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

def _serialize_user(user, *, include_teams: bool = True) -> dict:
    d = {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_staff": user.is_staff,
        "is_board_member": user.is_board_member,
        "is_coach": user.is_coach,
        "is_umpire": user.is_umpire,
        "is_active": user.is_active,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "date_joined": user.date_joined.isoformat() if user.date_joined else None,
    }
    if include_teams:
        d["coached_teams"] = list(
            user.coached_teams.filter(is_active=True).values("id", "name", "division_id")
        )
        d["assistant_coached_teams"] = list(
            user.assistant_coached_teams.filter(is_active=True).values("id", "name", "division_id")
        )
    return d


def _check_public_role(request, *, allow_coach: bool = False, allow_umpire: bool = False) -> tuple[bool, str]:
    """
    Check if the request has a valid DRF token with the required role.
    Returns (authorized: bool, reason: str).
    reason is 'ok', 'login_required', or 'not_authorized'.
    """
    from rest_framework.authtoken.models import Token
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Token "):
        return False, "login_required"
    key = auth[len("Token "):]
    try:
        token = Token.objects.select_related("user").get(key=key)
        u = token.user
        if not u.is_active:
            return False, "not_authorized"
        if u.is_staff or u.is_board_member:
            return True, "ok"
        if allow_coach and u.is_coach:
            return True, "ok"
        if allow_umpire and u.is_umpire:
            return True, "ok"
        return False, "not_authorized"
    except Token.DoesNotExist:
        return False, "login_required"


# ── Admin: User Management ────────────────────────────────────────────────────

class IsAdminUser:
    """Reusable permission check — requires is_staff."""
    def _require_admin(self, request):
        if not request.user or not request.user.is_staff:
            return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        return None


class UserListView(IsAdminUser, APIView):
    """
    GET  /api/auth/users/   — list all users (admin only)
    """
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        err = self._require_admin(request)
        if err:
            return err
        from league.models import User
        users = User.objects.all().order_by("email")
        return Response([_serialize_user(u, include_teams=False) for u in users])


class UserInviteView(IsAdminUser, APIView):
    """
    POST /api/auth/users/invite/
    Body: { email, first_name, last_name, is_board_member, is_coach, is_umpire }
    Creates the user (or updates roles if email exists) and sends a magic link.
    """
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        err = self._require_admin(request)
        if err:
            return err

        from league.models import User

        email = (request.data.get("email") or "").lower().strip()
        if not email or "@" not in email:
            return Response({"error": "A valid email address is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Find or create the user
        try:
            user = User.objects.get(email=email)
            created = False
        except User.DoesNotExist:
            user = User.objects.create_user(username=email, email=email, password=None)
            created = True

        # Update fields
        user.first_name = request.data.get("first_name", user.first_name) or ""
        user.last_name = request.data.get("last_name", user.last_name) or ""
        user.is_board_member = bool(request.data.get("is_board_member", user.is_board_member))
        user.is_coach = bool(request.data.get("is_coach", user.is_coach))
        user.is_umpire = bool(request.data.get("is_umpire", user.is_umpire))
        user.is_active = True
        user.save()

        # Invalidate old login tokens and send a fresh magic link
        from league.models.auth_token import LoginToken
        LoginToken.objects.filter(email=email, is_used=False).update(is_used=True)
        token_obj = LoginToken.objects.create(email=email)
        try:
            _send_magic_link(email, str(token_obj.token), request)
        except Exception as exc:
            import logging
            logging.getLogger(__name__).error("Invite magic link send failed: %s", exc)

        return Response(
            _serialize_user(user, include_teams=False),
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class UserDetailView(IsAdminUser, APIView):
    """
    PATCH  /api/auth/users/<pk>/   — update roles / name / active (admin only)
    DELETE /api/auth/users/<pk>/   — deactivate user (sets is_active=False)
    """
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def _get_user(self, pk):
        from league.models import User
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            return None

    def patch(self, request, pk):
        err = self._require_admin(request)
        if err:
            return err
        user = self._get_user(pk)
        if not user:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        # Prevent demoting yourself
        if user.pk == request.user.pk and request.data.get("is_active") is False:
            return Response({"error": "You cannot deactivate your own account."}, status=status.HTTP_400_BAD_REQUEST)

        allowed = {"first_name", "last_name", "is_board_member", "is_coach", "is_umpire", "is_active"}
        for field, value in request.data.items():
            if field in allowed:
                setattr(user, field, value)
        user.save()
        return Response(_serialize_user(user, include_teams=False))

    def delete(self, request, pk):
        err = self._require_admin(request)
        if err:
            return err
        user = self._get_user(pk)
        if not user:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        if user.pk == request.user.pk:
            return Response({"error": "You cannot deactivate your own account."}, status=status.HTTP_400_BAD_REQUEST)
        user.is_active = False
        user.save(update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)
