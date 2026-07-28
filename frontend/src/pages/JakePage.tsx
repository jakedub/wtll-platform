/**
 * JakePage — personal staff-only page. Not in navConfig.
 * Route: /jake
 *
 * Tab 0 — Scratchpad: multi-note editor, localStorage-persisted, auto-save.
 * Tab 1 — GenCon 2026: schedule, interactive shopping list, Will Call checklist.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import {
  Box, Button, Checkbox, Chip, Collapse, Dialog, Divider, FormControlLabel,
  IconButton, Paper, Tab, Tabs, Tooltip, TextField, Typography,
} from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import AddIcon from "@mui/icons-material/Add"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import NoteIcon from "@mui/icons-material/Note"

// ─────────────────────────────────────────────────────────────────────────────
// SCRATCHPAD types and helpers
// ─────────────────────────────────────────────────────────────────────────────

interface Note {
  id: string
  title: string
  content: string
  updatedAt: string
}

const NOTES_KEY = "jake_notes_v1"

function loadNotes(): Note[] {
  try { return JSON.parse(localStorage.getItem(NOTES_KEY) ?? "[]") as Note[] }
  catch { return [] }
}
function saveNotes(notes: Note[]) { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)) }
function newNote(): Note {
  return { id: crypto.randomUUID(), title: "New note", content: "", updatedAt: new Date().toISOString() }
}
function relativeTime(iso: string): string {
  const d = Date.now() - new Date(iso).getTime()
  const m = Math.floor(d / 60_000), h = Math.floor(d / 3_600_000), days = Math.floor(d / 86_400_000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// Splits "8:00am – 2:00pm" into { start: "8:00am", end: "2:00pm" }.
// If start has no am/pm suffix, borrows it from end ("2:00 – 6:00pm" → "2:00pm").
function splitTime(raw: string): { start: string; end: string | null } {
  const sep = raw.indexOf(" – ")
  if (sep === -1) return { start: raw, end: null }
  let start = raw.slice(0, sep).trim()
  const end   = raw.slice(sep + 3).trim()
  if (!/[ap]m/i.test(start)) {
    const suffix = end.match(/[ap]m/i)?.[0] ?? ""
    if (suffix) start += suffix
  }
  return { start, end }
}

// ─────────────────────────────────────────────────────────────────────────────
// GENCON data
// ─────────────────────────────────────────────────────────────────────────────

const DAYS = [
  {
    label: "Thursday, July 30",
    color: "#1565c0",
    events: [
      { time: "8:30am",          label: "Arrive — return Dresden paper ticket at ICC Customer Service", location: "ICC",                                         ticket: null },
      { time: "~8:45am",         label: "Purchase Dungeon of Du'unix on phone",                        location: "",                                            ticket: null },
      { time: "10:00am",         label: "Floor Opens → Hall H (or Hall F) — See Shopping List",                location: "Exhibit Hall",               ticket: null },
      { time: "~11:30am",        label: "Lunch",                                                        location: "",                                            ticket: null },
      { time: "2:00 – 6:00pm",   label: "The Dungeon of Du'unix — Gooey Cube ($16)",                   location: "ICC",                                         ticket: "📱" },
    ],
  },
  {
    label: "Friday, July 31",
    color: "#2e7d32",
    note: "Roland: Fri + Sun badge",
    events: [
      { time: "8:00am – 2:00pm", label: "Gen Con Games Library Morning Pass (Jake + Roland)",          location: "Stadium Field",                               ticket: "📱" },
      { time: "~11:30am",        label: "Lunch",                                                        location: "",                                            ticket: null },
      { time: "2:00 – 3:00pm",   label: "Learn, Play & Keep — Cats vs Cucumbers (Roland)",             location: "ICC Hall B, Green 9",                         ticket: "📱" },
      { time: "3:00 – 4:00pm",   label: "Gen Con Games Library (Jake) / Transit to Stadium (Roland)", location: "",                                            ticket: null },
      { time: "4:00 – 6:00pm",   label: "Intro to Leather Stamping (Jake + Roland)",                   location: "Stadium East Concourse",                      ticket: "🎟️" },
    ],
  },
  {
    label: "Saturday, August 1",
    color: "#6a1b9a",
    events: [
      { time: "10:00am",         label: "Floor opens — remaining shopping",                             location: "Exhibit Hall",                                ticket: null },
      { time: "10:30am",         label: "Queue for MRK & Scott Lynch signing",                          location: "ICC Exhibit Hall I",                          ticket: null },
      { time: "11:00am – 12pm",  label: "Signing — Mary Robinette Kowal & Scott Lynch",                location: "Authors Avenue",                              ticket: "🏛️" },
      { time: "11:30am",         label: "Get in Salvatore queue (from inside Authors Avenue)",          location: "ICC Exhibit Hall I",                          ticket: null },
      { time: "12:00 – 1:00pm",  label: "Signing — R.A. Salvatore",                                    location: "Authors Avenue",                              ticket: "🏛️" },
      { time: "1:00 – 3:00pm",   label: "The D&D Carnival",                                            location: "Ind. Repertory Theater, 6th Floor Rooftop",   ticket: "📱" },
      { time: "3:00 – 4:00pm",   label: "Lunch + shopping window",                                     location: "Exhibit Hall",                                ticket: null },
      { time: "4:00 – 6:00pm",   label: "Arcana Unleashed Preview",                                    location: "Stadium West Club Lounge",                    ticket: "🏛️" },
      { time: "6:00 – 7:30pm",   label: "Dungeons and Bingo!",                                         location: "JW Grand Ballroom 3–4",                       ticket: "📱" },
    ],
  },
  {
    label: "Sunday, August 2",
    color: "#e65100",
    events: [
      { time: "10:00 – 11:00am", label: "Last chance shopping",                                        location: "Exhibit Hall",                                ticket: null },
      { time: "11:00am – 12pm",  label: "Giant Galaxy Trucker (Jake + Roland)",                        location: "ICC 235–239",                                 ticket: "📱" },
      { time: "~12:00pm",        label: "Lunch",                                                        location: "",                                            ticket: null },
      { time: "12:00 – 4:00pm",  label: "Free / remaining shopping (hall closes 4pm)",                 location: "Exhibit Hall",                                ticket: null },
    ],
  },
]

interface ShopItem { id: string; game: string; publisher: string; booth: string; msrp: string }
const SHOP_ITEMS: ShopItem[] = [
  { id: "court",     game: "Court & Shadow",  publisher: "Kobold Press",            booth: "#1909", msrp: ""       },
  { id: "hdoom",     game: "Hastening Doom",  publisher: "Kobold Press",            booth: "#1909", msrp: ""       },
  { id: "lairs",     game: "Lairs",           publisher: "Kids Table Board Gaming", booth: "#2310", msrp: "$40"    },
  { id: "brumble",   game: "Brumble Quest",   publisher: "Plaid Hat Games",         booth: "#2229", msrp: "$10"    },
  { id: "container", game: "Container",       publisher: "Allplay",                 booth: "#2119", msrp: "$40"    },
  { id: "gruntz",    game: "Gruntz",          publisher: "Allplay",                 booth: "#2119", msrp: "$20"    },
  { id: "bookclub",  game: "Book Club",       publisher: "Allplay",                 booth: "#2119", msrp: "$9"     },
  { id: "movie",     game: "Movie Night",     publisher: "Allplay",                 booth: "#2119", msrp: "$9"     },
  { id: "soda",      game: "Soda Jerk",       publisher: "Allplay",                 booth: "#2119", msrp: "$9"     },
  { id: "gotfive",   game: "Got Five!",       publisher: "Blue Orange Games",       booth: "#1901", msrp: "$25"    },
  { id: "wingspan",  game: "Wingspan Pocket", publisher: "Stonemaier Games",        booth: "#2909", msrp: "$20"    },
  { id: "hypo",      game: "Hypothetically",  publisher: "IV Studio",               booth: "#3043", msrp: "$29.99" },
]

interface WillCallItem { id: string; label: string }
const WILLCALL_ITEMS: WillCallItem[] = [
  { id: "mrk",      label: "Signing — Mary Robinette Kowal & Scott Lynch (Sat 11am)" },
  { id: "salvatore",label: "Signing — R.A. Salvatore (Sat 12pm)" },
  { id: "dnd",      label: "The D&D Carnival (Sat 1pm)" },
  { id: "arcana",   label: "Arcana Unleashed Preview (Sat 4pm)" },
]

const SHOP_KEY        = "jake_gencon_shop_v1"
const SHOP_CUSTOM_KEY = "jake_gencon_shop_custom_v1"
const WILLCALL_KEY    = "jake_gencon_willcall_v1"

function loadCustomItems(): ShopItem[] {
  try { return JSON.parse(localStorage.getItem(SHOP_CUSTOM_KEY) ?? "[]") as ShopItem[] }
  catch { return [] }
}
function saveCustomItems(items: ShopItem[]) {
  localStorage.setItem(SHOP_CUSTOM_KEY, JSON.stringify(items))
}

function loadSet(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) ?? "[]") as string[]) }
  catch { return new Set() }
}
function saveSet(key: string, s: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...s]))
}

// ─────────────────────────────────────────────────────────────────────────────
// GenCon tab
// ─────────────────────────────────────────────────────────────────────────────

function TicketBadge({ ticket }: { ticket: string | null }) {
  if (!ticket) return null
  return (
    <Chip label={ticket} size="small"
      sx={{ height: 18, fontSize: "0.7rem", bgcolor: "#f5f5f5", ml: 0.5, px: 0.25, flexShrink: 0 }} />
  )
}

const PARKING_QR_SRC = "/parking-qr.png"
const MAPS_LINK      = "https://maps.google.com/?q=624+S+Missouri+Street,+Indianapolis,+IN+46225"

function ParkingCard() {
  const [qrOpen, setQrOpen] = useState(false)

  return (
    <>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", mb: 1 }}>
        {/* Header */}
        <Box sx={{ bgcolor: "#111", px: 2, py: 1.25, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#fff" }}>🅿️ Parking Pass</Typography>
          <Chip label="4 Day · Jul 30 – Aug 2" size="small"
            sx={{ height: 18, fontSize: "0.62rem", bgcolor: "rgba(255,255,255,0.15)", color: "#fff" }} />
        </Box>

        {/* Body: stacks vertically on mobile, side-by-side on sm+ */}
        <Box sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 1.5, sm: 3 },
          p: { xs: 1.75, sm: 2.5 },
          alignItems: { xs: "center", sm: "flex-start" },
        }}>
          {/* QR code — tap opens fullscreen modal */}
          <Box sx={{ flexShrink: 0, textAlign: "center" }}>
            <Box
              onClick={() => setQrOpen(true)}
              sx={{ display: "block", cursor: "pointer" }}
              title="Tap to enlarge"
            >
              <Box
                component="img" src={PARKING_QR_SRC} alt="Parking QR code"
                sx={{
                  width: { xs: 110, sm: 130 },
                  height: { xs: 110, sm: 130 },
                  display: "block",
                  borderRadius: 1,
                  border: "1px solid #e0e0e0",
                  imageRendering: "pixelated",
                }}
              />
            </Box>
            <Typography sx={{ fontSize: "0.65rem", color: "#aaa", mt: 0.75 }}>tap to enlarge</Typography>
          </Box>

          {/* Details */}
          <Box sx={{ flex: 1, width: { xs: "100%", sm: "auto" } }}>
            <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "#111", mb: 0.25 }}>
              Jobsite Supply
            </Typography>
            <Box
              component="a" href={MAPS_LINK} target="_blank" rel="noopener noreferrer"
              sx={{ fontSize: "0.82rem", color: "#1565c0", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
            >
              624 S Missouri St, Indianapolis, IN 46225
            </Box>

            <Divider sx={{ my: 1.25 }} />

            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.6 }}>
              {[
                "Shuttles run 8am – 10pm daily; text for pickup until 1am",
                "Show this digital QR code to the attendant on arrival",
                "Pass is valid for one vehicle only",
              ].map((note, i) => (
                <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                  <Typography sx={{ fontSize: "0.78rem", color: "#2e7d32", mt: "1px", flexShrink: 0 }}>✓</Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: "#555" }}>{note}</Typography>
                </Box>
              ))}
            </Box>

            <Typography sx={{ fontSize: "0.65rem", color: "#ccc", mt: 1.5, fontFamily: "monospace" }}>
              ID: 019c637f-214f-7148-a3e8-41988cbb7ad1
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Fullscreen QR modal */}
      <Dialog
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
      >
        {/* Modal header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2.5, py: 1.5, bgcolor: "#111" }}>
          <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.9rem" }}>🅿️ Parking Pass QR</Typography>
          <IconButton size="small" onClick={() => setQrOpen(false)} sx={{ color: "#fff" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        {/* Full-size QR */}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", p: 3, gap: 1.5, bgcolor: "#fff" }}>
          <Box
            component="img" src={PARKING_QR_SRC} alt="Parking QR code — full size"
            sx={{ width: "100%", maxWidth: 360, height: "auto", imageRendering: "pixelated", borderRadius: 1 }}
          />
          <Typography sx={{ fontSize: "0.75rem", color: "#888" }}>
            Show this to the attendant on arrival
          </Typography>
        </Box>
      </Dialog>
    </>
  )
}

