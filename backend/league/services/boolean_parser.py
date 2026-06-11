# league/services/boolean_parser.py


def parse_yes_no(value) -> bool:
    """
    Convert common CSV boolean representations to True/False.

    Accepts:
        'yes', 'y', 'true', '1'      → True
        'no',  'n', 'false', '0', '' → False
        None or unexpected            → False (with a warning)
    """
    if value is None:
        return False

    cleaned = str(value).strip().lower()

    if cleaned in {"yes", "y", "true", "1"}:
        return True
    elif cleaned in {"no", "n", "false", "0", ""}:
        return False
    else:
        print(f"Warning: Unexpected boolean value from CSV: '{value}', defaulting to False")
        return False
