"""
Google Maps Geocoding service.
Wraps the Geocoding API with retry logic.
"""
import time
from typing import Optional
import requests
from django.conf import settings

GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"


def geocode_address(address: str, retries: int = 3, delay: float = 1.0) -> Optional[dict]:
    """
    Geocode a single address string using Google Maps.
    Returns a dict with {lat, lng, formatted_address} or None on failure.
    """
    api_key = getattr(settings, "GOOGLE_MAPS_API_KEY", None)
    if not api_key:
        raise ValueError("GOOGLE_MAPS_API_KEY is not configured in settings.")

    params = {"address": address, "key": api_key}

    for attempt in range(retries):
        try:
            resp = requests.get(GEOCODE_URL, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()

            if data.get("status") == "OK" and data.get("results"):
                result = data["results"][0]
                loc = result["geometry"]["location"]
                return {
                    "lat": loc["lat"],
                    "lng": loc["lng"],
                    "formatted_address": result.get("formatted_address", ""),
                }

            if data.get("status") in ("ZERO_RESULTS", "INVALID_REQUEST"):
                return None  # Non-retryable

        except requests.RequestException:
            pass

        if attempt < retries - 1:
            time.sleep(delay)

    return None
