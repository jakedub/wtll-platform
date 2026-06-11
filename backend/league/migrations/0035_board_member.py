from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0034_allstar_uniforms_patches"),
    ]

    operations = [
        migrations.CreateModel(
            name="BoardMember",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("first_name", models.CharField(max_length=100)),
                ("last_name",  models.CharField(max_length=100)),
                ("role",       models.CharField(max_length=100, default="At-Large")),
                ("email",      models.EmailField(blank=True)),
                ("phone",      models.CharField(max_length=30, blank=True)),
                ("notes",      models.TextField(blank=True)),
                ("is_active",  models.BooleanField(default=True, db_index=True)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["sort_order", "role", "last_name"]},
        ),
    ]
