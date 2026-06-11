from django.db import models
from datetime import datetime, timedelta


SLOTS_PER_HOUR_CHOICES = [
    (1, "1 slot/hr (every 60 min)"),
    (2, "2 slots/hr (every 30 min)"),
    (3, "3 slots/hr (every 20 min)"),
    (4, "4 slots/hr (every 15 min)"),
    (6, "6 slots/hr (every 10 min)"),
]

SPECIALTY_CHOICES = [
    ("",        "None"),
    ("pitcher", "Pitcher"),
    ("catcher", "Catcher"),
]

# Divisions where specialty positions are available
SPECIALTY_DIVISIONS = ["majors", "aaa", "softball majors"]


class EvaluationEvent(models.Model):
    """One evaluation session (e.g. 2026 Spring Baseball Evaluations)."""
    program = models.ForeignKey(
        "league.Program", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="evaluation_events",
    )
    name = models.CharField(max_length=200, help_text="e.g. '2026 Spring Baseball Evaluations'")
    eval_date = models.DateField()
    start_time = models.TimeField(help_text="Time the first slot begins")
    location = models.CharField(max_length=255, blank=True)
    slots_per_hour = models.PositiveSmallIntegerField(
        choices=SLOTS_PER_HOUR_CHOICES, default=4,
        help_text="How many player slots per hour",
    )
    total_hours = models.DecimalField(
        max_digits=4, decimal_places=1, default=3,
        help_text="Total evaluation window in hours (e.g. 3.5)",
    )
    # Which divisions participate in this evaluation
    divisions = models.ManyToManyField(
        "league.Division", blank=True, related_name="evaluation_events",
    )

    notes = models.TextField(blank=True)
    is_public = models.BooleanField(
        default=False,
        help_text="When True, the public sign-up form is enabled.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-eval_date", "start_time"]

    def __str__(self):
        return f"{self.name} — {self.eval_date}"

    def generate_slots(self):
        """
        Create EvaluationTimeSlot records based on slots_per_hour and total_hours.
        Clears existing slots first. Returns the created slots.
        """
        self.slots.all().delete()
        interval_minutes = 60 // self.slots_per_hour
        total_slots = int(float(self.total_hours) * self.slots_per_hour)

        start = datetime.combine(self.eval_date, self.start_time)
        created = []
        for i in range(total_slots):
            slot_dt = start + timedelta(minutes=i * interval_minutes)
            s = EvaluationTimeSlot.objects.create(
                event=self,
                slot_time=slot_dt.time(),
                slot_number=i + 1,
            )
            created.append(s)
        return created

    @property
    def slot_count(self):
        return self.slots.count()

    @property
    def registration_count(self):
        return self.registrations.count()


class EvaluationTimeSlot(models.Model):
    """One time slot within an evaluation event."""
    event = models.ForeignKey(EvaluationEvent, on_delete=models.CASCADE, related_name="slots")
    slot_time = models.TimeField()
    slot_number = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering = ["slot_number"]

    def __str__(self):
        return f"{self.event.name} — {self.slot_time.strftime('%I:%M %p')}"

    @property
    def is_available(self):
        return not self.registration.exists()

    @property
    def display_time(self):
        return self.slot_time.strftime("%-I:%M %p")


class EvaluationRegistration(models.Model):
    """A player's sign-up for a specific time slot at an evaluation event."""
    event = models.ForeignKey(EvaluationEvent, on_delete=models.CASCADE, related_name="registrations")
    time_slot = models.OneToOneField(
        EvaluationTimeSlot, on_delete=models.CASCADE,
        related_name="registration",
        null=True, blank=True,
    )
    division = models.ForeignKey(
        "league.Division", on_delete=models.SET_NULL, null=True, blank=True,
    )
    parent_name = models.CharField(max_length=150)
    parent_email = models.EmailField(blank=True)
    parent_phone = models.CharField(max_length=30, blank=True)
    player_name = models.CharField(max_length=150)
    specialty_position = models.CharField(
        max_length=10, choices=SPECIALTY_CHOICES, blank=True, default="",
        help_text="Pitcher or Catcher — only applicable for AAA/Majors",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["time_slot__slot_number"]

    def __str__(self):
        t = self.time_slot.display_time if self.time_slot else "No slot"
        return f"{self.player_name} — {t} ({self.division})"
