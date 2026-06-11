"""
Evaluation event management and public sign-up.
"""
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from league.models import Division
from league.models.evaluation_event import (
    EvaluationEvent, EvaluationTimeSlot, EvaluationRegistration,
    SPECIALTY_DIVISIONS,
)
from league.models.program import Program


# ── Serializers ───────────────────────────────────────────────────────────────

class SlotSerializer(serializers.ModelSerializer):
    display_time = serializers.ReadOnlyField()
    is_taken = serializers.SerializerMethodField()
    registrant = serializers.SerializerMethodField()

    class Meta:
        model = EvaluationTimeSlot
        fields = ["id", "slot_time", "slot_number", "display_time", "is_taken", "registrant"]

    def get_is_taken(self, obj):
        return hasattr(obj, "registration")

    def get_registrant(self, obj):
        # Admin-only: show who registered
        req = self.context.get("request")
        is_admin = self.context.get("is_admin", False)
        if is_admin and hasattr(obj, "registration"):
            r = obj.registration
            return {
                "id": r.id,
                "player_name": r.player_name,
                "parent_name": r.parent_name,
                "parent_email": r.parent_email,
                "parent_phone": r.parent_phone,
                "division": r.division.name if r.division else None,
                "specialty_position": r.specialty_position,
            }
        return None


class EvaluationEventSerializer(serializers.ModelSerializer):
    slot_count = serializers.ReadOnlyField()
    registration_count = serializers.ReadOnlyField()
    program_name = serializers.SerializerMethodField()
    interval_minutes = serializers.SerializerMethodField()
    division_ids = serializers.SerializerMethodField()
    division_names = serializers.SerializerMethodField()

    class Meta:
        model = EvaluationEvent
        fields = [
            "id", "name", "eval_date", "start_time", "location",
            "slots_per_hour", "total_hours", "notes", "is_public",
            "program", "program_name",
            "division_ids", "division_names",
            "slot_count", "registration_count", "interval_minutes",
            "created_at",
        ]
        read_only_fields = ["created_at"]

    def get_program_name(self, obj):
        return obj.program.name if obj.program else None

    def get_interval_minutes(self, obj):
        return 60 // obj.slots_per_hour

    def get_division_ids(self, obj):
        return list(obj.divisions.values_list("id", flat=True))

    def get_division_names(self, obj):
        return [d.name for d in obj.divisions.order_by("name")]


class RegistrationSerializer(serializers.ModelSerializer):
    division_name = serializers.SerializerMethodField()
    slot_display = serializers.SerializerMethodField()

    class Meta:
        model = EvaluationRegistration
        fields = [
            "id", "event", "time_slot", "slot_display",
            "division", "division_name",
            "parent_name", "parent_email", "parent_phone",
            "player_name", "specialty_position",
            "notes", "created_at",
        ]
        read_only_fields = ["created_at"]

    def get_division_name(self, obj):
        return obj.division.name if obj.division else None

    def get_slot_display(self, obj):
        return obj.time_slot.display_time if obj.time_slot else None


# ── Admin views ───────────────────────────────────────────────────────────────

class EvaluationEventListCreateView(APIView):
    def get(self, request):
        qs = EvaluationEvent.objects.select_related("program").prefetch_related("divisions").all()
        return Response(EvaluationEventSerializer(qs, many=True).data)

    def post(self, request):
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        division_ids = data.pop("division_ids", [])
        s = EvaluationEventSerializer(data=data)
        if s.is_valid():
            event = s.save()
            if division_ids:
                event.divisions.set(division_ids)
            event.generate_slots()
            return Response(EvaluationEventSerializer(event).data, status=status.HTTP_201_CREATED)
        return Response(s.errors, status=400)


