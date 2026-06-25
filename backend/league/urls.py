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
    PlayerArchiveView,
    PlayerRestoreView,
    PlayerPermanentDeleteView,
)
from league.views.pitch_count import PitchCountView
from league.views.board_members import BoardMemberListView, BoardMemberDetailView, BoardRolesView
from league.views.dashboard_stats import DashboardStatsView
from league.views.softball_innings import (
    SoftballInningLogListView, SoftballInningLogDetailView,
    SoftballPitchStatusView, SoftballPitchSummaryView,
)
from league.views.player_pitch_summary import PlayerPitchSummaryView
from league.views.my_teams import MyTeamsView
from league.views.player_uploads import UploadPlayersView
from league.views.volunteer import VolunteerGameListView, VolunteerSignupCreateView, VolunteerSignupDeleteView, VolunteerPublicConfigView, ConcessionsCloseView
from league.views.umpire import UmpireGameListView, UmpireSignupCreateView, UmpireSignupDeleteView, UmpirePublicConfigView
from league.views.allstars import AllStarListCreateView, AllStarDetailView, AllStarSummaryView
from league.views.allstar_forms import AllStarTVFView, AllStarEnrollmentFormView, AllStarSoftballEnrollmentFormView
from league.views.eligibility_recheck import EligibilityRecheckView
from league.views.program_year import ProgramYearListView, StartProgramYearView, ProgramYearAvailableTypesView, ProgramCloseView
from league.views.evaluation_event import (
    EvaluationEventListCreateView, EvaluationEventDetailView,
    EvaluationEventRegenerateSlots, EvaluationEventPublicConfigView,
    EvaluationRegistrationsView, EvaluationPublicListView,
    EvaluationPublicRegisterView, EvaluationRegistrationDeleteView,
    DivisionsByProgramView,
)
from league.views.team_crud import TeamCreateView, TeamUpdateDeleteView
from league.views.team_calendar_manage import TeamCalendarListCreateView, TeamCalendarDetailView
from league.views.team_manage import (
    TeamManageListView, TeamManageDetailView,
    TeamPlayerAssignView, TeamPlayerRemoveView, FreeAgentsView,
)
from league.views.calendar_sync import CalendarSyncView
from league.views.documents import DocumentListView, DocumentUploadView, DocumentDetailView
from league.views.eval_signup import (
    EvalWindowListCreateView, EvalWindowDetailView,
    EvalSignupListCreateView, EvalSignupDeleteView,
)
from league.views.budget import (
    BudgetLineListCreateView, BudgetLineDetailView, BudgetLineReorderView,
    BudgetSummaryView, BudgetApprovalView, BudgetExportView,
    BudgetYearsView, BudgetCopyYearView,
)
from league.views.draft import (
    DraftListCreateView,
    DraftDetailView,
    DraftStateView,
    AvailablePlayersView,
    DraftPlayerView,
    SaveDraftTeamsView,
    DraftTeamStatsView,
    MarkDraftCompleteView,
    DraftExportView,
)
from league.views.evaluations import (
    EvaluationListCreateView,
    EvaluationDetailView,
    EvaluationImportView,
    EvaluationExportView,
)
from league.views.geocode import GeocodeView, GeocodeMissingPlayersView
from league.views.public_pitch_count import PublicPitchCountView
from league.views.district import (
    CheckPlayersInDistrictView,
    CheckPlayerEligibilityView,
    DistrictPolygonsView,
    ServeKMLFileView,
    CheckCsvDistrictView,
    BoundaryLeagueListView,
    BoundaryLeagueDetailView,
    RegenerateKMLView,
)
from league.views.district_leadership import (
    DistrictLeaderListView,
    DistrictLeaderDetailView,
    DistrictLeaderPositionsView,
)
from league.views.vendors import (
    VendorListView,
    VendorDetailView,
    VendorCategoriesView,
    VendorBoardRolesView,
)
from league.views.sibling_check import SiblingCheckView
from league.views.auth import (
    RequestLoginView, VerifyTokenView, MeView, LogoutView,
    UserListView, UserInviteView, UserDetailView,
)
from league.views.schedule_generator import ScheduleGenerateView, ScheduleExportView
from league.views.site_settings import SiteSettingsView, LeagueIdentityView, PublicLeagueIdentityView
from league.views.fundraising import (
    LineItemListCreateView, LineItemDetailView,
    CampaignListCreateView, CampaignDetailView,
    DepositListCreateView, DepositDetailView,
    FundraisingSummaryView,
)
from league.views.locations import (
    LeagueLocationListCreateView, LeagueLocationDetailView,
    LocationFieldListCreateView, LocationFieldDetailView,
)