function SectionHeader({ label, open, onToggle, right }: {
  label: string; open: boolean; onToggle: () => void; right?: React.ReactNode
}) {
  return (
    <Box
      onClick={onToggle}
      sx={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        cursor: "pointer", userSelect: "none",
        mb: open ? 1.5 : 0,
        py: 0.5,
      }}
    >
      <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#888" }}>
        {label}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {right}
        <ExpandMoreIcon sx={{ fontSize: 18, color: "#bbb", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </Box>
    </Box>
  )
}

function GenConTab() {
  const [bought, setBought]     = useState<Set<string>>(() => loadSet(SHOP_KEY))
  const [pickedUp, setPickedUp] = useState<Set<string>>(() => loadSet(WILLCALL_KEY))
  const [openSchedule,  setOpenSchedule]  = useState(true)
  const [openShopping,  setOpenShopping]  = useState(true)
  const [openWillCall,  setOpenWillCall]  = useState(true)
  // Per-day collapse — all open by default
  const [openDays, setOpenDays] = useState<Record<string, boolean>>(
    () => Object.fromEntries(DAYS.map(d => [d.label, true]))
  )
  const toggleDay = (label: string) =>
    setOpenDays(prev => ({ ...prev, [label]: !prev[label] }))

  // Custom shopping items
  const [customItems, setCustomItems] = useState<ShopItem[]>(loadCustomItems)
  const [addingItem,  setAddingItem]  = useState(false)
  const [newGame,  setNewGame]  = useState("")
  const [newBooth, setNewBooth] = useState("")
  const [newMsrp,  setNewMsrp]  = useState("")

  const allShopItems = [...SHOP_ITEMS, ...customItems]

  const commitNewItem = () => {
    if (!newGame.trim()) return
    const item: ShopItem = {
      id:        `custom_${Date.now()}`,
      game:      newGame.trim(),
      publisher: "",
      booth:     newBooth.trim(),
      msrp:      newMsrp.trim(),
    }
    const updated = [...customItems, item]
    setCustomItems(updated)
    saveCustomItems(updated)
    setNewGame(""); setNewBooth(""); setNewMsrp(""); setAddingItem(false)
  }

  const deleteCustomItem = (id: string) => {
    const updated = customItems.filter(i => i.id !== id)
    setCustomItems(updated)
    saveCustomItems(updated)
    setBought(prev => { const next = new Set(prev); next.delete(id); saveSet(SHOP_KEY, next); return next })
  }

  const toggleBought = (id: string) => {
    setBought(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      saveSet(SHOP_KEY, next)
      return next
    })
  }
  const toggleWillCall = (id: string) => {
    setPickedUp(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      saveSet(WILLCALL_KEY, next)
      return next
    })
  }

  const shopTotal = allShopItems
    .filter(i => !bought.has(i.id))
    .reduce((sum, i) => {
      const val = parseFloat((i.msrp || "0").replace("$", ""))
      return sum + (isNaN(val) ? 0 : val)
    }, 0)

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2.5, sm: 4 } }}>

      {/* Parking */}
      <ParkingCard />

      {/* Schedule */}
      <Box>
        <SectionHeader label="Schedule" open={openSchedule} onToggle={() => setOpenSchedule(o => !o)} />
        <Collapse in={openSchedule}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {DAYS.map(day => {
              const dayOpen = openDays[day.label] ?? true
              return (
              <Paper key={day.label} variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                {/* Day header — clickable to expand/collapse */}
                <Box
                  onClick={() => toggleDay(day.label)}
                  sx={{
                    bgcolor: day.color,
                    px: { xs: 1.5, sm: 2 },
                    py: { xs: 0.85, sm: 1 },
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    cursor: "pointer", userSelect: "none",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Typography sx={{ fontWeight: 700, fontSize: { xs: "0.82rem", sm: "0.9rem" }, color: "#fff" }}>
                      {day.label}
                    </Typography>
                    {day.note && (
                      <Chip label={day.note} size="small"
                        sx={{ height: 18, fontSize: "0.6rem", bgcolor: "rgba(255,255,255,0.2)", color: "#fff" }} />
                    )}
                  </Box>
                  <ExpandMoreIcon sx={{
                    fontSize: 18, color: "rgba(255,255,255,0.7)", flexShrink: 0,
                    transform: dayOpen ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s",
                  }} />
                </Box>

                {/* Events — collapsible */}
                <Collapse in={dayOpen}>
                {day.events.map((ev, i) => (
                  <Box key={i}>
                    {i > 0 && <Divider />}
                    <Box sx={{ px: { xs: 1.5, sm: 2 }, py: { xs: 0.85, sm: 1.1 } }}>
                      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.75 }}>
                        {/* Time column: start time, end time on separate line if range */}
                        {(() => {
                          const { start, end } = splitTime(ev.time)
                          return (
                            <Box sx={{ flexShrink: 0, width: { xs: 62, sm: 120 }, pt: "2px" }}>
                              <Typography sx={{
                                fontSize: { xs: "0.67rem", sm: "0.76rem" },
                                fontWeight: 600,
                                color: "#666",
                                whiteSpace: "nowrap",
                                lineHeight: 1.35,
                              }}>
                                {start}
                              </Typography>
                              {end && (
                                <Typography sx={{
                                  fontSize: { xs: "0.65rem", sm: "0.72rem" },
                                  color: "#aaa",
                                  whiteSpace: "nowrap",
                                  lineHeight: 1.35,
                                }}>
                                  {end}
                                </Typography>
                              )}
                            </Box>
                          )
                        })()}
                        {/* Event label + location, ticket badge inline */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
                            <Typography sx={{
                              fontSize: { xs: "0.8rem", sm: "0.82rem" },
                              color: "#111",
                              flex: 1,
                              lineHeight: 1.4,
                            }}>
                              {ev.label}
                            </Typography>
                            <TicketBadge ticket={ev.ticket} />
                          </Box>
                          {ev.location && (
                            <Typography sx={{ fontSize: { xs: "0.67rem", sm: "0.72rem" }, color: "#aaa", mt: 0.2 }}>
                              {ev.location}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                ))}
                </Collapse>
              </Paper>
              )
            })}
          </Box>
          <Box sx={{ mt: 1.25, px: 0.5 }}>
            <Typography sx={{ fontSize: "0.7rem", color: "#888", lineHeight: 1.6 }}>
              🎟️ paper ticket &nbsp;|&nbsp; 📱 e-ticket &nbsp;|&nbsp; 🏛️ Will Call required
            </Typography>
          </Box>
        </Collapse>
      </Box>

      <Divider />

      {/* Shopping list */}
      <Box>
        <SectionHeader
          label="Shopping List"
          open={openShopping}
          onToggle={() => setOpenShopping(o => !o)}
          right={
            <Typography sx={{ fontSize: "0.72rem", color: "#aaa", whiteSpace: "nowrap" }}>
              {bought.size}/{allShopItems.length} · ~${shopTotal.toFixed(0)} left
            </Typography>
          }
        />
        <Collapse in={openShopping}>
          <Typography sx={{ fontSize: "0.75rem", color: "#888", mb: 1.25, fontStyle: "italic", lineHeight: 1.5 }}>
            Enter via Wabash Street concourse (north, Lucas Oil side) or JW Marriott skybridge — closest to the 2000-range booths.
          </Typography>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
            {/* Table header */}
            <Box sx={{
              display: "grid",
              gridTemplateColumns: { xs: "32px 1fr 52px", sm: "32px 1fr 160px 70px 60px" },
              gap: 1,
              px: { xs: 1.5, sm: 2 },
              py: 0.85,
              bgcolor: "#f9fafb",
              borderBottom: "1px solid #e4e4e7",
            }}>
              {["", "Game", "Publisher", "Booth", "MSRP"].map((h, i) => (
                <Typography key={i} sx={{
                  fontSize: "0.68rem", fontWeight: 700, color: "#888",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                  display: (i === 2 || i === 3) ? { xs: "none", sm: "block" } : "block",
                }}>
                  {h}
                </Typography>
              ))}
            </Box>

            {allShopItems.map((item, i) => {
              const done     = bought.has(item.id)
              const isCustom = item.id.startsWith("custom_")
              return (
                <Box key={item.id}>
                  {i > 0 && <Divider />}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "32px 1fr 52px 28px", sm: "32px 1fr 160px 70px 60px 28px" },
                      gap: 1,
                      px: { xs: 1.5, sm: 2 },
                      py: { xs: 0.85, sm: 1 },
                      alignItems: "center",
                      bgcolor: done ? "#fafafa" : "transparent",
                      cursor: "pointer",
                      "&:hover": { bgcolor: done ? "#f5f5f5" : "#fafcff" },
                    }}
                    onClick={() => toggleBought(item.id)}
                  >
                    <Checkbox
                      size="small" checked={done}
                      onChange={() => toggleBought(item.id)}
                      onClick={e => e.stopPropagation()}
                      sx={{ p: 0, color: "#C41230", "&.Mui-checked": { color: "#C41230" } }}
                    />
                    {/* Game name + booth/publisher subtitle on mobile */}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{
                        fontSize: { xs: "0.8rem", sm: "0.82rem" },
                        fontWeight: 600,
                        color: done ? "#bbb" : "#111",
                        textDecoration: done ? "line-through" : "none",
                        lineHeight: 1.35,
                      }}>
                        {item.game}
                      </Typography>
                      <Typography sx={{
                        display: { xs: "block", sm: "none" },
                        fontSize: "0.68rem",
                        color: done ? "#ccc" : "#999",
                        fontFamily: "monospace",
                      }}>
                        {[item.booth, item.publisher].filter(Boolean).join(" · ")}
                      </Typography>
                    </Box>
                    {/* Publisher — desktop only */}
                    <Typography sx={{
                      display: { xs: "none", sm: "block" },
                      fontSize: "0.78rem",
                      color: done ? "#ccc" : "#666",
                    }}>
                      {item.publisher}
                    </Typography>
                    {/* Booth — desktop only */}
                    <Typography sx={{
                      display: { xs: "none", sm: "block" },
                      fontSize: "0.78rem",
                      color: done ? "#ccc" : "#888",
                      fontFamily: "monospace",
                    }}>
                      {item.booth}
                    </Typography>
                    {/* MSRP */}
                    <Typography sx={{
                      fontSize: "0.78rem",
                      color: done ? "#ccc" : "#555",
                      fontWeight: { xs: 600, sm: 400 },
                      textAlign: { xs: "right", sm: "left" },
                    }}>
                      {item.msrp}
                    </Typography>
                    {/* Delete — custom items only */}
                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                      {isCustom && (
                        <IconButton size="small"
                          onClick={e => { e.stopPropagation(); deleteCustomItem(item.id) }}
                          sx={{ p: 0.25, opacity: 0.3, "&:hover": { opacity: 1, color: "#C41230" } }}>
                          <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                </Box>
              )
            })}

            {/* Add item form */}
            <Divider />
            {addingItem ? (
              <Box sx={{
                display: "flex", gap: 1, px: { xs: 1.5, sm: 2 }, py: 1.25, alignItems: "center",
                flexWrap: { xs: "wrap", sm: "nowrap" },
                bgcolor: "#fafcff",
              }}>
                <TextField size="small" placeholder="Game name *" value={newGame} onChange={e => setNewGame(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") commitNewItem(); if (e.key === "Escape") setAddingItem(false) }}
                  autoFocus
                  sx={{ flex: { xs: "1 1 100%", sm: 2 }, "& .MuiInputBase-input": { fontSize: "0.82rem", py: 0.75 } }}
                />
                <TextField size="small" placeholder="Booth" value={newBooth} onChange={e => setNewBooth(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") commitNewItem(); if (e.key === "Escape") setAddingItem(false) }}
                  sx={{ flex: { xs: "1 1 calc(50% - 4px)", sm: 1 }, "& .MuiInputBase-input": { fontSize: "0.82rem", py: 0.75 } }}
                />
                <TextField size="small" placeholder="MSRP" value={newMsrp} onChange={e => setNewMsrp(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") commitNewItem(); if (e.key === "Escape") setAddingItem(false) }}
                  sx={{ flex: { xs: "1 1 calc(50% - 4px)", sm: 1 }, "& .MuiInputBase-input": { fontSize: "0.82rem", py: 0.75 } }}
                />
                <Button size="small" variant="contained" onClick={commitNewItem} disabled={!newGame.trim()}
                  sx={{ bgcolor: "#C41230", "&:hover": { bgcolor: "#a50e26" }, fontWeight: 700, flexShrink: 0, px: 1.5 }}>
                  Add
                </Button>
                <Button size="small" onClick={() => { setAddingItem(false); setNewGame(""); setNewBooth(""); setNewMsrp("") }}
                  sx={{ flexShrink: 0 }}>
                  Cancel
                </Button>
              </Box>
            ) : (
              <Box
                onClick={() => setAddingItem(true)}
                sx={{
                  display: "flex", alignItems: "center", gap: 1,
                  px: { xs: 1.5, sm: 2 }, py: 1,
                  cursor: "pointer", color: "#aaa",
                  "&:hover": { bgcolor: "#fafafa", color: "#C41230" },
                  transition: "color 0.15s",
                }}
              >
                <AddIcon sx={{ fontSize: 16 }} />
                <Typography sx={{ fontSize: "0.78rem" }}>Add item</Typography>
              </Box>
            )}
          </Paper>
        </Collapse>
      </Box>

      <Divider />

      {/* Will Call checklist */}
      <Box>
        <SectionHeader
          label="Will Call Checklist"
          open={openWillCall}
          onToggle={() => setOpenWillCall(o => !o)}
          right={
            <Chip
              label={`${pickedUp.size} / ${WILLCALL_ITEMS.length} picked up`}
              size="small"
              sx={{
                height: 18, fontSize: "0.62rem", fontWeight: 700,
                bgcolor: pickedUp.size === WILLCALL_ITEMS.length ? "#e8f5e9" : "#f5f5f5",
                color:   pickedUp.size === WILLCALL_ITEMS.length ? "#2e7d32" : "#888",
              }}
            />
          }
        />
        <Collapse in={openWillCall}>
          <Typography sx={{ fontSize: "0.75rem", color: "#888", mb: 1.25 }}>
            Pick up Thursday morning at ICC Customer Service (opens 7am).
          </Typography>
          <Paper variant="outlined" sx={{ borderRadius: 2, px: { xs: 1.5, sm: 2 }, py: 0.5 }}>
            {WILLCALL_ITEMS.map((item, i) => {
              const done = pickedUp.has(item.id)
              return (
                <Box key={item.id}>
                  {i > 0 && <Divider />}
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small" checked={done}
                        onChange={() => toggleWillCall(item.id)}
                        sx={{ color: "#C41230", "&.Mui-checked": { color: "#C41230" } }}
                      />
                    }
                    label={
                      <Typography sx={{
                        fontSize: { xs: "0.82rem", sm: "0.85rem" },
                        color: done ? "#bbb" : "#222",
                        textDecoration: done ? "line-through" : "none",
                        lineHeight: 1.4,
                      }}>
                        {item.label}
                      </Typography>
                    }
                    sx={{ py: 0.75, width: "100%", ml: 0 }}
                  />
                </Box>
              )
            })}
          </Paper>
        </Collapse>
      </Box>
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Scratchpad tab
// ─────────────────────────────────────────────────────────────────────────────

function ScratchpadTab() {
  const [notes, setNotes]           = useState<Note[]>(loadNotes)
  const [selectedId, setSelectedId] = useState<string | null>(() => loadNotes()[0]?.id ?? null)
  const [saved, setSaved]           = useState(false)
  const debounceRef                 = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selected = notes.find(n => n.id === selectedId) ?? null

  const persist = useCallback((updated: Note[], immediate = false) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const flush = () => { saveNotes(updated); setSaved(true); setTimeout(() => setSaved(false), 1500) }
    if (immediate) flush()
    else debounceRef.current = setTimeout(flush, 600)
  }, [])

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const addNote = () => {
    const n = newNote()
    const updated = [n, ...notes]
    setNotes(updated); setSelectedId(n.id); persist(updated, true)
  }

  const deleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id)
    setNotes(updated)
    if (selectedId === id) setSelectedId(updated[0]?.id ?? null)
    persist(updated, true)
  }

  const updateTitle = (title: string) => {
    if (!selected) return
    const updated = notes.map(n => n.id === selected.id ? { ...n, title, updatedAt: new Date().toISOString() } : n)
    setNotes(updated); persist(updated)
  }

  const updateContent = (content: string) => {
    if (!selected) return
    const updated = notes.map(n => n.id === selected.id ? { ...n, content, updatedAt: new Date().toISOString() } : n)
    setNotes(updated); persist(updated)
  }

  return (
    <Box>
      {/* Toolbar */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1, mb: 2 }}>
        {saved && (
          <Chip label="Saved" size="small"
            sx={{ height: 20, fontSize: "0.65rem", bgcolor: "#e8f5e9", color: "#2e7d32" }} />
        )}
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={addNote}
          sx={{ bgcolor: "#C41230", "&:hover": { bgcolor: "#a50e26" }, fontWeight: 700 }}>
          New note
        </Button>
      </Box>

      {notes.length === 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 2 }}>
          <NoteIcon sx={{ fontSize: 48, color: "#e0e0e0" }} />
          <Typography color="text.secondary">No notes yet.</Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={addNote}
            sx={{ borderColor: "#C41230", color: "#C41230" }}>
            Create your first note
          </Button>
        </Box>
      ) : (
        <Box sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "260px 1fr" },
          gap: 2,
          minHeight: { xs: "auto", sm: 500 },
        }}>
          {/* Sidebar: capped and scrollable on mobile so editor is reachable without excessive scroll */}
          <Paper variant="outlined" sx={{
            borderRadius: 2,
            overflow: "hidden",
            height: "fit-content",
            maxHeight: { xs: 190, sm: "none" },
            overflowY: { xs: "auto", sm: "visible" },
          }}>
            {notes.map((note, i) => (
              <Box key={note.id}>
                {i > 0 && <Divider />}
                <Box
                  onClick={() => setSelectedId(note.id)}
                  sx={{
                    px: { xs: 1.5, sm: 2 }, py: 1.25,
                    cursor: "pointer",
                    bgcolor: note.id === selectedId ? "#fff5f5" : "transparent",
                    borderLeft: note.id === selectedId ? "3px solid #C41230" : "3px solid transparent",
                    "&:hover": { bgcolor: note.id === selectedId ? "#fff5f5" : "#fafafa" },
                    display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{
                      fontWeight: note.id === selectedId ? 700 : 500, fontSize: "0.85rem",
                      color: note.id === selectedId ? "#C41230" : "#222",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {note.title || "Untitled"}
                    </Typography>
                    <Typography sx={{ fontSize: "0.7rem", color: "#aaa", mt: 0.25 }}>
                      {relativeTime(note.updatedAt)}
                    </Typography>
                    {note.content && (
                      <Typography sx={{ fontSize: "0.72rem", color: "#999", mt: 0.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {note.content.slice(0, 60)}
                      </Typography>
                    )}
                  </Box>
                  <Tooltip title="Delete note">
                    <IconButton size="small"
                      onClick={e => { e.stopPropagation(); deleteNote(note.id) }}
                      sx={{ opacity: 0.3, "&:hover": { opacity: 1, color: "#C41230" }, flexShrink: 0 }}>
                      <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            ))}
          </Paper>

          {/* Editor */}
          {selected ? (
            <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 2, sm: 2.5 }, display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField variant="standard" value={selected.title} onChange={e => updateTitle(e.target.value)}
                placeholder="Title" fullWidth
                InputProps={{ disableUnderline: true, sx: { fontSize: "1.2rem", fontWeight: 700, color: "#111" } }}
              />
              <Divider />
              <TextField multiline fullWidth minRows={10} variant="standard"
                value={selected.content} onChange={e => updateContent(e.target.value)}
                placeholder="Write anything…"
                InputProps={{ disableUnderline: true, sx: { fontSize: "0.9rem", lineHeight: 1.7, color: "#333", fontFamily: "inherit", alignItems: "flex-start" } }}
              />
              <Typography sx={{ fontSize: "0.7rem", color: "#ccc", textAlign: "right" }}>
                {selected.content.length} chars · last updated {relativeTime(selected.updatedAt)}
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 120 }}>
              <Typography color="text.secondary" fontSize="0.88rem">Select a note</Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page root
// ─────────────────────────────────────────────────────────────────────────────

export default function JakePage() {
  const [tab, setTab] = useState(0)

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
        <Box sx={{ width: 4, height: 28, bgcolor: "#C41230", borderRadius: 1, flexShrink: 0 }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>Jake</Typography>
          <Typography variant="body2" color="text.secondary">Personal · staff only</Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 600, minHeight: 44 } }}>
          <Tab label="Scratchpad" />
          <Tab label="GenCon 2026" />
        </Tabs>
      </Box>

      {tab === 0 && <ScratchpadTab />}
      {tab === 1 && <GenConTab />}
    </Box>
  )
}
