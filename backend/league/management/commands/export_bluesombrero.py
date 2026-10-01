import pandas as pd
from django.core.management.base import BaseCommand
# Adjust relative import path based on app structure
from ...services.report_exporter import fetch_all_report_data

class Command(BaseCommand):
    help = "Exports data from Blue Sombrero via Cognito auth and saves as JSON/CSV."

    def add_arguments(self, parser):
        parser.add_argument('--output', type=str, default='export.csv', help='Output file path')

    def handle(self, *args, **options):
        self.stdout.write("Starting Blue Sombrero export process...")
        try:
            records = fetch_all_report_data()
            df = pd.DataFrame(records)
            
            output_file = options['output']
            if output_file.endswith('.csv'):
                df.to_csv(output_file, index=False)
            else:
                df.to_json(output_file, orient='records', indent=2)
                
            self.stdout.write(self.style.SUCCESS(f"Successfully exported {len(records)} records to {output_file}"))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Export failed: {str(e)}"))