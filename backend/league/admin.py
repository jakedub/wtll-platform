from django import forms
from django.contrib import admin
from django.utils.html import format_html

from league.models import Division
from league.models import Team
from league.models import Player
from league.models import PitchCount
from league.models import PlayerProgramEnrollment
from league.models import User
from league.models import TeamAssignment
from league.models import Program
from league.models import Event
from league.models import TeamCalendar
from league.models import Position
from league.models import Evaluation
from league.models import Draft
from league.models import DraftSelection
from league.models import UmpireSignup
from league.models.volunteer_signup import VolunteerSignup
from league.models.allstar_selection import AllStarSelection
from league.models.budget import BudgetLine, BudgetApproval
from league.models.document import UploadedDocument
from league.models.public_signup_config import PublicSignupConfig
from league.models.evaluation_signup import EvaluationSignup, EvaluationSignupWindow
from django.contrib.auth.admin import UserAdmin


# ─── Custom form ──────────────────────────────────────────────────────────────

class PitchCountAdminForm(forms.ModelForm):
    """
    PitchCount admin form with a dynamic enrollment dropdown.

    The player_enrollment field starts empty (or pre-populated on edit).
    When the user selects a player, the JS in pitch_count_enrollment.js
    fires a fetch to /api/players/<id>/enrollments/ and repopulates
    the enrollment options without a page reload.
    """

    player_enrollment = forms.ModelChoiceField(
        queryset=PlayerProgramEnrollment.objects.select_related(
            "program", "division", "team"
        ),
        required=False,
        label="Enrollment (Division > Team)",
        help_text="Select a player first — this list will update automatically.",
        widget=forms.Select(attrs={"id": "id_player_enrollment"}),
    )

    class Meta:
        model = PitchCount
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Full queryset required for validation — Django checks the submitted
        # enrollment ID against this on save. The JS handles filtering what
        # the user sees in the dropdown.
        self.fields["player_enrollment"].queryset = (
            PlayerProgramEnrollment.objects
            .select_related("program", "division", "team")
            .order_by("division__name", "team__name")
        )

    def label_from_enrollment(self, enrollment):
        division = enrollment.division.name if enrollment.division else "No Division"
        team = enrollment.team.name if enrollment.team else "No Team"
        program = enrollment.program.name if enrollment.program else ""
        return f"{division} > {team}" + (f" ({program})" if program else "")


# ─── Admin registrations ──────────────────────────────────────────────────────
@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ["team", "event_type", "start_time", "end_time","description", "opponent", "field"]
    list_filter = ["start_time", "end_time", "location", "team", "field"]
    search_fields = ["location", "team"]

@admin.register(TeamCalendar)
class TeamCalendarAdmin(admin.ModelAdmin):
    list_display = ["team", "source", "is_active"]
@admin.register(Division)
class DivisionAdmin(admin.ModelAdmin):
    list_display = ["name", "program"]
    search_fields = ["name"]
@admin.register(TeamAssignment)
class TeamAssignmentAdmin(admin.ModelAdmin):
    list_display = ("user", "team", "role", "season_year")
    list_filter = ("role", "season_year", "team")
@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("Additional Info", {"fields": ("phone",)}),
    )
@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ["name", "division", "coach", "year", "is_active"]
    list_filter = ["division", "year", "is_active"]
    search_fields = ["name", "coach"]
@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ["name", "is_active"]

@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ["last_name", "first_name", "is_eligible", "is_allstar"]
    list_filter = ["is_eligible", "is_allstar", "is_showcase"]
    search_fields = ["first_name", "last_name"]


