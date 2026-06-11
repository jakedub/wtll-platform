import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Creates Draft and DraftSelection models.
    Draft scopes a session by name/year/division and tracks
    participating teams (M2M) and completion status.
    DraftSelection is the atomic player → team assignment,
    unique per draft+player.
    """

    dependencies = [
        ("league", "0009_evaluation"),
    ]

    operations = [
        # ── Draft ─────────────────────────────────────────────────────────────
        migrations.CreateModel(
            name="Draft",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100, help_text='e.g. "Fall 2026 AAA Draft"')),
                ("year", models.PositiveIntegerField()),
                (
                    "division",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="drafts",
                        to="league.division",
                    ),
                ),
                (
                    "selected_teams",
                    models.ManyToManyField(
                        blank=True,
                        related_name="drafts",
                        to="league.team",
                    ),
                ),
                ("is_complete", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["-created_at"]},
        ),

        # ── DraftSelection ────────────────────────────────────────────────────
        migrations.CreateModel(
            name="DraftSelection",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "draft",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="selections",
                        to="league.draft",
                    ),
                ),
                (
                    "player",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="draft_selections",
                        to="league.player",
                    ),
                ),
                (
                    "team",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="draft_selections",
                        to="league.team",
                    ),
                ),
                (
                    "division",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="league.division",
                    ),
                ),
                ("selected_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["selected_at"]},
        ),
        migrations.AddConstraint(
            model_name="draftselection",
            constraint=models.UniqueConstraint(
                fields=["draft", "player"],
                name="unique_player_per_draft",
            ),
        ),
    ]
