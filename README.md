# WTLL Platform

**Washington Township Little League — League Operations Platform**

A full-stack Django + React application for managing youth baseball and softball league operations. Built as a modular system covering the full player and board workflow: import → eligibility → evaluation → draft → schedule → in-season tracking → board operations → finance.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Django 5.2 + Django REST Framework |
| Frontend | React 18 + Vite + Material UI v5 |
| Database | PostgreSQL (Neon) |
| Geocoding | Google Maps Geocoding API |
| District Check | Shapely + GeoPandas (KML boundary file) |
| Auth | Email + password (DRF Token Auth) |
| Deployment | Render (backend) + Vercel (frontend) |

---

## Project Structure

```
wtll-platform/
├── backend/
│   ├── league/
│   │   ├── models/              # All domain models (one file per domain)
│   │   ├── views/               # API views (one file per domain)
│   │   ├── serializers/         # DRF serializers
│   │   ├── services/            # Business logic
│   │   │   ├── pitching_engine.py
│   │   │   ├── google_maps.py
│   │   │   ├── geocoding.py
│   │   │   ├── tiers.py
│   │   │   ├── division_mapper.py
│   │   │   ├── jersey_normalizer.py
│   │   │   └── boolean_parser.py
│   │   ├── utils/
│   │   │   └── district.py      # KML parsing + boundary checks
│   │   ├── static/
│   │   │   └── wtll_district_boundaries.kml
│   │   ├── form_templates/      # Excel templates for generated forms
│   │   │   └── OOB_template.xlsx
│   │   ├── management/commands/ # Seed commands
│   │   │   └── seed_board_hub.py
│   │   └── urls.py
│   └── wtll/                    # Django project config
│       ├── settings.py
│       ├── urls.py
│       └── wsgi.py
├── frontend/
│   └── src/
│       ├── api/                 # Axios client + typed API modules
│       ├── pages/               # Route-level pages
│       ├── components/          # Shared UI (AppLayout, nav, etc.)
│       ├── config/
│       │   └── navConfig.tsx    # Section nav + route config
│       ├── context/
│       │   ├── AuthContext.tsx        # Auth state (token + user)
│       │   └── AppSettingsContext.tsx # League branding + module flags
│       └── theme/               # Dynamic MUI theme (colors from DB)
├── docs/
│   └── plans/                   # Design docs and migration plans
└── README.md
```

---

