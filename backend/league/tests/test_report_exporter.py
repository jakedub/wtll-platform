import tempfile
from pathlib import Path

from django.test import SimpleTestCase

from league.services.browser_login import get_authenticated_session
from league.services.report_exporter import fetch_bluesombrero_report


class BlueSombreroExporterIntegrationTest(SimpleTestCase):
    """
    Integration tests against the live Blue Sombrero site. These launch a
    real headless browser for the login leg, so expect them to be slower
    than a typical unit test, and to fail if Playwright's Chromium build is
    not installed (playwright install chromium) or if the login selectors
    in browser_login.py no longer match the real page.
    """

    def setUp(self):
        # Use a throwaway cache file per test run so these tests always
        # exercise a real browser login rather than picking up whatever
        # cookies happen to be cached on this machine from other runs.
        self._tmp_dir = tempfile.TemporaryDirectory()
        self.cache_path = Path(self._tmp_dir.name) / "test_bluesombrero_cookies.json"
        self.addCleanup(self._tmp_dir.cleanup)

    def test_browser_login_session_generation(self):
        """Tests the real headless browser login and the resulting cookie jar."""
        session = get_authenticated_session(
            portal_id="10236",
            force_refresh=True,
            cache_path=self.cache_path,
        )

        # A successful login should leave the session holding cookies
        # collected from the real bluesombrero.com / stacksports.com
        # domains. This does not assert specific cookie names since those
        # are set by the site itself and are not something this code
        # controls, only that the browser login actually produced some.
        self.assertGreater(
            len(session.cookies),
            0,
            "Expected at least one cookie from the browser login, got none.",
        )

        # The cache file should now exist and be reusable by a later call.
        self.assertTrue(self.cache_path.exists())

        cached_session = get_authenticated_session(
            portal_id="10236",
            force_refresh=False,
            cache_path=self.cache_path,
        )
        self.assertGreater(
            len(cached_session.cookies),
            0,
            "Expected the cached session to carry over cookies from the browser login.",
        )

    def test_fetch_bluesombrero_report_live(self):
        """Tests live JSON data retrieval from the Blue Sombrero Reporting API."""
        report_data = fetch_bluesombrero_report(report_id="202676", portal_id="10236")

        self.assertIsNotNone(report_data)
        self.assertTrue(
            isinstance(report_data, (dict, list)),
            f"Expected dict or list response from report API, got {type(report_data)}"
        )