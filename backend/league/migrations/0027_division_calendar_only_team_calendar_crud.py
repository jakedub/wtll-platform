from django.db import migrations, models


def mark_field_rental(apps, schema_editor):
    """Auto-mark any division with 'field rental' in the name as calendar-only."""
    Division = apps.get_model("league", "Division")
    Division.objects.filter(name__icontains="field rental").update(is_calendar_only=True)


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0026_evaluationevent_divisions"),
    ]

    operations = [
        migrations.AddField(
            model_name="division",
            name="is_calendar_only",
            field=models.BooleanField(
                default=False,
                help_text="Appears only in calendars; excluded from player lists and sign-up forms.",
            ),
        ),
        migrations.RunPython(mark_field_rental, migrations.RunPython.noop),
    ]
