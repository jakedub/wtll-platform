# Set up notes
password for user C@rlsberg9075 for wtll_user

superuser: admin, C@rlsberg9075
# WTLL Platform

**Washington Township Little League — League Operations Platform**

A full-stack Django + React application for managing youth baseball league operations. Designed as a modular, expandable system. The MVP starts with **Pitch Count tracking** but the architecture supports growth into evaluations, drafting, eligibility, and more.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Django 4.2 + Django REST Framework |
| Frontend | React 18 + Vite + Material UI |
| Database | PostgreSQL (Render) / SQLite (local dev) |
| Deployment | Render (backend web service + frontend static site) |

---

## Project Structure

```
wtll-platform/
├── backend/
│   ├── league/                  # Core app
│   │   ├── models.py            # Player, Team, Division, PitchCount
│   │   ├── views.py             # API views
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   └── services/
│   │       ├── pitching_engine.py   # Fatigue + rest logic
│   │       └── eligibility_engine.py  # (future)
│   └── wtll/                    # Django project config
│       ├── settings.py
│       ├── urls.py
│       └── wsgi.py
├── frontend/
│   └── src/
│       ├── api/                 # API client layer
│       ├── pages/               # Route-level pages
│       ├── components/          # Shared UI components
│       └── theme/               # MUI theme config
├── render.yaml                  # Render deployment config
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
DATABASE_URL=              # leave blank for SQLite in dev
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend (`frontend/.env.local`)
```
VITE_API_URL=http://localhost:8000
```

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/players/` | List all players |
| GET | `/api/players/<id>/` | Player detail |
| GET | `/api/players/<id>/pitch-status/` | Current pitch status + fatigue |
| GET | `/api/players/<id>/pitch-history/` | Full pitch log |
| POST | `/api/pitch-count/` | Log pitches for a game |
| GET | `/api/teams/` | List all teams |

---

## Pitch Status Logic

The `pitching_engine` service computes rest requirements per Little League rules:

| Pitches | Required Rest |
|---|---|
| 1–20 | 0 days |
| 21–35 | 1 day |
| 36–50 | 2 days |
| 51–65 | 3 days |
| 66+ | 4 days |

Status outputs: `AVAILABLE` / `CAUTION` / `REST`

---

## Roadmap

- [x] Pitch Count module (MVP)
- [ ] Player Evaluations
- [ ] Draft Engine
- [ ] Eligibility Engine (address/district validation)
- [ ] Player Availability Scheduling
- [ ] Auth (JWT)
