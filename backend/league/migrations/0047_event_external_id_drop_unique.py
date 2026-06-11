"""
Remove the field-level unique=True from Event.external_id.
The composite UniqueConstraint(external_id, source) already enforces the
correct business rule: the same ICS UID can appear across different sources
(e.g. TEAM_CENTRAL vs ADMIN) without conflicting.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0046_logintoken_team_coach_user"),
    ]

    operations = [
        migrations.AlterField(
            model_name="event",
            name="external_id",
            field=models.CharField(db_index=True, max_length=255),
        ),
    ]
