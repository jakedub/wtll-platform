# Multi-Tenant Migration Plan

**Status:** Pre-implementation (not started)  
**Prerequisite:** At least 2–3 leagues actively using the single-deployment model  
**Estimated effort:** 3–4 weeks (backend) + 1–2 weeks (frontend + infra)

---

## Overview

The platform currently runs as a **single-tenant** application — one database, one backend deployment, one frontend, one league. This doc outlines the steps to convert it into a **subdomain-based multi-tenant** system where a single deployment serves any number of leagues, each fully isolated.

**Model:** Each league gets its own subdomain, e.g. `wtll.yourplatform.com`, `otherville.yourplatform.com`. The backend reads the subdomain on every request, resolves the tenant, and scopes all queries automatically.

---

## Architecture

```
wtll.yourplatform.com  →  Vercel (one build, reads subdomain)
otherville.yourplatform.com  →  same Vercel build

   ↓

Railway (one Django deployment)
   ↓ reads Host header → resolves Tenant → scopes all queries
   ↓
Neon (one PostgreSQL database, all tenants in same schema)
```

---

## Phase 1 — Backend: Tenant Model + Middleware

### Step 1 — Create the `Tenant` model

Add to `backend/league/models/tenant.py`:

```python
class Tenant(models.Model):
    name       = models.CharField(max_length=150, unique=True)
    subdomain  = models.SlugField(max_length=63, unique=True,
                     help_text="e.g. 'wtll' for wtll.yourplatform.com")
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.subdomain})"
```

Export from `league/models/__init__.py`.

### Step 2 — Add `tenant` FK to all major models

Every model that holds league-specific data needs a FK:

```python
tenant = models.ForeignKey(
    "league.Tenant",
    on_delete=models.CASCADE,
    related_name="+",
    db_index=True,
)
```

**Full list of models to update:**

| Model | File |
|---|---|
| `Player` | `models/players.py` |
| `Team` | `models/teams.py` |
| `Division` | `models/divisions.py` |
| `Program` | `models/program.py` |
| `PitchCount` | `models/pitch_count.py` |
| `PlayerProgramEnrollment` | `models/player_program_enrollment.py` |
| `TeamAssignment` | `models/team_assignment.py` |
| `Event` | `models/event.py` |
| `TeamCalendar` | `models/team_calendar.py` |
| `UmpireSignup` | `models/umpire_signup.py` |
| `Position` | `models/positions.py` |
| `Evaluation` | `models/evaluation.py` |
| `EvaluationSignup` / `EvaluationSignupWindow` | `models/evaluation_signup.py` |
| `EvaluationEvent` / `EvaluationTimeSlot` / `EvaluationRegistration` | `models/evaluation_event.py` |
| `Draft` / `DraftSelection` | `models/draft.py`, `models/draft_selection.py` |
| `AllStarSelection` | `models/allstar_selection.py` |
| `VolunteerSignup` | `models/volunteer_signup.py` |
| `BudgetLine` / `BudgetApproval` | `models/budget.py` |
| `UploadedDocument` | `models/document.py` |
| `SoftballInningLog` | `models/softball_inning_log.py` |
| `BoardMember` | `models/board_member.py` |
| `DistrictLeader` | `models/district_leader.py` |
| `Vendor` / `VendorLocation` | `models/vendor.py` |
| `BoundaryLeague` / `GeneratedKML` | `models/boundary.py` |
| `LeagueLocation` / `LocationField` | `models/location.py` |
| `FundraisingPlan` / `FundraisingLineItem` / `FundraisingCampaign` / `FundraisingDeposit` | `models/fundraising.py` |
| `BoardCalendarEvent` / `BoardChecklistItem` | `models/board_hub.py` |
| `PublicSignupConfig` | `models/public_signup_config.py` |

**Singleton models — replace with per-tenant instances:**

`SiteSettings` and `LeagueIdentity` are currently singletons (always `pk=1`). Convert them to regular models with a `OneToOneField(Tenant)` instead:

```python
class LeagueIdentity(models.Model):
    tenant        = models.OneToOneField(Tenant, on_delete=models.CASCADE, related_name="identity")
    league_name   = models.CharField(...)
    primary_color = models.CharField(...)
    # ... all existing fields
```

Remove the `save()` singleton override and `.get()` classmethod; replace with `request.tenant.identity`.

### Step 3 — Write the migration

Create `migrations/0069_add_tenant.py`. This is the most careful migration in the project:

