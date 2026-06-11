"""
Geocoding views.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from league.services.geocoding import geocode_single_address, geocode_missing_players_batch


class GeocodeView(APIView):
    """
    GET /api/geocode/?address=<address>
    Geocode a single address and return lat/lng.
    """

    def get(self, request):
        address = request.query_params.get("address", "").strip()
        if not address:
            return Response({"error": "address query param required."}, status=status.HTTP_400_BAD_REQUEST)

        result = geocode_single_address(address)
        if result:
            return Response(result)
        return Response({"error": "Could not geocode that address."}, status=status.HTTP_404_NOT_FOUND)


class GeocodeMissingPlayersView(APIView):
    """
    POST /api/geocode/batch/
    Geocode all players that have address data but no lat/lng.
    """

    def post(self, request):
        summary = geocode_missing_players_batch()
        return Response(summary)