@admin.register(PlayerProgramEnrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ["player", "program", "division", "team"]
    list_filter = ["division", "team", "program"]
    search_fields = ["player__first_name", "player__last_name"]
    autocomplete_fields = ["player"]

@admin.register(PitchCount)
class PitchCountAdmin(admin.ModelAdmin):
    form = PitchCountAdminForm

    list_display = ["player_label", "game_date", "pitches_thrown", "days_rest_required"]
    list_filter = ["game_date"]
    search_fields = ["player__first_name", "player__last_name"]
    date_hierarchy = "game_date"

    class Media:
        js = ("js/pitch_count_enrollment.js",)

    @admin.display(description="Player")
    def player_label(self, obj):
        enrollment = obj.player.enrollments.select_related(
            "division", "team"
        ).first()
        if enrollment:
            division = enrollment.division.name if enrollment.division else "No Division"
            team = enrollment.team.name if enrollment.team else "No Team"
            return format_html(
                "<strong>{}</strong> <span style='color:#666'>({} &rsaquo; {})</span>",
                obj.player.last_name + ", " + obj.player.first_name,
                division,
                team,
            )
        return f"{obj.player.last_name}, {obj.player.first_name}"


# ── New models ────────────────────────────────────────────────────────────────

@admin.register(Position)
class PositionAdmin(admin.ModelAdmin):
    list_display = ["code"]


@admin.register(Evaluation)
class EvaluationAdmin(admin.ModelAdmin):
    list_display = ["player", "season_year", "evaluation_type", "overall_total_display", "tier_spot_display"]
    list_filter = ["season_year", "evaluation_type"]
    search_fields = ["player__first_name", "player__last_name"]
    autocomplete_fields = ["player"]

    @admin.display(description="Overall")
    def overall_total_display(self, obj):
        return obj.overall_total

    @admin.display(description="Tier")
    def tier_spot_display(self, obj):
        return obj.tier_spot


@admin.register(Draft)
class DraftAdmin(admin.ModelAdmin):
    list_display = ["name", "year", "division", "is_complete", "created_at"]
    list_filter = ["year", "division", "is_complete"]
    search_fields = ["name"]
    filter_horizontal = ["selected_teams"]


@admin.register(DraftSelection)
class DraftSelectionAdmin(admin.ModelAdmin):
    list_display = ["player", "team", "division", "draft", "selected_at"]
    list_filter = ["draft", "division", "team"]
    search_fields = ["player__first_name", "player__last_name", "team__name"]
    autocomplete_fields = ["player"]


@admin.register(UmpireSignup)
class UmpireSignupAdmin(admin.ModelAdmin):
    list_display = ["umpire_name", "umpire_email", "umpire_phone", "role", "event", "signed_up_at"]
    list_filter = ["role"]
    search_fields = ["umpire_name", "umpire_email", "umpire_phone"]
    date_hierarchy = "signed_up_at"


@admin.register(VolunteerSignup)
class VolunteerSignupAdmin(admin.ModelAdmin):
    list_display = ["volunteer_name", "volunteer_email", "volunteer_phone", "role", "event", "notes", "signed_up_at"]
    list_filter = ["role"]
    search_fields = ["volunteer_name", "volunteer_email", "volunteer_phone"]
    date_hierarchy = "signed_up_at"


@admin.register(AllStarSelection)
class AllStarSelectionAdmin(admin.ModelAdmin):
    list_display = ["player", "division", "season_year", "is_returning", "paperwork_complete"]
    list_filter = ["season_year", "division", "is_returning"]
    search_fields = ["player__first_name", "player__last_name"]
    readonly_fields = ["paperwork_complete", "docs_complete", "docs_required"]


@admin.register(BudgetLine)
class BudgetLineAdmin(admin.ModelAdmin):
    list_display = ["year", "category", "item", "sub_group", "is_revenue", "actual", "effective_estimate", "owner_role"]
    list_filter = ["year", "category", "is_revenue"]
    search_fields = ["item", "owner_role"]


@admin.register(BudgetApproval)
class BudgetApprovalAdmin(admin.ModelAdmin):
    list_display = ["year", "approved_by", "approved_at"]


@admin.register(UploadedDocument)
class UploadedDocumentAdmin(admin.ModelAdmin):
    list_display = ["display_name", "folder_name", "extension", "file_size", "uploaded_at"]
    list_filter = ["folder_name"]
    search_fields = ["display_name", "folder_name"]


@admin.register(PublicSignupConfig)
class PublicSignupConfigAdmin(admin.ModelAdmin):
    list_display = ["form_type", "is_enabled", "updated_at"]


@admin.register(EvaluationSignup)
class EvaluationSignupAdmin(admin.ModelAdmin):
    list_display = ["player_last_name", "player_first_name", "division", "season_year", "parent_email", "signed_up_at"]
    list_filter = ["season_year", "division"]
    search_fields = ["player_first_name", "player_last_name", "parent_email"]


@admin.register(EvaluationSignupWindow)
class EvaluationSignupWindowAdmin(admin.ModelAdmin):
    list_display = ["season_year", "division", "eval_date", "eval_time", "eval_location", "is_open"]
    list_filter = ["season_year", "is_open"]