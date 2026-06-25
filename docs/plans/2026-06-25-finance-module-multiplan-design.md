# Finance Module & Multi-Plan Fundraising Design
**Date:** 2026-06-25  
**Status:** Approved  
**Scope:** New Finance nav section; multi-plan fundraising with drag-and-drop, quoted pricing, campaign types, and in-kind donations

---

## Overview

Two coordinated changes: (1) Budget and Fundraising move out of the Board section into a dedicated Finance section, and (2) the Fundraising module is generalized from a single hardcoded Facilities Plan into multiple named, colored plans — each with its own line items, optional phasing, and quoted price tracking.

---

## 1. Navigation

### New Finance Section
| Field | Value |
|---|---|
| `id` | `finance` |
| `label` | Finance |
| `color` | `#2e7d32` (green) |
| `dashboardPath` | `/section/finance` |
| Items | Budget (`/budget`), Fundraising (`/fundraising`) |

Budget and Fundraising are removed from the Board section.

---

## 2. Backend

### 2a. Model: `FundraisingPlan` (new)

| Field | Type | Notes |
|---|---|---|
| `name` | `CharField(150)` | e.g. "Facilities Capital Improvement" |
| `description` | `TextField(blank)` | Optional context |
| `uses_phases` | `BooleanField(default=False)` | When True, line items have phase 1/2/3 grouping |
| `color` | `CharField(7, blank)` | Hex code. If blank, a random color from a curated palette is assigned on `save()` |
| `is_active` | `BooleanField(default=True)` | Archived plans hidden from UI |
| `sort_order` | `PositiveIntegerField(default=0)` | Controls display order; also determines which plan is featured on the Progress tab |

**Random color palette** (assigned round-robin when color left blank):  
`#C41230`, `#1565c0`, `#6a1b9a`, `#e65100`, `#00838f`, `#f57f17`, `#37474f`

### 2b. Model: `FundraisingLineItem` (renamed from `FacilitiesLineItem`)

Added fields:
| Field | Type | Notes |
|---|---|---|
| `plan` | `FK → FundraisingPlan` | Required; all items belong to a plan |
| `quoted_price` | `DecimalField(null, blank)` | Single contractor quote; null = not yet quoted |

Changed fields:
- `phase` — becomes **nullable** (`null=True, blank=True`). Null means item belongs to a flat (non-phase) plan.

Migration: `migrations.RenameModel('FacilitiesLineItem', 'FundraisingLineItem')` + add fields.

**Data migration** creates the default plan and links existing items:
```python
plan = FundraisingPlan.objects.create(
    name="Facilities Capital Improvement",
    uses_phases=True,
    color="#C41230",
    sort_order=0,
)
FundraisingLineItem.objects.all().update(plan=plan)
```

### 2c. Model: `FundraisingCampaign`

Added field:
| Field | Type | Notes |
|---|---|---|
| `campaign_type` | `CharField(20, choices)` | `RAFFLE`, `SPONSORSHIP`, `GRANT`, `EVENT`, `DONATION`, `OTHER` |

### 2d. Model: `FundraisingDeposit`

Added fields:
| Field | Type | Notes |
|---|---|---|
| `is_in_kind` | `BooleanField(default=False)` | Non-cash contribution (labor, materials, equipment) |
| `in_kind_description` | `TextField(blank)` | What was donated; only meaningful when `is_in_kind=True` |

In-kind deposits are excluded from all cash totals. They are tracked separately and displayed with a distinct badge.

### 2e. Quoted Range Derivation

At every aggregation level (item, phase, plan, grand total), **Quoted Range** is computed as:

```
quoted_low  = sum(quoted_price  if quoted_price else estimate_low  for each item)
quoted_high = sum(quoted_price  if quoted_price else estimate_high for each item)
```

This gives a tightening range as contractor quotes come in. Once all items are quoted, Quoted Range Low = Quoted Range High = exact quoted total.

### 2f. API Changes

**Line items:**
- PATCH `/api/fundraising/line-items/<pk>/` — accepts `plan_id` to move an item between plans
- GET `/api/fundraising/line-items/` — response includes `plan_id`, `quoted_price`
- PATCH `/api/fundraising/line-items/reorder/` — accepts `[{id, sort_order, plan_id}]` for bulk reorder + cross-plan moves from drag-and-drop

**Plans:**
- GET/POST `/api/fundraising/plans/`
- PATCH/DELETE `/api/fundraising/plans/<pk>/`

**Summary:** `/api/fundraising/summary/` updated to return per-plan breakdown including `quoted_low`, `quoted_high`, `cash_raised`, `in_kind_count`.

**Campaigns:** `campaign_type` added to create/update/serialize.

**Deposits:** `is_in_kind`, `in_kind_description` added to create/update/serialize.

---

## 3. Frontend

### 3a. Progress Tab — Full Width, Two-Column Layout

