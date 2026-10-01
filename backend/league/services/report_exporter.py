import logging
from league.services.browser_login import fetch_report_with_playwright

logger = logging.getLogger(__name__)


def fetch_bluesombrero_report(report_id="202676", portal_id="10236"):
    """
    Fetches saved report JSON data directly via an authenticated Playwright session.
    """
    logger.info("=== STARTING REPORT FETCH [Report ID: %s | Portal ID: %s] ===", report_id, portal_id)

    try:
        report_data = fetch_report_with_playwright(report_id=report_id, portal_id=portal_id)
        logger.info("=== REPORT FETCH SUCCESSFUL ===")
        return report_data
    except Exception as err:
        logger.exception("[REPORT ERROR] Failed to retrieve report data: %s", err)
        raise


def _extract_ep_data(ep):
    """
    Safely retrieves the inner payload dict regardless of whether the captured 
    endpoint entry is a dict or a tuple/list (e.g. [url, data_dict]).
    """
    if isinstance(ep, (list, tuple)):
        # If it's a list/tuple [url, payload], find the first dictionary item
        for item in ep:
            if isinstance(item, dict):
                return item
        return {}
    elif isinstance(ep, dict):
        return ep
    return {}


def _get_result_set(ep_dict):
    """
    Locates the DynamicQuery/execute style payload inside a captured endpoint,
    which carries the actual resultSet.columns / resultSet.rows pair. Checked
    at both data.resultSet and data.data.resultSet since the reporting proxy
    nests the payload differently depending on the call.
    """
    data = ep_dict.get("data", {})
    if not isinstance(data, dict):
        return None

    rs = data.get("resultSet")
    if isinstance(rs, dict) and "columns" in rs and "rows" in rs:
        return rs

    inner = data.get("data")
    if isinstance(inner, dict):
        rs = inner.get("resultSet")
        if isinstance(rs, dict) and "columns" in rs and "rows" in rs:
            return rs

    return None


def convert_bluesombrero_payload(raw_data):
    """
    Parses raw intercepted Blue Sombrero JSON network endpoints and converts them
    into a clean list of dictionary records mapped by column display names.

    The DynamicQuery/execute endpoint is the source of truth here. Its
    resultSet.columns array and resultSet.rows array are already aligned
    positionally by BlueSombrero itself (row[i] goes with columns[i]) even
    though the columns' own "index" field is sparse (it skips ranges around
    custom question and discount columns), so we zip by position, not by
    that index field.
    """
    endpoints = raw_data.get("captured_endpoints", [])
    if not endpoints:
        raise ValueError("Invalid report payload: no captured endpoints found.")

    # There can be more than one DynamicQuery/execute capture in the same
    # session (the UI's own initial call, plus a forced full re-pull done by
    # browser_login.py when the UI's default page size truncated the rows).
    # Always take the one with the most rows so a partial first capture
    # never wins over a later, complete one.
    result_set = None
    best_row_count = -1
    for ep in endpoints:
        ep_dict = _extract_ep_data(ep)
        rs = _get_result_set(ep_dict)
        if rs is not None:
            row_count = len(rs.get("rows", []) or [])
            if row_count > best_row_count:
                result_set = rs
                best_row_count = row_count

    if result_set is None:
        raise ValueError("Invalid report payload: could not locate a resultSet with columns/rows.")

    columns = result_set.get("columns", [])
    rows = result_set.get("rows", [])

    # Resolve header names, disambiguating duplicate display names (e.g. two
    # "Player Grant Donation" columns with different underlying ids) by
    # appending the column id.
    column_headers = []
    name_counts = {}
    for col in columns:
        base_name = col.get("name") or col.get("id") or "Column"
        name_counts[base_name] = name_counts.get(base_name, 0) + 1

    seen_so_far = {}
    for col in columns:
        base_name = col.get("name") or col.get("id") or "Column"
        if name_counts[base_name] > 1:
            seen_so_far[base_name] = seen_so_far.get(base_name, 0) + 1
            column_headers.append(f"{base_name} ({col.get('id')})")
        else:
            column_headers.append(base_name)

    # Construct clean key-value records, matching each row cell to its
    # column by position.
    converted_records = []
    for row in rows:
        record = {}
        for col_idx, header_name in enumerate(column_headers):
            cell = row[col_idx] if col_idx < len(row) else None
            record[header_name] = cell.get("rowData") if isinstance(cell, dict) else cell
        converted_records.append(record)

    pre_dedupe_count = len(converted_records)
    converted_records = _dedupe_payment_history_fanout(converted_records, column_headers)
    if len(converted_records) != pre_dedupe_count:
        logger.info(
            "Removed %d duplicate payment history rows (order-detail-payment x payment-history fan out).",
            pre_dedupe_count - len(converted_records),
        )

    pre_player_dedupe_count = len(converted_records)
    converted_records = _dedupe_one_row_per_player_per_division(converted_records, column_headers)
    if len(converted_records) != pre_player_dedupe_count:
        logger.info(
            "Collapsed %d extra rows so each player appears once per division.",
            pre_player_dedupe_count - len(converted_records),
        )

    logger.info(
        "Successfully converted payload: %d records found across %d columns.",
        len(converted_records),
        len(column_headers),
    )

    return {
        "total_columns": len(column_headers),
        "total_rows": len(converted_records),
        "columns": column_headers,
        "records": converted_records,
    }


