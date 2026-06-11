import { Box, Typography } from "@mui/material"
import { RED } from "./shared"

interface Step { text: string; owner: string }
interface Phase { title: string; steps: Step[] }

const PHASES: Phase[] = [
  { title: "Phase 1 — Coach Nominations (1st Week of May)", steps: [
    { text: "Baseball Player Agent distributes nomination forms to all AAA and Majors head coaches", owner: "Baseball Player Agent" },
    { text: "Each coach nominates eligible players from their own roster (can nominate up to full roster)", owner: "Head Coaches" },
    { text: "Verify player eligibility: age, games played minimum, residency / school enrollment on file", owner: "Baseball Player Agent" },
    { text: "Compile nomination list by division (AAA separate from Majors)", owner: "Baseball Player Agent" },
    { text: "Share anonymized nomination summary with VP Baseball and All Star selection committee", owner: "Baseball Player Agent" },
  ]},
  { title: "Phase 2 — Selection (2nd Week of May)", steps: [
    { text: "Coach input forms completed: each coach provides written evaluation of nominated players (1 per team minimum)", owner: "Head Coaches" },
    { text: "Player self-nomination: one player per team may self-nominate (form submitted by parent)", owner: "Baseball Player Agent" },
    { text: "Selection committee meets: All Star Coaches (appointed) + VP Baseball + Baseball Player Agent", owner: "VP Baseball" },
    { text: "Teams selected by division; roster sizes per Little League district rules", owner: "Selection Committee" },
    { text: "All Star coaches confirmed (may differ from regular season coaches)", owner: "VP Baseball" },
    { text: "Notify selected players and families; confirm availability and willingness to commit", owner: "Baseball Player Agent" },
    { text: "Finalize rosters with alternates identified in case of withdrawals", owner: "Baseball Player Agent" },
  ]},
  { title: "Phase 3 — Documentation (Before End of School Year)", steps: [
    { text: "Identify returning vs. new players on each All Star roster", owner: "Baseball Player Agent" },
    { text: "Send documentation checklist to all families (different requirements for returning vs. new)", owner: "Baseball Player Agent" },
    { text: "Collect returning player docs: Tournament Verification Form + roster signature", owner: "Baseball Player Agent" },
    { text: "Collect new player docs: (1) Parent/guardian driver's license copy, (2) Hardcopy birth certificate, (3) Tournament Verification Form, (4) Proof of residency — school enrollment form OR utility bill (gas/electric/water in parent's name, current within 90 days)", owner: "Baseball Player Agent" },
    { text: "Review all submitted documentation for completeness and accuracy", owner: "Baseball Player Agent + VP Baseball" },
    { text: "Follow up with families with missing or incorrect documents (hard deadline 2 weeks before school ends)", owner: "Baseball Player Agent" },
  ]},
  { title: "Phase 4 — District Submission", steps: [
    { text: "Complete Tournament Team Affidavit for each All Star team (AAA and Majors separately)", owner: "Baseball Player Agent" },
    { text: "VP Baseball reviews and signs all affidavits before submission", owner: "VP Baseball" },
    { text: "Submit complete packet (affidavit + all player documents) to District Administrator", owner: "Baseball Player Agent" },
    { text: "Confirm receipt and approval from District Administrator", owner: "Baseball Player Agent" },
    { text: "File complete copies of all documentation to WTLL Google Drive (organized by year and division)", owner: "Secretary + Baseball Player Agent" },
    { text: "Announce All Star teams publicly once DA approval is confirmed", owner: "Marketing & Comms + Baseball Player Agent" },
  ]},
  { title: "Phase 5 — Tournament Preparation", steps: [
    { text: "Confirm tournament schedule and bracket from District (typically published late June)", owner: "Baseball Player Agent" },
    { text: "Order All Star uniforms (after roster is final and DA-approved)", owner: "VP Baseball + Equipment Manager" },
    { text: "All Star practices begin; coaches coordinate field time with Grounds Manager", owner: "All Star Coaches + Grounds Manager" },
  ]},
]

let stepCounter = 0

