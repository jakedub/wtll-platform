"""
Site Settings + League Identity API views.

GET  /api/settings/site/             — read SiteSettings (admin only)
PATCH /api/settings/site/            — update SiteSettings (admin only)
GET  /api/settings/league-identity/  — read LeagueIdentity (admin only)
PATCH /api/settings/league-identity/ — update LeagueIdentity (admin only)
GET  /api/settings/public/           — public read of LeagueIdentity (no auth)
"""
from typing import Optional
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated, AllowAny


def _require_admin(request) -> Optional[Response]:
    if not request.user or not request.user.is_staff:
        return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
    return None


def _serialize_site_settings(s) -> dict:
    return {
        "umpire_signups_enabled":     s.umpire_signups_enabled,
        "volunteer_signups_enabled":  s.volunteer_signups_enabled,
        "evaluation_signups_enabled": s.evaluation_signups_enabled,
        "magic_link_expiry_minutes":  s.magic_link_expiry_minutes,
        "default_program_id":         s.default_program_id,
        "default_program_name":       s.default_program.name if s.default_program else None,
        # Module toggles
        "module_preseason_enabled":   s.module_preseason_enabled,
        "module_finance_enabled":     s.module_finance_enabled,
        "module_baseball_enabled":    s.module_baseball_enabled,
        "module_softball_enabled":    s.module_softball_enabled,
        "module_schedule_enabled":    s.module_schedule_enabled,
        "module_involvement_enabled": s.module_involvement_enabled,
    }


def _serialize_league_identity(li) -> dict:
    return {
        "league_name":      li.league_name,
        "short_name":       li.short_name,
        "tagline":          li.tagline,
        "city":             li.city,
        "state":            li.state,
        "little_league_id": getattr(li, "little_league_id", ""),
        "contact_email":    li.contact_email,
        "website_url":      li.website_url,
        "primary_color":    li.primary_color,
        "secondary_color":  li.secondary_color,
    }


class SiteSettingsView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        err = _require_admin(request)
        if err:
            return err
        from league.models.site_settings import SiteSettings
        return Response(_serialize_site_settings(SiteSettings.get()))

    def patch(self, request):
        err = _require_admin(request)
        if err:
            return err
        from league.models.site_settings import SiteSettings
        from league.models.public_signup_config import PublicSignupConfig

        s = SiteSettings.get()

        allowed = {
            "umpire_signups_enabled", "volunteer_signups_enabled",
            "evaluation_signups_enabled",
            "magic_link_expiry_minutes", "default_program_id",
            # Module toggles
            "module_preseason_enabled",
            "module_finance_enabled", "module_baseball_enabled",
            "module_softball_enabled", "module_schedule_enabled",
            "module_involvement_enabled",
        }
        for field, value in request.data.items():
            if field in allowed:
                setattr(s, field, value)
        s.save()

        # Keep the legacy PublicSignupConfig rows in sync so existing
        # public-page config endpoints still work correctly.
        if "umpire_signups_enabled" in request.data:
            cfg, _ = PublicSignupConfig.objects.get_or_create(form_type="UMPIRE")
            cfg.is_enabled = s.umpire_signups_enabled
            cfg.save(update_fields=["is_enabled"])

        if "volunteer_signups_enabled" in request.data:
            cfg, _ = PublicSignupConfig.objects.get_or_create(form_type="VOLUNTEER")
            cfg.is_enabled = s.volunteer_signups_enabled
            cfg.save(update_fields=["is_enabled"])

        return Response(_serialize_site_settings(s))


class LeagueIdentityView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        err = _require_admin(request)
        if err:
            return err
        from league.models.site_settings import LeagueIdentity
        return Response(_serialize_league_identity(LeagueIdentity.get()))

    def patch(self, request):
        err = _require_admin(request)
        if err:
            return err
        from league.models.site_settings import LeagueIdentity

        li = LeagueIdentity.get()
        allowed = {
            "league_name", "short_name", "tagline",
            "city", "state", "little_league_id",
            "contact_email", "website_url",
            "primary_color", "secondary_color",
        }
        for field, value in request.data.items():
            if field in allowed:
                setattr(li, field, value)
        li.save()
        return Response(_serialize_league_identity(li))


class PublicLeagueIdentityView(APIView):
    """
    GET /api/settings/public/
    Returns the league identity for public-facing pages (no auth required).
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        from league.models.site_settings import LeagueIdentity, SiteSettings
        li = LeagueIdentity.get()
        ss = SiteSettings.get()
        data = _serialize_league_identity(li)
        # Include module flags so the frontend can gate nav sections without auth
        data.update({
            "module_preseason_enabled":   ss.module_preseason_enabled,
            "module_finance_enabled":     ss.module_finance_enabled,
            "module_baseball_enabled":    ss.module_baseball_enabled,
            "module_softball_enabled":    ss.module_softball_enabled,
            "module_schedule_enabled":    ss.module_schedule_enabled,
            "module_involvement_enabled": ss.module_involvement_enabled,
            # Public signup form live/disabled status
            "umpire_signups_enabled":     ss.umpire_signups_enabled,
            "volunteer_signups_enabled":  ss.volunteer_signups_enabled,
            "evaluation_signups_enabled": ss.evaluation_signups_enabled,
        })
        return Response(data)
