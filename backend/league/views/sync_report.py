import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from league.services.report_exporter import (
    fetch_bluesombrero_report,
    convert_bluesombrero_payload,
)

logger = logging.getLogger(__name__)


class SyncReportViewSet(viewsets.ViewSet):
    """
    ViewSet to handle live BlueSombrero report synchronization.
    """

    @action(detail=False, methods=['post', 'get'])
    def sync_bluesombrero_report(self, request):
        try:
            logger.info("Initiating Blue Sombrero report sync via ViewSet...")

            # 1. Runs the Playwright scraper and fetches raw report payloads
            raw_report_data = fetch_bluesombrero_report(report_id="202676", portal_id="10236")

            # 2. Converts the raw payload into a structured JSON dictionary of records
            converted_data = convert_bluesombrero_payload(raw_report_data)

            # 3. Returns the converted payload with resolved headers to the frontend
            return Response(converted_data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception("[SYNC ERROR] Failed to fetch or convert report: %s", e)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)