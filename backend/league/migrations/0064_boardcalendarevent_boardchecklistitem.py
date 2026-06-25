"""
Migration 0064 — Add BoardCalendarEvent + BoardChecklistItem models.

Backs the editable Board Operations Hub calendar and checklist.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0063_budgetline_division"),
    ]

    operations = [
        migrations.CreateModel(
            name="BoardCalendarEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("month_year",  models.CharField(max_length=30, help_text='e.g. "June 2026"')),
                ("phase",       models.CharField(max_length=150, blank=True)),
                ("text",        models.CharField(max_length=500)),
                ("owner",       models.CharField(max_length=300, blank=True)),
                ("color",       models.CharField(
                    max_length=20, default="red",
                    choices=[("red","Red"),("gold","Gold"),("green","Green"),("blue","Blue"),("purple","Purple"),("orange","Orange")],
                )),
                ("year",        models.PositiveIntegerField(db_index=True)),
                ("sort_order",  models.PositiveIntegerField(default=0)),
            ],
            options={"ordering": ["year", "sort_order", "id"]},
        ),
        migrations.CreateModel(
            name="BoardChecklistItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date_window", models.CharField(max_length=150)),
                ("item",        models.CharField(max_length=400)),
                ("owner",       models.CharField(max_length=300, blank=True)),
                ("item_type",   models.CharField(
                    max_length=20, default="action",
                    choices=[("hard","Hard Deadline"),("action","Action Item"),("allstar","All Stars"),
                             ("showcase","Showcase"),("fundraising","Fundraising"),("tee_ball","Tee Ball"),("general","General")],
                )),
                ("group",       models.CharField(
                    max_length=20, default="general",
                    choices=[("general","General"),("marketing","Marketing"),("budget","Budget"),
                             ("fallball","Fall Ball"),("allstars","All Stars"),("showcase","Showcase"),
                             ("fundraising","Fundraising"),("tee_ball","Tee Ball")],
                )),
                ("sort_order",  models.PositiveIntegerField(default=0)),
            ],
            options={"ordering": ["sort_order", "id"]},
        ),
    ]
