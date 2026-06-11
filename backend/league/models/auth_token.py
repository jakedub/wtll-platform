"""
LoginToken — single-use magic link token for passwordless authentication.
Expires after 15 minutes; marked used on successful verification.
"""
import uuid
from django.db import models
from django.utils import timezone
from datetime import timedelta


TOKEN_TTL_MINUTES = 15


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
        return timezone.now() > self.created_at + timedelta(minutes=TOKEN_TTL_MINUTES)

    @property
    def is_valid(self) -> bool:
        return not self.is_used and not self.is_expired
