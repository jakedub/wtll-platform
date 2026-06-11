import { useState } from "react"
import { Box, Tab, Tabs, Typography } from "@mui/material"
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth"
import CampaignIcon from "@mui/icons-material/Campaign"
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet"
import SportsBaseballIcon from "@mui/icons-material/SportsBaseball"
import StarIcon from "@mui/icons-material/Star"
import ChecklistIcon from "@mui/icons-material/Checklist"
import GroupsIcon from "@mui/icons-material/Groups"

import CalendarTab from "./CalendarTab"
import MarketingTab from "./MarketingTab"
import BudgetTab from "./BudgetTab"
import FallBallTab from "./FallBallTab"
import AllStarsTab from "./AllStarsTab"
import ChecklistTab from "./ChecklistTab"
import AssignmentsTab from "./AssignmentsTab"

const RED = "#C41230"

const TABS = [
  { label: "Calendar",    icon: <CalendarMonthIcon fontSize="small" />,         component: <CalendarTab /> },
  { label: "Marketing",   icon: <CampaignIcon fontSize="small" />,               component: <MarketingTab /> },
  { label: "Budget",      icon: <AccountBalanceWalletIcon fontSize="small" />,   component: <BudgetTab /> },
  { label: "Fall Ball",   icon: <SportsBaseballIcon fontSize="small" />,         component: <FallBallTab /> },
  { label: "All Stars",   icon: <StarIcon fontSize="small" />,                   component: <AllStarsTab /> },
  { label: "Checklist",   icon: <ChecklistIcon fontSize="small" />,              component: <ChecklistTab /> },
  { label: "Assignments", icon: <GroupsIcon fontSize="small" />,                 component: <AssignmentsTab /> },
]

export default function BoardHubPage() {
  const [tab, setTab] = useState(0)

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: RED, borderRadius: 1, flexShrink: 0 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#111" }}>Board Operations Hub</Typography>
        </Box>
        <Typography sx={{ color: "#777", fontSize: "0.875rem", ml: "20px" }}>
          2026–2027 season planning — calendar, marketing, budget, Fall Ball, All Stars, checklist &amp; work assignments.
        </Typography>
      </Box>

      {/* Tab bar */}
      <Box sx={{ borderBottom: "1px solid #e4e4e7", mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            "& .MuiTab-root": { fontSize: "0.8rem", fontWeight: 600, minHeight: 44, textTransform: "none", color: "#888", gap: 0.5 },
            "& .Mui-selected": { color: `${RED} !important` },
            "& .MuiTabs-indicator": { bgcolor: RED },
          }}
        >
          {TABS.map((t, i) => (
            <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Box>

      {/* Tab content */}
      {TABS.map((t, i) => (
        <Box key={i} sx={{ display: tab === i ? "block" : "none" }}>
          {t.component}
        </Box>
      ))}
    </Box>
  )
}
