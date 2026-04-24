from django.db import models
from league.models.divisions import Division
from league.models.teams import Team

class Player(models.Model):
    """
    A registered player. Intentionally flat at the MVP stage.

    Future expansion points:
    - address fields for district/eligibility validation
    - linked evaluations (OneToMany via Evaluation model)
    - draft picks (OneToMany via DraftPick model)
    """

    HAND_CHOICES = [
        ("R", "Right"),
        ("L", "Left"),
        ("S", "Switch"),
    ]

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField(null=True, blank=True)


    batting_hand = models.CharField(max_length=1, choices=HAND_CHOICES, blank=True, null=True)
    throwing_hand = models.CharField(max_length=1, choices=HAND_CHOICES, blank=True, null=True)

    is_eligible = models.BooleanField(default=True)
    is_allstar = models.BooleanField(default=False)
    is_showcase = models.BooleanField(default=False)

    # Geographic data — reserved for future address/district validation
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.last_name}, {self.first_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

