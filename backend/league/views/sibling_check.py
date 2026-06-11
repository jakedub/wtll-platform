"""
Sibling Check — detects players likely to be siblings by matching shared email addresses.

Logic:
  - Group all non-archived players by their contact email (case-insensitive).
  - Any email shared by 2+ players is a potential sibling group.
  - different_last_names=True flags groups where not all last names match.
  - Younger Sibling Rule: if any player in the group is in AA or a lower division,
    siblings in higher divisions are flagged as eligible via the younger-sibling rule.
    (Little League rule: older sibling is eligible if a younger sibling is in AA or below.)
"""
from typing import Optional

from rest_framework.views import APIView
from rest_framework.response import Response

from league.models.players import Player


# ── Division helpers ──────────────────────────────────────────────────────────

# Divisions at or below AA that trigger the younger-sibling eligibility rule.
# We match against the lowercased, stripped division name.
# Order matters: check more specific strings first.
_QUALIFYING_TOKENS = [
    "tee ball", "t-ball", "tball",           # Tee Ball
    "coach pitch", "machine pitch",           # Coached/machine pitch
    "rookie", "farm",                         # Rookie/Farm
    "minor aa", "minor-aa",                   # Minor AA
    "minor a", "minor-a",                     # Minor A
]
# AA itself (whole-word match to avoid matching "AAA")
import re
_AA_EXACT = re.compile(r'\baa\b')


def is_qualifying_division(division_name: Optional[str]) -> bool:
    """Return True if this division is 'AA or lower' for the younger-sibling rule."""
    if not division_name:
        return False
    name = division_name.strip().lower()
    # Explicitly NOT qualifying: aaa, majors, intermediate, 50/70, juniors, seniors
    if any(t in name for t in ("aaa", "majors", "intermediate", "50/70", "junior", "senior")):
        return False
    # Token matches for below-AA divisions
    if any(t in name for t in _QUALIFYING_TOKENS):
        return True
    # Exact/word-boundary AA match
    if _AA_EXACT.search(name):
        return True
    # Standalone "a" division (e.g. division named exactly "A" or "Minor A")
    if name.strip() in ("a", "minor a", "minors"):
        return True
    return False


def get_player_division(player) -> Optional[str]:
    """Return the most recent enrollment division name for a player, or None."""
    enrollment = player.enrollments.order_by("-id").first()
    if enrollment and enrollment.division:
        return enrollment.division.name
    return None


# ── View ──────────────────────────────────────────────────────────────────────

class SiblingCheckView(APIView):
    """
    GET /api/players/sibling-check/
    Returns groups of players sharing the same email address, with younger-sibling
    eligibility flags.
    """

    def get(self, request):
        players = (
            Player.objects
            .filter(is_archived=False)
            .exclude(email__isnull=True)
            .exclude(email="")
            .prefetch_related("enrollments__division")
            .order_by("last_name", "first_name")
        )

        # Build email → player list map (normalise email to lowercase)
        email_map: dict[str, list] = {}
        for p in players:
            key = p.email.strip().lower()
            if key not in email_map:
                email_map[key] = []
            email_map[key].append(p)

        groups = []
        for email, player_list in email_map.items():
            if len(player_list) < 2:
                continue

            last_names = {p.last_name.strip().lower() for p in player_list}

            # Resolve each player's division
            player_data = []
            for p in player_list:
                division = get_player_division(p)
                player_data.append({
                    "id": p.id,
                    "first_name": p.first_name,
                    "last_name": p.last_name,
                    "full_name": f"{p.first_name} {p.last_name}",
                    "division": division,
                    "qualifying_division": is_qualifying_division(division),
                })

            # Younger-sibling rule: if ANY player is in AA or lower, the group has
            # a qualifying sibling — flag the others as potentially eligible.
            has_qualifying_sibling = any(pd["qualifying_division"] for pd in player_data)

            # If multiple players qualify (e.g. two in AA), none gets flagged since
            # the rule only applies when the LOWER sibling enables the HIGHER one.
            # A player is "younger_sibling_eligible" if:
            #   - they are NOT in a qualifying division themselves, AND
            #   - at least one sibling IS in a qualifying division.
            for pd in player_data:
                pd["younger_sibling_eligible"] = (
                    has_qualifying_sibling and not pd["qualifying_division"]
                )

            groups.append({
                "email": email,
                "player_count": len(player_list),
                "different_last_names": len(last_names) > 1,
                "last_names": sorted(last_names),
                "has_qualifying_sibling": has_qualifying_sibling,
                "players": player_data,
            })

        # Sort: groups with younger-sibling rule first, then different-last-name groups,
        # then by player count desc, then email alpha
        groups.sort(key=lambda g: (
            not g["has_qualifying_sibling"],
            not g["different_last_names"],
            -g["player_count"],
            g["email"],
        ))

        players_flagged = sum(g["player_count"] for g in groups)
        younger_sibling_eligible_count = sum(
            1 for g in groups for p in g["players"] if p["younger_sibling_eligible"]
        )

        return Response({
            "total_groups": len(groups),
            "players_flagged": players_flagged,
            "different_last_name_groups": sum(1 for g in groups if g["different_last_names"]),
            "younger_sibling_eligible_count": younger_sibling_eligible_count,
            "groups": groups,
        })