export default function AllStarsTab() {
  stepCounter = 0
  return (
    <Box>
      <Typography sx={{ color: "#777", fontSize: "0.875rem", mb: 2.5 }}>
        Full 27-step process owned by <strong>Baseball Player Agent</strong> in coordination with <strong>VP Baseball</strong>. All paperwork must be submitted to the District Administrator before the end of the school year.
      </Typography>

      {/* Doc quick reference */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 2, mb: 3 }}>

        {/* Returning players */}
        <Box sx={{ border: `1px solid ${RED}`, borderRadius: 2, p: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 1, fontSize: "0.875rem" }}>📋 Returning Player Checklist</Typography>
          <Typography sx={{ fontSize: "0.72rem", color: "#777", mb: 1 }}>
            Previously on a WTLL All Star roster — no residency docs needed.
          </Typography>
          {[
            { label: "Tournament Verification Form", note: "Required" },
            { label: "Tournament Team Affidavit", note: "Team-level — one per team" },
            { label: "Parent/guardian signature on roster", note: "Required" },
          ].map(({ label, note }) => (
            <Box key={label} sx={{ display: "flex", gap: 1, py: 0.5, borderBottom: "1px solid #f0f0f0", "&:last-child": { borderBottom: "none" } }}>
              <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#2e7d32", flexShrink: 0, mt: "7px" }} />
              <Box>
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 500 }}>{label}</Typography>
                <Typography sx={{ fontSize: "0.7rem", color: "#888" }}>{note}</Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {/* New players */}
        <Box sx={{ border: "1px solid #d97706", borderRadius: 2, p: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 1, fontSize: "0.875rem" }}>📋 New Player Checklist</Typography>
          <Typography sx={{ fontSize: "0.72rem", color: "#777", mb: 1 }}>
            First-time All Star or not previously verified — full documentation required.
          </Typography>
          {[
            { label: "Parent / Guardian Driver's License", note: "Copy required — establishes identity" },
            { label: "Hardcopy Birth Certificate", note: "Original or certified copy — establishes age" },
            { label: "Tournament Verification Form", note: "Required for all players" },
            { label: "Proof of Residency", note: "School enrollment form OR utility bill (gas, electric, water — in parent's name at address)" },
            { label: "Tournament Team Affidavit", note: "Team-level — one per team" },
          ].map(({ label, note }) => (
            <Box key={label} sx={{ display: "flex", gap: 1, py: 0.5, borderBottom: "1px solid #fff7ed", "&:last-child": { borderBottom: "none" } }}>
              <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#d97706", flexShrink: 0, mt: "7px" }} />
              <Box>
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 500 }}>{label}</Typography>
                <Typography sx={{ fontSize: "0.7rem", color: "#888" }}>{note}</Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {/* Residency rule callout */}
        <Box sx={{ border: "1px solid #1565c040", bgcolor: "#e3f2fd40", borderRadius: 2, p: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 1, fontSize: "0.875rem" }}>🏠 How Residency is Determined</Typography>
          <Typography sx={{ fontSize: "0.82rem", lineHeight: 1.6, mb: 1.5 }}>
            A player establishes residency using <strong>one</strong> of the following:
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
            <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#1565c0", flexShrink: 0, mt: "7px" }} />
            <Box>
              <Typography sx={{ fontSize: "0.82rem", fontWeight: 600 }}>School Enrollment Form</Typography>
              <Typography sx={{ fontSize: "0.7rem", color: "#555" }}>Current school year enrollment showing home address. Must be from a WTLL feeder school or within district boundaries.</Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#1565c0", flexShrink: 0, mt: "7px" }} />
            <Box>
              <Typography sx={{ fontSize: "0.82rem", fontWeight: 600 }}>Utility Bill</Typography>
              <Typography sx={{ fontSize: "0.7rem", color: "#555" }}>Gas, electric, or water bill in a parent/guardian's name at the player's address. Must be current (within 90 days).</Typography>
            </Box>
          </Box>
          <Box sx={{ bgcolor: "#fff3cd", border: "1px solid #ffc10740", borderRadius: 1, p: 1, mt: 1.5 }}>
            <Typography sx={{ fontSize: "0.72rem", color: "#7c5a00" }}>
              ⚠️ Both options must show the <strong>same address</strong> as the player's registration record. Discrepancies must be resolved before DA submission.
            </Typography>
          </Box>
        </Box>

      </Box>

      {PHASES.map((phase) => (
        <Box key={phase.title} sx={{ borderLeft: `4px solid ${RED}`, borderRadius: "0 10px 10px 0", bgcolor: "#fafafa", border: "1px solid #e4e4e7", borderLeftColor: RED, p: 2, mb: 2 }}>
          <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: RED, mb: 1.5 }}>{phase.title}</Typography>
          {phase.steps.map((step) => {
            stepCounter++
            const num = stepCounter
            return (
              <Box key={num} sx={{ display: "flex", gap: 1.5, py: 0.75, borderBottom: "1px solid #ececec", "&:last-child": { borderBottom: "none" } }}>
                <Box sx={{ minWidth: 24, height: 24, borderRadius: "50%", bgcolor: RED, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, flexShrink: 0 }}>{num}</Box>
                <Box>
                  <Typography sx={{ fontSize: "0.83rem", lineHeight: 1.5 }}>{step.text}</Typography>
                  <Typography sx={{ fontSize: "0.72rem", color: "#777", mt: 0.25 }}>Owner: {step.owner}</Typography>
                </Box>
              </Box>
            )
          })}
        </Box>
      ))}
    </Box>
  )
}
