from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0032_backfill_player_sport"),
    ]

    operations = [
        migrations.CreateModel(
            name="SoftballInningLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("game_date", models.DateField()),
                ("innings_pitched", models.PositiveSmallIntegerField(
                    help_text="Number of innings pitched in this game (1–12)."
                )),
                ("notes", models.TextField(blank=True)),
                ("logged_at", models.DateTimeField(auto_now_add=True)),
                ("player", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="softball_inning_logs",
                    to="league.player",
                )),
                ("player_enrollment", models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="softball_inning_logs",
                    to="league.playerprogramenrollment",
                )),
            ],
            options={"ordering": ["-game_date", "-logged_at"]},
        ),
    ]
