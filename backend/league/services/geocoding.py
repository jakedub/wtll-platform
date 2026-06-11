"""
Geocoding service layer.
Handles single-address and batch geocoding of Player records.
"""
from typing import Optional
from league.services.google_maps import geocode_address


def geocode_single_address(address: str) -> Optional[dict]:
    """Geocode a free-form address string. Returns {lat, lng, formatted_address} or None."""
    if not address or not address.strip():
        return None
    return geocode_address(address.strip())


def geocode_missing_players_batch() -> dict:
    """
    Geocode all Player records that have address data but no lat/lng.
    Updates the player in place and returns a summary.
    """
    from league.models import Player

    players = Player.objects.filter(
        latitude__isnull=True,
        longitude__isnull=True,
    ).exclude(address_line_1="").exclude(city="").exclude(state="")

    total = players.count()
    success = 0
    failed = 0

    for player in players:
        full_addr = player.full_address
        if not full_addr:
            failed += 1
            continue

        result = geocode_address(full_addr)
        if result:
            player.latitude = result["lat"]
            player.longitude = result["lng"]
            player.save(update_fields=["latitude", "longitude"])
            success += 1
        else:
            failed += 1

    return {"total": total, "success": success, "failed": failed}
