from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('league', '0036_merge_0035_variants'),
    ]

    operations = [
        migrations.AddField(
            model_name='event',
            name='concessions_closed',
            field=models.BooleanField(
                default=False,
                help_text='When True, concessions sign-up is closed for this game on the public page.',
            ),
        ),
    ]
