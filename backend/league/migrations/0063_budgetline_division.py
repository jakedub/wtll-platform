"""
Migration 0063 — Add division field to BudgetLine.

Used for Baseball/Softball items to tag per-division costs
(Tee Ball, Pee Wee, AAA, Majors, Softball Minors, Softball Majors).
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0062_budgetline_quantity_unitcost"),
    ]

    operations = [
        migrations.AddField(
            model_name="budgetline",
            name="division",
            field=models.CharField(
                blank=True,
                max_length=20,
                choices=[
                    ("TEE_BALL",  "Tee Ball"),
                    ("PEE_WEE",   "Pee Wee"),
                    ("AAA",       "AAA"),
                    ("MAJORS",    "Majors"),
                    ("SF_MINORS", "Softball Minors"),
                    ("SF_MAJORS", "Softball Majors"),
                    ("ALL_DIV",   "All Divisions"),
                ],
                default="",
                help_text="Baseball/Softball division this item applies to.",
            ),
        ),
    ]
