import json
from django.core.management.base import BaseCommand
from league.services.report_exporter import fetch_bluesombrero_report


class Command(BaseCommand):
    help = "Exports Blue Sombrero saved report data to a JSON file."

    def add_arguments(self, parser):
        parser.add_argument(
            "--report-id",
            type=str,
            default="202676",
            help="Blue Sombrero Saved Report ID (default: 202676)",
        )
        parser.add_argument(
            "--portal-id",
            type=str,
            default="10236",
            help="Blue Sombrero Portal ID (default: 10236)",
        )
        parser.add_argument(
            "--output",
            type=str,
            default="bluesombrero_report_202676.json",
            help="Destination output file path",
        )

    def handle(self, *args, **options):
        report_id = options["report_id"]
        portal_id = options["portal_id"]
        output_file = options["output"]

        self.stdout.write(f"Fetching report {report_id} for portal {portal_id}...")

        try:
            data = fetch_bluesombrero_report(report_id=report_id, portal_id=portal_id)
            
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)

            self.stdout.write(
                self.style.SUCCESS(f"Successfully saved report data to {output_file}")
            )
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Failed to export report: {e}"))