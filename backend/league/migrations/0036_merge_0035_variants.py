from django.db import migrations


class Migration(migrations.Migration):
    """
    Merge the two independent 0035 migrations:
      - 0035_alter_division_is_calendar_only
      - 0035_board_member
    Both depend only on 0034_allstar_uniforms_patches, so they are safe to merge.
    """

    dependencies = [
        ('league', '0035_alter_division_is_calendar_only'),
        ('league', '0035_board_member'),
    ]

    operations = []
