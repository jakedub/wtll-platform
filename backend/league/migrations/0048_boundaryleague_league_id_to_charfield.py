"""
league_id was incorrectly defined as IntegerField but the ll_initial.json
data uses string slugs (e.g. 'brownsburg-softball'). Change to CharField.

Uses RunSQL with an explicit USING clause because PostgreSQL requires a cast
expression when changing a column from INTEGER to VARCHAR.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0044_boundary_league_generated_kml"),
    ]

    operations = [
        # Retype the column with explicit USING cast — required by PostgreSQL.
        migrations.RunSQL(
            sql="""
                ALTER TABLE league_boundaryleague
                    ALTER COLUMN league_id TYPE VARCHAR(100)
                    USING league_id::VARCHAR(100);
            """,
            reverse_sql="""
                ALTER TABLE league_boundaryleague
                    ALTER COLUMN league_id TYPE INTEGER
                    USING league_id::INTEGER;
            """,
        ),
        # Keep Django's internal state in sync with the real column type.
        migrations.AlterField(
            model_name="boundaryleague",
            name="league_id",
            field=models.CharField(max_length=100, unique=True),
        ),
    ]
