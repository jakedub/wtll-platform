from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0019_merge_0018_merge_20260603_1600_0018_uploaded_document"),
    ]

    operations = [
        migrations.AddField(
            model_name="player",
            name="is_archived",
            field=models.BooleanField(
                db_index=True, default=False,
                help_text="Soft-delete: hides the player from active views.",
            ),
        ),
        migrations.AddField(
            model_name="player",
            name="archived_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
