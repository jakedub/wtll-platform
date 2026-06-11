import { Box, Typography } from "@mui/material"
import { Notice, RED } from "./shared"

interface CalEvent { text: string; owner: string; color: string }
interface Month { month: string; phase: string; events: CalEvent[] }

const DOT_COLORS: Record<string, string> = {
  red: RED, gold: "#d97706", green: "#2e7d32", blue: "#1565c0", purple: "#6a1b9a", orange: "#c2410c",
}

const MONTHS: Month[] = [
  { month: "June 2026", phase: "2026 Rec Season Finish", events: [
    { text: "Playoffs — 1st week of June (all divisions)", owner: "VP Baseball · VP Softball", color: "red" },
    { text: "Championship Game — Saturday of first full week of June", owner: "President · VP Baseball · Grounds Manager", color: "red" },
    { text: "All Star paperwork finalized & submitted to DA before end of school year", owner: "Baseball Player Agent · VP Baseball", color: "purple" },
    { text: "Teen Baseball (Juniors/Seniors) practices begin post-championship", owner: "Baseball Player Agent", color: "gold" },
    { text: "End-of-season awards, trophies, sponsor recognition", owner: "VP Baseball · Sponsorship Coordinator", color: "blue" },
    { text: "Collect equipment, inventory uniforms & gear", owner: "Equipment Manager", color: "green" },
  ]},
  { month: "July 2026", phase: "Fall Ball Planning · Teen Baseball", events: [
    { text: "Teen Baseball season ends mid-July", owner: "Baseball Player Agent", color: "red" },
    { text: "Fall Ball registration opens early July", owner: "Baseball Player Agent · Secretary", color: "gold" },
    { text: "Confirm interleague partners for Fall Ball (AAA/Majors)", owner: "President · VP Baseball", color: "orange" },
    { text: "Identify Fall Ball coach volunteers", owner: "Baseball Player Agent", color: "blue" },
    { text: "All Star tournaments begin (district/sectional)", owner: "VP Baseball · Baseball Player Agent", color: "purple" },
    { text: "Begin Fall Ball scheduling framework", owner: "VP Baseball · Umpire in Chief", color: "green" },
  ]},
  { month: "August 2026", phase: "Fall Ball Launch", events: [
    { text: "Fall Ball registration closes 2nd week of August", owner: "Baseball Player Agent · Secretary", color: "red" },
    { text: "Fall Ball uniforms ordered — 2nd week of August (hat + raglan)", owner: "VP Baseball · Equipment Manager", color: "red" },
    { text: "Fall Ball teams formed & coaches notified", owner: "Baseball Player Agent", color: "gold" },
    { text: "Fall Ball schedule finalized with interleague partners", owner: "VP Baseball", color: "blue" },
    { text: "Confirm umpire coverage for Fall Ball games", owner: "Umpire in Chief", color: "orange" },
    { text: "Field prep & scheduling for Fall Ball fields", owner: "Grounds Manager", color: "green" },
  ]},
  { month: "September 2026", phase: "Fall Ball Season", events: [
    { text: "Fall Ball regular season in progress (AAA, Majors, +AA if threshold met)", owner: "VP Baseball", color: "red" },
    { text: "Single-day tournament — last weekend of September", owner: "VP Baseball · Grounds Manager · Umpire in Chief", color: "gold" },
    { text: "Begin board recruitment for 2027 season (open roles)", owner: "President · Secretary", color: "blue" },
    { text: "Sponsorship outreach for 2027 season begins", owner: "Sponsorship Coordinator", color: "purple" },
    { text: "Concessions operations during Fall Ball games", owner: "Concessions Manager", color: "green" },
  ]},
  { month: "October 2026", phase: "Fall Ball Wrap · 2027 Planning Begins", events: [
    { text: "Fall Ball season ends October 1", owner: "VP Baseball", color: "red" },
    { text: "Fall Ball wrap-up, equipment collection", owner: "Equipment Manager", color: "gold" },
    { text: "Begin 2027 budget planning process", owner: "Treasurer · All VPs", color: "blue" },
    { text: "Annual board elections / officer transitions", owner: "President · Secretary", color: "orange" },
    { text: "Fundraising planning for 2027", owner: "Fundraising Coordinator", color: "green" },
  ]},
  { month: "November 2026", phase: "Off-Season Planning", events: [
    { text: "2027 budget presented to & approved by board (early November)", owner: "Treasurer · President", color: "red" },
    { text: "Vendor contract renewals reviewed (fields, insurance, uniforms)", owner: "President · VP Baseball · VP Softball", color: "gold" },
    { text: "Draft Little League charter renewal documentation", owner: "Secretary · President", color: "blue" },
    { text: "Sponsor renewal outreach — returning sponsors priority", owner: "Sponsorship Coordinator", color: "orange" },
    { text: "Safety Officer completes annual field safety audit", owner: "Safety Officer", color: "purple" },
  ]},
  { month: "December 2026", phase: "Pre-Season Contracts", events: [
    { text: "Indoor evaluation venue contracted by early December", owner: "VP Baseball · Grounds Manager", color: "red" },
    { text: "Finalize umpire recruitment plan for 2027 season", owner: "Umpire in Chief", color: "gold" },
    { text: "Uniform vendor selection for 2027 spring season (AAA/Majors)", owner: "VP Baseball · Equipment Manager", color: "blue" },
    { text: "Registration platform configured for January launch", owner: "Secretary · Player Agents", color: "orange" },
    { text: "Coach recruitment campaign drafted (social/email)", owner: "Marketing & Comms · Baseball Player Agent", color: "green" },
  ]},
  { month: "January 2027", phase: "Registration Opens", events: [
    { text: "Registration opens 2nd week of January (second semester start)", owner: "Secretary · Baseball Player Agent · Softball Player Agent", color: "red" },
    { text: "School enrollment form required at registration", owner: "Baseball Player Agent · Softball Player Agent", color: "red" },
    { text: "Spring registration launch marketing push (flyer, social, school newsletter)", owner: "Marketing & Comms Manager", color: "gold" },
    { text: "Coach recruitment posts go live", owner: "Marketing & Comms · Baseball Player Agent", color: "blue" },
    { text: "Teen Baseball (Juniors/Seniors) registration opens", owner: "Baseball Player Agent", color: "orange" },
  ]},
  { month: "February 2027", phase: "Registration Active", events: [
    { text: "Registration ongoing; follow-up outreach to families", owner: "Marketing & Comms · Secretary", color: "red" },
    { text: "Evaluations announcement published (date, location, what to bring)", owner: "Marketing & Comms · Baseball Player Agent", color: "gold" },
    { text: "Umpire training / certification sessions scheduled", owner: "Umpire in Chief", color: "blue" },
    { text: "Pitcher/catcher clinic promo & sign-ups", owner: "Marketing & Comms · VP Baseball", color: "orange" },
    { text: "Safety plan updated; background checks processed for coaches", owner: "Safety Officer · Baseball Player Agent", color: "green" },
  ]},
  { month: "March 2027", phase: "Evals · Draft · Rosters", events: [
    { text: "Registration closes mid-March; eligibility check runs", owner: "Baseball Player Agent · Softball Player Agent", color: "red" },
    { text: "AAA/Majors evaluations — 1st Saturday of March (indoors)", owner: "VP Baseball · Baseball Player Agent", color: "red" },
    { text: "Draft complete before last Saturday of March; rosters finalized that Saturday", owner: "VP Baseball · Baseball Player Agent", color: "red" },
    { text: "Spring uniforms ordered late March (AAA/Majors)", owner: "VP Baseball · Equipment Manager", color: "gold" },
    { text: "Field maintenance, lining, dugout prep begins", owner: "Grounds Manager", color: "green" },
  ]},
  { month: "April 2027", phase: "Spring Season Launch", events: [
    { text: "Opening Day — 2nd Saturday of April", owner: "President · VP Baseball · VP Softball · Marketing", color: "red" },
    { text: "Opening Day announcement & social campaign", owner: "Marketing & Comms Manager", color: "gold" },
    { text: "Regular season begins (PeeWee, AA, AAA, Majors, Softball)", owner: "VP Baseball · VP Softball", color: "blue" },
    { text: "Concessions open for season; volunteers scheduled", owner: "Concessions Manager · Volunteer Coordinator", color: "orange" },
    { text: "GameChanger setup & weekly recap posts begin", owner: "Marketing & Comms Manager", color: "green" },
  ]},
  { month: "May 2027", phase: "All Stars · Teen Baseball", events: [
    { text: "All Star nominations — 1st week of May (coaches nominate)", owner: "Baseball Player Agent · VP Baseball", color: "purple" },
    { text: "All Star selection — 2nd week of May", owner: "All Star Coaches · VP Baseball · Baseball Player Agent", color: "purple" },
    { text: "Teen Baseball registration closes 2nd week of May (no eval/draft)", owner: "Baseball Player Agent", color: "red" },
    { text: "No games on Memorial Day", owner: "VP Baseball · VP Softball", color: "gold" },
    { text: "All Star paperwork preparation begins", owner: "Baseball Player Agent", color: "blue" },
  ]},
  { month: "June 2027", phase: "Playoffs · Championship · All Stars", events: [
    { text: "Playoffs — 1st week of June", owner: "VP Baseball · VP Softball · Umpire in Chief", color: "red" },
    { text: "Championship — Saturday of first full week of June", owner: "President · VP Baseball · VP Softball · Grounds Manager", color: "red" },
    { text: "All Star paperwork submitted to DA before end of school year", owner: "Baseball Player Agent · VP Baseball", color: "purple" },
    { text: "Teen Baseball practices begin post-championship", owner: "Baseball Player Agent", color: "gold" },
    { text: "End-of-season awards, trophies distributed", owner: "VP Baseball · VP Softball", color: "green" },
  ]},
  { month: "July 2027", phase: "All Stars · Teen Baseball · Fall Ball Prep", events: [
    { text: "All Star tournament play (district/sectional/state)", owner: "VP Baseball · Baseball Player Agent", color: "purple" },
    { text: "Teen Baseball season ends mid-July", owner: "Baseball Player Agent", color: "red" },
    { text: "Fall Ball registration opens early July", owner: "Baseball Player Agent · Secretary", color: "gold" },
    { text: "Begin Fall Ball planning cycle (coaches, interleague, schedule)", owner: "VP Baseball", color: "blue" },
    { text: "Post-season equipment audit & storage", owner: "Equipment Manager", color: "orange" },
  ]},
]

