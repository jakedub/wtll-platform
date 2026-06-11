"""
Softball inning log API.

Rules (LL Minors & Majors Softball):
  - Max 12 innings pitched in a calendar day.
  - 7+ innings in a day → 1 calendar day of rest mandatory.
  - 1–6 innings → no rest required.
  - No 3-consecutive-day restriction (unlike baseball).
"""
import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, serializers
from django.db.models import Sum

from league.models import Player, SoftballInningLog
from league.models.player_program_enrollment import PlayerProgramEnrollment


# ── Serializers ────────────────────────────────────────────────────────────────

class SoftballInningLogSerializer(serializers.ModelSerializer):
    player_name = serializers.SerializerMethodField()
    team_name   = serializers.SerializerMethodField()

    class Meta:
        model = SoftballInningLog
        fields = [
            "id", "player", "player_name", "player_enrollment",
            "game_date", "innings_pitched", "notes", "logged_at", "team_name",
        ]
        read_only_fields = ["id", "logged_at", "player_name", "team_name"]

    def get_player_name(self, obj):
        return obj.player.full_name if obj.player else None

    def get_team_name(self, obj):
        if obj.player_enrollment and obj.player_enrollment.team:
            return obj.player_enrollment.team.name
        return None


# ── Status engine ──────────────────────────────────────────────────────────────

def _softball_status(player: Player) -> dict:
    """
    Compute the current pitching eligibility status for a softball pitcher.
    Returns a dict with status, innings_today, next_available_date, etc.
    """
    today = datetime.date.today()

    # Innings pitched today
    today_logs = SoftballInningLog.objects.filter(player=player, game_date=today)
    innings_today = today_logs.aggregate(total=Sum("innings_pitched"))["total"] or 0

    # Most recent game date before today (for rest check)
    last_log = (
        SoftballInningLog.objects
        .filter(player=player, game_date__lt=today)
        .order_by("-game_date")
        .first()
    )

    rest_required = 0
    last_game_date = None
    innings_last_game = 0

    if last_log:
        last_game_date = last_log.game_date
        # Total innings on that day
        innings_last_game = (
            SoftballInningLog.objects
            .filter(player=player, game_date=last_game_date)
            .aggregate(total=Sum("innings_pitched"))["total"] or 0
        )
        if innings_last_game >= 7:
            rest_required = 1

    # Days since last game
    days_since_last = (today - last_game_date).days if last_game_date else 999

    # Can pitch today?
    rest_served = days_since_last > rest_required
    innings_remaining = max(0, 12 - innings_today)
    can_pitch = rest_served and innings_remaining > 0

    # Next available date
    if can_pitch:
        next_available = today.isoformat()
    else:
        if not rest_served:
            next_available = (last_game_date + datetime.timedelta(days=rest_required + 1)).isoformat()
        else:
            next_available = "Max innings reached today"

    if can_pitch:
        stat = "AVAILABLE"
    elif not rest_served:
        stat = "RESTING"
    else:
        stat = "MAX_INNINGS"

    return {
        "status": stat,
        "innings_today": innings_today,
        "innings_remaining_today": innings_remaining,
        "innings_last_game": innings_last_game,
        "last_game_date": last_game_date.isoformat() if last_game_date else None,
        "days_rest_required": rest_required,
        "days_since_last_game": days_since_last,
        "next_available_date": next_available,
    }


# ── Views ──────────────────────────────────────────────────────────────────────

class SoftballInningLogListView(APIView):
    """GET /api/softball-innings/  — all logs, optional ?player=<id>&date=<YYYY-MM-DD>"""

    def get(self, request):
        qs = SoftballInningLog.objects.select_related("player", "player_enrollment__team")
        player_id = request.query_params.get("player")
        if player_id:
            qs = qs.filter(player_id=player_id)
        date = request.query_params.get("date")
        if date:
            qs = qs.filter(game_date=date)
        return Response(SoftballInningLogSerializer(qs, many=True).data)

    def post(self, request):
        s = SoftballInningLogSerializer(data=request.data)
        if not s.is_valid():
            return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)
        innings = s.validated_data.get("innings_pitched", 0)
        if innings < 1 or innings > 12:
            return Response({"error": "innings_pitched must be 1–12."}, status=400)
        log = s.save()
        return Response(SoftballInningLogSerializer(log).data, status=status.HTTP_201_CREATED)


class SoftballInningLogDetailView(APIView):
    """DELETE /api/softball-innings/<pk>/"""

    def delete(self, request, pk):
        try:
            log = SoftballInningLog.objects.get(pk=pk)
        except SoftballInningLog.DoesNotExist:
            return Response({"error": "Not found."}, status=404)
        log.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SoftballPitchStatusView(APIView):
    """GET /api/softball-innings/status/<player_id>/"""

    def get(self, request, player_id):
        try:
            player = Player.objects.get(pk=player_id)
        except Player.DoesNotExist:
            return Response({"error": "Player not found."}, status=404)
        return Response(_softball_status(player))


class SoftballPitchSummaryView(APIView):
    """GET /api/softball-innings/summary/ — today's status for all active softball pitchers"""

    def get(self, request):
        players = Player.objects.filter(
            sport="softball",
            is_pitcher=True,
            is_active=True,
            is_archived=False,
        )
        result = []
        for p in players:
            s = _softball_status(p)
            result.append({
                "player_id": p.id,
                "player_name": p.full_name,
                **s,
            })
        result.sort(key=lambda x: x["status"])
        return Response(result)
