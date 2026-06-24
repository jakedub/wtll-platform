# User Roles & Settings Module — Design Doc
**Date:** 2026-06-24  
**Status:** Approved

---

## Problem

The platform has binary authentication — you're either logged in (full access to everything) or using a public page (no auth). There is no way to give an umpire or coach a scoped login, no way to invite users before they first log in, and no admin UI to manage who has what role. The existing `is_coach` flag exists but is not surfaced anywhere in the UI, and there's no umpire or board member concept on user accounts.

---

## Goals

1. Add `is_umpire` and `is_board_member` role flags to the User model alongside the existing `is_coach` and `is_staff`.
2. Build a Settings page (admin-only) for inviting users and managing their roles.
3. Gate the relevant public-facing pages so they require the appropriate role to view.
4. Default "Pitchers Only" filter to enabled on both Pitch Log and Pitch Count pages.

---

## Non-Goals

- The board member role is a placeholder — it will have scoped access restrictions in a future pass. For now it grants the same public-page access as admin.
- No changes to the full protected app nav (all authenticated users still see all nav items for now).
- No password-based auth — magic link only.

---

## Roles

Four independent boolean flags on `User`. A user can hold multiple roles.

| Flag | Existing? | Meaning |
|---|---|---|
| `is_staff` | ✅ Yes | Full admin access — Django staff |
| `is_board_member` | ❌ New | Board-level access (less than admin, TBD) |
| `is_coach` | ✅ Yes | Coach access — tied to one or more teams |
| `is_umpire` | ❌ New | Umpire access |

---

## Public Page Access Matrix

| Page | Always Public | Required Role (if not public) |
|---|---|---|
| `/public/volunteer-signups` | ✅ Yes (if enabled) | — |
| `/public/evaluations` | ✅ Yes (if enabled) | — |
| `/public/umpire-signups` | ❌ No | is_umpire OR is_staff OR is_board_member |
| `/public/pitch-log` | ❌ No | is_coach OR is_staff OR is_board_member |
| `/public/pitch-count` | ❌ No | is_coach OR is_umpire OR is_staff OR is_board_member |
| `/public/softball-innings` | ❌ No | is_coach OR is_staff OR is_board_member |

Pages that require a role show a "Sign in to access" prompt if the visitor is not logged in, or a "Not authorized" message if they're logged in with insufficient role.

---

## Backend Changes

### 1. User Model (`backend/league/models/user.py`)

Add two fields:

```python
is_umpire = models.BooleanField(default=False)
is_board_member = models.BooleanField(default=False)
```

### 2. Migration

`0052_user_umpire_board_member.py` — adds both fields.

### 3. `_serialize_user` (`backend/league/views/auth.py`)

Add to the returned dict:
```python
"is_umpire": user.is_umpire,
"is_board_member": user.is_board_member,
```

### 4. New Endpoints

All three require `is_staff=True` (admin only).

#### `GET /api/auth/users/`
Returns all users ordered by email. Fields: `id`, `email`, `first_name`, `last_name`, `is_staff`, `is_board_member`, `is_coach`, `is_umpire`, `is_active`, `last_login`, `date_joined`.

#### `POST /api/auth/users/invite/`
Body: `{ email, first_name, last_name, is_board_member, is_coach, is_umpire }`  
Creates the user (or updates roles if email already exists), then sends a magic link immediately.  
Returns the user object.

#### `PATCH /api/auth/users/<id>/`
Allowed fields: `first_name`, `last_name`, `is_board_member`, `is_coach`, `is_umpire`, `is_active`.  
`is_staff` is intentionally excluded — Django staff status managed via Django admin only.  
Returns updated user object.

### 5. Public Page View Gating

Each gated public view gets a helper:

```python
def _check_public_role(request, *, allow_coach=False, allow_umpire=False) -> bool:
    """Returns True if the request has a valid token with sufficient role."""
    from rest_framework.authtoken.models import Token
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Token "):
        return False
    try:
        token = Token.objects.select_related("user").get(key=auth[6:])
        u = token.user
        if u.is_staff or u.is_board_member:
            return True
        if allow_coach and u.is_coach:
            return True
        if allow_umpire and u.is_umpire:
            return True
    except Token.DoesNotExist:
        pass
    return False
```