1. Create the `Tenant` table.
2. Create a default tenant (for the existing WTLL data):
   ```python
   def create_default_tenant(apps, schema_editor):
       Tenant = apps.get_model("league", "Tenant")
       Tenant.objects.create(id=1, name="Washington Township Little League", subdomain="wtll")
   ```
3. Add `tenant` FK columns to all models **with `default=1`** (the WTLL tenant) so existing rows are valid.
4. Remove defaults once backfill is confirmed.

Run locally first, verify row counts, then deploy.

### Step 4 — Tenant-resolution middleware

Create `backend/league/middleware/tenant.py`:

```python
import threading
from django.http import Http404
from league.models.tenant import Tenant

_thread_local = threading.local()

def get_current_tenant():
    return getattr(_thread_local, "tenant", None)

class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        host = request.get_host().split(":")[0]  # strip port
        subdomain = host.split(".")[0]           # e.g. "wtll"

        # Allow admin and health-check routes to pass without a tenant
        if subdomain in ("admin", "api", "localhost", "127"):
            _thread_local.tenant = None
            return self.get_response(request)

        try:
            tenant = Tenant.objects.select_related(
                "identity", "settings"
            ).get(subdomain=subdomain, is_active=True)
        except Tenant.DoesNotExist:
            raise Http404(f"No active league found for subdomain '{subdomain}'")

        _thread_local.tenant = tenant
        request.tenant = tenant
        return self.get_response(request)
```

Register in `wtll/settings.py`:
```python
MIDDLEWARE = [
    "league.middleware.tenant.TenantMiddleware",
    # ... existing middleware
]
```

### Step 5 — Scope all queries in views

Replace direct queryset usage with tenant-filtered versions. Two approaches:

**Option A — Manual (simple, explicit):** In each view, add `.filter(tenant=request.tenant)`:

```python
# Before
players = Player.objects.all()

# After
players = Player.objects.filter(tenant=request.tenant)
```

**Option B — Manager-based (recommended):** Add a `TenantManager` to each model:

```python
class TenantManager(models.Manager):
    def for_request(self, request):
        return self.get_queryset().filter(tenant=request.tenant)
```

Use `Player.objects.for_request(request)` everywhere.

**Option C — django-scopes (best for scale):** Install `django-scopes` and wrap views with `@scope({"tenant": request.tenant})`. Raises an error if any query escapes the scope accidentally.

**Recommendation:** Start with Option A (explicit), then refactor to django-scopes when comfortable.

### Step 6 — Update singleton-pattern views

Replace `SiteSettings.get()` and `LeagueIdentity.get()` with:

```python
# Before
li = LeagueIdentity.get()

# After
li = request.tenant.identity
ss = request.tenant.settings
```

Update `site_settings.py` view accordingly.

### Step 7 — User ↔ Tenant association

Users need to be scoped to a tenant. Options:

**Simple:** Add `tenant = ForeignKey(Tenant, ...)` to the `User` model. Users can only log into their own tenant.

**Flexible (later):** A `TenantMembership` through-table lets one user belong to multiple leagues (e.g., a district leader).

Start simple. Add `tenant` FK to `User`:

```python
class User(AbstractBaseUser, PermissionsMixin):
    tenant = models.ForeignKey("league.Tenant", on_delete=models.CASCADE, null=True, blank=True)
    # ...
```

On login (`VerifyTokenView`), verify `user.tenant == request.tenant`. Reject if mismatch.

### Step 8 — Auth/email scoping

The magic-link email system sends links to `FRONTEND_URL`. This needs to become `https://{tenant.subdomain}.yourplatform.com` instead of a static env var.

Update `views/auth.py` to build the login URL from `request.tenant.subdomain`:

```python
frontend_url = f"https://{request.tenant.subdomain}.yourplatform.com"
login_link = f"{frontend_url}/auth/callback?token={token.token}"
```

---

## Phase 2 — Frontend: Subdomain Routing

### Step 1 — Identify tenant from subdomain

In `AppSettingsContext.tsx`, the `/settings/public/` endpoint will now automatically return the correct tenant's identity (because the backend resolves it from the subdomain). No frontend change needed for this — it just works.

### Step 2 — Vercel wildcard domain

In your Vercel project settings, add a wildcard domain:

```
*.yourplatform.com
```

Vercel serves the same React build for all subdomains. The backend (Railway) is the one doing tenant resolution.

### Step 3 — CORS update

In `backend/wtll/settings.py`, replace the static `CORS_ALLOWED_ORIGINS` list with a regex:

```python
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://[\w-]+\.yourplatform\.com$",
    r"^http://localhost:\d+$",   # local dev
]
```

### Step 4 — Invite / onboarding flow

