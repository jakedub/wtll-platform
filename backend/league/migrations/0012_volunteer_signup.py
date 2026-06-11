from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0011_enrollment_team_nullable"),
    ]

    operations = [
        migrations.CreateModel(
            name="VolunteerSignup",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("volunteer_name", models.CharField(max_length=150)),
                ("volunteer_email", models.EmailField(blank=True)),
                ("role", models.CharField(
                    choices=[("GROUNDS", "Grounds Crew"), ("CONCESSIONS", "Concessions Stand")],
                    max_length=20,
                )),
                ("notes", models.CharField(blank=True, max_length=255)),
                ("signed_up_at", models.DateTimeField(auto_now_add=True)),
                ("event", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="volunteer_signups",
                    to="league.event",
                )),
            ],
            options={
                "ordering": ["event__start_time", "role", "signed_up_at"],
            },
        ),
    ]
