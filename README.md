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
| Auth | Passwordless magic-link (DRF Token Auth) |
| Deployment | Railway (backend) + Vercel (frontend) |

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

### ✅ Authentication (Magic Link / Passwordless)
Board members and coaches log in via a one-time email link — no passwords. Links expire after a configurable window (default 15 minutes, adjustable in Site Settings). User roles: Staff (admin), Board Member, Coach, Umpire.

---

### ✅ Pre-Season Workflow

**Player Import (SportsConnect CSV)**
Upload enrollment CSV files exported from SportsConnect. Upserts players on `first_name + last_name + date_of_birth`. Returns an insert/update/failure report. Handles sibling detection across enrollment records.

**Address & District Validation**
Three-step: geocode addresses via Google Maps → check KML boundary → mark eligibility. Feeder school exceptions supported. Batch geocode runs on all un-geocoded players at once. Boundary check can be run per-player or in bulk. KML for the WTLL district is stored server-side and regenerated on demand.

**Player Evaluations**
Score players 1–5 on hitting, fielding, throwing, pitching, and catching. Automatic tier assignment. CSV import/export. Print forms for eval day. Public sign-up portal (no auth) for families to register for eval slots.

**Draft Engine**
Full draft room — snake format, tier indicators, balance panel (player/pitcher/catcher counts + avg score per team), undo picks, XLSX export with draft results + jersey roster sheet. Separate drafts for baseball and softball.

**Out-of-Boundary Waiver Form**
Generates a pre-filled OOB waiver request form (XLSX) for download. Automatically fills in league name, Little League ID number, and the current president's name and email from the Board Members database.

---

### ✅ Schedule Generator
Full round-robin schedule generation with SportsConnect xlsx export.

**Custom Mode** — manually build a schedule row by row with team dropdowns, field defaults, editable cells, and single-row delete.

**Automate Mode** (5-step wizard)
- Step 1 — Setup: sport, division, event type, games/practices per team
- Step 2 — Other Leagues: add external league teams to the round-robin pool
- Step 3 — Dates & Days: start date, days of week
- Step 4 — Start Times: weeknight and weekend time slots
- Step 5 — Location & Fields: default location and field

**Coach Conflict Detection** — flags scheduling conflicts where the same coach is on two overlapping games:
- 🔴 Red — head coach double-booked
- 🟣 Purple — assistant coach overlap
- 🩷 Pink — coach is also a board member (informational)

**Round-Robin Algorithm** — circle method with home/away balancing, bye injection for odd team counts, and cyclic round repetition to fill the target game count.

---

### ✅ Baseball Operations

**Pitch Count Tracking**
Log and track pitcher usage per Little League rest rules.

| Pitches | Required Rest |
|---|---|
| 1–20 | 0 days |
| 21–35 | 1 day |
| 36–50 | 2 days |
| 51–65 | 3 days |
| 66+ | 4 days |

Status outputs: `AVAILABLE` / `CAUTION` / `REST`. Public read-only view available without login.

**All Stars**
Track all-star selections by division, generate TVF forms, print enrollment paperwork for tournament directors. Separate flows for baseball and softball All Stars.

**Team Management**
Assign coaches (head + assistant), manage rosters, view team schedules.

---

### ✅ Softball Operations
Separate softball player roster, inning log (tracks innings pitched per player with rest-day rules), team management, and All Stars — all parallel to the baseball module. Each softball module is independently toggle-able.

---

### ✅ Team Calendars & ICS Subscriptions
Per-team calendars with ICS feed URLs for Google Calendar / Apple Calendar / Outlook sync. Public links work without login. Calendar management page lists all subscribed feeds.

---

### ✅ Volunteer & Umpire Sign-Ups
Public sign-up forms (no auth required) for umpire availability and volunteer slots (grounds crew, concessions). Admins can enable/disable each public form from Site Settings. Concessions close button marks a game as closed for volunteers.

---

### ✅ Board Hub — Operations Hub
The central hub for board planning throughout the year. All data is DB-backed and fully editable.

**Calendar Tab**
- Year filter chips (All Years, 2026, 2027, …)
- Events grouped by month with phase labels and color-coded chips
- Add/edit/delete events per month
- Seed command populates a full league-year calendar (June → July following year)

**Checklist Tab**
- Filter by item type (Hard Deadline, Action Item, etc.) and group
- Full CRUD with date window, owner, type, and group fields

**Dedicated tabs for planning groups:**
- Marketing, Budget, Fall Ball, All Stars, Showcase, Fundraising, Tee Ball
- Each tab shows only its group's checklist items
- Tab visibility is per-browser customizable (gear icon with toggle popover)
- Required tabs (Calendar, Checklist) are always shown

**Assignments Tab** — Board role assignment overview.

---

### ✅ Finance

**Budget**
Annual operating budget with income and expense line items. Line items have category, description, budgeted amount, and actual amount. Budget approval workflow (mark as approved with date). XLSX export. Multi-year support with year copy.

**Fundraising**
Capital improvement campaign tracking with multi-plan support.
- Plans with target amounts and descriptions
- Line items within each plan (drag-to-reorder)
- Campaigns (fundraising drives) with goal amounts
- Deposit tracking per campaign with date and amount
- Progress bars per plan and summary totals
- Overall summary: total raised vs. total goal

---

### ✅ Board Members
Board roster with roles, contact info (phone, email), and active/inactive status. President name and email auto-populate on TVF forms and OOB waiver forms. Board members are separate from system users.

---