export default function CalendarTab() {
  return (
    <Box>
      <Notice color="gold">
        <strong>Key Fixed Dates: </strong>
        Opening Day = 2nd Saturday of April &nbsp;·&nbsp; Playoffs = 1st week of June &nbsp;·&nbsp;
        Championship = Saturday of first full week of June &nbsp;·&nbsp; No games Memorial Day &nbsp;·&nbsp;
        All Star paperwork due before end of school year &nbsp;·&nbsp; Fall Ball ends October 1
      </Notice>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 2 }}>
        {MONTHS.map((m) => (
          <Box key={m.month} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, overflow: "hidden" }}>
            <Box sx={{ bgcolor: RED, color: "#fff", px: 2, py: 1.25, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>{m.month}</Typography>
              <Typography sx={{ fontSize: "0.68rem", opacity: 0.85 }}>{m.phase}</Typography>
            </Box>
            <Box sx={{ p: 1.5 }}>
              {m.events.map((e, i) => (
                <Box key={i} sx={{ display: "flex", gap: 1, py: 0.6, borderBottom: i < m.events.length - 1 ? "1px solid #f4f4f5" : "none" }}>
                  <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: DOT_COLORS[e.color] ?? "#999", flexShrink: 0, mt: "5px" }} />
                  <Box>
                    <Typography sx={{ fontSize: "0.8rem", lineHeight: 1.45 }}>{e.text}</Typography>
                    <Typography sx={{ fontSize: "0.68rem", color: "#888", mt: 0.25 }}>{e.owner}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