When inviting a new user to a specific league, the magic link should point to `https://{subdomain}.yourplatform.com/auth/callback?token=...`. Update `UserInviteView` to build the URL from the request's tenant.

---

## Phase 3 — Provisioning New Leagues

Once multi-tenant is live, provisioning a new league becomes a single admin command:

```python
# backend/league/management/commands/provision_tenant.py

class Command(BaseCommand):
    help = "Provision a new tenant league"

    def add_arguments(self, parser):
        parser.add_argument("--name",      required=True)
        parser.add_argument("--subdomain", required=True)
        parser.add_argument("--admin-email", required=True)
        parser.add_argument("--primary-color", default="#C41230")

    def handle(self, *args, **opts):
        from league.models.tenant import Tenant
        from league.models.site_settings import LeagueIdentity, SiteSettings
        from league.models.user import User

        tenant = Tenant.objects.create(
            name=opts["name"],
            subdomain=opts["subdomain"],
        )
        LeagueIdentity.objects.create(
            tenant=tenant,
            league_name=opts["name"],
            primary_color=opts["primary_color"],
        )
        SiteSettings.objects.create(tenant=tenant)

        # Create the first admin user
        user = User.objects.create(
            email=opts["admin-email"],
            tenant=tenant,
            is_staff=True,
            is_active=True,
        )
        self.stdout.write(self.style.SUCCESS(
            f"Tenant '{opts['subdomain']}' created. Admin: {user.email}"
        ))
```

Run as:
```bash
python manage.py provision_tenant \
  --name "Otherville Little League" \
  --subdomain otherville \
  --admin-email president@otherville.com \
  --primary-color "#0047AB"
```

---

## Phase 4 — Data Isolation Audit

Before going live with a second tenant, run a full isolation audit:

1. **Query audit** — search the codebase for any `.objects.all()`, `.objects.get()`, `.objects.filter()` that don't include `tenant=` or `for_request(request)`. Every instance is a potential data leak.

2. **Test with two tenants** — Create two test tenants, add data to each, and verify that API calls scoped to tenant A never return tenant B's data.

3. **Admin site** — Django admin shows all tenants' data by default. Add `TenantAdmin` mixins or use `django-admin-tenants` to scope the admin UI per-superuser.

4. **File uploads** — If `UploadedDocument` stores files, ensure the file path includes the tenant subdomain (e.g., `uploads/{subdomain}/filename.pdf`) so files can't be guessed across tenants.

---

## Phase 5 — Infrastructure

### Railway
One Railway service continues to serve all tenants. No changes needed unless traffic requires horizontal scaling.

### Neon
One Neon project/database. All tenant data co-exists in the same schema, isolated by the `tenant` FK. This is the simplest model and scales well until tens of thousands of players.

**Alternative for large scale:** Neon's branching feature could give each tenant a database branch, but this adds operational complexity and is not needed at early stage.

### Domain
Point `*.yourplatform.com` as a wildcard CNAME to Vercel. Individual tenants get `{subdomain}.yourplatform.com` automatically.

---

## Migration Order Summary

```
1. Create Tenant model + migration
2. Backfill existing WTLL data with tenant_id=1
3. Convert SiteSettings + LeagueIdentity singletons → per-tenant
4. Add tenant FK to all remaining models
5. Write + test TenantMiddleware locally
6. Add tenant FK to User; update login verification
7. Scope all views (manual filter pass)
8. Update auth email URLs to use tenant subdomain
9. Update CORS to wildcard regex
10. Add Vercel wildcard domain
11. Write provision_tenant management command
12. Audit for unscoped queries
13. Two-tenant smoke test
14. Deploy
```

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Unscoped query leaks tenant B data to tenant A | Use django-scopes (raises on unscoped query); full two-tenant audit before go-live |
| Migration corrupts existing WTLL data | Run migration on a Neon branch first; verify row counts before applying to production |
| Singleton models (SiteSettings, LeagueIdentity) hold wrong state | Refactor to OneToOneField early; test both tenants return independent values |
| File uploads accessible across tenants | Scope upload paths to tenant subdomain; add auth check on file serve |
| Magic links misdirected to wrong subdomain | Build frontend URL from `request.tenant.subdomain`; test invite flow for each tenant |

---

## What Stays the Same

- All existing models, views, and API endpoints — just get filtered
- The React frontend — no routing changes needed
- Deployment infrastructure — one Railway service, one Vercel project, one Neon DB
- Authentication flow — magic link still works; just scoped to the tenant's subdomain
- The `AppSettingsContext` color/module system — already designed to read from the backend, so it will automatically show each tenant's branding
