from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('league', '0040_boardmember_sport'),
    ]

    operations = [
        migrations.CreateModel(
            name='Vendor',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('category', models.CharField(
                    choices=[
                        ('uniforms', 'Uniforms'),
                        ('equipment', 'Equipment'),
                        ('trophies', 'Trophies & Awards'),
                        ('photography', 'Photography'),
                        ('printing', 'Printing'),
                        ('concessions', 'Food & Concessions'),
                        ('facilities', 'Fields & Facilities'),
                        ('umpires', 'Umpires'),
                        ('sponsors', 'Sponsors'),
                        ('other', 'Other'),
                    ],
                    db_index=True,
                    default='other',
                    max_length=50,
                )),
                ('contact_name', models.CharField(blank=True, max_length=150)),
                ('contact_phone', models.CharField(blank=True, max_length=30)),
                ('contact_email', models.EmailField(blank=True, max_length=254)),
                ('website', models.URLField(blank=True)),
                ('notes', models.TextField(blank=True)),
                ('board_role', models.CharField(
                    blank=True,
                    choices=[
                        ('President', 'President'),
                        ('Vice President', 'Vice President'),
                        ('Treasurer', 'Treasurer'),
                        ('Secretary', 'Secretary'),
                        ('Player Agent', 'Player Agent'),
                        ('Safety Officer', 'Safety Officer'),
                        ('Fundraising', 'Fundraising'),
                        ('Sponsorship', 'Sponsorship'),
                        ('Concessions', 'Concessions'),
                        ('Grounds', 'Grounds'),
                        ('Equipment Manager', 'Equipment Manager'),
                        ('Umpire Coordinator', 'Umpire Coordinator'),
                        ('Marketing', 'Marketing'),
                        ('Information Officer', 'Information Officer'),
                        ('At-Large', 'At-Large'),
                        ('Other', 'Other'),
                    ],
                    help_text='Board role responsible for this vendor relationship.',
                    max_length=100,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['category', 'name'],
            },
        ),
    ]
