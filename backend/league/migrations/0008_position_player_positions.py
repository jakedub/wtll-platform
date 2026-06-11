from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Creates the Position lookup table and adds a ManyToMany
    from Player to Position.
    """

    dependencies = [
        ("league", "0007_player_expand_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="Position",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "code",
                    models.CharField(
                        max_length=10,
                        unique=True,
                        choices=[
                            ("1B", "1st Base"),
                            ("2B", "2nd Base"),
                            ("3B", "3rd Base"),
                            ("SS", "Shortstop"),
                            ("LF", "Left Field"),
                            ("CF", "Center Field"),
                            ("RF", "Right Field"),
                            ("P",  "Pitcher"),
                            ("C",  "Catcher"),
                        ],
                    ),
                ),
            ],
            options={"ordering": ["code"]},
        ),
        migrations.AddField(
            model_name="player",
            name="positions",
            field=models.ManyToManyField(
                to="league.Position",
                blank=True,
                related_name="players",
            ),
        ),
    ]
