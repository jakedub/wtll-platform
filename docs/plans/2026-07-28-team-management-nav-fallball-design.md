# Design: Team Management Nav Restructure, Fall Ball Fixes, and Auto Assign

**Date:** 2026-07-28
**Status:** Approved

---

## Overview

Five related changes to fix Fall Ball program behavior, broken team filters, nav organization, closed-season visibility, and add Fall Ball auto-assignment in the Draft Room.

---

## 1. Fall Ball Softball Missing from Program Years

**Root cause:** The `Program` model has a single `sport` field. When Program Years creates a Fall Ball program, it stores one sport value. The `DEFAULT_DIVISIONS` for `FALL_BALL` correctly defines both baseball and softball divisions, but the creation view may not be creating all of them.

**Fix:** Update the Program Years creation view to always create all default divisions for `FALL_BALL` regardless of the program's `sport` field. Fall Ball is inherently multi-sport and should not be gated by the `sport` field. The `sport` field on the Program model should be left blank or set to `"both"` for Fall Ball.

---

## 2. Team Management Filter Broken

**Root cause:** The frontend filters teams client-side using `t.program_type`, which is derived from `division.program` FK on the backend. If a division's `program` FK is null, `program_type` returns null and no teams ever match the filter.

**Fix:**
- Pass the selected `program_type` as a query param to the backend (`?program_type=FALL_BALL`) instead of filtering client-side. The `TeamManageListView` already supports this param.
- Remove the client-side `programFilter` logic and rely entirely on server-side filtering.
- Ensure all divisions created by Program Years have their `program` FK set correctly on creation.

---

## 3. Navigation Restructure

**Changes to `navConfig.tsx`:**

- Move the `preseason` section to appear after `finance` in the `NAV_SECTIONS` array (currently it appears after `softball`).
- Remove `Team Management` from the `baseball` section items.
- Remove `Team Management` from the `softball` section items.
- Add a single `Team Management` item to the `preseason` section (path: `/team-management`, no sport query param — the page already handles both sports).

**New Pre-Season nav items (in order):**
1. Player Import
2. Eligibility
3. Evaluations
4. Team Management
5. Baseball Draft
6. Softball Draft

**New nav section order:**
1. Board
2. Finance
3. Pre-Season
4. Baseball Ops
5. Softball Ops
6. Schedule
7. Involvement

---

## 4. Hide Closed Seasons Checkbox

**Location:** Team Management page, in the filter row alongside the Year selector.

**Behavior:**
- Checkbox labeled "Hide closed seasons", checked by default.
- When checked, adds `hide_closed=true` to the `GET /api/team-manage/` request.
- Backend filters out teams where `division.program.season_closed = True`.
- When unchecked, all teams for the selected year are shown including those from closed programs.

**Backend change:** Add `hide_closed` query param handling to `TeamManageListView`. If `hide_closed=true`, add `.filter(division__program__season_closed=False)` to the queryset (or exclude teams with no program when appropriate).

---

## 5. Fall Ball Auto Assign in Draft Room

**Trigger:** An "Auto Assign All" button appears in the Draft Room only when the active draft's division belongs to a Fall Ball program.

**Behavior:**
- User clicks "Auto Assign All".
- A confirmation dialog appears: "This will assign all players to their division team. Continue?"
- Backend endpoint `POST /api/draft/<draft_id>/auto-assign/` runs the assignment:
  - Reads each player in the draft list's `PlayerProgramEnrollment.division`.
  - Finds the single `Team` in that division for the current year.
  - Creates or updates a `PlayerProgramEnrollment` assigning the player to that team.
  - Returns a summary: how many players were assigned, how many had no matching team.
- Frontend shows a success toast with the summary count.
- Manual adjustments are made afterward in Team Management.

**Constraints:**
- Only runs when `division.program.program_type = "FALL_BALL"`.
- If a player's division has no team yet, they are skipped (reported in the summary).
- Does not overwrite existing manual assignments — only assigns players not yet on a team.

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/config/navConfig.tsx` | Reorder sections, move Team Management to Pre-Season |
| `frontend/src/pages/TeamManagementPage.tsx` | Server-side program filter, hide closed seasons checkbox |
| `backend/league/views/team_manage.py` | Add `hide_closed` filter |
| `backend/league/views/program_years.py` | Fix Fall Ball division creation for both sports |
| `backend/league/views/draft.py` (or new file) | Add `auto-assign` endpoint |
| `frontend/src/pages/DraftRoomPage.tsx` | Add Auto Assign button for Fall Ball drafts |
