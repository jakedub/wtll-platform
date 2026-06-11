from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0015_evaluation_signup"),
    ]

    operations = [
        migrations.CreateModel(
            name="PublicSignupConfig",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("form_type", models.CharField(
                    choices=[("UMPIRE", "Umpire Sign-Up"), ("VOLUNTEER", "Volunteer Sign-Up")],
                    max_length=20, unique=True,
                )),
                ("is_enabled", models.BooleanField(default=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
