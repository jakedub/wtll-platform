import { Box, Chip, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material"
import { CHIP_SX } from "./shared"

interface CheckItem { date: string; item: string; owner: string; type: "hard" | "action" | "allstar" }

const ITEMS: CheckItem[] = [
  { date: "1st week of June 2026", item: "Playoffs conducted (all divisions)", owner: "VP Baseball · VP Softball", type: "hard" },
  { date: "Sat, first full week of June 2026", item: "Championship games — all divisions", owner: "President · VP Baseball · Grounds Manager", type: "hard" },
  { date: "Before end of school year 2026", item: "All Star paperwork submitted to DA", owner: "Baseball Player Agent · VP Baseball", type: "allstar" },
  { date: "Early July 2026", item: "Fall Ball registration opens; Early Bird flyer published", owner: "Baseball Player Agent · Marketing", type: "action" },
  { date: "July 2026", item: "Interleague partners confirmed for Fall Ball", owner: "President · VP Baseball", type: "action" },
  { date: "2nd week of August 2026", item: "Fall Ball registration closes", owner: "Baseball Player Agent · Secretary", type: "hard" },
  { date: "2nd week of August 2026", item: "Fall Ball uniforms ordered (hat + raglan)", owner: "VP Baseball · Equipment Manager", type: "hard" },
  { date: "Last weekend of September 2026", item: "Fall Ball single-day tournament", owner: "VP Baseball · Grounds Manager · Umpire in Chief", type: "action" },
  { date: "October 1, 2026", item: "Fall Ball season ends", owner: "VP Baseball", type: "hard" },
  { date: "Early November 2026", item: "2027 budget presented to board", owner: "Treasurer · President", type: "hard" },
  { date: "Early December 2026", item: "Indoor evaluation venue contracted", owner: "VP Baseball · Grounds Manager", type: "hard" },
  { date: "December 2026", item: "Uniform vendor selected for 2027 spring (AAA/Majors)", owner: "VP Baseball · Equipment Manager", type: "action" },
  { date: "December 2026", item: "Registration platform configured for January launch", owner: "Secretary · Player Agents", type: "action" },
  { date: "2nd week of January 2027", item: "Spring registration opens (second semester)", owner: "Secretary · Baseball Player Agent · Softball Player Agent", type: "hard" },
  { date: "January 2027", item: "School enrollment form required — communicated at registration", owner: "Baseball Player Agent · Softball Player Agent", type: "action" },
  { date: "February 2027", item: "Pitcher/catcher clinic promoted and scheduled", owner: "VP Baseball · Marketing", type: "action" },
  { date: "February 2027", item: "Umpire training / certification sessions scheduled", owner: "Umpire in Chief", type: "action" },
  { date: "1st Saturday of March 2027", item: "AAA/Majors indoor evaluations", owner: "VP Baseball · Baseball Player Agent", type: "hard" },
  { date: "Mid-March 2027", item: "Registration closes; eligibility check runs", owner: "Baseball Player Agent · Softball Player Agent", type: "hard" },
  { date: "Before last Saturday of March 2027", item: "Draft complete", owner: "VP Baseball · Baseball Player Agent", type: "hard" },
  { date: "Last Saturday of March 2027", item: "Rosters finalized", owner: "VP Baseball · Baseball Player Agent", type: "hard" },
  { date: "Late March 2027", item: "Spring uniforms ordered (AAA/Majors)", owner: "VP Baseball · Equipment Manager", type: "hard" },
  { date: "2nd Saturday of April 2027", item: "Opening Day", owner: "President · VP Baseball · VP Softball", type: "hard" },
  { date: "Memorial Day 2027", item: "No games scheduled", owner: "VP Baseball · VP Softball", type: "hard" },
  { date: "1st week of May 2027", item: "All Star nominations distributed to coaches", owner: "Baseball Player Agent", type: "allstar" },
  { date: "2nd week of May 2027", item: "Teen Baseball registration closes", owner: "Baseball Player Agent", type: "hard" },
  { date: "2nd week of May 2027", item: "All Star teams selected", owner: "Selection Committee · VP Baseball", type: "allstar" },
  { date: "1st week of June 2027", item: "Playoffs (all divisions)", owner: "VP Baseball · VP Softball · Umpire in Chief", type: "hard" },
  { date: "Before end of school year 2027", item: "All Star paperwork submitted to DA", owner: "Baseball Player Agent · VP Baseball", type: "allstar" },
  { date: "Sat, first full week of June 2027", item: "Championship games", owner: "President · VP Baseball · VP Softball", type: "hard" },
  { date: "Post-championship, June 2027", item: "Teen Baseball practices begin; season ends mid-July", owner: "Baseball Player Agent", type: "action" },
  { date: "Early July 2027", item: "Fall Ball 2027 registration opens; planning cycle begins", owner: "Baseball Player Agent · VP Baseball", type: "action" },
]

const TYPE_LABEL: Record<string, { label: string; color: keyof typeof CHIP_SX }> = {
  hard:    { label: "Hard Deadline", color: "red" },
  action:  { label: "Action Item",   color: "orange" },
  allstar: { label: "All Stars",     color: "purple" },
}

const ROW_BG: Record<string, string> = {
  hard:    "rgba(196,18,48,0.04)",
  action:  "rgba(230,81,0,0.04)",
  allstar: "rgba(106,27,154,0.05)",
}

export default function ChecklistTab() {
  return (
    <Box>
      <Box sx={{ display: "flex", gap: 1.5, mb: 2.5, flexWrap: "wrap" }}>
        {Object.entries(TYPE_LABEL).map(([, { label, color }]) => (
          <Chip key={label} label={label} size="small" sx={{ ...CHIP_SX[color], fontWeight: 700, fontSize: "0.72rem" }} />
        ))}
        <Typography sx={{ fontSize: "0.8rem", color: "#888", alignSelf: "center" }}>— Color-coded by type</Typography>
      </Box>
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {["Date / Window", "Item", "Owner", "Type"].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#C41230", bgcolor: "#fafafa", whiteSpace: "nowrap" }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {ITEMS.map((row, i) => {
              const { label, color } = TYPE_LABEL[row.type]
              return (
                <TableRow key={i} sx={{ bgcolor: ROW_BG[row.type] }}>
                  <TableCell sx={{ fontSize: "0.8rem", whiteSpace: "nowrap", fontWeight: 600 }}>{row.date}</TableCell>
                  <TableCell sx={{ fontSize: "0.82rem" }}>{row.item}</TableCell>
                  <TableCell sx={{ fontSize: "0.78rem", color: "#555" }}>{row.owner}</TableCell>
                  <TableCell><Chip label={label} size="small" sx={{ ...CHIP_SX[color], fontWeight: 700, fontSize: "0.68rem", height: 20 }} /></TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Box>
    </Box>
  )
}
