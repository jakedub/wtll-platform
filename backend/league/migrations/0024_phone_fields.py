from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0023_program_year_player_active"),
    ]

    operations = [
        migrations.AddField(
            model_name="umpiresignup",
            name="umpire_phone",
            field=models.CharField(blank=True, max_length=30),
        ),
        migrations.AddField(
            model_name="volunteersignup",
            name="volunteer_phone",
            field=models.CharField(blank=True, max_length=30),
        ),
    ]