# ─── Router (ViewSets) ────────────────────────────────────────────────────────

router = DefaultRouter()
router.register(r"teams", TeamViewSet, basename="team")

# ─── URL Patterns ─────────────────────────────────────────────────────────────

urlpatterns = [
    path("", include(router.urls)),

    # Divisions
    path("divisions/", DivisionListView.as_view(), name="division-list"),

    # Players
    path("players/import/", UploadPlayersView.as_view(), name="player-import"),
    path("players/sibling-check/", SiblingCheckView.as_view(), name="player-sibling-check"),
    path("players/", PlayerListView.as_view(), name="player-list"),
    path("players/<int:player_id>/", PlayerDetailView.as_view(), name="player-detail"),
    path("players/<int:player_id>/enrollments/", PlayerEnrollmentsView.as_view(), name="player-enrollments"),
    path("players/<int:player_id>/pitch-status/", PlayerPitchStatusView.as_view(), name="player-pitch-status"),
    path("players/<int:player_id>/pitch-history/", PlayerPitchHistoryView.as_view(), name="player-pitch-history"),
    path("players/pitch-summary/", PlayerPitchSummaryView.as_view()),
    path("players/<int:player_id>/archive/", PlayerArchiveView.as_view(), name="player-archive"),
    path("players/<int:player_id>/restore/", PlayerRestoreView.as_view(), name="player-restore"),
    path("players/<int:player_id>/delete/", PlayerPermanentDeleteView.as_view(), name="player-delete"),
    path("teams/<int:team_id>/roster/", TeamRostersView.as_view(), name="team-rosters"),
    path("teams/<int:team_id>/roster-with-pitch-summary/",TeamRosterWithPitchSummaryView.as_view(),name="team-roster-summary"),
    path("my-teams/", MyTeamsView.as_view(), name="my-teams"),
    # Dashboard stats
    path("dashboard/stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
    # Board members
    path("board-members/",           BoardMemberListView.as_view(),   name="board-member-list"),
    path("board-members/roles/",     BoardRolesView.as_view(),        name="board-member-roles"),
    path("board-members/<int:pk>/",  BoardMemberDetailView.as_view(), name="board-member-detail"),
    # Pitch counts (baseball)
    path("pitch-count/", PitchCountView.as_view(), name="pitch-count-create"),
    path("pitch-count/public-summary/", PublicPitchCountView.as_view(), name="pitch-count-public-summary"),
    # Softball inning log
    path("softball-innings/",                          SoftballInningLogListView.as_view(),   name="softball-inning-list"),
    path("softball-innings/<int:pk>/",                 SoftballInningLogDetailView.as_view(), name="softball-inning-detail"),
    path("softball-innings/status/<int:player_id>/",   SoftballPitchStatusView.as_view(),     name="softball-pitch-status"),
    path("softball-innings/summary/",                  SoftballPitchSummaryView.as_view(),    name="softball-pitch-summary"),

    # Evaluation sign-ups
    path("eval-signups/windows/", EvalWindowListCreateView.as_view(), name="eval-window-list"),
    path("eval-signups/windows/<int:pk>/", EvalWindowDetailView.as_view(), name="eval-window-detail"),
    path("eval-signups/", EvalSignupListCreateView.as_view(), name="eval-signup-list"),
    path("eval-signups/<int:pk>/", EvalSignupDeleteView.as_view(), name="eval-signup-delete"),

    # Documents
    path("documents/", DocumentListView.as_view(), name="document-list"),
    path("documents/upload/", DocumentUploadView.as_view(), name="document-upload"),
    path("documents/<int:pk>/", DocumentDetailView.as_view(), name="document-detail"),

    # Evaluation events (admin + public sign-up)
    path("divisions-by-program/",           DivisionsByProgramView.as_view(),         name="divisions-by-program"),
    path("eval-events/public/",             EvaluationPublicListView.as_view(),       name="eval-event-public-list"),
    path("eval-events/register/",           EvaluationPublicRegisterView.as_view(),   name="eval-event-register"),
    path("eval-events/registrations/<int:pk>/", EvaluationRegistrationDeleteView.as_view(), name="eval-reg-delete"),
    path("eval-events/",                    EvaluationEventListCreateView.as_view(),  name="eval-event-list"),
    path("eval-events/<int:pk>/",           EvaluationEventDetailView.as_view(),      name="eval-event-detail"),
    path("eval-events/<int:pk>/regenerate/",EvaluationEventRegenerateSlots.as_view(), name="eval-event-regen"),
    path("eval-events/<int:pk>/public/",    EvaluationEventPublicConfigView.as_view(),name="eval-event-public"),
    path("eval-events/<int:pk>/registrations/", EvaluationRegistrationsView.as_view(),name="eval-event-regs"),

    # Program year management
    path("program-years/",        ProgramYearListView.as_view(),          name="program-year-list"),
    path("program-years/start/",  StartProgramYearView.as_view(),         name="program-year-start"),
    path("program-years/types/",  ProgramYearAvailableTypesView.as_view(),name="program-year-types"),
    path("program-years/<int:pk>/close/",  ProgramCloseView.as_view(), {"action": "close"},  name="program-close"),
    path("program-years/<int:pk>/reopen/", ProgramCloseView.as_view(), {"action": "reopen"}, name="program-reopen"),

    # Team Calendar subscriptions (ICS URL management)
    path("team-calendars-manage/", TeamCalendarListCreateView.as_view(), name="team-calendar-list"),
    path("team-calendars-manage/<int:pk>/", TeamCalendarDetailView.as_view(), name="team-calendar-detail"),

    # Team CRUD (create/edit/delete from app UI)
    path("teams-manage/", TeamCreateView.as_view(), name="team-create"),
    path("teams-manage/<int:pk>/", TeamUpdateDeleteView.as_view(), name="team-update-delete"),

    # Team management (coaches, roster)
    path("team-manage/", TeamManageListView.as_view(), name="team-manage-list"),
    path("team-manage/free-agents/", FreeAgentsView.as_view(), name="team-free-agents"),
    path("team-manage/<int:pk>/", TeamManageDetailView.as_view(), name="team-manage-detail"),
    path("team-manage/<int:pk>/assign/", TeamPlayerAssignView.as_view(), name="team-assign-player"),
    path("team-manage/<int:pk>/players/<int:player_id>/", TeamPlayerRemoveView.as_view(), name="team-remove-player"),

    # Calendar sync
    path("calendars/sync/", CalendarSyncView.as_view(), name="calendar-sync"),

    # Eligibility re-check
    path("eligibility/recheck/", EligibilityRecheckView.as_view(), name="eligibility-recheck"),

    # Budget
path("budget/lines/", BudgetLineListCreateView.as_view(), name="budget-line-list"),
    path("budget/lines/reorder/", BudgetLineReorderView.as_view(), name="budget-line-reorder"),
    path("budget/lines/<int:pk>/", BudgetLineDetailView.as_view(), name="budget-line-detail"),
    path("budget/summary/", BudgetSummaryView.as_view(), name="budget-summary"),
    path("budget/approve/", BudgetApprovalView.as_view(), name="budget-approve"),
    path("budget/approve/<int:year>/", BudgetApprovalView.as_view(), name="budget-approve-delete"),
    path("budget/export/", BudgetExportView.as_view(), name="budget-export"),
    path("budget/years/", BudgetYearsView.as_view(), name="budget-years"),
    path("budget/copy-year/", BudgetCopyYearView.as_view(), name="budget-copy-year"),

    # All Stars
    path("allstars/summary/", AllStarSummaryView.as_view(), name="allstar-summary"),
    path("allstars/", AllStarListCreateView.as_view(), name="allstar-list"),
    path("allstars/<int:pk>/", AllStarDetailView.as_view(), name="allstar-detail"),
    path("allstars/<int:pk>/forms/tvf/", AllStarTVFView.as_view(), name="allstar-tvf"),
    path("allstars/<int:pk>/forms/enrollment/", AllStarEnrollmentFormView.as_view(), name="allstar-enrollment"),
    path("allstars/<int:pk>/forms/enrollment-softball/", AllStarSoftballEnrollmentFormView.as_view(), name="allstar-enrollment-softball"),

    # Volunteer sign-ups
    path("volunteers/games/", VolunteerGameListView.as_view(), name="volunteer-game-list"),
    path("volunteers/games/<int:event_id>/concessions-closed/", ConcessionsCloseView.as_view(), name="volunteer-concessions-close"),
    path("volunteers/signups/", VolunteerSignupCreateView.as_view(), name="volunteer-signup-create"),
    path("volunteers/signups/<int:pk>/", VolunteerSignupDeleteView.as_view(), name="volunteer-signup-delete"),
    path("volunteers/public-config/", VolunteerPublicConfigView.as_view(), name="volunteer-public-config"),

    # Umpire sign-ups
    path("umpire/games/", UmpireGameListView.as_view(), name="umpire-game-list"),
    path("umpire/signups/", UmpireSignupCreateView.as_view(), name="umpire-signup-create"),
    path("umpire/signups/<int:pk>/", UmpireSignupDeleteView.as_view(), name="umpire-signup-delete"),
    path("umpire/public-config/", UmpirePublicConfigView.as_view(), name="umpire-public-config"),

    # Drafts
    path("drafts/", DraftListCreateView.as_view(), name="draft-list"),
    path("drafts/<int:pk>/", DraftDetailView.as_view(), name="draft-detail"),
    path("drafts/<int:pk>/state/", DraftStateView.as_view(), name="draft-state"),
    path("drafts/<int:pk>/available-players/", AvailablePlayersView.as_view(), name="draft-available"),
    path("drafts/<int:pk>/pick/", DraftPlayerView.as_view(), name="draft-pick"),
    path("drafts/<int:pk>/teams/", SaveDraftTeamsView.as_view(), name="draft-teams"),
    path("drafts/<int:pk>/team-stats/", DraftTeamStatsView.as_view(), name="draft-team-stats"),
    path("drafts/<int:pk>/complete/", MarkDraftCompleteView.as_view(), name="draft-complete"),
    path("drafts/<int:pk>/export/", DraftExportView.as_view(), name="draft-export"),

    # Evaluations
    path("evaluations/import/", EvaluationImportView.as_view(), name="evaluation-import"),
    path("evaluations/export/", EvaluationExportView.as_view(), name="evaluation-export"),
    path("evaluations/", EvaluationListCreateView.as_view(), name="evaluation-list"),
    path("evaluations/<int:pk>/", EvaluationDetailView.as_view(), name="evaluation-detail"),

    # Geocoding
    path("geocode/", GeocodeView.as_view(), name="geocode"),
    path("geocode/batch/", GeocodeMissingPlayersView.as_view(), name="geocode-batch"),

    # Vendors
    path("vendors/",                  VendorListView.as_view(),       name="vendor-list"),
    path("vendors/categories/",       VendorCategoriesView.as_view(), name="vendor-categories"),
    path("vendors/board-roles/",      VendorBoardRolesView.as_view(), name="vendor-board-roles"),
    path("vendors/<int:pk>/",         VendorDetailView.as_view(),     name="vendor-detail"),

    # District Leadership
    path("district-leaders/",               DistrictLeaderListView.as_view(),      name="district-leader-list"),
    path("district-leaders/positions/",     DistrictLeaderPositionsView.as_view(), name="district-leader-positions"),
    path("district-leaders/<int:pk>/",      DistrictLeaderDetailView.as_view(),    name="district-leader-detail"),

    # Authentication (magic link / passwordless)
    path("auth/request-login/", RequestLoginView.as_view(),  name="auth-request-login"),
    path("auth/verify/",         VerifyTokenView.as_view(),   name="auth-verify"),
    path("auth/me/",             MeView.as_view(),            name="auth-me"),
    path("auth/logout/",         LogoutView.as_view(),        name="auth-logout"),
    # User management (admin only)
    path("auth/users/",          UserListView.as_view(),      name="auth-user-list"),
    path("auth/users/invite/",   UserInviteView.as_view(),    name="auth-user-invite"),
    path("auth/users/<int:pk>/", UserDetailView.as_view(),    name="auth-user-detail"),

    # District / Eligibility
    path("district/check/", CheckPlayersInDistrictView.as_view(), name="district-check"),
    path("district/eligibility/", CheckPlayerEligibilityView.as_view(), name="district-eligibility"),
    path("district/polygons/", DistrictPolygonsView.as_view(), name="district-polygons"),
    path("district/kml/", ServeKMLFileView.as_view(), name="district-kml"),
    path("district/kml/regenerate/", RegenerateKMLView.as_view(), name="district-kml-regenerate"),
    path("district/check-csv/", CheckCsvDistrictView.as_view(), name="district-check-csv"),
    # Boundary league management
    path("district/leagues/", BoundaryLeagueListView.as_view(), name="boundary-league-list"),
    path("district/leagues/<int:pk>/", BoundaryLeagueDetailView.as_view(), name="boundary-league-detail"),

    # Schedule Generator
    path("schedules/generate/", ScheduleGenerateView.as_view(), name="schedule-generate"),
    path("schedules/export/",   ScheduleExportView.as_view(),   name="schedule-export"),

    # Site Settings + League Identity
    path("settings/site/",            SiteSettingsView.as_view(),        name="site-settings"),
    path("settings/league-identity/", LeagueIdentityView.as_view(),      name="league-identity"),
    path("settings/public/",          PublicLeagueIdentityView.as_view(), name="league-identity-public"),

    # League Locations
    path("locations/",                                          LeagueLocationListCreateView.as_view(), name="location-list"),
    path("locations/<int:pk>/",                                 LeagueLocationDetailView.as_view(),     name="location-detail"),
    path("locations/<int:location_pk>/fields/",                 LocationFieldListCreateView.as_view(),  name="location-field-list"),
    path("locations/<int:location_pk>/fields/<int:field_pk>/",  LocationFieldDetailView.as_view(),      name="location-field-detail"),

    # Fundraising
    path("fundraising/summary/",                              FundraisingSummaryView.as_view(),     name="fundraising-summary"),
    path("fundraising/line-items/",                           LineItemListCreateView.as_view(),     name="fundraising-line-items"),
    path("fundraising/line-items/<int:pk>/",                  LineItemDetailView.as_view(),         name="fundraising-line-item-detail"),
    path("fundraising/campaigns/",                            CampaignListCreateView.as_view(),     name="fundraising-campaigns"),
    path("fundraising/campaigns/<int:pk>/",                   CampaignDetailView.as_view(),         name="fundraising-campaign-detail"),
    path("fundraising/campaigns/<int:campaign_pk>/deposits/", DepositListCreateView.as_view(),      name="fundraising-deposits"),
    path("fundraising/deposits/<int:pk>/",                    DepositDetailView.as_view(),          name="fundraising-deposit-detail"),
]