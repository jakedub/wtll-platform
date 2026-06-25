"""
League Location & LocationField CRUD views.

GET    /api/locations/                  → list all locations (with nested fields)
POST   /api/locations/                  → create location
GET    /api/locations/<id>/             → retrieve single location
PATCH  /api/locations/<id>/             → update location
DELETE /api/locations/<id>/             → delete location

POST   /api/locations/<id>/fields/      → add a field to a location
PATCH  /api/locations/<id>/fields/<fid>/  → update a field
DELETE /api/locations/<id>/fields/<fid>/  → delete a field
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from league.models.location import LeagueLocation, LocationField
from league.models.boundary import BoundaryLeague


def _serialize_field(f: LocationField) -> dict:
    return {
        "id": f.id,
        "name": f.name,
        "division_tag": f.division_tag,
        "sort_order": f.sort_order,
    }


def _serialize_location(loc: LeagueLocation, include_fields: bool = True) -> dict:
    d = {
        "id": loc.id,
        "name": loc.name,
        "short_name": loc.short_name,
        "address": loc.address,
        "city": loc.city,
        "state": loc.state,
        "zip_code": loc.zip_code,
        "district": loc.district,
        "is_home": loc.is_home,
        "notes": loc.notes,
        "league_id": loc.league_id,
        "league_name": loc.league.league_name if loc.league else None,
        "created_at": loc.created_at.isoformat() if loc.created_at else None,
        "updated_at": loc.updated_at.isoformat() if loc.updated_at else None,
    }
    if include_fields:
        d["fields"] = [_serialize_field(f) for f in loc.fields.all()]
    return d


class LeagueLocationListCreateView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        locs = LeagueLocation.objects.select_related("league").prefetch_related("fields").all()
        return Response([_serialize_location(l) for l in locs])

    def _resolve_league(self, data):
        """Return a BoundaryLeague instance if league_id is provided, else None."""
        league_id = data.get("league_id")
        if not league_id:
            return None
        try:
            return BoundaryLeague.objects.get(pk=int(league_id))
        except (BoundaryLeague.DoesNotExist, (ValueError, TypeError)):
            return None

    def post(self, request):
        data = request.data
        loc = LeagueLocation.objects.create(
            name=data.get("name", ""),
            short_name=data.get("short_name", ""),
            address=data.get("address", ""),
            city=data.get("city", ""),
            state=data.get("state", "OH"),
            zip_code=data.get("zip_code", ""),
            district=data.get("district", ""),
            is_home=bool(data.get("is_home", False)),
            notes=data.get("notes", ""),
            league=self._resolve_league(data),
        )
        # Allow inline field creation on POST
        for f_data in data.get("fields", []):
            LocationField.objects.create(
                location=loc,
                name=f_data.get("name", ""),
                division_tag=f_data.get("division_tag", ""),
                sort_order=int(f_data.get("sort_order", 0)),
            )
        loc.refresh_from_db()
        return Response(_serialize_location(loc), status=status.HTTP_201_CREATED)


class LeagueLocationDetailView(APIView):
    authentication_classes = []
    permission_classes = []

    def _get_loc(self, pk):
        try:
            return LeagueLocation.objects.select_related("league").prefetch_related("fields").get(pk=pk)
        except LeagueLocation.DoesNotExist:
            return None

    def get(self, request, pk):
        loc = self._get_loc(pk)
        if not loc:
            return Response({"error": "Not found"}, status=404)
        return Response(_serialize_location(loc))

    def patch(self, request, pk):
        loc = self._get_loc(pk)
        if not loc:
            return Response({"error": "Not found"}, status=404)
        data = request.data
        FIELDS = ["name", "short_name", "address", "city", "state",
                  "zip_code", "district", "notes"]
        for field in FIELDS:
            if field in data:
                setattr(loc, field, data[field])
        if "is_home" in data:
            loc.is_home = bool(data["is_home"])
        if "league_id" in data:
            if data["league_id"]:
                try:
                    loc.league = BoundaryLeague.objects.get(pk=int(data["league_id"]))
                except (BoundaryLeague.DoesNotExist, (ValueError, TypeError)):
                    loc.league = None
            else:
                loc.league = None
        loc.save()
        loc.refresh_from_db()
        return Response(_serialize_location(loc))

    def delete(self, request, pk):
        loc = self._get_loc(pk)
        if not loc:
            return Response({"error": "Not found"}, status=404)
        loc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LocationFieldListCreateView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, location_pk):
        try:
            loc = LeagueLocation.objects.get(pk=location_pk)
        except LeagueLocation.DoesNotExist:
            return Response({"error": "Location not found"}, status=404)

        data = request.data
        f = LocationField.objects.create(
            location=loc,
            name=data.get("name", ""),
            division_tag=data.get("division_tag", ""),
            sort_order=int(data.get("sort_order", 0)),
        )
        return Response(_serialize_field(f), status=status.HTTP_201_CREATED)


class LocationFieldDetailView(APIView):
    authentication_classes = []
    permission_classes = []

    def _get_field(self, location_pk, field_pk):
        try:
            return LocationField.objects.get(pk=field_pk, location_id=location_pk)
        except LocationField.DoesNotExist:
            return None

    def patch(self, request, location_pk, field_pk):
        f = self._get_field(location_pk, field_pk)
        if not f:
            return Response({"error": "Not found"}, status=404)
        data = request.data
        for attr in ["name", "division_tag"]:
            if attr in data:
                setattr(f, attr, data[attr])
        if "sort_order" in data:
            f.sort_order = int(data["sort_order"])
        f.save()
        return Response(_serialize_field(f))

    def delete(self, request, location_pk, field_pk):
        f = self._get_field(location_pk, field_pk)
        if not f:
            return Response({"error": "Not found"}, status=404)
        f.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
