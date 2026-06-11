"""
Passwordless (magic-link) authentication views.

Flow:
  1. POST /api/auth/request-login/  { "email": "..." }
     → Creates a LoginToken, emails the magic link to the user.
     → Always returns 200 so we don't leak whether an email exists.

  2. GET  /api/auth/verify/?token=<uuid>
     → Validates the token, finds or creates the User, returns a DRF auth token.
     → Marks the LoginToken as used.

  3. GET  /api/auth/me/             (requires Authorization: Token <token>)
     → Returns current user's profile and linked teams.

  4. POST /api/auth/logout/         (requires Authorization: Token <token>)
     → Deletes the DRF auth token (server-side logout).
"""
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated

from league.models.auth_token import LoginToken


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_or_create_user(email: str):
    """Find an existing user by email or create a new one."""
    from league.models import User
    email = email.lower().strip()
    try:
        return User.objects.get(email=email), False
    except User.DoesNotExist:
        user = User.objects.create_user(
            username=email,
            email=email,
            password=None,          # No password — magic link only
        )
        return user, True


def _get_or_create_auth_token(user):
    """Return (token_key, created) for the DRF auth token."""
    from rest_framework.authtoken.models import Token
    token, created = Token.objects.get_or_create(user=user)
    return token.key, created


def _send_magic_link(email: str, token_uuid: str, request) -> None:
    """Compose and send the magic link email."""
    # Build the frontend URL — the React app handles /auth/callback
    frontend_origin = getattr(settings, "FRONTEND_URL", "").rstrip("/")
    if not frontend_origin:
        # Fallback: derive from the request
        frontend_origin = request.build_absolute_uri("/").rstrip("/")

    link = f"{frontend_origin}/auth/callback?token={token_uuid}"

    send_mail(
        subject="Your WTLL Platform login link",
        message=(
            f"Click the link below to sign in to WTLL Platform.\n\n"
            f"{link}\n\n"
            f"This link expires in 15 minutes and can only be used once.\n"
            f"If you didn't request this, you can ignore this email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=False,
    )


# ── Views ──────────────────────────────────────────────────────────────────────

class RequestLoginView(APIView):
    """
    POST /api/auth/request-login/
    Body: { "email": "coach@example.com" }
    Sends a magic link to the given email address.
    Always responds 200 to avoid leaking whether an email is registered.
    """
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        email = (request.data.get("email") or "").lower().strip()
        if not email or "@" not in email:
            return Response(
                {"error": "A valid email address is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Invalidate any existing unused tokens for this email to avoid confusion
        LoginToken.objects.filter(email=email, is_used=False).update(is_used=True)

        token_obj = LoginToken.objects.create(email=email)

        try:
            _send_magic_link(email, str(token_obj.token), request)
        except Exception as exc:
            # Log but don't expose the error to the client
            import logging
            logging.getLogger(__name__).error("Magic link send failed: %s", exc)

        return Response({"detail": "If that email is on file, a login link is on its way."})


class VerifyTokenView(APIView):
    """
    GET /api/auth/verify/?token=<uuid>
    Validates the magic link token and returns a DRF auth token.
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        raw = request.query_params.get("token", "").strip()
        if not raw:
            return Response(
                {"error": "Missing token parameter."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token_obj = LoginToken.objects.get(token=raw)
        except LoginToken.DoesNotExist:
            return Response(
                {"error": "Invalid or expired login link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not token_obj.is_valid:
            return Response(
                {"error": "This login link has already been used or has expired. Request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Mark consumed before doing anything else (prevents double-use)
        token_obj.is_used = True
        token_obj.save(update_fields=["is_used"])

        user, created = _get_or_create_user(token_obj.email)
        auth_token, _ = _get_or_create_auth_token(user)

        return Response({
            "token": auth_token,
            "user": _serialize_user(user),
        })


class MeView(APIView):
    """
    GET /api/auth/me/
    Returns the current authenticated user's profile + coached teams.
    """
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(_serialize_user(request.user))


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Deletes the auth token (server-side logout).
    """
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            request.user.auth_token.delete()
        except Exception:
            pass
        return Response({"detail": "Logged out."})


# ── Serialisation ─────────────────────────────────────────────────────────────

def _serialize_user(user) -> dict:
    coached = list(
        user.coached_teams.filter(is_active=True).values("id", "name", "division_id")
    )
    asst_coached = list(
        user.assistant_coached_teams.filter(is_active=True).values("id", "name", "division_id")
    )
    return {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_staff": user.is_staff,
        "is_coach": user.is_coach,
        "coached_teams": coached,
        "assistant_coached_teams": asst_coached,
    }