## Local Development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # fill in values
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_board_hub # seed Operations Hub calendar + checklist
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local      # set VITE_API_URL
npm run dev
```

---

## Environment Variables

### Backend (`backend/.env`)
```
SECRET_KEY=your-secret-key-here
DEBUG=True
DATABASE_URL=                    # Neon connection string
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
GOOGLE_MAPS_API_KEY=             # required for address geocoding
RESEND_API_KEY=                  # or SendGrid — for magic-link emails
FROM_EMAIL=noreply@yourleague.com
FRONTEND_URL=http://localhost:5173
```

### Frontend (`frontend/.env.local`)
```
VITE_API_URL=http://localhost:8000
```

---

## Features

The full feature list now lives in the WTLL Obsidian vault (Personal/WTLL/wtll-platform README.md) instead of here, so there is a single source of truth. See that note for what is shipped, plus WTLL TODO.md and WTLL Kanban.md for known gaps and the longer-term roadmap.

---

## Data Model Highlights

### Division
```python
Division.name              # e.g., "Majors", "AAA"
Division.program_type      # "RECREATION" or "SHOWCASE"
Division.is_calendar_only  # True = Field Rental (excluded from schedule generator)
Division.program           # FK to Program (.sport = "baseball" | "softball")
```

### Team
```python
Team.coach                 # CharField — head coach name
Team.assistant_coach       # CharField — comma-separated assistant names
Team.coach_user            # FK to User (optional)
Team.assistant_coach_user  # FK to User (optional)
```

### LeagueIdentity (Singleton)
```python
LeagueIdentity.league_name      # Full official name
LeagueIdentity.short_name       # Abbreviation (e.g. "WTLL")
LeagueIdentity.little_league_id # Used on OOB waiver forms
LeagueIdentity.primary_color    # Hex — drives the entire MUI theme
LeagueIdentity.secondary_color  # Hex
```

### SiteSettings (Singleton)
```python
SiteSettings.module_finance_enabled     # bool
SiteSettings.module_baseball_enabled    # bool
SiteSettings.module_softball_enabled    # bool
SiteSettings.module_schedule_enabled    # bool
SiteSettings.module_involvement_enabled # bool
```

### Vendor / VendorLocation
```python
Vendor.products        # Comma-separated product list
Vendor.account_number  # Our account number with this vendor
Vendor.account_name    # Name on the account (may differ from league name)
VendorLocation.label   # e.g. "Fishers", "Indianapolis"
VendorLocation.is_primary  # Primary / preferred location
```

### BoardCalendarEvent / BoardChecklistItem
```python
BoardCalendarEvent.month_year  # e.g. "2026-06"
BoardCalendarEvent.phase       # e.g. "Pre-Season", "Opening Day"
BoardCalendarEvent.color       # red | gold | green | blue | purple | orange
BoardChecklistItem.group       # marketing | budget | fallball | allstars | ...
BoardChecklistItem.item_type   # hard | action | allstar | showcase | ...
```

---

## API Highlights

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/settings/public/` | League identity + module flags (no auth) |
| PATCH | `/api/settings/site/` | Update site settings + module toggles (admin) |
| PATCH | `/api/settings/league-identity/` | Update branding colors, name, ID (admin) |
| POST | `/api/schedules/generate/` | Generate round-robin or practice schedule |
| POST | `/api/schedules/export/` | Export schedule to SportsConnect xlsx |
| GET | `/api/vendors/` | List vendors with locations nested |
| POST | `/api/vendors/<id>/locations/` | Add a location to a vendor |
| GET | `/api/board-hub/calendar/` | List calendar events (filterable by ?year=) |
| GET | `/api/board-hub/checklist/` | List checklist items (filterable by ?group=) |
| GET | `/api/forms/oob/` | Download pre-filled OOB waiver xlsx |
| POST | `/api/players/import/` | Import SportsConnect CSV |
| POST | `/api/pitch-count/` | Log pitches for a game |
| POST | `/api/geocode/batch/` | Geocode all un-geocoded players |
| POST | `/api/district/check/` | Run district boundary check |
| GET | `/api/fundraising/plans/` | List fundraising plans with line items |
| GET | `/api/budget/summary/` | Budget summary with totals |

---

## Deployment

The production stack uses three managed services: **Neon** (PostgreSQL database), **Render** (Django backend), and **Vercel** (React frontend). Deploy in that order — database first, then backend, then frontend.

**Production URLs**
| Service | URL |
|---|---|
| Django Admin | `https://wtll-backend.onrender.com/admin/` |
| Backend API | `https://wtll-backend.onrender.com/api/` |

---

### 1. Neon (Database)

