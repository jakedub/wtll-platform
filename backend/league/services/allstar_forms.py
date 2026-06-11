"""
All Star form generation service.

TVF (Tournament Player Verification): flat PDF — uses reportlab text overlay
merged with the original blank via pypdf.

School Enrollment Form: has 20 AcroForm fields — filled directly with pypdf.

Both services return a bytes object ready to stream as a PDF response.
"""
import io
from datetime import date
from pathlib import Path

FORMS_DIR = Path(__file__).resolve().parent.parent / "static" / "forms"
TVF_BLANK        = FORMS_DIR / "TVF.pdf"
ENROLLMENT_BLANK = FORMS_DIR / "enrollment_form.pdf"

LEAGUE_NAME = "Washington Township Little League"
LEAGUE_ID   = "1140814"


# ── TVF — coordinate overlay ───────────────────────────────────────────────────
#
# All positions are (x, y) in points from the bottom-left of a 612x792 page.
# Font: Helvetica 9pt.  Adjust _TVF_COORDS if layout ever drifts.

_TVF_COORDS = {
    # "Date Requested" blank starts at x=278, y=688.4
    "date_requested": (285, 688),
    # "League Name" blank starts at x=122, y=671.4
    "league_name":    (123, 671),
    # "League ID#" blank starts at x=492, y=671.4
    "league_id":      (493, 671),
    # "Player Name" blank starts at x=120, y=627.4
    "player_name":    (121, 627),
    # "Date of Birth" blank starts at x=493, y=627.4
    "dob":            (494, 627),
    # Parent address row y=537.4: street blank x=129, city blank x=277, state blank x=429, zip blank x=494
    "street":         (130, 537),
    "city":           (282, 537),
    "state":          (432, 537),
    "zip_code":       (496, 537),
    # Checkboxes — "□ BASEBALL" at x=233.2, y=713.1
    "chk_baseball":        (235, 713),
    # Board of Health checkbox at y=586.4, x=67.5 — always marked (standard age proof)
    "chk_board_of_health": (68,  586),
    # Driver's License at y=522.5 — always marked (standard residency proof to bring)
    "chk_drivers_license": (68,  522),
    # League President signature line (approximate — near bottom of form)
    "president_name":      (130, 195),
}

_FONT_SIZE = 9
_FONT      = "Helvetica"


def _build_tvf_overlay(
    player_name: str,
    dob: str,
    street: str,
    city: str,
    state: str,
    zip_code: str,
    president_name: str = "",
) -> bytes:
    """Return a single-page PDF bytes containing only the overlay text."""
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    c.setFont(_FONT, _FONT_SIZE)

    def draw(key: str, value: str) -> None:
        if value:
            x, y = _TVF_COORDS[key]
            c.drawString(x, y, str(value))

    today = date.today().strftime("%m/%d/%Y")

    draw("date_requested", today)
    draw("league_name",    LEAGUE_NAME)
    draw("league_id",      LEAGUE_ID)
    draw("player_name",    player_name)
    draw("dob",            dob)
    draw("street",         street)
    draw("city",           city)
    draw("state",          state)
    draw("zip_code",       zip_code)

    # Always mark checkboxes with "X"
    c.setFont(_FONT, 8)
    for key in ("chk_baseball", "chk_board_of_health", "chk_drivers_license"):
        x, y = _TVF_COORDS[key]
        c.drawString(x, y, "X")

    # President name on signature line (if provided)
    if president_name:
        c.setFont(_FONT, _FONT_SIZE)
        draw("president_name", president_name)

    c.save()
    buf.seek(0)
    return buf.read()


def generate_tvf(player, allstar_selection=None, president_name: str = "") -> bytes:
    """
    Generate a pre-filled TVF for the given Player.
    Always marks: Baseball, Board of Health (age proof), Driver's License (residency).
    Returns PDF bytes.
    """
    from pypdf import PdfReader, PdfWriter

    overlay_bytes = _build_tvf_overlay(
        player_name    = f"{player.first_name} {player.last_name}",
        dob            = player.date_of_birth or "",
        street         = player.address_line_1 or "",
        city           = player.city or "",
        state          = player.state or "",
        zip_code       = player.zip_code or "",
        president_name = president_name,
    )

    # Merge overlay on top of blank TVF
    blank   = PdfReader(str(TVF_BLANK))
    overlay = PdfReader(io.BytesIO(overlay_bytes))
    writer  = PdfWriter()

    base_page = blank.pages[0]
    base_page.merge_page(overlay.pages[0])
    writer.add_page(base_page)

    # Copy metadata safely — DocumentInformation values may be non-string types
    try:
        raw_meta = blank.metadata or {}
        clean = {k: str(v) for k, v in raw_meta.items() if v is not None}
        if clean:
            writer.add_metadata(clean)
    except Exception:
        pass  # metadata is cosmetic — don't fail the whole PDF

    out = io.BytesIO()
    writer.write(out)
    out.seek(0)
    return out.read()


# ── Enrollment Form helpers ────────────────────────────────────────────────────

