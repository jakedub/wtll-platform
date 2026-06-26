import client from "./client"

// ─── Types ────────────────────────────────────────────────────────────────────

export type CalendarColor = "red" | "gold" | "green" | "blue" | "purple" | "orange"

export interface CalendarEvent {
  id:         number
  month_year: string
  phase:      string
  text:       string
  owner:      string
  color:      CalendarColor
  year:       number
  sort_order: number
}

export type ChecklistType =
  | "hard" | "action" | "allstar"
  | "showcase" | "fundraising" | "tee_ball" | "general"

export type ChecklistGroup =
  | "general" | "marketing" | "budget" | "fallball" | "allstars"
  | "showcase" | "fundraising" | "tee_ball"

export interface ChecklistItem {
  id:          number
  date_window: string
  item:        string
  owner:       string
  item_type:   ChecklistType
  group:       ChecklistGroup
  sort_order:  number
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

function unwrap<T>(res: any): T {
  return res?.data?.data ?? res?.data ?? res
}

export async function getCalendarEvents(year?: number): Promise<CalendarEvent[]> {
  const params = year ? { year } : {}
  const res = await client.get("/board-hub/calendar/", { params })
  return unwrap<CalendarEvent[]>(res) ?? []
}

export async function createCalendarEvent(data: Omit<CalendarEvent, "id">): Promise<CalendarEvent> {
  const res = await client.post("/board-hub/calendar/", data)
  return unwrap<CalendarEvent>(res)
}

export async function updateCalendarEvent(id: number, data: Partial<CalendarEvent>): Promise<CalendarEvent> {
  const res = await client.patch(`/board-hub/calendar/${id}/`, data)
  return unwrap<CalendarEvent>(res)
}

export async function deleteCalendarEvent(id: number): Promise<void> {
  await client.delete(`/board-hub/calendar/${id}/`)
}

// ─── Checklist ────────────────────────────────────────────────────────────────

export async function getChecklistItems(group?: ChecklistGroup): Promise<ChecklistItem[]> {
  const params = group ? { group } : {}
  const res = await client.get("/board-hub/checklist/", { params })
  return unwrap<ChecklistItem[]>(res) ?? []
}

export async function createChecklistItem(data: Omit<ChecklistItem, "id">): Promise<ChecklistItem> {
  const res = await client.post("/board-hub/checklist/", data)
  return unwrap<ChecklistItem>(res)
}

export async function updateChecklistItem(id: number, data: Partial<ChecklistItem>): Promise<ChecklistItem> {
  const res = await client.patch(`/board-hub/checklist/${id}/`, data)
  return unwrap<ChecklistItem>(res)
}

export async function deleteChecklistItem(id: number): Promise<void> {
  await client.delete(`/board-hub/checklist/${id}/`)
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const CHECKLIST_TYPE_META: Record<ChecklistType, { label: string; color: string }> = {
  hard:        { label: "Hard Deadline", color: "red"    },
  action:      { label: "Action Item",   color: "orange" },
  allstar:     { label: "All Stars",     color: "purple" },
  showcase:    { label: "Showcase",      color: "blue"   },
  fundraising: { label: "Fundraising",   color: "gold"   },
  tee_ball:    { label: "Tee Ball",      color: "green"  },
  general:     { label: "General",       color: "blue"   },
}

export const CHECKLIST_GROUP_META: Record<ChecklistGroup, { label: string }> = {
  general:     { label: "General"     },
  marketing:   { label: "Marketing"   },
  budget:      { label: "Budget"      },
  fallball:    { label: "Fall Ball"   },
  allstars:    { label: "All Stars"   },
  showcase:    { label: "Showcase"    },
  fundraising: { label: "Fundraising" },
  tee_ball:    { label: "Tee Ball"    },
}

export const CALENDAR_COLOR_OPTIONS: { value: CalendarColor; label: string; hex: string }[] = [
  { value: "red",    label: "Red",    hex: "#C41230" },
  { value: "gold",   label: "Gold",   hex: "#d97706" },
  { value: "green",  label: "Green",  hex: "#2e7d32" },
  { value: "blue",   label: "Blue",   hex: "#1565c0" },
  { value: "purple", label: "Purple", hex: "#6a1b9a" },
  { value: "orange", label: "Orange", hex: "#c2410c" },
]
