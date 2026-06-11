"""
Volunteer sign-up views.
Any game can have Grounds Crew and Concessions Stand volunteers.
No auth required — volunteers enter name + email.
"""
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from league.models import Event, VolunteerSignup
from league.serializers.volunteer_serializer import VolunteerGameSerializer, VolunteerSignupSerializer


class VolunteerGameListView(APIView):
    """
    GET /api/volunteers/games/
    Returns all upcoming game events with their current volunteer rosters.
    Query params:
      ?all=1  — include past games too
    """

    def get(self, request):
        qs = Event.objects.select_related("team", "team__division").prefetch_related(
            "volunteer_signups"
        ).filter(event_type="GAME", is_cancelled=False)

        if not request.query_params.get("all"):
            qs = qs.filter(start_time__gte=timezone.now())

        qs = qs.order_by("start_time")
        return Response(VolunteerGameSerializer(qs, many=True).data)


class VolunteerSignupCreateView(APIView):
    """
    POST /api/volunteers/signups/

    Single signup:
      Body: { event_id, volunteer_name, volunteer_email, role, notes }

    Batch signup (multiple games at once):
      Body: { event_ids: [1, 2, 3], volunteer_name, volunteer_email, role, notes }

    Roles: GROUNDS | CONCESSIONS
    """

    def post(self, request):
        role = request.data.get("role")
        name = (request.data.get("volunteer_name") or "").strip()
        email = (request.data.get("volunteer_email") or "").strip()
        phone = (request.data.get("volunteer_phone") or "").strip()
        notes = (request.data.get("notes") or "").strip()

        if not role or not name:
            return Response(
                {"error": "role and volunteer_name are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if role not in ("GROUNDS", "CONCESSIONS"):
            return Response(
                {"error": "role must be GROUNDS or CONCESSIONS."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Batch signup ────────────────────────────────────────────────────────
        event_ids = request.data.get("event_ids")
        if event_ids:
            if not isinstance(event_ids, list):
                return Response({"error": "event_ids must be a list."}, status=status.HTTP_400_BAD_REQUEST)

            created = []
            skipped = []
            for eid in event_ids:
                try:
                    event = Event.objects.get(pk=eid)
                except Event.DoesNotExist:
                    skipped.append(eid)
                    continue
                signup = VolunteerSignup.objects.create(
                    event=event,
                    volunteer_name=name,
                    volunteer_email=email,
                    volunteer_phone=phone,
                    role=role,
                    notes=notes,
                )
                created.append(signup)

            return Response(
                {
                    "created": VolunteerSignupSerializer(created, many=True).data,
                    "count": len(created),
                    "skipped": skipped,
                },
                status=status.HTTP_201_CREATED,
            )

        # ── Single signup ───────────────────────────────────────────────────────
        event_id = request.data.get("event_id")
        if not event_id:
            return Response(
                {"error": "event_id or event_ids is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            event = Event.objects.get(pk=event_id)
        except Event.DoesNotExist:
            return Response({"error": "Event not found."}, status=status.HTTP_404_NOT_FOUND)

        signup = VolunteerSignup.objects.create(
            event=event,
            volunteer_name=name,
            volunteer_email=email,
            volunteer_phone=phone,
            role=role,
            notes=notes,
        )

        return Response(VolunteerSignupSerializer(signup).data, status=status.HTTP_201_CREATED)


class VolunteerSignupDeleteView(APIView):
    """
    DELETE /api/volunteers/signups/<pk>/
    """

    def delete(self, request, pk):
        try:
            signup = VolunteerSignup.objects.get(pk=pk)
        except VolunteerSignup.DoesNotExist:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        signup.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class VolunteerPublicConfigView(APIView):
    """GET/POST /api/volunteers/public-config/  — read or toggle public access."""

    def get(self, request):
        from league.models.public_signup_config import PublicSignupConfig
        cfg, _ = PublicSignupConfig.objects.get_or_create(form_type="VOLUNTEER")
        return Response({"form_type": "VOLUNTEER", "is_enabled": cfg.is_enabled})

    def post(self, request):
        from league.models.public_signup_config import PublicSignupConfig
        cfg, _ = PublicSignupConfig.objects.get_or_create(form_type="VOLUNTEER")
        cfg.is_enabled = bool(request.data.get("is_enabled", False))
        cfg.save()
        return Response({"form_type": "VOLUNTEER", "is_enabled": cfg.is_enabled})


class ConcessionsCloseView(APIView):
    """
    POST /api/volunteers/games/<event_id>/concessions-closed/
    Toggles the concessions_closed flag on a game event.
    Returns: { concessions_closed: bool }
    """

    def post(self, request, event_id):
        try:
            event = Event.objects.get(pk=event_id, event_type="GAME")
        except Event.DoesNotExist:
            return Response({"error": "Game not found."}, status=status.HTTP_404_NOT_FOUND)

        event.concessions_closed = not event.concessions_closed
        event.save(update_fields=["concessions_closed"])
        return Response({"concessions_closed": event.concessions_closed})
