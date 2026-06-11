from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Expands the Player model with all fields needed for the full
    enrollment → district-check → evaluation → draft workflow.
    No existing columns are altered or dropped.
    """

    dependencies = [
        ("league", "0006_umpire_signup"),
    ]

    operations = [
        # ── Core ──────────────────────────────────────────────────────────────
        migrations.AddField(
            model_name="player",
            name="email",
            field=models.EmailField(blank=True, null=True, max_length=254),
        ),

        # ── Handedness — widen from 1 char to 10 ──────────────────────────────
        migrations.AlterField(
            model_name="player",
            name="batting_hand",
            field=models.CharField(
                max_length=10,
                blank=True,
                choices=[("right", "Right"), ("left", "Left"), ("switch", "Switch")],
                default="",
            ),
        ),
        migrations.AlterField(
            model_name="player",
            name="throwing_hand",
            field=models.CharField(
                max_length=10,
                blank=True,
                choices=[("right", "Right"), ("left", "Left"), ("switch", "Switch")],
                default="",
            ),
        ),

        # ── Status flags ──────────────────────────────────────────────────────
        migrations.AlterField(
            model_name="player",
            name="is_eligible",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="player",
            name="interested_showcase",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="player",
            name="residency_same",
            field=models.BooleanField(default=True),
        ),

        # ── Program metadata ──────────────────────────────────────────────────
        migrations.AddField(
            model_name="player",
            name="program",
            field=models.CharField(
                max_length=30, blank=True,
                choices=[("spring", "Spring"), ("summer", "Summer"), ("fall", "Fall"), ("winter", "Winter")],
            ),
        ),
        migrations.AddField(
            model_name="player",
            name="sport",
            field=models.CharField(
                max_length=10, blank=True, default="baseball",
                choices=[("baseball", "Baseball"), ("softball", "Softball")],
            ),
        ),

        # ── Address ───────────────────────────────────────────────────────────
        migrations.AddField(
            model_name="player",
            name="address_line_1",
            field=models.CharField(max_length=100, blank=True),
        ),
        migrations.AddField(
            model_name="player",
            name="address_line_2",
            field=models.CharField(max_length=100, blank=True),
        ),
        migrations.AddField(
            model_name="player",
            name="city",
            field=models.CharField(max_length=50, blank=True),
        ),
        migrations.AddField(
            model_name="player",
            name="state",
            field=models.CharField(max_length=50, blank=True),
        ),
        migrations.AddField(
            model_name="player",
            name="zip_code",
            field=models.CharField(max_length=20, blank=True),
        ),

        # ── Geocoding / district ──────────────────────────────────────────────
        migrations.AddField(
            model_name="player",
            name="in_district",
            field=models.BooleanField(null=True, blank=True, db_index=True),
        ),
        migrations.AddField(
            model_name="player",
            name="district_checked_at",
            field=models.DateTimeField(null=True, blank=True),
        ),

        # ── School & eligibility ──────────────────────────────────────────────
        migrations.AddField(
            model_name="player",
            name="school_name",
            field=models.CharField(max_length=255, blank=True),
        ),

        # ── League preferences ────────────────────────────────────────────────
        migrations.AddField(
            model_name="player",
            name="teammate_request",
            field=models.CharField(max_length=255, blank=True),
        ),
        migrations.AddField(
            model_name="player",
            name="coach_request",
            field=models.CharField(max_length=255, blank=True),
        ),
        migrations.AddField(
            model_name="player",
            name="jersey_size",
            field=models.CharField(max_length=10, blank=True),
        ),

        # ── Tier (stored label, updated by management command) ────────────────
        migrations.AddField(
            model_name="player",
            name="tier",
            field=models.CharField(max_length=10, blank=True),
        ),
    ]
