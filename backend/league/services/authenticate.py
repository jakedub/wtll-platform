import os
import logging
import requests
from django.conf import settings
from pycognito import Cognito

logger = logging.getLogger(__name__)

class BlueSombreroCognitoAuth:
    """
    Handles AWS Cognito SRP authentication and executes the Stack Sports /
    Blue Sombrero token exchange and auto login redirection sequence.
    """
    def __init__(self, username=None, password=None, client_id=None, region=None, user_pool_id=None):
        self.username = username or getattr(settings, 'BLUE_SOMBRERO_USERNAME', None)
        self.password = password or getattr(settings, 'BLUE_SOMBRERO_PASSWORD', None)
        self.client_id = client_id or getattr(settings, 'BLUE_SOMBRERO_COGNITO_CLIENT_ID', '572but04so1ovl883vi2j95vpj')
        self.region = region or getattr(settings, 'AWS_COGNITO_REGION', 'us-west-2')
        self.user_pool_id = user_pool_id or getattr(settings, 'BLUE_SOMBRERO_USER_POOL_ID', 'us-west-2_AiiSrRjbC')
        self.stack_client_id = getattr(settings, 'BLUE_SOMBRERO_STACK_CLIENT_ID', '612b0399b1854a002e427f78')

        logger.info("[AUTH INIT] Username: %s | ClientID: %s | UserPool: %s | Region: %s",
                    self.username, self.client_id, self.user_pool_id, self.region)

        if not self.username or not self.password:
            logger.error("[AUTH INIT FAILED] BLUE_SOMBRERO_USERNAME or BLUE_SOMBRERO_PASSWORD is missing.")
            raise ValueError("BLUE_SOMBRERO_USERNAME and BLUE_SOMBRERO_PASSWORD must be defined.")

    def get_cognito_tokens(self) -> dict:
        """Authenticates against AWS Cognito via SRP and returns JWT tokens."""
        logger.info("[COGNITO AUTH] Initiating SRP authentication for user: %s", self.username)
        try:
            os.environ["AWS_DEFAULT_REGION"] = self.region
            u = Cognito(
                user_pool_id=self.user_pool_id,
                client_id=self.client_id,
                username=self.username,
                user_pool_region=self.region
            )
            u.authenticate(password=self.password)
            logger.info("[COGNITO AUTH SUCCESS] Tokens generated successfully. IdToken length: %d", len(u.id_token or ""))
            return {
                "id_token": u.id_token,
                "access_token": u.access_token,
                "refresh_token": u.refresh_token
            }
        except Exception as e:
            logger.exception("[COGNITO AUTH ERROR] Cognito SRP Authentication Failed: %s", str(e))
            raise Exception(f"Cognito SRP Authentication Failed: {str(e)}")

    def get_authenticated_session(
        self,
        portal_id="10236",
        app_name="Washington Township Little League",
        instance_key="leagues",
    ) -> tuple[requests.Session, dict]:
        """
        Executes token registration with Stack Sports and follows the redirect
        handoff chain (core api, gowtll autologin, bluesombrero autologin) to
        yield a fully authenticated requests.Session object. Authorization on
        the downstream reporting API is cookie based, not header based, so the
        cookies collected while following these redirects are the whole point.
        """
        session = requests.Session()

        session.headers.update({
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*"
        })

        # Step 0: Visit the actual login page before doing anything else.
        # login.stacksports.com sits behind Incapsula, and auth.stacksports.com
        # is on the same apex domain. If the WAF issues a visitor or session
        # cookie scoped to stacksports.com on this request, a call straight
        # into the tokens API with no such cookie is a plausible reason that
        # call comes back 401. This is a hypothesis, not a confirmed fact,
        # since the HAR capture used here does not include response headers,
        # so it cannot show what Set-Cookie values the real browser got. If
        # this does not clear the 401, check the logged response body from
        # Step 1 below for the server's actual error message.
        logger.info("[AUTH STEP 0] Visiting Stack Sports login page to seed session cookies...")
        login_page_url = "https://login.stacksports.com/login"
        login_page_params = {
            "client_id": self.stack_client_id,
            "redirect_uri": f"https://core-api.bluesombrero.com/login/redirect/portal/{portal_id}",
            "app_name": app_name,
            "portalid": str(portal_id),
            "instancekey": instance_key,
        }
        res_login_page = session.get(login_page_url, params=login_page_params, allow_redirects=True)
        logger.info("[AUTH STEP 0] Login page status: %d | Cookies collected: %d", res_login_page.status_code, len(session.cookies))

        tokens = self.get_cognito_tokens()

        # Step 1: Register Cognito Tokens with Stack Sports Auth API
        logger.info("[AUTH STEP 1] Registering Cognito tokens with Stack Sports Auth API...")
        auth_url = f"https://auth.stacksports.com/api/users/{self.username}/tokens"

        # The server's own error message confirms this endpoint does require
        # a Bearer Authorization header ("Authorization token not present").
        # The captured HAR header list did not show it, evidently scrubbed
        # or truncated in that tool's output, so removing it earlier was a
        # mistake based on incomplete data. Putting it back.
        auth_headers = {
            "Authorization": f"Bearer {tokens['id_token']}",
            "Content-Type": "application/json;charset=UTF-8",
            "Referer": "https://login.stacksports.com/"
        }

        auth_payload = {
            "email": self.username,
            "idToken": tokens["id_token"],
            "accessToken": tokens["access_token"],
            "refreshToken": tokens["refresh_token"],
        }

        res_auth = session.post(auth_url, json=auth_payload, headers=auth_headers)
        logger.info("[AUTH STEP 1] Response Status: %d | Body: %s", res_auth.status_code, res_auth.text)
        if not res_auth.ok:
            # Log what requests actually put on the wire, not just what we
            # asked it to send, so we can rule out the header being dropped
            # or reshaped somewhere between here and the socket.
            sent_headers = dict(res_auth.request.headers)
            if "Authorization" in sent_headers:
                sent_headers["Authorization"] = sent_headers["Authorization"][:20] + "...<redacted>"
            raise Exception(
                f"[AUTH STEP 1 FAILED] Status {res_auth.status_code} from {auth_url} | "
                f"Response body: {res_auth.text} | Sent headers: {sent_headers} | "
                f"id_token present: {bool(tokens.get('id_token'))} | id_token length: {len(tokens.get('id_token') or '')}"
            )

        # Step 2: POST the token handoff to the Blue Sombrero portal redirect
        # endpoint. This is a form encoded POST, not a bearer authenticated
        # GET. The redirect target, app_name, portalid and instancekey all
        # ride as query params, and the tokens ride as the form body. The
        # server responds 302 and, if allow_redirects is left on, requests
        # will walk the rest of the chain itself:
        #   core-api.bluesombrero.com/login/redirect/portal/{id}
        #   -> www.gowtll.org/stacksportsautologin.aspx
        #   -> leagues.bluesombrero.com/autologin.aspx
        #   -> Default.aspx
        # picking up the real ASP.NET session cookies along the way.
        logger.info("[AUTH STEP 2] Posting token handoff for Portal ID %s...", portal_id)
        redirect_url = f"https://core-api.bluesombrero.com/login/redirect/portal/{portal_id}"

        redirect_params = {
            "app_name": app_name,
            "portalid": str(portal_id),
            "instancekey": instance_key,
        }

        redirect_form_data = {
            "idToken": tokens["id_token"],
            "accessToken": tokens["access_token"],
            "refreshToken": tokens["refresh_token"],
        }

        redirect_headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Referer": "https://login.stacksports.com/",
        }

        res_redirect = session.post(
            redirect_url,
            params=redirect_params,
            data=redirect_form_data,
            headers=redirect_headers,
            allow_redirects=True,
        )
        logger.info("[AUTH STEP 2] Redirect Status Code: %d | Final URL: %s", res_redirect.status_code, res_redirect.url)
        if res_redirect.status_code >= 400:
            raise Exception(
                f"[AUTH STEP 2 FAILED] Status {res_redirect.status_code} from {res_redirect.url} | Response body: {res_redirect.text}"
            )

        # Keep these two explicit cookies set as well. The real redirect
        # chain should populate the actual ASP.NET session cookies, but
        # downstream code and tests key off these two names directly.
        session.cookies.set("stackIdToken", tokens["id_token"], domain=".bluesombrero.com")
        session.cookies.set("portalId", str(portal_id), domain=".bluesombrero.com")

        logger.info("[AUTH SUCCESS] Authenticated session generated with %d cookies after redirect chain.", len(session.cookies))
        return session, tokens