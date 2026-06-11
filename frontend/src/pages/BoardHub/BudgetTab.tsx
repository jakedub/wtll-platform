import { Box, Button, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material"
import { Notice, RED } from "./shared"
import { useNavigate } from "react-router-dom"

function BudgetTable({ rows }: { rows: [string, string, string, string][] }) {
  return (
    <Box sx={{ overflowX: "auto", mb: 1 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {["Item", "2026 Actual", "2027 Est.", "Owner"].map((h) => (
              <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.75rem", color: RED, bgcolor: "#fafafa", whiteSpace: "nowrap" }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(([item, actual, est, owner], i) => (
            <TableRow key={i} hover>
              <TableCell sx={{ fontSize: "0.82rem" }}>{item}</TableCell>
              <TableCell sx={{ fontSize: "0.82rem", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{actual}</TableCell>
              <TableCell sx={{ fontSize: "0.82rem", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{est}</TableCell>
              <TableCell sx={{ fontSize: "0.78rem", color: "#777" }}>{owner}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  )
}

function Subtotal({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", bgcolor: "#fafafa", border: `1px solid ${RED}`, borderRadius: 1.5, px: 2, py: 1, mb: 3 }}>
      <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>{label}</Typography>
      <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: RED }}>{value}</Typography>
    </Box>
  )
}

export default function BudgetTab() {
  const navigate = useNavigate()
  return (
    <Box>
      <Notice color="gold">
        <strong>FY26 Budget is live in the Budget module.</strong> Broken down by Baseball, Softball, Concessions, Marketing, Grounds, Rent & Utilities, Equipment, Admin, Sponsorship, and more.
      </Notice>
      <Button
        variant="contained"
        onClick={() => navigate("/budget?year=2026")}
        sx={{ mb: 3, bgcolor: RED, "&:hover": { bgcolor: "#960E24" } }}
      >
        Open FY26 Budget →
      </Button>

      {/* Roles table */}
      <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Board Roles & Budget Ownership</Typography>
      <Box sx={{ overflowX: "auto", mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {["Role", "Budget Oversight"].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.75rem", color: RED, bgcolor: "#fafafa" }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              ["President", "Full budget approval"],
              ["VP of Baseball Operations", "Uniforms, awards, umpires, evaluations"],
              ["VP of Softball Operations", "Softball uniforms, awards, field costs"],
              ["Baseball Player Agent (+ Coaching Coord.)", "Player registration, All Stars, coaches"],
              ["Softball Player Agent", "Softball registration, All Stars"],
              ["Secretary", "Admin / charter fees"],
              ["Treasurer", "Budget owner, bank accounts, P&L"],
              ["Safety Officer", "First aid supplies, safety training"],
              ["Grounds Manager", "Field maintenance, chalk, dragging, mowing"],
              ["Marketing & Comms Manager", "Design tools, printing, social ads"],
              ["Concessions Manager", "Concessions inventory & supplies"],
              ["Sponsorship Coordinator", "Signage, sponsor fulfillment costs"],
              ["Fundraising Coordinator", "Fundraiser materials, platform fees"],
              ["Volunteer Coordinator", "Volunteer recognition / appreciation"],
              ["Equipment Manager", "Bats, balls, helmets, catching gear"],
              ["Umpire in Chief", "Umpire pay, training, gear"],
            ].map(([role, oversight]) => (
              <TableRow key={role} hover>
                <TableCell sx={{ fontSize: "0.82rem", fontWeight: 500 }}>{role}</TableCell>
                <TableCell sx={{ fontSize: "0.82rem", color: "#555" }}>{oversight}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      <Typography sx={{ fontWeight: 700, mb: 1 }}>Uniforms — Owner: VP Baseball / VP Softball</Typography>
      <BudgetTable rows={[
        ["AAA Spring Uniforms (jersey, pants, hat)", "$1,800", "$1,890", "VP Baseball"],
        ["Majors Spring Uniforms", "$2,100", "$2,205", "VP Baseball"],
        ["AA Spring Uniforms", "$1,400", "$1,470", "VP Baseball"],
        ["PeeWee Spring Uniforms", "$900", "$945", "VP Baseball"],
        ["Softball Uniforms", "$1,600", "$1,680", "VP Softball"],
        ["Fall Ball Uniforms (hat + raglan)", "$800", "$840", "VP Baseball"],
        ["All Star Uniforms", "$1,200", "$1,260", "VP Baseball"],
      ]} />
      <Subtotal label="Uniforms Subtotal" value="$10,290" />

      <Typography sx={{ fontWeight: 700, mb: 1 }}>Umpires — Owner: Umpire in Chief</Typography>
      <BudgetTable rows={[
        ["AAA/Majors plate umpire pay (spring)", "$3,200", "$3,360", "Umpire in Chief"],
        ["Softball umpire pay", "$1,800", "$1,890", "Umpire in Chief"],
        ["Fall Ball umpire pay", "$1,000", "$1,050", "Umpire in Chief"],
        ["Umpire training & certification", "$400", "$420", "Umpire in Chief"],
        ["Umpire gear / equipment", "$300", "$315", "Umpire in Chief"],
      ]} />
      <Subtotal label="Umpires Subtotal" value="$7,035" />

      <Typography sx={{ fontWeight: 700, mb: 1 }}>Awards & Trophies — Owner: VP Baseball / VP Softball</Typography>
      <BudgetTable rows={[
        ["Division champion trophies (all divisions)", "$900", "$945", "VP Baseball"],
        ["Participation medals / pins", "$600", "$630", "VP Baseball"],
        ["All Star medals / plaques", "$350", "$368", "VP Baseball"],
        ["Softball awards", "$400", "$420", "VP Softball"],
      ]} />
      <Subtotal label="Awards Subtotal" value="$2,363" />

      <Typography sx={{ fontWeight: 700, mb: 1 }}>Equipment — Owner: Equipment Manager</Typography>
      <BudgetTable rows={[
        ["Game balls (all divisions)", "$1,100", "$1,155", "Equipment Manager"],
        ["Batting helmets (replacement)", "$400", "$420", "Equipment Manager"],
        ["Catching gear sets", "$600", "$630", "Equipment Manager"],
        ["Batting equipment (bats, tees)", "$500", "$525", "Equipment Manager"],
        ["Bases, pitching rubbers", "$300", "$315", "Grounds Manager"],
      ]} />
      <Subtotal label="Equipment Subtotal" value="$3,045" />

      <Typography sx={{ fontWeight: 700, mb: 1 }}>Facilities & Programs — Owner: Grounds Manager / President</Typography>
      <BudgetTable rows={[
        ["Indoor eval venue rental", "$500", "$525", "VP Baseball / Grounds Manager"],
        ["Field chalk, clay, drag material", "$700", "$735", "Grounds Manager"],
        ["Field lighting / utility", "$400", "$420", "Grounds Manager"],
        ["Insurance (league liability)", "$1,800", "$1,890", "President / Treasurer"],
        ["Little League charter & registration fees", "$600", "$630", "Secretary / President"],
        ["Background check fees (coaches)", "$400", "$420", "Safety Officer / Player Agents"],
      ]} />
      <Subtotal label="Facilities Subtotal" value="$4,620" />

      <Typography sx={{ fontWeight: 700, mb: 1 }}>Admin & Operations — Owner: Treasurer / Secretary</Typography>
      <BudgetTable rows={[
        ["Registration platform fees (SportsConnect)", "$800", "$840", "Secretary / Treasurer"],
        ["GameChanger subscription", "$400", "$420", "Marketing & Comms"],
        ["Marketing / design / printing", "$600", "$630", "Marketing & Comms"],
        ["Concessions inventory", "$2,500", "$2,625", "Concessions Manager"],
        ["Safety supplies / first aid kits", "$200", "$210", "Safety Officer"],
        ["Volunteer appreciation", "$300", "$315", "Volunteer Coordinator"],
        ["Fundraiser platform / materials", "$250", "$263", "Fundraising Coordinator"],
        ["Miscellaneous / contingency (5%)", "$900", "$945", "Treasurer"],
      ]} />
      <Subtotal label="Admin Subtotal" value="$6,248" />

      {/* Summary */}
      <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Budget Summary & Gap Analysis</Typography>
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {["Category", "2026 Actual", "2027 Est."].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.75rem", color: RED, bgcolor: "#fafafa" }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              ["Uniforms", "$9,800", "$10,290"],
              ["Umpires", "$6,700", "$7,035"],
              ["Awards & Trophies", "$2,250", "$2,363"],
              ["Equipment", "$2,900", "$3,045"],
              ["Facilities & Programs", "$4,400", "$4,620"],
              ["Admin & Operations", "$5,950", "$6,248"],
            ].map(([cat, actual, est]) => (
              <TableRow key={cat} hover>
                <TableCell sx={{ fontSize: "0.82rem", fontWeight: 500 }}>{cat}</TableCell>
                <TableCell sx={{ fontSize: "0.82rem", textAlign: "right" }}>{actual}</TableCell>
                <TableCell sx={{ fontSize: "0.82rem", textAlign: "right" }}>{est}</TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ borderTop: `2px solid ${RED}` }}>
              <TableCell sx={{ fontWeight: 700, color: RED }}>Total Expenses</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: "right" }}>$32,000</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: "right", color: RED }}>$33,601</TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Projected Revenue</TableCell>
              <TableCell sx={{ textAlign: "right" }}>$34,500</TableCell>
              <TableCell sx={{ textAlign: "right" }}>$36,000</TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Net (Revenue – Expenses)</TableCell>
              <TableCell sx={{ textAlign: "right", fontWeight: 700, color: "#2e7d32" }}>+$2,500</TableCell>
              <TableCell sx={{ textAlign: "right", fontWeight: 700, color: "#2e7d32" }}>+$2,399</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Box>
    </Box>
  )
}
