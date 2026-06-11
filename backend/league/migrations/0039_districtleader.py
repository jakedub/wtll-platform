from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('league', '0038_merge_20260608_1110'),
    ]

    operations = [
        migrations.CreateModel(
            name='DistrictLeader',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('district_number', models.IntegerField(db_index=True, help_text='Little League district number (e.g. 12). Required.')),
                ('is_hq', models.BooleanField(db_index=True, default=False, help_text='Check if this contact is Little League HQ (not a local district).')),
                ('name', models.CharField(blank=True, max_length=150)),
                ('position', models.CharField(blank=True, choices=[('District Administrator', 'District Administrator'), ('Assistant District Administrator', 'Assistant District Administrator'), ('District Commissioner', 'District Commissioner'), ('UIC', 'UIC (Umpire-in-Chief)'), ('Safety Officer', 'Safety Officer'), ('Treasurer', 'Treasurer'), ('Secretary', 'Secretary'), ('At-Large', 'At-Large'), ('HQ', 'HQ'), ('Other', 'Other')], max_length=100)),
                ('contact_phone', models.CharField(blank=True, max_length=30)),
                ('contact_email', models.EmailField(blank=True, max_length=254)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['district_number', 'is_hq', 'position', 'name'],
            },
        ),
    ]
