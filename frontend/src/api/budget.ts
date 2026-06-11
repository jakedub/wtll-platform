import client from "./client"

export const CATEGORIES = [
  { value: "BASEBALL",     label: "Baseball",                 color: "#1565c0" },
  { value: "SOFTBALL",     label: "Softball",                 color: "#6a1b9a" },
  { value: "CONCESSIONS",  label: "Concessions",              color: "#e65100" },
  { value: "MARKETING",    label: "Marketing",                color: "#00695c" },
  { value: "GROUNDS",      label: "Grounds & Facilities",     color: "#2e7d32" },
  { value: "RENT_UTIL",    label: "Rent & Utilities",         color: "#4527a0" },
  { value: "EQUIPMENT",    label: "Equipment",                color: "#1565c0" },
  { value: "ADMIN",        label: "Admin & Operations",       color: "#37474f" },
  { value: "SPONSORSHIP",  label: "Sponsorship & Fundraising",color: "#d97706" },
  { value: "LL_FEES",      label: "Little League Fees",       color: "#c62828" },
  { value: "SAFETY",       label: "Safety & Supplies",        color: "#e65100" },
  { value: "APPAREL",      label: "Apparel",                  color: "#00695c" },
  { value: "SCHOLARSHIPS", label: "Scholarships",             color: "#4a148c" },
  { value: "DONATIONS",    label: "Donations",                color: "#1b5e20" },
  { value: "OTHER",        label: "Other",                    color: "#546e7a" },
]

export interface BudgetLine {
  id: number
  year: number
  category: string
  category_display: string
  item: string
  sub_group: string
  owner_role: string
  is_revenue: boolean
  actual: string | null       // Decimal comes as string from DRF
  estimate: string | null
  estimate_override: boolean
  effective_estimate: string | null
  notes: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface BudgetSummary {
  year: string | null
  by_category: Record<string, { label: string; actual: number; estimate: number }>
  total_expenses: { actual: number; estimate: number }
  total_revenue: { actual: number; estimate: number }
  gap: { actual: number; estimate: number }
  approval: BudgetApproval | null
}

export interface BudgetApproval {
  id: number
  year: number
  approved_by: string
  approved_at: string
  notes: string
}

function unwrap<T>(res: any): T {
  return res?.data?.data ?? res?.data ?? res
}

export async function getBudgetLines(year?: number): Promise<BudgetLine[]> {
  const res = await client.get("/budget/lines/", { params: year ? { year } : {} })
  return unwrap<BudgetLine[]>(res) ?? []
}

export async function createBudgetLine(data: Partial<BudgetLine>): Promise<BudgetLine> {
  const res = await client.post("/budget/lines/", data)
  return unwrap<BudgetLine>(res)
}

export async function updateBudgetLine(id: number, data: Partial<BudgetLine>): Promise<BudgetLine> {
  const res = await client.patch(`/budget/lines/${id}/`, data)
  return unwrap<BudgetLine>(res)
}

export async function deleteBudgetLine(id: number): Promise<void> {
  await client.delete(`/budget/lines/${id}/`)
}

export async function getBudgetSummary(year?: number): Promise<BudgetSummary> {
  const res = await client.get("/budget/summary/", { params: year ? { year } : {} })
  return unwrap<BudgetSummary>(res)
}

export async function approveBudget(year: number, approvedBy: string, notes: string): Promise<BudgetApproval> {
  const res = await client.post("/budget/approve/", { year, approved_by: approvedBy, notes })
  return unwrap<BudgetApproval>(res)
}

export async function revokeApproval(year: number): Promise<void> {
  await client.delete(`/budget/approve/${year}/`)
}

export async function getBudgetYears(): Promise<number[]> {
  const res = await client.get("/budget/years/")
  return res.data.years ?? []
}

export async function copyBudgetYear(
  fromYear: number,
  toYear: number,
  multiplier = 1.05,
  overwrite = false,
): Promise<{ created: number; to_year: number; from_year: number }> {
  const res = await client.post("/budget/copy-year/", {
    from_year: fromYear, to_year: toYear, multiplier, overwrite,
  })
  return res.data
}

export function getBudgetExportURL(year?: number): string {
  const base = (client.defaults.baseURL ?? "").replace(/\/$/, "")
  return `${base}/budget/export/${year ? `?year=${year}` : ""}`
}
