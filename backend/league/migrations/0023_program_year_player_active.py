"""
Add program_type + season_year + sport to Program.
Add is_active to Player.
Remove old unique_name on Program, add unique (season_year, program_type).
"""
from django.db import migrations, models


def deduplicate_programs(apps, schema_editor):
    """
    Keep one Program per (season_year, program_type), delete the rest.
    Before deleting a duplicate, null-out any FKs pointing to it.
    """
    Program  = apps.get_model("league", "Program")
    Division = apps.get_model("league", "Division")
    PlayerProgramEnrollment = apps.get_model("league", "PlayerProgramEnrollment")

    seen: dict = {}   # key → id to keep

    for p in Program.objects.order_by("id"):
        key = (p.season_year, p.program_type)
        if key not in seen:
            seen[key] = p.id
        else:
            # Reassign dependents to the keeper, then delete this duplicate
            keeper_id = seen[key]
            # Null out Division.program for divisions pointing to this duplicate
            Division.objects.filter(program_id=p.id).update(program_id=None)
            # Re-point enrollments to the keeper (skip any that would violate the unique constraint)
            for enr in PlayerProgramEnrollment.objects.filter(program_id=p.id):
                already_exists = PlayerProgramEnrollment.objects.filter(
                    player_id=enr.player_id, program_id=keeper_id
                ).exists()
                if already_exists:
                    enr.delete()   # duplicate enrollment — safe to drop
                else:
                    enr.program_id = keeper_id
                    enr.save(update_fields=["program_id"])
            p.delete()


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    # Required because RunPython modifies FKs and then we ALTER TABLE in the same migration.
    # Without this PostgreSQL raises "cannot ALTER TABLE because it has pending trigger events".
    atomic = False

    dependencies = [
        ("league", "0022_alter_evaluationsignupwindow_is_open_and_more"),
    ]

    operations = [
        # ── Program changes ───────────────────────────────────────────────────
        migrations.AddField(
            model_name="program",
            name="program_type",
            field=models.CharField(
                max_length=20,
                choices=[
                    ("RECREATION",    "Recreation"),
                    ("ALL_STARS",     "All Stars"),
                    ("SHOWCASE",      "Showcase"),
                    ("TEEN_BASEBALL", "Teen Baseball"),
                    ("TEEN_SOFTBALL", "Teen Softball"),
                    ("FALL_BALL",     "Fall Ball"),
                ],
                default="RECREATION",
            ),
        ),
        migrations.AddField(
            model_name="program",
            name="season_year",
            field=models.PositiveIntegerField(default=2026),
        ),
        migrations.AddField(
            model_name="program",
            name="sport",
            field=models.CharField(max_length=10, blank=True, default="baseball"),
        ),
        # Remove the old unique constraint on name
        migrations.AlterField(
            model_name="program",
            name="name",
            field=models.CharField(max_length=150),
        ),
        # Deduplicate before adding unique constraint
        migrations.RunPython(deduplicate_programs, noop),
        # Add new unique_together
        migrations.AlterUniqueTogether(
            name="program",
            unique_together={("season_year", "program_type")},
        ),

        # ── Player changes ────────────────────────────────────────────────────
        migrations.AddField(
            model_name="player",
            name="is_active",
            field=models.BooleanField(
                default=True,
                db_index=True,
                help_text="Active in the current season.",
            ),
        ),
    ]
