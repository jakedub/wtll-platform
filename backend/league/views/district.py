"""
District boundary views.
"""
import csv
import io
from pathlib import Path

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import FileResponse, HttpResponse, Http404

from league.utils.district import (
    check_all_players_in_district,
    determine_player_eligibility,
    is_point_in_district,
    load_district_polygons,
    eligibility_reason,
    KML_PATH,
)
from league.services.geocoding import geocode_single_address


class CheckPlayersInDistrictView(APIView):
    """
    POST /api/district/check/
    Run district boundary check for all geocoded players.
    """

    def post(self, request):
        summary = check_all_players_in_district()
        return Response(summary)


class CheckPlayerEligibilityView(APIView):
    """
    POST /api/district/eligibility/
    Update is_eligible for all players that have had a district check.
    """

    def post(self, request):
        summary = determine_player_eligibility()
        return Response(summary)


class DistrictPolygonsView(APIView):
    """
    GET /api/district/polygons/
    Return district polygon coordinates as GeoJSON-style list of coordinate arrays.
    """

    def get(self, request):
        try:
            polygons = load_district_polygons()
            result = []
            for poly in polygons:
                coords = list(poly.exterior.coords)
                result.append([[lng, lat] for lng, lat, *_ in coords])
            return Response({"polygons": result})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


STATIC_DIR = KML_PATH.parent

# Fallback static files (used when no DB record exists yet)
KML_FILES = {
    "wtll":     STATIC_DIR / "wtll_district_boundaries.kml",
    "8":        STATIC_DIR / "district_8_boundaries.kml",
    "7":        STATIC_DIR / "district_7_boundaries.kml",
    "combined": STATIC_DIR / "district_combined_boundaries.kml",
}


