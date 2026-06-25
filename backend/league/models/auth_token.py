"""
LoginToken — single-use magic link token for passwordless authentication.
Expires after 15 minutes; marked used on successful verification.
"""
import uuid
from django.db import models
from django.utils import timezone
from datetime import timedelta


TOKEN_TTL_MINUTES = 15  # Fallback default if SiteSettings not yet seeded


def _get_ttl_minutes() -> int:
    """Read the TTL from SiteSettings; fall back to the module constant."""
    try:
        from league.models.site_settings import SiteSettings
        s = SiteSettings.objects.filter(pk=1).values_list("magic_link_expiry_minutes", flat=True).first()
        return s if s is not None else TOKEN_TTL_MINUTES
    except Exception:
        return TOKEN_TTL_MINUTES


class LoginToken(models.Model):
    email = models.EmailField(db_index=True)
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"LoginToken({self.email}, used={self.is_used})"

    @property
    def is_expired(self) -> bool:
        return timezone.now() > self.created_at + timedelta(minutes=_get_ttl_minutes())

    @property
    def is_valid(self) -> bool:
        return not self.is_used and not self.is_expired
