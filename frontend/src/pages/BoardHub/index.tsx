import { useState, useEffect, useRef } from "react"
import {
  Box, Tab, Tabs, Typography, IconButton, Tooltip,
  Popover, FormControlLabel, Switch, Divider, Button,
} from "@mui/material"
import CalendarMonthIcon        from "@mui/icons-material/CalendarMonth"
import CampaignIcon             from "@mui/icons-material/Campaign"
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet"
import SportsBaseballIcon       from "@mui/icons-material/SportsBaseball"
import StarIcon                 from "@mui/icons-material/Star"
import ChecklistIcon            from "@mui/icons-material/Checklist"
import GroupsIcon               from "@mui/icons-material/Groups"
import EmojiEventsIcon          from "@mui/icons-material/EmojiEvents"
import AttachMoneyIcon          from "@mui/icons-material/AttachMoney"
import ChildCareIcon            from "@mui/icons-material/ChildCare"
import TuneIcon                 from "@mui/icons-material/Tune"

import CalendarTab       from "./CalendarTab"
import MarketingTab      from "./MarketingTab"
import BudgetTab         from "./BudgetTab"
import FallBallTab       from "./FallBallTab"
import AllStarsTab       from "./AllStarsTab"
import ChecklistTab      from "./ChecklistTab"
import AssignmentsTab    from "./AssignmentsTab"
import ShowcaseTab       from "./ShowcaseTab"
import FundraisingHubTab from "./FundraisingHubTab"
import TeeBallTab        from "./TeeBallTab"

const RED = "#C41230"
const LS_KEY = "boardhub_visible_tabs"

// ─── Master tab registry ──────────────────────────────────────────────────────

const ALL_TABS = [
  { id: "calendar",     label: "Calendar",     icon: <CalendarMonthIcon fontSize="small" />,        component: <CalendarTab />,      required: true  },
  { id: "checklist",   label: "Checklist",    icon: <ChecklistIcon fontSize="small" />,             component: <ChecklistTab />,     required: true  },
  { id: "marketing",   label: "Marketing",    icon: <CampaignIcon fontSize="small" />,              component: <MarketingTab />,     required: false },
  { id: "budget",      label: "Budget",       icon: <AccountBalanceWalletIcon fontSize="small" />,  component: <BudgetTab />,        required: false },
  { id: "fallball",    label: "Fall Ball",    icon: <SportsBaseballIcon fontSize="small" />,        component: <FallBallTab />,      required: false },
  { id: "allstars",    label: "All Stars",    icon: <StarIcon fontSize="small" />,                  component: <AllStarsTab />,      required: false },
  { id: "showcase",    label: "Showcase",     icon: <EmojiEventsIcon fontSize="small" />,           component: <ShowcaseTab />,      required: false },
  { id: "fundraising", label: "Fundraising",  icon: <AttachMoneyIcon fontSize="small" />,           component: <FundraisingHubTab />,required: false },
  { id: "tee_ball",    label: "Tee Ball",     icon: <ChildCareIcon fontSize="small" />,             component: <TeeBallTab />,       required: false },
  { id: "assignments", label: "Assignments",  icon: <GroupsIcon fontSize="small" />,                component: <AssignmentsTab />,   required: false },
]

const DEFAULT_VISIBLE = new Set(
  ALL_TABS.filter(t => t.required || ["calendar","checklist","marketing","budget","fallball","allstars"].includes(t.id)).map(t => t.id)
)

function loadVisible(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const arr = JSON.parse(raw) as string[]
      // Always include required tabs
      const required = ALL_TABS.filter(t => t.required).map(t => t.id)
      return new Set([...required, ...arr])
    }
  } catch { /* ignore */ }
  return new Set(DEFAULT_VISIBLE)
}

function saveVisible(visible: Set<string>) {
  localStorage.setItem(LS_KEY, JSON.stringify([...visible]))
}

// ─── Customize popover ────────────────────────────────────────────────────────

interface CustomizeProps {
  visible:   Set<string>
  onChange:  (next: Set<string>) => void
  onReset:   () => void
}

