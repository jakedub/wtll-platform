# Design: Season Pipeline Page

**Date:** 2026-08-03
**Status:** Approved

---

## Purpose

Replace the generic Pre-Season section dashboard with a purpose-built pipeline view that shows where each program is in its season lifecycle. Answers the question "what do I do next?" without requiring the user to mentally track progress across separate tools.

---

## Season Order

Programs run sequentially, not in parallel:

1. Recreation (March+) — full pipeline
2. All Stars (starts during/end of Rec) — light pipeline, no draft
3. Teen Baseball / Teen Softball (after Rec) — full pipeline
4. Fall Ball (after Teen Ball) — full pipeline, no evaluations
5. Showcase — year-round, no pipeline (quick-links only)

---

## Nav Placement

- New nav item "Season Pipeline" added as first item in Pre-Season section
- Route: `/season-pipeline`
- Existing Pre-Season tools (Player Import, Evaluations, Team Management, Draft) remain in nav
- Pre-Season section dashboard (`/section/preseason`) unchanged

---

## Page Layout

Year selector at top (defaults to current year).

One card per program in season order. Programs not yet started for the selected year show grayed-out with a "Not started" label and a link to Program Years to start them.

Showcase pinned at bottom — styled as "Year-Round Program", no step tracker, quick-links to Teams and Schedule only.

---

## Step Tracker

Each active program card shows a horizontal step rail with clickable chips. A "Next Step" call-to-action below the rail points to the first incomplete step.

### Steps and completion logic

| Step | Done when | Link target |
|---|---|---|
| Divisions | ≥ 1 division linked to program | `/program-years` |
| Teams | ≥ 1 team in program | `/team-management` |
| Player Import | ≥ 1 player enrolled in program | `/player-import` |
| Evaluations | ≥ 1 evaluation event for season year | `/evaluations-hub` |
| Draft | ≥ 1 draft for a division in this program | `/draft` or `/draft?sport=softball` |
| Team Assignments | All drafts for program are complete | `/draft` |
| Schedule | ≥ 1 game scheduled for program teams | `/baseball-schedule` or `/softball-schedule` |
| Close Season | `season_closed = true` | `/program-years` |

### Per-program step variations

| Program | Steps skipped |
|---|---|
| All Stars | Draft, Team Assignments (player selection model) |
| Fall Ball | Evaluations |
| Showcase | All steps (quick-links only) |

---

## Backend

**New endpoint:** `GET /api/program-years/<pk>/pipeline-status/`

Returns:
```json
{
  "program_id": 1,
  "program_type": "RECREATION",
  "season_year": 2026,
  "season_closed": false,
  "steps": {
    "divisions":        { "done": true,  "count": 7 },
    "teams":            { "done": true,  "count": 12 },
    "players":          { "done": false, "count": 0 },
    "evaluations":      { "done": false, "count": 0 },
    "draft":            { "done": false, "count": 0 },
    "draft_complete":   { "done": false, "count": 0 },
    "schedule":         { "done": false, "count": 0 },
    "closed":           { "done": false }
  }
}
```

Implemented as a new `ProgramPipelineStatusView` in `program_year.py`. Uses lightweight per-step queries (no complex annotations). Called once per program card on page load.

---

## Frontend Files

| File | Change |
|---|---|
| `frontend/src/pages/SeasonPipelinePage.tsx` | New page |
| `frontend/src/config/navConfig.tsx` | Add Season Pipeline as first Pre-Season item |
| `frontend/src/App.tsx` (or router) | Register `/season-pipeline` route |
| `backend/league/views/program_year.py` | Add `ProgramPipelineStatusView` |
| `backend/league/urls.py` | Register pipeline-status endpoint |
