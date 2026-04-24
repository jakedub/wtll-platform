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