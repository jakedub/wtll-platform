from django.db import models


class VolunteerSignup(models.Model):
    ROLE_CHOICES = [
        ("GROUNDS", "Grounds Crew"),
        ("CONCESSIONS", "Concessions Stand"),
    ]

    event = models.ForeignKey(
        "league.Event",
        on_delete=models.CASCADE,
        related_name="volunteer_signups",
    )
    volunteer_name = models.CharField(max_length=150)
    volunteer_email = models.EmailField(blank=True)
    volunteer_phone = models.CharField(max_length=30, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    notes = models.CharField(max_length=255, blank=True)
    signed_up_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["event__start_time", "role", "signed_up_at"]

    def __str__(self):
        return f"{self.volunteer_name} — {self.get_role_display()} @ {self.event}"
