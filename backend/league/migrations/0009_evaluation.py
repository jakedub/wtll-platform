import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Creates the Evaluation model — 13 scored fields across
    hitting, fielding, throwing, pitching, and catching.
    Unique per player + season_year + evaluation_type.
    """

    dependencies = [
        ("league", "0008_position_player_positions"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Evaluation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "player",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="evaluations",
                        to="league.player",
                    ),
                ),
                (
                    "evaluator",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="evaluations_given",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                ("season_year", models.IntegerField()),
                (
                    "evaluation_type",
                    models.CharField(
                        choices=[("pre", "Pre-Season"), ("post", "Post-Season")],
                        max_length=10,
                    ),
                ),
                # Hitting
                ("hitting_power",   models.IntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ("hitting_contact", models.IntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ("hitting_form",    models.IntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                # Fielding
                ("fielding_form",   models.IntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ("fielding_glove",  models.IntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ("fielding_hustle", models.IntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                # Throwing
                ("throwing_form",     models.IntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ("throwing_speed",    models.IntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ("throwing_accuracy", models.IntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                # Pitching
                ("pitching_speed",    models.IntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ("pitching_accuracy", models.IntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                # Catching
                ("catcher_receiving", models.IntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ("catcher_blocking",  models.IntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["-season_year", "evaluation_type"]},
        ),
        migrations.AddConstraint(
            model_name="evaluation",
            constraint=models.UniqueConstraint(
                fields=["player", "season_year", "evaluation_type"],
                name="unique_evaluation_per_player_season_type",
            ),
        ),
    ]
