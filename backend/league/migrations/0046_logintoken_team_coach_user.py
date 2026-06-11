"""
Migration: add LoginToken model and coach_user / assistant_coach_user FKs on Team.
"""
import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0045_seed_boundary_data"),
    ]

    operations = [
        # ── LoginToken ────────────────────────────────────────────────────────
        migrations.CreateModel(
            name="LoginToken",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("email", models.EmailField(db_index=True, max_length=254)),
                ("token", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("is_used", models.BooleanField(default=False)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        # ── Team coach_user / assistant_coach_user FKs ────────────────────────
        migrations.AddField(
            model_name="team",
            name="coach_user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="coached_teams",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="team",
            name="assistant_coach_user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="assistant_coached_teams",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