Views return `403` with `{"error": "not_authorized"}` if the check fails, or `401` with `{"error": "login_required"}` if no token at all.

---

## Frontend Changes

### 1. `AuthUser` interface (`AuthContext.tsx`)

```typescript
export interface AuthUser {
  // ... existing fields ...
  is_umpire: boolean
  is_board_member: boolean
}
```

### 2. `usePublicAuth` hook (new — `src/hooks/usePublicAuth.ts`)

Reads the stored token and user from localStorage (same as AuthContext but usable outside the protected app shell). Used by gated public pages to check role without redirecting.

```typescript
export function usePublicAuth() {
  // returns { user: AuthUser | null, hasRole: (role) => boolean }
}
```

### 3. Gated public pages

Each gated public page wraps its content in a `<PublicRoleGate>` component:

```tsx
<PublicRoleGate requires={["is_coach", "is_staff", "is_board_member"]}>
  {/* page content */}
</PublicRoleGate>
```

`PublicRoleGate` renders:
- The page content if the user has any of the required roles
- A "Sign in" prompt (with a link to `/login`) if no token is present
- A "You don't have access to this page" message if logged in but wrong role

### 4. Settings Page (`src/pages/SettingsPage.tsx`)

Admin-only. Placed in the Board section nav as "Settings" or "User Management."

**Layout:** Two tabs — **Users** (active) and **Site Settings** (stub for future use).

**Users tab:**
- Search bar (filters by name or email client-side)
- Table columns: Email, Name, Roles (chips), Last Login, Active (toggle)
- Role chips: colored per role — Admin (red), Board (purple), Coach (blue), Umpire (orange)
- Click a row → inline expansion or slide-out panel with editable fields:
  - First Name, Last Name
  - Role checkboxes: Board Member, Coach, Umpire (Admin is read-only, shown greyed)
  - Active toggle
  - Save / Cancel
- **Invite User** button (top right) → dialog:
  - Email (required)
  - First Name, Last Name (optional — user can fill in after login)
  - Role checkboxes
  - "Send Invite" → POST `/api/auth/users/invite/` → magic link sent

### 5. Pitch Log & Pitch Count — "Pitchers Only" default

Both pages initialize their player filter state with `pitchersOnly: true`.

On **Pitch Log (`/pitch-log`)** and **Public Pitch Log (`/public/pitch-log`)**:
- Toggle: "Pitchers Only" (default ON) — filters player list to `is_pitcher=True` (or however the pitcher flag is stored)
- When OFF: shows all players who have logged pitches regardless of position

On **Pitch Count (`/teams`)** and **Public Pitch Count (`/public/pitch-count`)**:
- Same toggle, same default
- Coaches see only their tied teams' divisions (all teams they head-coach or assistant-coach)

### 6. Nav — Settings entry

Added to the Board section in `navConfig.tsx`:
```tsx
{ label: 'Settings', path: '/settings', icon: <SettingsIcon />, description: 'User accounts, roles, and site configuration.' }
```

Route added in `App.tsx`: `<Route path="/settings" element={<SettingsPage />} />`

---

## Data Flow — Invite

```
Admin fills Invite dialog
  → POST /api/auth/users/invite/  { email, roles }
  → Backend creates User with roles set
  → Backend creates LoginToken
  → Backend sends magic link email
  → Admin sees new user appear in table (pending last_login = null)
User clicks email link
  → GET /api/auth/verify/?token=<uuid>
  → Returns DRF token + user profile (with roles)
  → Frontend stores token, redirects to app
```

---

## Migration Path

1. Add `is_umpire`, `is_board_member` fields (migration 0052) — all default `False`, non-breaking.
2. Existing `is_coach=True` users are unaffected — their flag is already set correctly.
3. No data backfill needed.
