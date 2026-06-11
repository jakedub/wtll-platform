# league/views/umpire.py

from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from league.models.event import Event
from league.models.umpire_signup import UmpireSignup
from league.models.public_signup_config import PublicSignupConfig
from league.serializers.umpire_serializer import UmpireGameSerializer, UmpireSignupSerializer

# Division names that require umpires
UMPIRE_DIVISIONS = ["AAA", "Majors"]


class UmpireGameListView(APIView):
    """
    GET /api/umpire/games/
    Returns upcoming (or all, with ?all=true) GAME events for AAA and Majors
    divisions, annotated with existing umpire signups.

    Query params:
      all=true   — include past games (default: upcoming only)
    """

    def get(self, request):
        show_all = request.query_params.get("all", "").lower() == "true"

        qs = (
            Event.objects
            .select_related("team", "team__division")
            .prefetch_related("umpire_signups")
            .filter(
                event_type="GAME",
                team__division__name__in=UMPIRE_DIVISIONS,
                is_cancelled=False,
            )
            .order_by("start_time")
        )

        if not show_all:
            qs = qs.filter(start_time__gte=timezone.now())

        serializer = UmpireGameSerializer(qs, many=True)
        return Response({"success": True, "data": serializer.data})


class UmpireSignupCreateView(APIView):
    """
    POST /api/umpire/signups/

    Single signup:
      Body: { event, umpire_name, umpire_email (optional), role }

    Batch signup (multiple games at once):
      Body: {
        event_ids: [
          { event_id: 1, role: "PLATE" },
          { event_id: 2, role: "BASE" },
          ...
        ],
        umpire_name, umpire_email (optional), umpire_phone (optional)
      }
    """

    def post(self, request):
        event_ids = request.data.get("event_ids")

        if event_ids:
            # ── Batch signup ──────────────────────────────────────────────────
            if not isinstance(event_ids, list):
                return Response(
                    {"success": False, "errors": {"event_ids": ["Must be a list."]}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            umpire_name = (request.data.get("umpire_name") or "").strip()
            if not umpire_name:
                return Response(
                    {"success": False, "errors": {"umpire_name": ["Name is required."]}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            umpire_email = (request.data.get("umpire_email") or "").strip()
            umpire_phone = (request.data.get("umpire_phone") or "").strip()

            created = []
            errors = []

            for item in event_ids:
                if isinstance(item, dict):
                    eid = item.get("event_id")
                    role = item.get("role")
                else:
                    eid = item
                    role = request.data.get("role")

                if not eid or not role:
                    errors.append(f"Skipped item (missing event_id or role): {item}")
                    continue

                try:
                    event = Event.objects.get(pk=eid)
                except Event.DoesNotExist:
                    errors.append(f"Event {eid} not found.")
                    continue

                try:
                    signup = UmpireSignup.objects.create(
                        event=event,
                        umpire_name=umpire_name,
                        umpire_email=umpire_email,
                        umpire_phone=umpire_phone,
                        role=role,
                    )
                    created.append(signup)
                except Exception as e:
                    errors.append(f"Event {eid} {role}: {str(e)}")

            return Response(
                {
                    "success": True,
                    "data": UmpireSignupSerializer(created, many=True).data,
                    "count": len(created),
                    "errors": errors,
                },
                status=status.HTTP_201_CREATED,
            )

        # ── Single signup (existing behaviour) ───────────────────────────────
        serializer = UmpireSignupSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"success": True, "data": serializer.data},
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"success": False, "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )


class UmpireSignupDeleteView(APIView):
    """
    DELETE /api/umpire/signups/<pk>/
    Remove an umpire signup (unclaim a game).
    """

    def delete(self, request, pk):
        try:
            signup = UmpireSignup.objects.get(pk=pk)
        except UmpireSignup.DoesNotExist:
            return Response(
                {"success": False, "error": "Signup not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        signup.delete()
        return Response({"success": True}, status=status.HTTP_200_OK)


class UmpirePublicConfigView(APIView):
    """GET/POST /api/umpire/public-config/  — read or toggle public access."""

    def get(self, request):
        cfg, _ = PublicSignupConfig.objects.get_or_create(form_type="UMPIRE")
        return Response({"form_type": "UMPIRE", "is_enabled": cfg.is_enabled})

    def post(self, request):
        cfg, _ = PublicSignupConfig.objects.get_or_create(form_type="UMPIRE")
        cfg.is_enabled = bool(request.data.get("is_enabled", False))
        cfg.save()
        return Response({"form_type": "UMPIRE", "is_enabled": cfg.is_enabled})
