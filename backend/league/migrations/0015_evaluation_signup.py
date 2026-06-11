from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0014_budget"),
    ]

    operations = [
        migrations.CreateModel(
            name="EvaluationSignupWindow",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("season_year", models.PositiveIntegerField()),
                ("eval_date", models.DateField(blank=True, null=True, verbose_name="Evaluation date")),
                ("eval_location", models.CharField(blank=True, max_length=255)),
                ("eval_time", models.CharField(blank=True, help_text="e.g. '9:00 AM – 12:00 PM'", max_length=100)),
                ("is_open", models.BooleanField(default=False, help_text="Enable to allow public sign-ups for this window.")),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("division", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="eval_signup_windows", to="league.division")),
            ],
            options={"ordering": ["season_year", "division__name"], "unique_together": {("season_year", "division")}},
        ),
        migrations.CreateModel(
            name="EvaluationSignup",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("season_year", models.PositiveIntegerField()),
                ("player_first_name", models.CharField(max_length=100)),
                ("player_last_name", models.CharField(max_length=100)),
                ("player_dob", models.DateField(blank=True, null=True)),
                ("parent_name", models.CharField(blank=True, max_length=150)),
                ("parent_email", models.EmailField(blank=True)),
                ("parent_phone", models.CharField(blank=True, max_length=30)),
                ("notes", models.TextField(blank=True)),
                ("signed_up_at", models.DateTimeField(auto_now_add=True)),
                ("is_public", models.BooleanField(default=False, help_text="When True, this sign-up form is visible on the public-facing sign-up page.")),
                ("division", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="evaluation_signups", to="league.division")),
            ],
            options={"ordering": ["season_year", "player_last_name", "player_first_name"]},
        ),
    ]