No `maxWidth` constraint. Layout:

```
┌─────────────────────────────────┬──────────────────┐
│  Featured Plan (left, ~68%)     │  Other Plans     │
│                                 │  (right, ~32%)   │
│  [Plan Name banner + color]     │                  │
│  Raised: $X                     │  ┌─ Plan Card ─┐ │
│  Estimate Range: $X – $Y        │  │ name        │ │
│  Quoted Range:   $X – $Y        │  │ raised      │ │
│                                 │  │ est range   │ │
│  Phase 1 ▶ (collapsed)          │  │ quoted range│ │
│  Phase 2 ▶ (collapsed)          │  │ [mini bar]  │ │
│  Phase 3 ▶ (collapsed)          │  └─────────────┘ │
│                                 │  ┌─ Plan Card ─┐ │
│                                 │  │ ...         │ │
│                                 │  └─────────────┘ │
└─────────────────────────────────┴──────────────────┘
```

- **Featured plan** — `selectedPlan` state (default: first by `sort_order`). Banner uses the plan's `name` and `color`. Grand total raised (cash only), estimate range, and quoted range all displayed. Phases/items collapsed by default.
- **Right-side cards** — all other active plans. Each card colored with the plan's `color`. Shows: plan name, cash raised, in-kind count if any, estimate range, quoted range (only if ≥1 quoted item), mini progress bar.
- **Clicking a card** swaps `selectedPlan` state — the clicked plan expands to the left column, the previous featured plan moves to the right as a card. No page reload; pure state swap.

### 3b. Plans Tab

Replaces the old "Facilities Plan" tab.

**Plan list** — all active plans as collapsible sections, collapsed by default. Plan header shows: name, color swatch, estimate range, quoted range, item count, edit/archive button.

**Add Plan dialog:**
- Name (required)
- Description (optional)
- Uses phases toggle
- Color: color picker with hex input + "Assign random color" checkbox (checked by default)

**Line item table** per plan (when expanded):
| Column | Notes |
|---|---|
| ⠿ (drag handle) | For reordering within plan or moving to another plan |
| Item | Description |
| Category | Select chip |
| Est. Low | Editable inline |
| Est. High | Editable inline |
| Quoted Price | Single nullable value; shows "–" if not quoted |
| Notes | Truncated, expands inline |
| Actions | Edit / Delete |

- Items collapsed by default (show summary row; click/expand to edit)
- **Drag-and-drop** uses `@dnd-kit/core` + `@dnd-kit/sortable`. Items can be dragged within a plan (reorder) or dropped onto another plan's section (cross-plan move). Drop zones highlight when a drag is active.
- Phase grouping shown only when `uses_phases=true`. Phase sub-headers show: `Estimate Range: $X – $Y` and `Quoted Range: $X – $Y` (quoted range only shown if ≥1 quoted item in phase).

### 3c. Campaigns Tab

- **Campaign type** shown as a colored chip on each campaign card (Raffle = orange, Sponsorship = blue, Grant = purple, Event = teal, Donation = green, Other = grey).
- Campaign dialog adds a `campaign_type` selector (default: Donation).
- **Deposit dialog** adds:
  - "In-kind donation" checkbox
  - When checked: description field appears; amount field relabels to "Estimated Value (optional)"
  - Earmark dropdown still available for in-kind (e.g., donated lumber earmarked to "Diamond 8 — Fencing")
- **Campaign card** shows cash raised and, if any in-kind deposits exist, a secondary line: "+ N in-kind contribution(s)"
- In-kind deposits in the deposit list show a `[IN-KIND]` badge and are visually de-emphasized (italic amount)

---

## 4. Migration Sequence

| # | Migration | Description |
|---|---|---|
| 0057 | `fundraising_plan` | Create `FundraisingPlan` table |
| 0058 | `fundraising_lineitem_rename` | `RenameModel` FacilitiesLineItem → FundraisingLineItem; add `plan`, `quoted_price`; make `phase` nullable |
| 0059 | `fundraising_lineitem_seed_plan` | Data migration: create default Facilities plan, link existing items |
| 0060 | `fundraising_campaign_deposit_updates` | Add `campaign_type` to Campaign; add `is_in_kind`, `in_kind_description` to Deposit |

---

## 5. Library Dependency

`@dnd-kit/core` + `@dnd-kit/sortable` added to frontend `package.json`. Already widely used in React projects; no build tooling changes required.

---

## 6. Future Considerations

- **Pledge tracking** — committed amounts vs. received; would add a `FundraisingPledge` model alongside deposits
- **Progress milestones** — celebrate 25%/50%/75% thresholds on plan progress bars
- **Campaign cost tracking** — net vs. gross raised (a raffle has operational costs)
- **Grant-specific fields** — application deadline, award date, reporting due date
- **Public donor page** — read-only view of plans + progress for prospective donors (noted in original fundraising design doc)
