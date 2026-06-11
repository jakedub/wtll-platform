from django.db import migrations, models
import league.models.document


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0017_budget_categories_fy26_data"),
    ]

    operations = [
        migrations.CreateModel(
            name="UploadedDocument",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("folder_name", models.CharField(max_length=200)),
                ("display_name", models.CharField(max_length=300)),
                ("file", models.FileField(upload_to=league.models.document.document_upload_path)),
                ("description", models.TextField(blank=True)),
                ("tag", models.CharField(blank=True, max_length=100)),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
                ("file_size", models.PositiveIntegerField(default=0)),
            ],
            options={"ordering": ["folder_name", "display_name"]},
        ),
    ]
