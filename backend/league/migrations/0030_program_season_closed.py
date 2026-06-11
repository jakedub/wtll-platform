from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0029_merge_20260604_1445"),
    ]

    operations = [
        migrations.AddField(
            model_name="program",
            name="season_closed",
            field=models.BooleanField(default=False, db_index=True),
        ),
        migrations.AddField(
            model_name="program",
            name="closed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
