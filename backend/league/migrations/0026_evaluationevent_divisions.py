from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0025_evaluation_event"),
    ]

    operations = [
        migrations.AddField(
            model_name="evaluationevent",
            name="divisions",
            field=models.ManyToManyField(
                blank=True, related_name="evaluation_events", to="league.division"
            ),
        ),
    ]
