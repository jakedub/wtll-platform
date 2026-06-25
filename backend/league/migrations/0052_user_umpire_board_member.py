"""
Migration 0052 — Add is_umpire and is_board_member role flags to User.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0051_boundaryleague_address"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="is_umpire",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="user",
            name="is_board_member",
            field=models.BooleanField(default=False),
        ),
    ]
