import { Box, Chip, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material"
import { RED } from "./shared"

interface Task { task: string; timing: string; notes: string }
interface Role { title: string; sub: string; note?: string; tasks: Task[] }

const ROLES: Role[] = [
  { title: "President", sub: "Overall league operations, board leadership, external relationships", tasks: [
    { task: "Board meeting facilitation (monthly)", timing: "Year-round", notes: "Set agenda, distribute minutes, track action items" },
    { task: "Little League charter renewal", timing: "Nov–Dec", notes: "Coordinate with Secretary; submit to LL International" },
    { task: "Interleague partner coordination (Fall Ball)", timing: "July", notes: "Confirm leagues, game format, field sharing" },
    { task: "Budget approval", timing: "Early November", notes: "Review Treasurer's submission; board vote required" },
    { task: "Insurance renewal oversight", timing: "Oct–Nov", notes: "Verify coverage levels; coordinate with Treasurer" },
    { task: "Opening Day ceremony coordination", timing: "April", notes: "MC or delegate; coordinate with Grounds, Marketing" },
    { task: "Championship Day oversight", timing: "First full week of June", notes: "On-site; VIP/family communications" },
    { task: "Board recruitment & role filling", timing: "Sept–Oct", notes: "Identify gaps; recruit and onboard new members" },
  ]},
  { title: "VP of Baseball Operations", sub: "All baseball divisions, uniforms, schedules, umpires, evaluations, draft", tasks: [
    { task: "Indoor evaluation venue contracted", timing: "Early December", notes: "Hard deadline — downstream impact on schedule" },
    { task: "AAA/Majors evaluations run", timing: "1st Saturday of March", notes: "Coordinate with Baseball Player Agent; indoor venue" },
    { task: "Draft overseen and completed", timing: "Before last Saturday of March", notes: "With Baseball Player Agent; rosters final last Saturday" },
    { task: "Spring uniforms ordered", timing: "Late March", notes: "AAA/Majors; coordinate with Equipment Manager" },
    { task: "Fall Ball uniforms ordered", timing: "2nd week of August", notes: "Hat + raglan; vendor confirmed prior December" },
    { task: "All Star team selection oversight", timing: "2nd week of May", notes: "Sit on selection committee with Player Agent" },
    { task: "All Star affidavit review & signature", timing: "May–June", notes: "Review before Baseball Player Agent submits to DA" },
    { task: "Fall Ball schedule finalized", timing: "August", notes: "Interleague partners + own fields; coordinate with Grounds" },
    { task: "Regular season game schedule", timing: "March", notes: "Publish via GameChanger before Opening Day" },
  ]},
  { title: "VP of Softball Operations", sub: "All softball divisions, uniforms, schedule, All Stars", tasks: [
    { task: "Softball registration coordination", timing: "Jan–March", notes: "With Softball Player Agent; school enrollment form required" },
    { task: "Softball evaluations (if applicable)", timing: "March", notes: "Coordinate venue; draft if competitive division" },
    { task: "Softball uniforms ordered", timing: "Late March", notes: "Own vendor or shared with baseball vendor" },
    { task: "Softball schedule published", timing: "March", notes: "Via GameChanger; coordinate field availability" },
    { task: "Softball All Stars process", timing: "May–June", notes: "Mirror baseball All Star process; own DA submission" },
    { task: "Softball championship coordination", timing: "1st week of June", notes: "Coordinate with Grounds for field" },
    { task: "Softball awards and trophies", timing: "June", notes: "Order by May; coordinate with Treasurer for budget" },
  ]},
  { title: "Baseball Player Agent", sub: "Player registrations, eligibility, All Stars, coach management, evaluations", note: "Also Acting Coaching Coordinator", tasks: [
    { task: "Manage registration system; enforce school enrollment requirement", timing: "Jan–March", notes: "SportsConnect; school enrollment form at registration" },
    { task: "Eligibility check after registration closes", timing: "Mid-March", notes: "Age, residency/school, registration completeness" },
    { task: "Run AAA/Majors evaluations (with VP Baseball)", timing: "1st Saturday of March", notes: "Indoor venue; score sheets, volunteer evaluators" },
    { task: "Coordinate draft with VP Baseball", timing: "Before last Saturday of March", notes: "Finalize rosters last Saturday of March" },
    { task: "All Star nominations — distribute forms to coaches", timing: "1st week of May", notes: "Separate for AAA and Majors" },
    { task: "All Star selection committee participation", timing: "2nd week of May", notes: "With VP Baseball and appointed All Star coaches" },
    { task: "All Star documentation collection", timing: "May–June", notes: "Returning vs. new player docs; hard deadline before school ends" },
    { task: "All Star DA submission", timing: "Before end of school year", notes: "Affidavit + all player docs; confirm receipt from DA" },
    { task: "Teen Baseball registration management", timing: "Jan–2nd week of May", notes: "No eval/draft; practices begin post-championship" },
    { task: "Coach recruitment [Coaching Coordinator]", timing: "Dec–Feb", notes: "Social posts, direct outreach, background check coordination" },
    { task: "Coach placement and team assignment [CC]", timing: "March", notes: "Match coaches to teams at draft; notify via GameChanger" },
    { task: "Coach training coordination [CC]", timing: "March–April", notes: "LL required coach training; track completion" },
    { task: "Fall Ball player registration & team formation", timing: "July–August", notes: "Closes 2nd week of August" },
  ]},
  { title: "Softball Player Agent", sub: "Softball registrations, eligibility, All Stars", tasks: [
    { task: "Manage softball registration", timing: "Jan–March", notes: "School enrollment form required at registration" },
    { task: "Eligibility verification for softball players", timing: "Mid-March", notes: "Age, residency, registration completeness" },
    { task: "Softball All Star nominations and selection", timing: "May", notes: "Mirror baseball process; coordinate with VP Softball" },
    { task: "Softball All Star documentation", timing: "May–June", notes: "Same doc requirements as baseball (returning vs. new)" },
  ]},
  { title: "Secretary", sub: "Board records, communications, charter, registration platform", tasks: [
    { task: "Board meeting minutes", timing: "Monthly", notes: "Distribute within 48 hours of meeting" },
    { task: "Charter renewal documentation", timing: "Nov–Dec", notes: "Coordinate with President; submit to LL International" },
    { task: "Registration platform configuration", timing: "December", notes: "SportsConnect setup for January launch" },
    { task: "Google Drive organization (docs, All Stars, rosters)", timing: "Year-round", notes: "File All Star docs with Player Agent post-submission" },
    { task: "League correspondence (DA, LL International)", timing: "As needed", notes: "Coordinate with President and VP Baseball" },
  ]},
  { title: "Treasurer", sub: "Budget, accounts, P&L, vendor payments", tasks: [
    { task: "2027 budget drafted with all VPs", timing: "Oct–Nov", notes: "Line-item estimates; vendor items at 2026 actual + 5%" },
    { task: "2027 budget presented to board", timing: "Early November", notes: "Hard deadline — board vote required" },
    { task: "Vendor payments processed", timing: "As invoiced", notes: "Uniforms, umpires, insurance, equipment" },
    { task: "Concessions P&L tracking", timing: "Monthly during season", notes: "With Concessions Manager" },
    { task: "Registration fee reconciliation", timing: "After registration closes", notes: "Verify SportsConnect totals against budget" },
    { task: "End-of-year financial summary", timing: "October", notes: "Actual vs. budget for board review" },
  ]},
  { title: "Safety Officer", sub: "Field safety, first aid, background checks, ASAP plan", tasks: [
    { task: "Annual field safety audit", timing: "November", notes: "Document hazards; coordinate repairs with Grounds Manager" },
    { task: "ASAP plan update", timing: "Feb–March", notes: "Required by LL for charter; submit to DA" },
    { task: "Background checks for all coaches", timing: "Feb–March", notes: "Process through JDP or LL approved vendor; coordinate with Player Agents" },
    { task: "First aid supplies stocked at all fields", timing: "Before Opening Day", notes: "AED check, first aid kits per field" },
    { task: "Safety training for coaches (concussion protocol)", timing: "March", notes: "Online certification; track completion" },
  ]},
  { title: "Grounds Manager", sub: "Field maintenance, chalk, clay, equipment, venues", tasks: [
    { task: "Contract indoor eval venue", timing: "Early December", notes: "Gymnastics facility, school gym, or rec center; hard deadline" },
    { task: "Spring field prep (chalk, mound, bases, fencing check)", timing: "March–April", notes: "All fields game-ready before Opening Day" },
    { task: "Field maintenance during season (drag, chalk, mow)", timing: "Weekly during season", notes: "Coordinate with volunteer work crews" },
    { task: "Fall Ball field prep and teardown", timing: "Aug + Oct", notes: "Coordinate with VP Baseball for Fall Ball schedule" },
    { task: "Championship Day field setup", timing: "First full week of June", notes: "Special setup: banners, seating, PA system prep" },
    { task: "Post-season equipment storage", timing: "June + October", notes: "Bases, equipment boxes, portable items secured" },
  ]},
  { title: "Marketing & Communications Manager", sub: "All external communications, social media, GameChanger, flyers, website", tasks: [
    { task: "Fall Ball Early Bird flyer + social pack", timing: "Early July", notes: "See Marketing tab for full content spec" },
    { task: "Spring registration launch campaign", timing: "Early January", notes: "Flyer, school newsletter insert, social posts" },
    { task: "Coach recruitment posts", timing: "January", notes: "With Baseball Player Agent" },
    { task: "Evaluations announcement", timing: "February", notes: "Date, location, what to bring" },
    { task: "Pitcher/catcher clinic promo", timing: "February", notes: "With VP Baseball" },
    { task: "Opening Day hype campaign", timing: "2 weeks before Opening Day", notes: "Countdown posts, logistics info" },
    { task: "Weekly GameChanger recaps", timing: "Weekly during season", notes: "Every Monday; standings + highlights" },
    { task: "Playoffs & Championship content", timing: "Late May / early June", notes: "Bracket graphics, recaps, celebration posts" },
    { task: "All Star announcement", timing: "After DA approval", notes: "Player names, photos, coach intros" },
    { task: "Sponsorship deck", timing: "Oct–Nov", notes: "Tiered packages; with Sponsorship Coordinator" },
  ]},
  { title: "Concessions Manager", sub: "Concessions stand operations, inventory, volunteers, revenue", tasks: [
    { task: "Inventory order for spring season", timing: "March", notes: "Based on prior year actuals; Treasurer approval" },
    { task: "Concessions open for season", timing: "Opening Day (April)", notes: "Coordinate with Volunteer Coordinator for staffing" },
    { task: "Weekly inventory restocking", timing: "Weekly during season", notes: "Track sell-through vs. waste; adjust orders" },
    { task: "Championship Day concessions", timing: "First full week of June", notes: "Full operation; may need extra volunteers" },
    { task: "Fall Ball concessions (select weekends)", timing: "September", notes: "Scaled back — high-traffic weekends only" },
    { task: "End-of-season P&L report to Treasurer", timing: "June + October", notes: "Revenue vs. COGS" },
  ]},
  { title: "Umpire in Chief", sub: "Umpire recruitment, training, assignment, pay", tasks: [
    { task: "Umpire recruitment plan finalized", timing: "December", notes: "Target count: enough for AAA/Majors + Softball + playoffs" },
    { task: "Umpire training / certification sessions", timing: "February", notes: "Online LL modules + in-person mechanics session" },
    { task: "Spring season umpire assignments", timing: "March (prior to Opening Day)", notes: "Build schedule in advance; post to GameChanger or shared doc" },
    { task: "Playoff and championship umpire assignments", timing: "Late May", notes: "Most experienced umpires for championship games" },
    { task: "Fall Ball umpire assignments", timing: "August", notes: "Confirm before season starts" },
    { task: "Umpire pay tracking and submission to Treasurer", timing: "Monthly during season", notes: "Per-game rate; track games worked" },
  ]},
  { title: "Equipment Manager", sub: "Bats, balls, helmets, catching gear, storage, inventory", tasks: [
    { task: "End-of-season equipment inventory", timing: "June + October", notes: "Document condition; flag replacements needed" },
    { task: "Equipment order for spring season", timing: "Feb–March", notes: "Balls, replacement helmets, catching gear; Treasurer approval" },
    { task: "Uniform distribution to coaches", timing: "After delivery (April)", notes: "Track by team; collect receipts" },
    { task: "Fall Ball uniform coordination", timing: "August–September", notes: "Receive, sort, distribute; hat + raglan only" },
    { task: "Equipment storage organization", timing: "Oct–Nov", notes: "Clean, dry, inventoried storage for off-season" },
  ]},
  { title: "Sponsorship Coordinator", sub: "Sponsor relationships, packages, signage, fulfillment", tasks: [
    { task: "Sponsorship deck finalized (tiered packages)", timing: "October–November", notes: "Gold/Silver/Bronze tiers with benefits and reach data" },
    { task: "Returning sponsor renewals contacted first", timing: "November", notes: "Priority outreach before end-of-year" },
    { task: "New sponsor outreach", timing: "Dec–March", notes: "Signage fulfillment for spring season" },
  ]},
  { title: "Fundraising Coordinator", sub: "Annual fundraiser planning, execution, and financial tracking", tasks: [
    { task: "Annual fundraiser planned and executed", timing: "Feb–April", notes: "Product sale, event, or digital campaign" },
    { task: "Platform fees and materials budgeted with Treasurer", timing: "November", notes: "Approved in budget process" },
  ]},
  { title: "Volunteer Coordinator", sub: "Volunteer recruitment, scheduling, and appreciation", tasks: [
    { task: "Volunteer roster built for Opening Day, concessions, championship", timing: "March–April", notes: "Coordinate with Concessions Manager and Grounds" },
    { task: "Volunteer appreciation / recognition at end of season", timing: "June", notes: "Budget item; coordinate with Treasurer" },
  ]},
]

export default function AssignmentsTab() {
  return (
    <Box>
      <Typography sx={{ color: "#777", fontSize: "0.875rem", mb: 3 }}>
        Tasks, timing, and notes for all 16 board roles. The Baseball Player Agent section covers all Coaching Coordinator duties (no Coaching Coordinator on staff for 2027).
      </Typography>
      {ROLES.map((role) => (
        <Box key={role.title} sx={{ mb: 3 }}>
          <Box sx={{ borderLeft: `4px solid ${RED}`, bgcolor: "#f9f9f9", borderRadius: "0 8px 8px 0", px: 2, py: 1.5, mb: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>{role.title}</Typography>
                {role.note && <Chip label={role.note} size="small" sx={{ bgcolor: "rgba(230,162,0,0.15)", color: "#b45309", fontWeight: 700, fontSize: "0.68rem", height: 20 }} />}
              </Box>
              <Typography sx={{ fontSize: "0.75rem", color: "#888" }}>{role.sub}</Typography>
            </Box>
          </Box>
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {["Task", "Timing", "Notes"].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.72rem", color: RED, bgcolor: "#fafafa" }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {role.tasks.map((t, i) => (
                  <TableRow key={i} hover>
                    <TableCell sx={{ fontSize: "0.82rem", fontWeight: 500 }}>{t.task}</TableCell>
                    <TableCell sx={{ fontSize: "0.8rem", whiteSpace: "nowrap", color: "#444" }}>{t.timing}</TableCell>
                    <TableCell sx={{ fontSize: "0.78rem", color: "#666" }}>{t.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Box>
      ))}
    </Box>
  )
}
