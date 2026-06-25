# Fundraising Module Design
**Date:** 2026-06-24  
**Status:** Approved  
**Scope:** Internal board campaign tracker + editable facilities plan (Phase 1); public donor page (Phase 2, future)

---

## Overview

The Fundraising module gives the WTLL board a single place to manage the league's capital improvement fundraising effort. It ties named fundraising campaigns (raffle nights, sponsorship drives, grants) to line-item project costs so the board can see exactly how much has been raised and where gaps remain across all three improvement phases.

---

## Backend

### Models

**`FacilitiesLineItem`**
| Field | Type | Notes |
|---|---|---|
| `phase` | `IntegerField` (1/2/3) | Which improvement phase |
| `location` | `CharField(100)` | e.g. "Diamond 8", "Property Wide" |
| `description` | `CharField(200)` | Line item name |
| `category` | `CharField(20)` | `INFRA`, `SAFETY`, `AMENITY`, `FULL`, `ELECTRICAL` |
| `estimate_low` | `DecimalField` | Low end of cost range |
| `estimate_high` | `DecimalField` | High end of cost range |
| `notes` | `TextField(blank)` | Contractor notes, assumptions |
| `sort_order` | `PositiveIntegerField(default=0)` | Manual ordering within phase |
| `is_complete` | `BooleanField(default=False)` | Board marks as done |

Seeded from the existing Facilities Capital Improvement Tracker HTML on first migration (management command or data migration). All 10 diamonds + shared items from Phases 1–3.

**`FundraisingCampaign`**
| Field | Type | Notes |
|---|---|---|
| `name` | `CharField(150)` | e.g. "2026 Raffle Night" |
| `description` | `TextField(blank)` | What this campaign is |
| `goal` | `DecimalField(null, blank)` | Optional target for this specific campaign |
| `is_active` | `BooleanField(default=True)` | Hide closed campaigns |
| `created_at` | `DateTimeField(auto_now_add)` | |

**`FundraisingDeposit`**
| Field | Type | Notes |
|---|---|---|
| `campaign` | `FK → FundraisingCampaign` | |
| `amount` | `DecimalField` | Dollars received |
| `date` | `DateField` | When received |
| `notes` | `TextField(blank)` | Check number, donor type, etc. |
| `line_item` | `FK → FacilitiesLineItem, null, blank` | Optional earmark to a specific project item |

### API Endpoints

All admin-only (`IsAuthenticated` + `is_staff`); future public endpoint noted below.

| Method | URL | Description |
|---|---|---|
| GET | `/api/fundraising/line-items/` | All line items grouped by phase |
| POST | `/api/fundraising/line-items/` | Create line item |
| PATCH | `/api/fundraising/line-items/<pk>/` | Update line item |
| DELETE | `/api/fundraising/line-items/<pk>/` | Delete line item |
| GET | `/api/fundraising/campaigns/` | All campaigns with totals |
| POST | `/api/fundraising/campaigns/` | Create campaign |
| PATCH | `/api/fundraising/campaigns/<pk>/` | Update campaign |
| GET | `/api/fundraising/campaigns/<pk>/deposits/` | Deposits for a campaign |
| POST | `/api/fundraising/campaigns/<pk>/deposits/` | Log a deposit |
| PATCH | `/api/fundraising/deposits/<pk>/` | Edit a deposit |
| DELETE | `/api/fundraising/deposits/<pk>/` | Delete a deposit |
| GET | `/api/fundraising/summary/` | Aggregated totals by phase + line item for Progress tab |

**`/api/fundraising/summary/` response shape:**
```json
{
  "grand_total_raised": 45200.00,
  "phases": [
    {
      "phase": 1,
      "estimate_low": 88000,
      "estimate_high": 191500,
      "raised": 28700.00,
      "items": [
        {
          "id": 1,
          "location": "Diamond 8",
          "description": "Drainage improvements",
          "category": "INFRA",
          "estimate_low": 5000,
          "estimate_high": 15000,
          "raised": 5000.00,
          "is_complete": false
        }
      ]
    }
  ]
}
```

---

## Frontend

### Navigation

Add to the **Board** section in `navConfig.tsx`:
```
{ label: 'Fundraising', path: '/fundraising', icon: <VolunteerActivismIcon />, description: 'Capital improvement campaigns, deposits, and project progress.' }
```

### `FundraisingPage` — `/fundraising`

Three tabs rendered on a single page:

---

#### Tab 1: Progress

Read-only dashboard view — primary view for board meetings.

- **Grand total banner:** total raised (all campaigns, all deposits) vs. estimate range low–high. Large progress bar across the top.
- **Per-phase cards:** one card per phase showing phase estimate range, total raised toward that phase's items, and a fill bar.
- **Per-line-item rows:** within each phase card, expandable list of every project line item. Each row shows:
  - Location + description
  - Category tag chip (color-coded per the HTML document)
  - Estimate range
  - Amount raised (sum of deposits earmarked to this item)
  - Progress fill bar (uses midpoint of estimate range as 100%)
  - `✓` badge if `is_complete`
- Unearmarked deposits (general fund) shown in a separate "General / Unallocated" section at the bottom.

---

#### Tab 2: Campaigns

Campaign management and deposit logging.

- **Campaign list:** cards or rows for each campaign showing name, total raised, goal (if set), active/closed badge.
- **Add Campaign** button → inline dialog: name, description, optional goal, active toggle.
- Each campaign is **expandable** to show its deposits in a table: date, amount, notes, earmarked item (or "General").
- **Log Deposit** button within each campaign → dialog with:
  - Amount (required)
  - Date (defaults to today)
  - Notes (optional)
  - Earmark: Autocomplete over all line items (grouped by phase + location), or leave blank for general fund
- Edit and delete deposit via row actions (icon buttons).
- Edit/archive campaign via campaign-level actions.

---

#### Tab 3: Facilities Plan

Editable master project list, mirroring the imported HTML data.

- Items grouped by phase, then location (matching the original tracker layout).
- Each row: location, description, category select, estimate low, estimate high, notes, sort order, is_complete toggle.
- Inline editing (click to edit, blur to save) for estimate fields and notes.
- **Add Item** button per phase group → dialog: phase, location, description, category, estimates, notes.
- **Delete** with confirmation per row (shows warning if deposits are earmarked to it).
- Phase subtotals auto-calculated from line items.

---

## Data Migration / Seed

A Django data migration (or `loaddata` fixture) seeds all line items from the HTML tracker on first deploy. The 40+ items across Phases 1–3 are pre-loaded so the board doesn't have to enter them manually. Estimates match the HTML document as of FY26 planning.

---

## Future: Public Donor Page (Phase 2)

A public, read-only page at `/public/fundraising` (no auth required) showing:
- The league name and a brief pitch
- Grand total raised + goal progress
- Per-phase progress bars and project list
- A "Support WTLL" call-to-action (links to contact email or PayPal/Stripe when integrated)

The data model is already shaped correctly for this — `PublicFundraisingSummaryView` would use `AllowAny` and return the same summary payload as `/api/fundraising/summary/`, scoped to whatever the board marks as public-visible.

A public link (`/public/fundraising`) would be shareable with prospective donors, community partners, and grant applications without requiring a login.

---

## Access Control

- All three tabs and all API endpoints: `is_staff` or `is_board_member` (board members should be able to view and log deposits, but only admins can delete line items or campaigns).
- Future public page: `AllowAny`.

---

## Migration Number

Next migration will be `0054_fundraising`.