[Neon](https://neon.tech) is a serverless Postgres platform. Sign in with GitHub.

**Create a project**
- Project name: e.g. `wtll-platform`
- Region: closest to your users (e.g. AWS US East 2)
- Postgres version: 16 (default). Skip Neon Auth.

**Get your connection string**
After the project is created, go to **Dashboard → Connection Details**. Select Role: `neondb_owner`, Database: `neondb`, Connection type: **Pooled connection** (hostname contains `-pooler`).

Copy the full pooled connection string:
```
postgresql://neondb_owner:<password>@ep-<name>-pooler.<region>.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

This becomes your `DATABASE_URL` in Railway. If it is ever exposed, rotate it immediately in **Neon → Settings → Roles → Reset password**.

---

### 2. Railway (Django Backend)

[Railway](https://railway.app) builds and runs the Django app from your GitHub repo.

**Create a service**
1. Sign in → New Project → Deploy from GitHub repo → select your repo
2. Before the first deploy succeeds, configure the root directory (see below) — without it Railway tries to build from the repo root and fails

**Set the root directory**
In your service → **Settings → Source → Root Directory**, enter `backend`. Railway will now install dependencies and run gunicorn from inside `backend/`.

**Configure environment variables**
In your service → **Variables**, add:

| Key | Value |
|---|---|
| `DATABASE_URL` | Your Neon **pooled** connection string |
| `SECRET_KEY` | A long random string — generate with `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | `*.up.railway.app` (or your custom domain) |
| `CORS_ALLOWED_ORIGINS` | Your Vercel frontend URL, e.g. `https://wtll-platform.vercel.app` (fill in after Vercel deploys) |
| `FRONTEND_URL` | Same Vercel URL |
| `GOOGLE_MAPS_API_KEY` | Required for address geocoding — Google Cloud Console |
| `RESEND_API_KEY` | Reserved for future email features — currently bypassed |
| `FROM_EMAIL` | e.g. `noreply@yourdomain.com` |

**Generate a public domain**
In your service → **Settings → Networking → Generate Domain**. Copy this URL — you'll need it for Vercel's `VITE_API_URL`.

**nixpacks.toml**
`backend/nixpacks.toml` explicitly lists all required Nix packages so Railway builds correctly:
```toml
[phases.setup]
nixPkgs = ["python3", "postgresql_16.dev", "gcc", "stdenv.cc.cc.lib"]
```
`stdenv.cc.cc.lib` provides `libstdc++.so.6` which pandas and numpy require. Railway picks this file up automatically.

**Run migrations and seed data**
Once the first deploy is live, open your service → **Console** tab and run:

```bash
# Apply all migrations
/opt/venv/bin/python manage.py migrate

# Create your admin account
/opt/venv/bin/python manage.py createsuperuser

# Seed league identity, site settings, and board hub calendar + checklist
/opt/venv/bin/python manage.py seed_production
```

`seed_production` is safe to re-run — it uses `get_or_create` throughout.

**Healthcheck**
Railway monitors `/api/settings/public/` (configured in `railway.toml`). This endpoint requires no auth and is used to confirm the app is up.

---

### 3. Vercel (React Frontend)

[Vercel](https://vercel.com) builds the Vite/React app and serves it as a static site with client-side routing.

**Create a project**
1. Sign in → Add New Project → Import Git Repository → select your repo
2. Set **Root Directory** to `frontend`
3. Framework preset: **Vite**

**Add environment variables**
In Project → **Settings → Environment Variables**:

| Key | Value |
|---|---|
| `VITE_API_URL` | Your Railway backend URL, e.g. `https://wtll-platform-production.up.railway.app` — no trailing slash |

`VITE_API_URL` is baked into the JS bundle at build time. If you change it, redeploy.

**vercel.json**
`frontend/vercel.json` rewrites all routes to `index.html` so React Router handles navigation. No additional Vercel config needed.

---

### 4. Post-Deploy: Update Railway CORS

After Vercel gives you a URL, go back to Railway → Variables and update:

```
CORS_ALLOWED_ORIGINS=https://wtll-platform.vercel.app
FRONTEND_URL=https://wtll-platform.vercel.app
```

Trigger a redeploy on Railway. This ensures API calls are accepted from your frontend domain.

---

### 5. First Login

1. Open your Vercel URL → log in with the superuser email and password you set via `createsuperuser`
2. Go to **Settings → League Identity** → update name, colors, Little League ID
3. Go to **Settings → Site Settings** → toggle modules on/off for your league
4. Go to **Settings → Users** → create accounts for coaches and board members (password shown once at creation)

Alternatively, use the Django admin at `https://wtll-backend.onrender.com/admin/` with the superuser credentials you created in the console.

---

### Provisioning a second league

The current model is one deployment per league (separate Neon project, Railway service, and Vercel project each). Steps:

1. Create a new Neon project → copy the pooled `DATABASE_URL`
2. Create a new Railway service from the same repo → set Root Directory to `backend`, add all env vars
3. Create a new Vercel project from the same repo → set Root Directory to `frontend`, set `VITE_API_URL` to the new Railway URL
4. Run `migrate`, `createsuperuser`, and `seed_production` in the Railway console
5. Log in → Settings → League Identity → configure name, colors, ID
6. Settings → Site Settings → toggle off unused modules

See `docs/plans/multi-tenant-migration.md` for the roadmap to a shared multi-tenant deployment.

---

## Roadmap

The completed roadmap, known gaps, and longer-term plans now live in the WTLL Obsidian vault (WTLL TODO.md and WTLL Kanban.md), not here, so progress is tracked in one place.
