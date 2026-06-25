# league/models/user.py
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    phone = models.CharField(max_length=20, blank=True, null=True)
    is_coach = models.BooleanField(default=False)
    is_umpire = models.BooleanField(default=False)
    is_board_member = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.username

    @property
    def roles(self) -> list[str]:
        """Return a list of role labels for this user."""
        r = []
        if self.is_staff:
            r.append("admin")
        if self.is_board_member:
            r.append("board")
        if self.is_coach:
            r.append("coach")
        if self.is_umpire:
            r.append("umpire")
        return r