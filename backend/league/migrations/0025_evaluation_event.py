from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0024_phone_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="EvaluationEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=200)),
                ("eval_date", models.DateField()),
                ("start_time", models.TimeField()),
                ("location", models.CharField(blank=True, max_length=255)),
                ("slots_per_hour", models.PositiveSmallIntegerField(
                    choices=[(1,"1 slot/hr"),(2,"2 slots/hr"),(3,"3 slots/hr"),(4,"4 slots/hr"),(6,"6 slots/hr")],
                    default=4,
                )),
                ("total_hours", models.DecimalField(decimal_places=1, max_digits=4, default=3)),
                ("notes", models.TextField(blank=True)),
                ("is_public", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("program", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="evaluation_events", to="league.program")),
            ],
            options={"ordering": ["-eval_date", "start_time"]},
        ),
        migrations.CreateModel(
            name="EvaluationTimeSlot",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("slot_time", models.TimeField()),
                ("slot_number", models.PositiveSmallIntegerField(default=1)),
                ("event", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="slots", to="league.evaluationevent")),
            ],
            options={"ordering": ["slot_number"]},
        ),
        migrations.CreateModel(
            name="EvaluationRegistration",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("parent_name", models.CharField(max_length=150)),
                ("parent_email", models.EmailField(blank=True)),
                ("parent_phone", models.CharField(blank=True, max_length=30)),
                ("player_name", models.CharField(max_length=150)),
                ("specialty_position", models.CharField(blank=True, choices=[("","None"),("pitcher","Pitcher"),("catcher","Catcher")], default="", max_length=10)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("event", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="registrations", to="league.evaluationevent")),
                ("time_slot", models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="registration", to="league.evaluationtimeslot")),
                ("division", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="league.division")),
            ],
            options={"ordering": ["time_slot__slot_number"]},
        ),
    ]
