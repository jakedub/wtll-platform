from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0033_softball_inning_log"),
    ]

    operations = [
        migrations.AddField(
            model_name="allstarselection",
            name="doc_uniforms_ordered",
            field=models.BooleanField(default=False, verbose_name="Uniforms Ordered"),
        ),
        migrations.AddField(
            model_name="allstarselection",
            name="doc_ll_patches",
            field=models.BooleanField(default=False, verbose_name="Little League Patches"),
        ),
    ]
