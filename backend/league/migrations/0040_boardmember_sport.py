from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('league', '0039_districtleader'),
    ]

    operations = [
        migrations.AddField(
            model_name='boardmember',
            name='sport',
            field=models.CharField(
                blank=True,
                choices=[('', 'Both / All Sports'), ('baseball', 'Baseball'), ('softball', 'Softball')],
                default='',
                help_text='Baseball or Softball — used for VP and Player Agent roles.',
                max_length=20,
            ),
            preserve_default=False,
        ),
    ]
