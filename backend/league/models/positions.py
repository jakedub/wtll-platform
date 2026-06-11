# league/models/positions.py

from django.db import models

POSITION_CHOICES = [
    ("1B", "1st Base"),
    ("2B", "2nd Base"),
    ("3B", "3rd Base"),
    ("SS", "Shortstop"),
    ("LF", "Left Field"),
    ("CF", "Center Field"),
    ("RF", "Right Field"),
    ("P",  "Pitcher"),
    ("C",  "Catcher"),
]


class Position(models.Model):
    code = models.CharField(max_length=10, unique=True, choices=POSITION_CHOICES)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return self.get_code_display()
