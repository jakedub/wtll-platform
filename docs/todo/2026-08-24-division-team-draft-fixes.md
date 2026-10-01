---
title: Division, Team, and Draft Fixes
status: open
created: 2026-08-24
tags: [todo, wtll, divisions, teams, drafts]
---

# To Do: Division, Team, and Draft Fixes

## 1. Draft UI: allow deleting drafts

* [ ] Add a delete action to the Draft List page in the UI.
* Backend already supports this. `DraftDeleteView` (or equivalent) in `backend/league/views/draft.py` has a working `delete(self, request, pk)` handler.
* `frontend/src/pages/DraftListPage.tsx` currently has no delete button or confirmation dialog wired to that endpoint. This is a frontend only gap.
* Suggest a confirmation modal before delete since a draft likely has `DraftSelection` rows tied to it.

## 2. Restrict Division names to a fixed list per sport

* [ ] Division names should no longer be freeform text. Restrict to an approved list, scoped by sport.

Softball divisions:
1. Intermediate
2. Majors
3. Minors
4. Combined

Baseball divisions:
1. Intermediate
2. Majors
3. AAA Minors
4. AA Minors
5. PeeWee
6. T-Ball
7. Combined

Current state: `backend/league/models/divisions.py` has `Division.name` as a free `CharField(unique=True)` with no sport field and no choice restriction. Needs:
* [ ] Add a `sport` field to `Division` (baseball / softball), matching what the division management design doc already assumes.
* [ ] Replace the open text name field with a `choices` restricted field or a lookup table, scoped per sport.
* [ ] Migration to backfill/normalize any existing division names that do not match this list.

## 3. Divisions should connect to Program Types

* [ ] A division should be linkable to one or more program types: Recreation, Fall, All Stars, Showcase.
* Current state: `Division` has a single `program` ForeignKey (one program per division), not a program type association, and no support for a division belonging to more than one program context.
* [ ] Confirm whether this should be a many to many relationship (one Division reused across program types) or whether each program type instance gets its own Division row scoped by the fixed name list above.

## 4. Divisions can have multiple Teams; Team names are not unique

* [ ] Confirm/document that a Division can have many Teams (already true, `Team.division` is a ForeignKey, so this already works).
* [ ] Confirm Team name uniqueness rules. Current constraint in `backend/league/models/teams.py` is `unique_together (name, division, year)`, meaning the same team name can already repeat across different divisions or years.
* Requirement to formalize: Recreation teams will regularly reuse the same team name season over season. Confirm this existing constraint is sufficient, or whether a looser rule is needed (e.g. same name allowed twice in the same division/year for different program types).

---

## Open questions to resolve before implementation

1. Program type relationship: many to many vs per program type Division rows?
2. Should the fixed division name list be enforced at the database level (choices/constraint) or only at the form/API validation level, to allow easier updates later?
3. Does restricting division names retroactively break any existing division rows that do not match the approved list?