# BlueSombrero's saved report joins the "order detail payment" (ODP) and
# "order payment history" (OPH) tables only on Order No, not on the actual
# payment record each ODP row belongs to. So an order with N installment
# payments comes back as N x N rows: every ODP row crossed with every OPH
# row for that order, instead of each ODP row paired with just its own
# payment. The two columns below are the real foreign key between them
# (ODP's own payment history id vs. the OPH row's own id) -- when they
# don't match, the row is a fan out artifact, not a real distinct payment.
_PAYMENT_FANOUT_KEY_PAIR = ("ODP Payment History Id", "OPH Order Payment History Id")


def _dedupe_payment_history_fanout(records, column_headers):
    left_key, right_key = _PAYMENT_FANOUT_KEY_PAIR
    if left_key not in column_headers or right_key not in column_headers:
        # Report doesn't include this level of payment detail -- nothing to do.
        return records

    deduped = []
    for record in records:
        left_val = record.get(left_key)
        right_val = record.get(right_key)
        # Keep rows with no payment-history pairing at all (nothing to fan
        # out), and rows where the ids genuinely correspond to each other.
        if left_val in (None, "") or right_val in (None, "") or str(left_val) == str(right_val):
            deduped.append(record)
    return deduped


# Even after the payment history fan out is removed, the same player can
# still show up more than once per division -- extra order items (jersey,
# camp add-ons, discounts, multiple custom-question rows, etc.) each land in
# their own row of the same underlying report. The league only wants one row
# per player per division, so this collapses to the first row seen for each
# (player, division) pair. Player Id is used when the report includes it,
# since two players can share a name; first/last name is the fallback.
_DIVISION_KEY = "Division Name"
_PLAYER_ID_KEY = "Player Id"
_PLAYER_NAME_KEYS = ("Player First Name", "Player Last Name")


def _dedupe_one_row_per_player_per_division(records, column_headers):
    if _DIVISION_KEY not in column_headers:
        # Report isn't broken out by division -- nothing to key the dedupe on.
        return records

    has_player_id = _PLAYER_ID_KEY in column_headers
    has_player_name = all(k in column_headers for k in _PLAYER_NAME_KEYS)
    if not has_player_id and not has_player_name:
        # No reliable way to identify the player -- leave the rows alone
        # rather than risk collapsing unrelated people together.
        return records

    seen = set()
    deduped = []
    for record in records:
        division_val = record.get(_DIVISION_KEY)
        if has_player_id and record.get(_PLAYER_ID_KEY) not in (None, ""):
            player_component = ("id", record.get(_PLAYER_ID_KEY))
        else:
            player_component = ("name", record.get(_PLAYER_NAME_KEYS[0]), record.get(_PLAYER_NAME_KEYS[1]))

        key = (player_component, division_val)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(record)
    return deduped