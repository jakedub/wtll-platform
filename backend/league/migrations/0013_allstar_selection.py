from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0012_volunteer_signup"),
    ]

    operations = [
        migrations.CreateModel(
            name="AllStarSelection",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("season_year", models.PositiveIntegerField()),
                ("is_returning", models.BooleanField(default=False, help_text="Previously on a WTLL All Star roster — no residency docs required.")),
                ("doc_tournament_verification", models.BooleanField(default=False, verbose_name="Tournament Verification Form")),
                ("doc_team_affidavit", models.BooleanField(default=False, verbose_name="Tournament Team Affidavit")),
                ("doc_drivers_license", models.BooleanField(default=False, verbose_name="Parent/Guardian Driver's License")),
                ("doc_birth_certificate", models.BooleanField(default=False, verbose_name="Hardcopy Birth Certificate")),
                ("doc_residency_proof", models.BooleanField(default=False, verbose_name="Proof of Residency")),
                ("residency_type", models.CharField(blank=True, choices=[("SCHOOL", "School Enrollment Form"), ("UTILITY", "Utility Bill")], max_length=10, verbose_name="Residency document type")),
                ("notes", models.TextField(blank=True)),
                ("selected_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("division", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="allstar_selections", to="league.division")),
                ("player", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="allstar_selections", to="league.player")),
            ],
            options={
                "ordering": ["-season_year", "division__name", "player__last_name"],
                "unique_together": {("player", "season_year")},
            },
        ),
    ]
