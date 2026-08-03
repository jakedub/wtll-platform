# Design: Checkbox Division Selection and Program Year Delete

**Date:** 2026-07-28
**Status:** Approved

---

## Division Panel: Checkbox Selection

Replace the free-text add input with a predefined checkbox list per program type. Each default division shows as a checkbox — checked if already linked to the program, unchecked if not. Checking adds it; unchecking removes it (with the team-link guard). Rename stays available per row.

Program types with no predefined defaults (ALL_STARS, SHOWCASE, TEEN_BASEBALL, TEEN_SOFTBALL) keep the free-text fallback.

### Default Division Lists

**FALL_BALL — Baseball:** Fall PeeWee, Fall AA, Fall AAA, Fall Majors
**FALL_BALL — Softball:** Fall Softball Minors, Fall Softball Majors
**RECREATION — Baseball:** Tee Ball, Pee Wee, AA, AAA, Majors
**RECREATION — Softball:** Softball Minors, Softball Majors

---

## Program Year Delete

A trash icon button on each program card opens a confirm dialog showing how many teams and enrollments will be deleted. On confirm:

1. Delete `PlayerProgramEnrollment` records where `program = pk`
2. Delete `Team` records where `division__program = pk` and `year = program.season_year`
3. Nullify `division.program` FK for all divisions linked to this program (preserves division records)
4. Delete the `Program` record

Divisions are preserved so other program years using the same division names are unaffected.

---

## Backend Changes

| File | Change |
|---|---|
| `backend/league/models/program.py` | Update Fall Ball division names in DEFAULT_DIVISIONS |
| `backend/league/views/program_year.py` | Add `ProgramYearDeleteView` |
| `backend/league/urls.py` | Register DELETE endpoint |

## Frontend Changes

| File | Change |
|---|---|
| `frontend/src/pages/ProgramYearPage.tsx` | Replace DivisionPanel free-text with checkbox list; add delete button to ProgramCard |