### ✅ District Leadership
District and HQ contact directory — name, role/position, phone, email. Separate from the internal board member list.

---

### ✅ Documents & Bylaws
File library organized into folders (Bylaws & Policies, All Star Forms, Coach Resources, Player Eligibility Forms). Static files are served directly. API-generated files (like the OOB waiver) show a "Pre-filled" badge and download on demand.

---

### ✅ Boundaries
Interactive map showing WTLL, District 8, and District 7 league boundaries. KML file stored server-side. Boundary leagues are manageable (add/edit/delete). KML can be regenerated from stored boundary data.

---

### ✅ Vendors & Suppliers
Vendor contact directory organized by category (Uniforms, Equipment, Facilities, etc.).

- **Products/Services** — comma-separated list displayed as chips (e.g. Field chalk, Mound clay chips)
- **Account Info** — account number and name-on-account; yellow warning shown when the account is under a different name (e.g. a former league name)
- **Multiple Locations** — each vendor can have multiple physical locations (Fishers, Indianapolis) with primary flag, address, website, phone, and notes. Locations are editable inline on the card.
- Filtered by category chips; searchable across name, contact, products, and account fields
- Board role assignment (who manages this vendor relationship)

---

### ✅ Locations
Manage parks, complexes, and fields used by WTLL. Each location can have multiple fields. Used as defaults in the schedule generator.

---

### ✅ League Identity & Branding (White-Label Ready)

Configured in Settings → League Identity. Changes take effect immediately across the app — no rebuild required.

- League name, short name, tagline
- City and state
- Little League ID number (auto-fills OOB waiver forms)
- Contact email and website URL
- **Primary color** — updates the entire MUI theme (buttons, chips, nav active state, etc.)
- **Secondary color** — available for future use

The frontend fetches branding from `/api/settings/public/` on load and rebuilds the MUI theme dynamically using the stored hex colors.

---

### ✅ Site Settings
Admin-only controls in Settings → Site Settings.

**Public Pages** — toggle each public-facing sign-up form on/off:
- Umpire Sign-Ups
- Volunteer Sign-Ups
- Evaluation Sign-Ups

**Authentication** — configure magic link expiry window (15 min → 24 hr).

**Season** — set the default program year used by pitch log and other pages.

**Module Configuration** — enable/disable entire nav sections for deployments that don't use all features:
- Finance (Budget + Fundraising)
- Baseball Ops
- Softball Ops
- Schedule
- Involvement (Umpires, Volunteers, Evaluations)

Board and Pre-Season sections are always visible. Toggling a module immediately updates the nav without a page refresh.

---

### ✅ Platform Guide
Step-by-step walkthrough accessible from the nav rail. Covers Pre-Season, Baseball Ops, Softball Ops, Schedule, Board Ops, Finance, and Involvement sections.

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

## Deployment (Railway + Vercel + Neon)

### After merging migrations, run on Railway:
```bash
python manage.py migrate
python manage.py seed_board_hub  # first time only
```

### Provisioning a second league (current model — one deployment per league):
1. Create a new Neon project → copy `DATABASE_URL`
2. Create a new Railway service from the same repo → set env vars
3. Create a new Vercel project → set `VITE_API_URL`
4. SSH into Railway → `python manage.py createsuperuser && python manage.py migrate`
5. Log in → Settings → League Identity → configure name, colors, ID
6. Settings → Site Settings → toggle off unused modules

See `docs/plans/multi-tenant-migration.md` for the roadmap to a shared multi-tenant deployment.

---

## Roadmap

### Completed
- [x] Magic-link authentication (passwordless)
- [x] User roles (staff, board member, coach, umpire)
- [x] Player Import (SportsConnect CSV)
- [x] Address & District Validation (Google Maps + KML)
- [x] Player Evaluations + public sign-up portal
- [x] Baseball Draft Engine (snake format, XLSX export)
- [x] Softball Draft Engine
- [x] Pitch Count module with rest-day rules
- [x] Softball Inning Log
- [x] All Stars (baseball + softball, TVF + enrollment forms)
- [x] Out-of-Boundary Waiver Form (pre-filled from DB)
- [x] Schedule Generator (Custom + Automate modes)
- [x] Coach Conflict Detection (time-overlap based)
- [x] Team Calendars + ICS subscriptions
- [x] Volunteer & Umpire Sign-Up management
- [x] Board Hub — Operations Calendar (DB-backed, editable)
- [x] Board Hub — Checklist (DB-backed, grouped, editable)
- [x] Board Hub — Marketing, Budget, Fall Ball, All Stars, Showcase, Fundraising, Tee Ball tabs
- [x] Board Hub — customizable tab visibility (per-browser)
- [x] Finance — Budget (multi-year, XLSX export)
- [x] Finance — Fundraising (multi-plan, campaigns, deposits, progress tracking)
- [x] Board Members directory
- [x] District Leadership directory
- [x] Vendor directory with products, account info, and multi-location support
- [x] Boundaries map (KML, interactive)
- [x] Locations & Fields management
- [x] Documents & Bylaws file library
- [x] League Identity (name, colors, Little League ID)
- [x] Dynamic theming — primary/secondary colors from DB update the entire MUI theme
- [x] Site Settings (public page toggles, auth config, module enable/disable)
- [x] Platform Guide
- [x] White-label / multi-league module toggle system

### Planned
- [ ] Multi-tenant architecture (see `docs/plans/multi-tenant-migration.md`)
- [ ] Push notifications for schedule changes
- [ ] Mobile-optimized score entry
- [ ] Sponsor management portal
