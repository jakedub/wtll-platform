from django.urls import path, include
from rest_framework.routers import DefaultRouter

from league.views.teams import TeamRosterWithPitchSummaryView, TeamRostersView, TeamViewSet
from league.views.divisions import DivisionListView
from league.views.players import (
    PlayerListView,
    PlayerDetailView,
    PlayerEnrollmentsView,
    PlayerPitchStatusView,
    PlayerPitchHistoryView,
)
from league.views.pitch_count import PitchCountView
from league.views.player_pitch_summary import PlayerPitchSummaryView
from league.views.my_teams import MyTeamsView



# ─── Router (ViewSets) ────────────────────────────────────────────────────────

router = DefaultRouter()
router.register(r"teams", TeamViewSet, basename="team")

# ─── URL Patterns ─────────────────────────────────────────────────────────────

urlpatterns = [
    path("", include(router.urls)),

    # Divisions
    path("divisions/", DivisionListView.as_view(), name="division-list"),

    # Players
    path("players/", PlayerListView.as_view(), name="player-list"),
    path("players/<int:player_id>/", PlayerDetailView.as_view(), name="player-detail"),
    path("players/<int:player_id>/enrollments/", PlayerEnrollmentsView.as_view(), name="player-enrollments"),
    path("players/<int:player_id>/pitch-status/", PlayerPitchStatusView.as_view(), name="player-pitch-status"),
    path("players/<int:player_id>/pitch-history/", PlayerPitchHistoryView.as_view(), name="player-pitch-history"),
    path("players/pitch-summary/", PlayerPitchSummaryView.as_view()),
    path("teams/<int:team_id>/roster/", TeamRostersView.as_view(), name="team-rosters"),
    path("teams/<int:team_id>/roster-with-pitch-summary/",TeamRosterWithPitchSummaryView.as_view(),name="team-roster-summary"),
    path("my-teams/", MyTeamsView.as_view(), name="my-teams"),
    # Pitch counts
    path("pitch-count/", PitchCountView.as_view(), name="pitch-count-create"),
]