# Division export values (from AcroForm inspection)
_DIV_BASEBALL = "/1"
_DIV_SOFTBALL = "/2"

# Level export values (from AcroForm inspection)
# Kid order: [0]TBall=/1, [1]LLMajors=/2, [2]Junior=/3, [3]Minors=/4, [4]Intermediate=/5, [5]Senior=/6
_LEVEL_EXPORT = {
    "tee ball":     "/1",
    "majors":       "/2",   # LL (Majors)
    "junior":       "/3",
    "minors":       "/4",   # AA, AAA, PeeWee
    "intermediate": "/5",
    "senior":       "/6",
}


def _division_level_export(division_name: str) -> str:
    """Return the Level radio export value for a given division name."""
    name = (division_name or "").lower()
    if "major" in name:
        return _LEVEL_EXPORT["majors"]
    if "junior" in name:
        return _LEVEL_EXPORT["junior"]
    if "senior" in name:
        return _LEVEL_EXPORT["senior"]
    if "intermediate" in name:
        return _LEVEL_EXPORT["intermediate"]
    if "tee" in name:
        return _LEVEL_EXPORT["tee ball"]
    return _LEVEL_EXPORT["minors"]   # AA, AAA, PeeWee → Minors


def _set_radio_button(writer, field_name: str, export_value: str) -> None:
    """
    Set a radio button group to the given export_value by walking the
    AcroForm /Fields tree on the writer's root — NOT page annotations.
    export_value must include the leading slash, e.g. '/2'.
    """
    from pypdf.generic import NameObject, IndirectObject

    try:
        acro = writer._root_object["/AcroForm"].get_object()
        fields = acro["/Fields"]
    except (KeyError, AttributeError):
        return

    for fref in fields:
        fobj = fref.get_object() if isinstance(fref, IndirectObject) else fref
        if str(fobj.get("/T", "")) != field_name:
            continue

        # Set /V on the parent field
        fobj[NameObject("/V")] = NameObject(export_value)

        # Walk kids and toggle /AS
        kids = fobj.get("/Kids")
        if not kids:
            fobj[NameObject("/AS")] = NameObject(export_value)
            break

        for kid_ref in kids.get_object():
            kid = kid_ref.get_object() if isinstance(kid_ref, IndirectObject) else kid_ref
            ap = kid.get("/AP")
            if not ap:
                continue
            n = ap.get_object().get("/N")
            if not n:
                continue
            n_o = n.get_object()
            if NameObject(export_value) in n_o:
                kid[NameObject("/AS")] = NameObject(export_value)
            else:
                kid[NameObject("/AS")] = NameObject("/Off")
        break


def _build_enrollment_form(player, division_name: str, division_export: str) -> bytes:
    """
    Core enrollment form generator.
    division_export: '/1' for Baseball, '/2' for Softball.
    """
    from pypdf import PdfReader, PdfWriter

    today = date.today().strftime("%m/%d/%Y")
    today_year = str(date.today().year)

    full_address = ", ".join(filter(None, [
        player.address_line_1,
        player.city,
        player.state,
        player.zip_code,
    ]))

    field_values = {
        "League Name":           LEAGUE_NAME,
        "League ID":             LEAGUE_ID,
        "PlayerStudent Name":    f"{player.first_name} {player.last_name}",
        "Date of Birth":         player.date_of_birth or "",
        "ParentGuardian Address -- Street, City/State, Zip": full_address,
        "Print Student Name":    f"{player.first_name} {player.last_name}",
        "School Name":           player.school_name or "",
        "School Year":           today_year,
        "Date":                  today,
        # Left blank — completed by school administrator
        "School Admin Name":     "",
        "School Address":        "",
        "School Phone":          "",
        "Enrollment Date":       "",
        "Title School Administrator Principal or Vice Principal": "",
        "Print Name of Parent/Legal Guardian 1": "",
    }

    reader = PdfReader(str(ENROLLMENT_BLANK))
    writer = PdfWriter()
    writer.append(reader)
    writer.update_page_form_field_values(writer.pages[0], field_values)

    # Set Division and Level radio buttons (must come after update_page_form_field_values)
    _set_radio_button(writer, "Division", division_export)
    _set_radio_button(writer, "Level", _division_level_export(division_name))

    out = io.BytesIO()
    writer.write(out)
    out.seek(0)
    return out.read()


def generate_enrollment_form(player, allstar_selection=None) -> bytes:
    """
    Generate a pre-filled Baseball School Enrollment Form.
    Division = Baseball; Level = derived from allstar_selection.division.
    """
    division_name = ""
    if allstar_selection and allstar_selection.division:
        division_name = allstar_selection.division.name
    return _build_enrollment_form(player, division_name, _DIV_BASEBALL)


def generate_softball_enrollment_form(player, allstar_selection=None) -> bytes:
    """
    Generate a pre-filled Softball School Enrollment Form.
    Division = Softball; Level = derived from allstar_selection.division.
    """
    division_name = ""
    if allstar_selection and allstar_selection.division:
        division_name = allstar_selection.division.name
    return _build_enrollment_form(player, division_name, _DIV_SOFTBALL)
