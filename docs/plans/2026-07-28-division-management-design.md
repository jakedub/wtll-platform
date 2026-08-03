# Design: Inline Division Management on Program Years

**Date:** 2026-07-28
**Status:** Approved

---

## Overview

Add inline division management to each program card on the Program Years page. Divisions are properties of a program; managing them in context avoids a separate nav item and keeps the program → division relationship visible.

---

## UI: Program Card Expansion

Each program card gains a "Divisions" toggle at the bottom, showing the current division count (e.g. "4 divisions"). Clicking it expands an inline panel.

The panel contains:
- A list of the program's current divisions, each showing:
  - Division name (inline-editable via pencil icon)
  - Sport badge: Baseball or Softball
  - Delete icon (with confirmation if teams are linked)
- An "Add Division" row at the bottom with a name text field and Baseball / Softball selector

---

## Backend

Four operations under a new view at `/api/program-years/<program_id>/divisions/`:

| Method | Path | Action |
|---|---|---|
| GET | `/api/program-years/<id>/divisions/` | List all divisions for this program |
| POST | `/api/program-years/<id>/divisions/` | Create a division linked to this program |
| PATCH | `/api/program-years/<id>/divisions/<div_id>/` | Rename a division |
| DELETE | `/api/program-years/<id>/divisions/<div_id>/` | Delete (blocked if teams are linked) |

**Delete guard:** If any `Team` has `division_id = div_id`, return a 400 with a message listing the team count. The user must remove or reassign those teams first.

**Division fields on create:** `name` (required), `sport` (required: `"baseball"` or `"softball"`). The `program` FK is set from the URL param. `is_calendar_only` defaults to `False`.

---

## Files Changed

| File | Change |
|---|---|
| `backend/league/views/program_year.py` | Add `ProgramDivisionView` and `ProgramDivisionDetailView` |
| `backend/league/urls.py` | Register new division endpoints |
| `frontend/src/pages/ProgramYearPage.tsx` | Add division panel to program cards |
