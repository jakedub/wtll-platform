from django.db import models


class PublicSignupConfig(models.Model):
    """Controls whether a public-facing sign-up form is enabled."""
    FORM_CHOICES = [
        ("UMPIRE",    "Umpire Sign-Up"),
        ("VOLUNTEER", "Volunteer Sign-Up"),
    ]
    form_type = models.CharField(max_length=20, choices=FORM_CHOICES, unique=True)
    is_enabled = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.get_form_type_display()} — {'enabled' if self.is_enabled else 'disabled'}"