function CustomizePopover({ visible, onChange, onReset }: CustomizeProps) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null)

  const toggle = (id: string, checked: boolean) => {
    const next = new Set(visible)
    checked ? next.add(id) : next.delete(id)
    onChange(next)
  }

  return (
    <>
      <Tooltip title="Customize tabs">
        <IconButton size="small" onClick={e => setAnchor(e.currentTarget)}
          sx={{ color: "#888", "&:hover": { color: RED } }}>
          <TuneIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { borderRadius: 2, border: "1px solid #e4e4e7", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 220 } }}
      >
        <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", color: "#333" }}>Visible Tabs</Typography>
          <Typography sx={{ fontSize: "0.73rem", color: "#999", mt: 0.25 }}>Calendar and Checklist are always shown.</Typography>
        </Box>
        <Divider sx={{ my: 1 }} />
        <Box sx={{ px: 1.5, pb: 1 }}>
          {ALL_TABS.filter(t => !t.required).map(t => (
            <FormControlLabel
              key={t.id}
              control={
                <Switch
                  size="small"
                  checked={visible.has(t.id)}
                  onChange={e => toggle(t.id, e.target.checked)}
                  sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: RED }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: RED } }}
                />
              }
              label={<Typography sx={{ fontSize: "0.83rem" }}>{t.label}</Typography>}
              sx={{ display: "flex", m: 0, py: 0.4 }}
            />
          ))}
        </Box>
        <Divider />
        <Box sx={{ px: 2, py: 1, display: "flex", justifyContent: "flex-end" }}>
          <Button size="small" onClick={() => { onReset(); setAnchor(null) }}
            sx={{ fontSize: "0.75rem", color: "#888", textTransform: "none" }}>
            Reset to defaults
          </Button>
        </Box>
      </Popover>
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BoardHubPage() {
  const [visible, setVisible] = useState<Set<string>>(() => loadVisible())
  const [tab, setTab]         = useState(0)

  // Persist whenever visible changes
  useEffect(() => { saveVisible(visible) }, [visible])

  const visibleTabs = ALL_TABS.filter(t => visible.has(t.id))

  // Clamp active tab index when tabs are hidden
  const safeTab = Math.min(tab, visibleTabs.length - 1)

  const handleVisibleChange = (next: Set<string>) => {
    setVisible(next)
    // If the currently active tab got hidden, snap back to 0
    const visibleIds = ALL_TABS.filter(t => next.has(t.id)).map(t => t.id)
    const currentId  = visibleTabs[safeTab]?.id
    if (currentId && !visibleIds.includes(currentId)) setTab(0)
  }

  const handleReset = () => {
    setVisible(new Set(DEFAULT_VISIBLE))
    setTab(0)
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 2, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
            <Box sx={{ width: 4, height: 28, bgcolor: RED, borderRadius: 1, flexShrink: 0 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#111" }}>Board Operations Hub</Typography>
          </Box>
          <Typography sx={{ color: "#777", fontSize: "0.875rem", ml: "20px" }}>
            Season planning — calendar, checklists &amp; work areas for your active board groupings.
          </Typography>
        </Box>
        <CustomizePopover
          visible={visible}
          onChange={handleVisibleChange}
          onReset={handleReset}
        />
      </Box>

      {/* Tab bar */}
      <Box sx={{ borderBottom: "1px solid #e4e4e7", mb: 3 }}>
        <Tabs
          value={safeTab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            "& .MuiTab-root": { fontSize: "0.8rem", fontWeight: 600, minHeight: 44, textTransform: "none", color: "#888", gap: 0.5 },
            "& .Mui-selected": { color: `${RED} !important` },
            "& .MuiTabs-indicator": { bgcolor: RED },
          }}
        >
          {visibleTabs.map((t, i) => (
            <Tab key={t.id} label={t.label} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Box>

      {/* Tab content */}
      {visibleTabs.map((t, i) => (
        <Box key={t.id} sx={{ display: safeTab === i ? "block" : "none" }}>
          {t.component}
        </Box>
      ))}
    </Box>
  )
}
