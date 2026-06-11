from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0020_player_archive"),
    ]

    operations = [
        migrations.AddField(
            model_name="team",
            name="home_location",
            field=models.CharField(
                blank=True, max_length=255,
                help_text="Default home field / location for schedule display",
            ),
        ),
    ]