class EvaluationEventDetailView(APIView):
    def get(self, request, pk):
        event = get_object_or_404(EvaluationEvent, pk=pk)
        slots = event.slots.prefetch_related("registration__division").all()
        divs = Division.objects.all().order_by("name")

        # Group slots for admin display
        slot_data = SlotSerializer(slots, many=True, context={"is_admin": True, "request": request}).data

        return Response({
            "event": EvaluationEventSerializer(event).data,
            "slots": slot_data,
            "divisions": [{"id": d.id, "name": d.name} for d in divs],
        })

    def patch(self, request, pk):
        event = get_object_or_404(EvaluationEvent, pk=pk)
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        division_ids = data.pop("division_ids", None)
        s = EvaluationEventSerializer(event, data=data, partial=True)
        if s.is_valid():
            updated = s.save()
            if division_ids is not None:
                updated.divisions.set(division_ids)
            if any(f in data for f in ["slots_per_hour", "total_hours", "start_time", "eval_date"]):
                updated.generate_slots()
            return Response(EvaluationEventSerializer(updated).data)
        return Response(s.errors, status=400)

    def delete(self, request, pk):
        get_object_or_404(EvaluationEvent, pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EvaluationEventRegenerateSlots(APIView):
    """POST /api/eval-events/<pk>/regenerate/ — rebuild time slots."""
    def post(self, request, pk):
        event = get_object_or_404(EvaluationEvent, pk=pk)
        slots = event.generate_slots()
        return Response({"created": len(slots), "message": f"{len(slots)} slots generated."})


class EvaluationEventPublicConfigView(APIView):
    """GET/POST /api/eval-events/<pk>/public/"""
    def get(self, request, pk):
        event = get_object_or_404(EvaluationEvent, pk=pk)
        return Response({"id": event.id, "is_public": event.is_public, "name": event.name})

    def post(self, request, pk):
        event = get_object_or_404(EvaluationEvent, pk=pk)
        event.is_public = bool(request.data.get("is_public", False))
        event.save(update_fields=["is_public"])
        return Response({"id": event.id, "is_public": event.is_public})


class EvaluationRegistrationsView(APIView):
    """GET /api/eval-events/<pk>/registrations/ — admin view all sign-ups."""
    def get(self, request, pk):
        event = get_object_or_404(EvaluationEvent, pk=pk)
        regs = event.registrations.select_related("division", "time_slot").order_by("time_slot__slot_number")
        return Response(RegistrationSerializer(regs, many=True).data)


# ── Public views ──────────────────────────────────────────────────────────────

class EvaluationPublicListView(APIView):
    """GET /api/eval-events/public/ — all public evaluation events with slot availability."""
    def get(self, request):
        events = EvaluationEvent.objects.filter(is_public=True).select_related("program").order_by("eval_date")
        result = []
        for event in events:
            slots = event.slots.prefetch_related("registration").order_by("slot_number")
            divs = Division.objects.filter(
                evaluationregistration__event=event
            ).distinct().union(
                Division.objects.all()
            ).order_by("name")

            # For public: slot availability per slot (no registrant name)
            slots_data = [
                {
                    "id": s.id,
                    "slot_time": s.slot_time.strftime("%H:%M"),
                    "display_time": s.display_time,
                    "slot_number": s.slot_number,
                    "is_taken": hasattr(s, "registration"),
                }
                for s in slots
            ]

            # Use event's selected divisions; fall back to all (minus exclusions)
            excluded = ["field rental"]
            if event.divisions.exists():
                div_qs = event.divisions.order_by("name")
            else:
                div_qs = Division.objects.order_by("name")
            all_divs = [
                {"id": d.id, "name": d.name,
                 "specialty_eligible": d.name.lower() in SPECIALTY_DIVISIONS}
                for d in div_qs
                if not any(ex in d.name.lower() for ex in excluded)
            ]

            result.append({
                "id": event.id,
                "name": event.name,
                "eval_date": str(event.eval_date),
                "start_time": event.start_time.strftime("%H:%M"),
                "location": event.location,
                "notes": event.notes,
                "slots": slots_data,
                "divisions": all_divs,
                "available_count": sum(1 for s in slots_data if not s["is_taken"]),
            })
        return Response(result)


class EvaluationPublicRegisterView(APIView):
    """
    POST /api/eval-events/register/
    Body: { event_id, slot_id, division_id, parent_name, parent_email, parent_phone,
            player_name, specialty_position, notes }
    """
    def post(self, request):
        event_id   = request.data.get("event_id")
        slot_id    = request.data.get("slot_id")
        division_id= request.data.get("division_id")
        parent_name= (request.data.get("parent_name") or "").strip()
        player_name= (request.data.get("player_name") or "").strip()

        if not all([event_id, slot_id, division_id, parent_name, player_name]):
            return Response({"error": "event_id, slot_id, division_id, parent_name, and player_name are required."}, status=400)

        event = get_object_or_404(EvaluationEvent, pk=event_id, is_public=True)
        slot  = get_object_or_404(EvaluationTimeSlot, pk=slot_id, event=event)

        # Check slot not already taken
        if hasattr(slot, "registration"):
            return Response({"error": "That time slot is already taken. Please choose another."}, status=409)

        division = get_object_or_404(Division, pk=division_id)
        specialty = (request.data.get("specialty_position") or "").lower().strip()

        # Only allow specialty for eligible divisions
        if specialty and division.name.lower() not in SPECIALTY_DIVISIONS:
            specialty = ""

        reg = EvaluationRegistration.objects.create(
            event=event,
            time_slot=slot,
            division=division,
            parent_name=parent_name,
            parent_email=(request.data.get("parent_email") or "").strip(),
            parent_phone=(request.data.get("parent_phone") or "").strip(),
            player_name=player_name,
            specialty_position=specialty,
            notes=(request.data.get("notes") or "").strip(),
        )

        return Response({
            "id": reg.id,
            "player_name": reg.player_name,
            "slot_time": slot.display_time,
            "division": division.name,
            "message": f"Successfully registered {player_name} for {slot.display_time}.",
        }, status=status.HTTP_201_CREATED)


class DivisionsByProgramView(APIView):
    """
    GET /api/divisions-by-program/
    Returns divisions grouped by program type for the eval event division selector.
    Example: { "Baseball": [{"id":1,"name":"Majors"}, ...], "Softball": [...] }
    """
    def get(self, request):
        from league.models.program import Program, PROGRAM_TYPES
        excluded = ["field rental"]

        # Group divisions by their associated program type
        # Divisions linked to programs
        groups: dict = {}

        for prog in Program.objects.order_by("season_year", "program_type"):
            divs = Division.objects.filter(program=prog).order_by("name")
            divs = [d for d in divs if not any(ex in d.name.lower() for ex in excluded)]
            if divs:
                label = f"{prog.program_type_label if hasattr(prog, 'program_type_label') else prog.get_program_type_display()} {prog.season_year}"
                groups[label] = [{"id": d.id, "name": d.name} for d in divs]

        # Also include any divisions not linked to any program
        unlinked = Division.objects.filter(program__isnull=True).order_by("name")
        unlinked = [d for d in unlinked if not any(ex in d.name.lower() for ex in excluded)]
        if unlinked:
            groups["Other"] = [{"id": d.id, "name": d.name} for d in unlinked]

        # If nothing grouped, just return all
        if not groups:
            all_divs = Division.objects.order_by("name")
            groups["All Divisions"] = [
                {"id": d.id, "name": d.name}
                for d in all_divs
                if not any(ex in d.name.lower() for ex in excluded)
            ]

        return Response(groups)


class EvaluationRegistrationDeleteView(APIView):
    """DELETE /api/eval-events/registrations/<pk>/ — admin cancel a registration."""
    def delete(self, request, pk):
        reg = get_object_or_404(EvaluationRegistration, pk=pk)
        reg.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
