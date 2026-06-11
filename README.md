# WTLL Platform

**Washington Township Little League — League Operations Platform**

A full-stack Django + React application for managing youth baseball league operations. Built as a modular system covering the full player workflow: import → address validation → evaluation → draft.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Django 4.2 + Django REST Framework |
| Frontend | React 18 + Vite + Material UI |
| Database | PostgreSQL (Render) / SQLite (local dev) |
| Geocoding | Google Maps Geocoding API |
| District Check | Shapely + GeoPandas (KML boundary file) |
| Deployment | Render (backend web service + frontend static site) |

---

## Project Structure

```
wtll-platform/
├── backend/
│   ├── league/
│   │   ├── models/              # Player, Team, Division, PitchCount,
│   │   │                        #   Evaluation, Draft, DraftSelection,
│   │   │                        #   Position, UmpireSignup, etc.
│   │   ├── views/               # API views (one file per domain)
│   │   ├── serializers/
│   │   ├── services/            # Business logic services
│   │   │   ├── pitching_engine.py
│   │   │   ├── google_maps.py   # Google Maps geocoding
│   │   │   ├── geocoding.py     # Batch geocoding
│   │   │   ├── tiers.py         # Evaluation tier calculations
│   │   │   ├── division_mapper.py
│   │   │   ├── jersey_normalizer.py
│   │   │   └── boolean_parser.py
│   │   ├── utils/
│   │   │   └── district.py      # KML parsing + district boundary checks
│   │   ├── static/
│   │   │   └── wtll_district_boundaries.kml    # WTLL district boundary polygon
│   │   └── urls.py
│   └── wtll/                    # Django project config
│       ├── settings.py
│       ├── urls.py
│       └── wsgi.py
├── frontend/
│   └── src/
│       ├── api/                 # API client layer
│       ├── pages/               # Route-level pages
│       ├── components/          # Shared UI components
│       └── theme/               # MUI theme (WTLL red/black/gray)
├── render.yaml
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
DATABASE_URL=                    # leave blank for SQLite in dev
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
GOOGLE_MAPS_API_KEY=             # required for address geocoding
```

### Frontend (`frontend/.env.local`)
```
VITE_API_URL=http://localhost:8000
```

---

## Features

### ✅ Pitch Count Tracking
Log and track pitcher usage per Little League rest rules.

| Pitches | Required Rest |
|---|---|
| 1–20 | 0 days |
| 21–35 | 1 day |
| 36–50 | 2 days |
| 51–65 | 3 days |
| 66+ | 4 days |

Status outputs: `AVAILABLE` / `CAUTION` / `REST`

### ✅ Umpire Sign-Ups
Game-by-game sign-up sheet for AAA and Majors umpires (Plate + Base roles). No authentication required — umpires enter their name and email directly.

### ✅ Player Import (SportsConnect CSV)
Upload enrollment CSV files exported from SportsConnect. The importer upserts players on `first_name + last_name + date_of_birth`, creates program enrollments, normalizes jersey sizes, maps division names, and returns an insert/update/failure report.

Required CSV columns:
- Player First Name, Player Last Name
- Player Street, Player City, Player State, Player Postal Code
- Player Birth Date
- Teammate Request, Coach Request
- Little League School Name

### ✅ Player Evaluations
Score players on a 1–5 scale across hitting (power, contact, form), fielding (form, glove, hustle), throwing (form, speed, accuracy), pitching (speed, accuracy), and catching (receiving, blocking). Tier assignment is automatic based on overall total. Features include:
- Add/edit/delete evaluations via an inline form dialog
- Ranked table sorted by tier, then overall score
- Filter by year and type (pre/post season)
- CSV import with column validation and upsert logic
- CSV export sorted by tier/score for draft prep

### ✅ Draft Engine
Full draft room for assigning eligible players to teams by division:
- Create and manage multiple drafts (one per division/year)
- **Team setup** — select which teams participate in each draft
- **Available pool** — sorted by tier and overall score, filterable by tier; shows pitcher/catcher designations
- **One-click picks** — select a team inline and click Draft to assign a player
- **Undo picks** — remove a player from a team at any time
- **Balance panel** — live team stats showing player count, pitcher count, catcher count, and avg overall score
- **Mark complete** — lock the draft when finished
- **XLSX export** with two sheets: Draft Results (players grouped by team with all eval scores) and Jersey Roster Sheet (jersey size counts per team grouped by division)

### ✅ Address & District Validation
Three-step workflow after import:

1. **Geocode Addresses** — calls Google Maps API to fill `latitude`/`longitude` for all players missing coordinates.
2. **Check District Boundary** — compares coordinates against the WTLL district KML polygon (`wtll_district_boundaries.kml`) using Shapely.
3. **Determine Eligibility** — marks `is_eligible = True` for players who are in district **or** attend an approved feeder school.

**Feeder schools:** Crooked Creek Elementary, Fox Hill Elementary, Greenbriar Elementary, Nora Elementary, Spring Mill Elementary, Towne Meadow Elementary, Willow Lake Elementary, Brebeuf Jesuit Preparatory, Park Tudor, St. Luke Catholic School, St. Monica School, Hasten Hebrew Academy, Sycamore School, Orchard School, International Montessori School, International School of Indiana.

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/players/` | List all players |
| GET | `/api/players/<id>/` | Player detail |
| GET | `/api/players/<id>/pitch-status/` | Current pitch status |
| GET | `/api/players/<id>/pitch-history/` | Full pitch log |
| POST | `/api/players/import/` | Import SportsConnect CSV |
| POST | `/api/pitch-count/` | Log pitches for a game |
| GET | `/api/teams/` | List all teams |
| GET | `/api/umpire/games/` | List AAA/Majors games |
| POST | `/api/umpire/signups/` | Sign up as umpire |
| DELETE | `/api/umpire/signups/<id>/` | Cancel sign-up |
| GET | `/api/geocode/?address=` | Geocode a single address |
| POST | `/api/geocode/batch/` | Geocode all un-geocoded players |
| POST | `/api/district/check/` | Run district check for all geocoded players |
| POST | `/api/district/eligibility/` | Update eligibility for all checked players |
| GET | `/api/district/polygons/` | District boundary as coordinate arrays |
| GET | `/api/district/kml/` | Serve the district KML file |

---

## Roadmap

- [x] Pitch Count module
- [x] Umpire Sign-Up module
- [x] Player Import (SportsConnect CSV)
- [x] Address & District Validation
- [x] Player Evaluations
- [x] Draft Engine
- [ ] Volunteer Sign-Up (grounds crew + concessions)
- [ ] Auth (JWT)
