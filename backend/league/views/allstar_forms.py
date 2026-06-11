"""
All Star form download views.
GET /api/allstars/<selection_id>/forms/tvf/
GET /api/allstars/<selection_id>/forms/enrollment/
"""
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response

from league.models import AllStarSelection
from league.services.allstar_forms import generate_tvf, generate_enrollment_form, generate_softball_enrollment_form


def _get_selection(pk):
    try:
        return AllStarSelection.objects.select_related("player", "division").get(pk=pk)
    except AllStarSelection.DoesNotExist:
        return None
    except Exception as exc:
        # Catches DB errors (e.g. pending migration adding columns)
        raise exc


def _pdf_response(pdf_bytes, filename):
    resp = HttpResponse(pdf_bytes, content_type="application/pdf")
    resp["Content-Disposition"] = f'attachment; filename="{filename}"'
    return resp


class AllStarTVFView(APIView):
    """GET /api/allstars/<pk>/forms/tvf/"""

    def get(self, request, pk):
        try:
            sel = _get_selection(pk)
        except Exception as exc:
            return Response({"error": f"Database error — pending migration? {exc}"}, status=500)

        if not sel:
            return Response({"error": "Not found."}, status=404)

        # Pull president name from board members if available
        president_name = ""
        try:
            from league.models.board_member import BoardMember
            president = BoardMember.objects.filter(role__iexact="president", is_active=True).first()
            if president:
                president_name = president.full_name
        except Exception:
            pass  # board_member table may not exist yet

        try:
            pdf_bytes = generate_tvf(sel.player, sel, president_name=president_name)
        except Exception as e:
            return Response({"error": f"PDF generation failed: {e}"}, status=500)

        name = f"TVF_{sel.player.last_name}_{sel.player.first_name}_{sel.season_year}.pdf"
        return _pdf_response(pdf_bytes, name)


class AllStarEnrollmentFormView(APIView):
    """GET /api/allstars/<pk>/forms/enrollment/   — Baseball School Enrollment Form"""

    def get(self, request, pk):
        try:
            sel = _get_selection(pk)
        except Exception as exc:
            return Response({"error": f"Database error — pending migration? {exc}"}, status=500)

        if not sel:
            return Response({"error": "Not found."}, status=404)

        try:
            pdf_bytes = generate_enrollment_form(sel.player, sel)
        except Exception as e:
            return Response({"error": f"PDF generation failed: {e}"}, status=500)

        name = f"Baseball_Enrollment_{sel.player.last_name}_{sel.player.first_name}_{sel.season_year}.pdf"
        return _pdf_response(pdf_bytes, name)


class AllStarSoftballEnrollmentFormView(APIView):
    """GET /api/allstars/<pk>/forms/enrollment-softball/   — Softball School Enrollment Form"""

    def get(self, request, pk):
        try:
            sel = _get_selection(pk)
        except Exception as exc:
            return Response({"error": f"Database error — pending migration? {exc}"}, status=500)

        if not sel:
            return Response({"error": "Not found."}, status=404)

        try:
            pdf_bytes = generate_softball_enrollment_form(sel.player, sel)
        except Exception as e:
            return Response({"error": f"PDF generation failed: {e}"}, status=500)

        name = f"Softball_Enrollment_{sel.player.last_name}_{sel.player.first_name}_{sel.season_year}.pdf"
        return _pdf_response(pdf_bytes, name)
