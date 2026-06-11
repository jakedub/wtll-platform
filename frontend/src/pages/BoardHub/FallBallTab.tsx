import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material"
import { Notice, Tag } from "./shared"

function PhaseCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Box sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 2.5 }}>
      <Typography sx={{ fontWeight: 700, mb: 1.5 }}>{title}</Typography>
      {items.map((item, i) => (
        <Box key={i} sx={{ display: "flex", gap: 1, py: 0.5, borderBottom: i < items.length - 1 ? "1px solid #f4f4f5" : "none", fontSize: "0.83rem" }}>
          <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#C41230", flexShrink: 0, mt: "7px" }} />
          <Typography sx={{ fontSize: "0.83rem", lineHeight: 1.5 }}>{item}</Typography>
        </Box>
      ))}
    </Box>
  )
}

export default function FallBallTab() {
  return (
    <Box>
      <Typography sx={{ color: "#777", fontSize: "0.875rem", mb: 2 }}>
        Supplemental fall program providing additional reps for AAA and Majors players. Interleague format with partner leagues. Single-day tournament last weekend of September. Season ends October 1.
      </Typography>
      <Notice color="blue">
        <strong>Key Decisions to Finalize by July 15: </strong>
        AA division threshold (minimum registration count) · Interleague partner leagues confirmed · Umpire approach (certified vs. volunteer) · Uniform vendor selection
      </Notice>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 2, mb: 2.5 }}>
        <PhaseCard title="Phase 1 — July: Planning" items={[
          "Confirm interleague partners (1–2 leagues) — President / VP Baseball",
          "Set AA threshold (min. 16 players to run division)",
          "Post Fall Ball registration on website + GameChanger",
          "Identify coach volunteers for each team",
          "Draft Fall Ball schedule framework",
          "Confirm field availability (own + partner fields)",
          "Early Bird flyer published first week of July",
        ]} />
        <PhaseCard title="Phase 2 — August: Launch" items={[
          "Registration closes 2nd week of August",
          "Evaluate AA viability (count vs. threshold)",
          "Teams formed; coaches notified by Aug 15",
          "Uniforms ordered 2nd week of August (hat + raglan shirt)",
          "Schedule finalized with all interleague partners",
          "Umpire assignments confirmed — Umpire in Chief",
          "GameChanger teams set up; rosters loaded",
        ]} />
        <PhaseCard title="Phase 3 — September–October: Season" items={[
          "Regular season games begin 1st weekend of September",
          "Interleague games mixed into schedule (home + away)",
          "No standings — developmental, not competitive record",
          "Concessions on select weekends — Concessions Manager",
          "Single-day tournament — last weekend of September",
          "Tournament: double-elimination or pool play format",
          "Awards: medals for all participants, trophy for winner",
          "Season ends October 1 — all equipment collected",
        ]} />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
        <Box sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 2.5 }}>
          <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Divisions Offered</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                {["Division", "Ages", "Status"].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#C41230" }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow><TableCell>Majors</TableCell><TableCell>10–12</TableCell><TableCell><Tag label="Always offered" color="green" /></TableCell></TableRow>
              <TableRow><TableCell>AAA</TableCell><TableCell>9–11</TableCell><TableCell><Tag label="Always offered" color="green" /></TableCell></TableRow>
              <TableRow><TableCell>AA</TableCell><TableCell>7–9</TableCell><TableCell><Tag label="≥16 registrants" color="gold" /></TableCell></TableRow>
              <TableRow><TableCell>PeeWee</TableCell><TableCell>5–7</TableCell><TableCell><Tag label="Not offered" color="red" /></TableCell></TableRow>
            </TableBody>
          </Table>
        </Box>
        <Box sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 2.5 }}>
          <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Uniform Details</Typography>
          {[
            ["Components", "Hat + raglan shirt only (no pants)"],
            ["Order date", "2nd week of August"],
            ["Owner", "VP Baseball + Equipment Manager"],
            ["Vendor", "Match spring vendor if possible"],
            ["Player name", "Optional — cost consideration"],
            ["Hat", "WTLL logo, one color per division if budget allows"],
          ].map(([label, val], i) => (
            <Box key={i} sx={{ display: "flex", gap: 1, py: 0.5, borderBottom: i < 5 ? "1px solid #f4f4f5" : "none" }}>
              <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, minWidth: 100 }}>{label}:</Typography>
              <Typography sx={{ fontSize: "0.8rem", color: "#555" }}>{val}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}
