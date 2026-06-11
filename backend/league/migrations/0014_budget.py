from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0013_allstar_selection"),
    ]

    operations = [
        migrations.CreateModel(
            name="BudgetLine",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("year", models.PositiveIntegerField(db_index=True)),
                ("category", models.CharField(
                    choices=[
                        ("UNIFORMS", "Uniforms"), ("UMPIRES", "Umpires"),
                        ("AWARDS", "Awards & Trophies"), ("EQUIPMENT", "Equipment"),
                        ("FACILITIES", "Facilities & Programs"), ("ADMIN", "Admin & Operations"),
                        ("REVENUE", "Revenue"),
                    ],
                    max_length=20,
                )),
                ("item", models.CharField(max_length=200)),
                ("owner_role", models.CharField(blank=True, max_length=150)),
                ("is_revenue", models.BooleanField(default=False)),
                ("actual", models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name="Prior year actual ($)")),
                ("estimate", models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name="Current year estimate ($)")),
                ("estimate_override", models.BooleanField(default=False)),
                ("notes", models.TextField(blank=True)),
                ("sort_order", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["year", "category", "sort_order", "id"]},
        ),
        migrations.CreateModel(
            name="BudgetApproval",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("year", models.PositiveIntegerField(unique=True)),
                ("approved_by", models.CharField(max_length=150)),
                ("approved_at", models.DateTimeField(auto_now_add=True)),
                ("notes", models.TextField(blank=True)),
            ],
        ),
    ]
