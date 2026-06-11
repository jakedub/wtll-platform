from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('league', '0005_alter_event_external_id'),
    ]

    operations = [
        migrations.CreateModel(
            name='UmpireSignup',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('umpire_name', models.CharField(max_length=150)),
                ('umpire_email', models.EmailField(blank=True, max_length=254)),
                ('role', models.CharField(choices=[('PLATE', 'Plate Umpire'), ('BASE', 'Base Umpire')], max_length=10)),
                ('signed_up_at', models.DateTimeField(auto_now_add=True)),
                ('event', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='umpire_signups',
                    to='league.event',
                )),
            ],
            options={
                'ordering': ['event__start_time', 'role'],
            },
        ),
        migrations.AddConstraint(
            model_name='umpiresignup',
            constraint=models.UniqueConstraint(
                fields=['event', 'role'],
                name='unique_umpire_role_per_event',
            ),
        ),
    ]
