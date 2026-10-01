"""
Authentication views.

Active:
  1. POST /api/auth/login/          { "username": "...", "password": "..." }
     → Authenticates with username + password, returns a DRF auth token.

  2. GET  /api/auth/me/             (requires Authorization: Token <token>)
     → Returns current user's profile and linked teams.

  3. POST /api/auth/logout/         (requires Authorization: Token <token>)
     → Deletes the DRF auth token (server-side logout).

Commented out (magic-link — requires email provider):
  - POST /api/auth/request-login/
  - GET  /api/auth/verify/
"""
from django.contrib.auth import authenticate

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated

# ── Magic-link imports (kept for future re-enable) ────────────────────────────
# from django.conf import settings
# from django.core.mail import send_mail
# from django.utils import timezone
# from league.models.auth_token import LoginToken


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_or_create_auth_token(user):
    """Return (token_key, created) for the DRF auth token."""
    from rest_framework.authtoken.models import Token
    token, created = Token.objects.get_or_create(user=user)
    return token.key, created


# ── Views ──────────────────────────────────────────────────────────────────────

class PasswordLoginView(APIView):
    """
    POST /api/auth/login/
    Body: { "username": "...", "password": "..." }
    Authenticates with username + password and returns a DRF auth token.
    """
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        username = (request.data.get("username") or "").strip()
        password = request.data.get("password") or ""

        if not username or not password:
            return Response(
                {"error": "Username and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response(
                {"error": "Invalid username or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {"error": "This account has been deactivated."},
                status=status.HTTP_403_FORBIDDEN,
            )

        auth_token, _ = _get_or_create_auth_token(user)
        return Response({
            "token": auth_token,
            "user": _serialize_user(user),
        })


# ── Magic-link views (commented out — requires email provider) ─────────────────
#
# class RequestLoginView(APIView):
#     authentication_classes = []
#     permission_classes = []
#     def post(self, request):
#         from league.models.auth_token import LoginToken
#         email = (request.data.get("email") or "").lower().strip()
#         if not email or "@" not in email:
#             return Response({"error": "A valid email address is required."}, status=400)
#         LoginToken.objects.filter(email=email, is_used=False).update(is_used=True)
#         token_obj = LoginToken.objects.create(email=email)
#         try:
#             _send_magic_link(email, str(token_obj.token), request)
#         except Exception as exc:
#             import logging
#             logging.getLogger(__name__).error("Magic link send failed: %s", exc)
#         return Response({"detail": "If that email is on file, a login link is on its way."})
#
# class VerifyTokenView(APIView):
#     authentication_classes = []
#     permission_classes = []
#     def get(self, request):
#         from league.models.auth_token import LoginToken
#         raw = request.query_params.get("token", "").strip()
#         if not raw:
#             return Response({"error": "Missing token parameter."}, status=400)
#         try:
#             token_obj = LoginToken.objects.get(token=raw)
#         except LoginToken.DoesNotExist:
#             return Response({"error": "Invalid or expired login link."}, status=400)
#         if not token_obj.is_valid:
#             return Response({"error": "This login link has already been used or has expired."}, status=400)
#         token_obj.is_used = True
#         token_obj.save(update_fields=["is_used"])
#         user, _ = _get_or_create_user(token_obj.email)
#         auth_token, _ = _get_or_create_auth_token(user)
#         return Response({"token": auth_token, "user": _serialize_user(user)})


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
        "username": user.username,
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
        users = User.objects.all().order_by("username")
        return Response([_serialize_user(u, include_teams=False) for u in users])


class UserInviteView(IsAdminUser, APIView):
    """
    POST /api/auth/users/invite/
    Body: { username, email (optional), password (optional), first_name, last_name,
            is_board_member, is_coach, is_umpire }

    Creates the user (or updates roles if username already exists). If a
    password is supplied the admin sets it directly; otherwise a random
    12-character one is generated. Either way the password is returned once
    in the response so the admin can share it with the user out-of-band.
    """
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import secrets
        import string

        err = self._require_admin(request)
        if err:
            return err

        from league.models import User

        username = (request.data.get("username") or "").strip()
        if not username:
            return Response({"error": "A username is required."}, status=status.HTTP_400_BAD_REQUEST)

        email = (request.data.get("email") or "").lower().strip()

        # Find or create the user
        try:
            user = User.objects.get(username=username)
            created = False
        except User.DoesNotExist:
            user = User.objects.create_user(username=username, email=email, password=None)
            created = True

        # Update fields
        if email:
            user.email = email
        user.first_name = request.data.get("first_name", user.first_name) or ""
        user.last_name = request.data.get("last_name", user.last_name) or ""
        user.is_board_member = bool(request.data.get("is_board_member", user.is_board_member))
        user.is_coach = bool(request.data.get("is_coach", user.is_coach))
        user.is_umpire = bool(request.data.get("is_umpire", user.is_umpire))
        user.is_active = True

        password = (request.data.get("password") or "").strip()
        if password and len(password) < 8:
            return Response(
                {"error": "Password must be at least 8 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not password:
            # Generate a random 12-character password (letters + digits)
            alphabet = string.ascii_letters + string.digits
            password = "".join(secrets.choice(alphabet) for _ in range(12))
        user.set_password(password)
        user.save()

        data = _serialize_user(user, include_teams=False)
        data["generated_password"] = password  # shown once to admin

        return Response(data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


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


class UserSetPasswordView(IsAdminUser, APIView):
    """
    POST /api/auth/users/<pk>/set-password/
    Body: { "password": "..." }   (optional)

    Admin only. Sets the user's password directly to the given value, or,
    if no password is supplied, generates a random 12-character one. The
    password is returned once in the response so the admin can share it
    with the user out-of-band — same pattern as the invite flow.
    """
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        import secrets
        import string

        err = self._require_admin(request)
        if err:
            return err

        from league.models import User
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        password = (request.data.get("password") or "").strip()
        generated = False
        if not password:
            alphabet = string.ascii_letters + string.digits
            password = "".join(secrets.choice(alphabet) for _ in range(12))
            generated = True
        elif len(password) < 8:
            return Response(
                {"error": "Password must be at least 8 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(password)
        user.save(update_fields=["password"])

        # Setting a password server-side invalidates any existing session,
        # so issue a fresh auth token the next time this user logs in by
        # dropping the old one rather than leaving a stale token active.
        from rest_framework.authtoken.models import Token
        Token.objects.filter(user=user).delete()

        data = _serialize_user(user, include_teams=False)
        if generated:
            data["generated_password"] = password  # shown once to admin
        return Response(data)
