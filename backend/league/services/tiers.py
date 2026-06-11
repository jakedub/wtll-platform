# league/services/tiers.py


def calculate_overall_tier(score: int) -> str:
    """
    Return a human-readable tier label based on overall evaluation score (max 45).

    Tier 1: elite (38+)
    Tier 2: above average (34–37)
    Tier 3: average (30–33)
    Tier 4: below average (26–29)
    Tier 5: developing (<26)
    """
    if score >= 38:
        return "Tier 1"
    elif score >= 34:
        return "Tier 2"
    elif score >= 30:
        return "Tier 3"
    elif score >= 26:
        return "Tier 4"
    return "Tier 5"


def calculate_pitcher_tier(pitching_total: int) -> str:
    """Ace / Strong / Development / None."""
    if pitching_total >= 9:
        return "Ace"
    elif pitching_total >= 7:
        return "Strong"
    elif pitching_total >= 5:
        return "Development"
    return "None"


def calculate_catcher_tier(catcher_total: int) -> str:
    """Elite / Strong / Emergency / None."""
    if catcher_total >= 9:
        return "Elite"
    elif catcher_total >= 7:
        return "Strong"
    elif catcher_total >= 5:
        return "Emergency"
    return "None"