class ServeKMLFileView(APIView):
    """
    GET  /api/district/kml/                — serve WTLL boundary KML (default)
    GET  /api/district/kml/?district=wtll  — WTLL boundary only
    GET  /api/district/kml/?district=8     — full District 8 boundaries
    GET  /api/district/kml/?district=7     — full District 7 boundaries
    GET  /api/district/kml/?district=combined — D7+D8 combined view
    GET  /api/district/kml/?info=1         — return file metadata instead of file

    POST /api/district/kml/?district=<key> — replace KML content (stored in DB)
    """

    def _district_key(self, request) -> str:
        return request.query_params.get("district", "wtll")

    def get(self, request):
        from league.models.boundary import GeneratedKML

        key = self._district_key(request)

        # ── ?info=1 → metadata ────────────────────────────────────────────────
        if request.query_params.get("info"):
            import datetime
            db_rec = GeneratedKML.objects.filter(district_key=key).first()
            if db_rec:
                return Response({
                    "source": "database",
                    "district_key": key,
                    "size_bytes": len(db_rec.kml_content.encode()),
                    "modified": db_rec.updated_at.isoformat(),
                    "note": db_rec.note,
                    "exists": True,
                })
            path = KML_FILES.get(key, KML_PATH)
            if not path.exists():
                raise Http404(f"KML file not found: {key}")
            stat = path.stat()
            return Response({
                "source": "static",
                "district_key": key,
                "filename": path.name,
                "size_bytes": stat.st_size,
                "modified": datetime.datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "exists": True,
            })

        # ── Serve KML — DB first, fall back to static file ────────────────────
        db_rec = GeneratedKML.objects.filter(district_key=key).first()
        if db_rec and db_rec.kml_content:
            return HttpResponse(
                db_rec.kml_content,
                content_type="application/vnd.google-earth.kml+xml",
            )

        path = KML_FILES.get(key, KML_PATH)
        if not path.exists():
            raise Http404(f"KML file not found for district '{key}'")
        return FileResponse(
            open(path, "rb"),
            content_type="application/vnd.google-earth.kml+xml",
            as_attachment=False,
            filename=path.name,
        )

    def post(self, request):
        """Replace the KML for a specific district (stored in DB)."""
        from league.models.boundary import GeneratedKML

        key = self._district_key(request)
        if key not in KML_FILES:
            return Response(
                {"error": f"Unknown district key '{key}'. Use: wtll, 8, 7, combined."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        file = request.FILES.get("file")
        if not file:
            return Response({"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        if not file.name.lower().endswith(".kml"):
            return Response({"error": "File must be a .kml file."}, status=status.HTTP_400_BAD_REQUEST)

        content = file.read()
        if b"<kml" not in content.lower():
            return Response(
                {"error": "File does not appear to be a valid KML document."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        kml_text = content.decode("utf-8")

        obj, created = GeneratedKML.objects.update_or_create(
            district_key=key,
            defaults={
                "kml_content": kml_text,
                "note": f"uploaded ({file.name})",
            },
        )

        # If the WTLL KML was replaced, also refresh the eligibility engine's file cache
        if key == "wtll":
            try:
                KML_PATH.write_text(kml_text, encoding="utf-8")
                load_district_polygons.cache_clear()
            except Exception:
                pass  # non-fatal

        return Response({
            "success": True,
            "district_key": key,
            "size_bytes": len(kml_text),
            "created": created,
        }, status=status.HTTP_200_OK)


class CheckCsvDistrictView(APIView):
    """
    POST /api/district/check-csv/
    Accept a CSV with address columns, geocode each row, check district membership.
    Expected columns: first_name, last_name, address, city, state, zip_code
    """

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        text = file.read().decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))

        results = []
        for i, row in enumerate(reader, start=2):
            first = row.get("first_name", "").strip()
            last = row.get("last_name", "").strip()
            address = row.get("address", "").strip()
            city = row.get("city", "").strip()
            state = row.get("state", "").strip()
            zip_code = row.get("zip_code", "").strip()

            full_addr = ", ".join(filter(None, [address, city, state, zip_code]))
            if not full_addr:
                results.append({
                    "row": i,
                    "name": f"{first} {last}",
                    "address": "",
                    "in_district": None,
                    "error": "No address data",
                })
                continue

            geo = geocode_single_address(full_addr)
            if not geo:
                results.append({
                    "row": i,
                    "name": f"{first} {last}",
                    "address": full_addr,
                    "in_district": None,
                    "error": "Geocoding failed",
                })
                continue

            in_district = is_point_in_district(geo["lat"], geo["lng"])
            results.append({
                "row": i,
                "name": f"{first} {last}",
                "address": geo["formatted_address"],
                "lat": geo["lat"],
                "lng": geo["lng"],
                "in_district": in_district,
                "error": None,
            })

        total = len(results)
        in_count = sum(1 for r in results if r["in_district"] is True)
        out_count = sum(1 for r in results if r["in_district"] is False)
        error_count = sum(1 for r in results if r["error"])

        return Response({
            "summary": {
                "total": total,
                "in_district": in_count,
                "out_of_district": out_count,
                "errors": error_count,
            },
            "results": results,
        })


# ── League CRUD ───────────────────────────────────────────────────────────────

def _serialize_league(league) -> dict:
    return {
        "id": league.id,
        "league_id": league.league_id,
        "league_name": league.league_name,
        "league_location": league.league_location,
        "official_name": league.official_name,
        "district": league.district,
        "is_district_league": league.is_district_league,
        "shape_components": league.shape_components,
        "shared_boundary_with": league.shared_boundary_with,
    }


class BoundaryLeagueListView(APIView):
    """
    GET  /api/district/leagues/  — list all leagues (ordered by district, name)
    POST /api/district/leagues/  — create a new league
    """

    def get(self, request):
        from league.models.boundary import BoundaryLeague
        leagues = list(BoundaryLeague.objects.all())
        return Response([_serialize_league(lg) for lg in leagues])

    def post(self, request):
        from league.models.boundary import BoundaryLeague
        data = request.data
        required = {"league_id", "league_name"}
        missing = required - set(data.keys())
        if missing:
            return Response(
                {"error": f"Missing required fields: {', '.join(missing)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        league = BoundaryLeague.objects.create(
            league_id=data["league_id"],
            league_name=data["league_name"],
            league_location=data.get("league_location", ""),
            official_name=data.get("official_name", ""),
            district=data.get("district"),
            is_district_league=data.get("is_district_league", True),
            shape_components=data.get("shape_components", []),
            shared_boundary_with=data.get("shared_boundary_with", ""),
        )
        return Response(_serialize_league(league), status=status.HTTP_201_CREATED)


class BoundaryLeagueDetailView(APIView):
    """
    PATCH  /api/district/leagues/<pk>/  — partial update a league
    DELETE /api/district/leagues/<pk>/  — remove a league
    """

    def _get_object(self, pk):
        from league.models.boundary import BoundaryLeague
        try:
            return BoundaryLeague.objects.get(pk=pk)
        except BoundaryLeague.DoesNotExist:
            return None

    def patch(self, request, pk):
        league = self._get_object(pk)
        if not league:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        allowed = {
            "league_name", "league_location", "official_name",
            "district", "is_district_league", "shape_components", "shared_boundary_with",
        }
        for field, value in request.data.items():
            if field in allowed:
                setattr(league, field, value)
        league.save()
        return Response(_serialize_league(league))

    def delete(self, request, pk):
        league = self._get_object(pk)
        if not league:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        league.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RegenerateKMLView(APIView):
    """
    POST /api/district/kml/regenerate/
    Rebuild all four KML files from current BoundaryLeague data and persist to DB.
    """

    def post(self, request):
        from league.utils.kml_generator import regenerate_all_kml
        kml_map = regenerate_all_kml(note="regenerated from league editor")

        # Also refresh the eligibility engine's file cache with the new WTLL KML
        if "wtll" in kml_map:
            try:
                KML_PATH.write_text(kml_map["wtll"], encoding="utf-8")
                load_district_polygons.cache_clear()
            except Exception:
                pass

        return Response({
            "success": True,
            "regenerated": [
                {"district_key": k, "size_bytes": len(v)}
                for k, v in kml_map.items()
            ],
        })
