import { Link } from "react-router-dom"
import Box from "@mui/material/Box"
import Grid from "@mui/material/Grid"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"
import AssessmentIcon from "@mui/icons-material/Assessment"
import AssignmentIcon from "@mui/icons-material/Assignment"
import PrintIcon from "@mui/icons-material/Print"
import ArrowForwardIcon from "@mui/icons-material/ArrowForward"

const COLOR = "#6a1b9a"

const ITEMS = [
  {
    label: "Baseball Evaluations",
    path: "/evaluations",
    icon: <AssessmentIcon />,
    description: "Score baseball players on hitting, fielding, throwing, pitching, and catching. Supports bulk data entry.",
  },
  {
    label: "Softball Evaluations",
    path: "/evaluations?sport=softball",
    icon: <AssessmentIcon />,
    description: "Score softball players on hitting, fielding, throwing, pitching, and catching.",
  },
  {
    label: "Create Evaluations",
    path: "/evaluation-events",
    icon: <AssignmentIcon />,
    description: "Set up public evaluation sign-up events with time slots for players to register.",
  },
  {
    label: "Print Evaluation Forms",
    path: "/evaluations/print",
    icon: <PrintIcon />,
    description: "Generate printable evaluation slips by program and division — 2 players per page, ready to hand to evaluators.",
  },
]

export default function EvaluationsHubPage() {
  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 32, bgcolor: COLOR, borderRadius: 1, flexShrink: 0 }} />
          <AssessmentIcon sx={{ color: COLOR, fontSize: 28 }} />
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#111" }}>
            Evaluations
          </Typography>
        </Box>
        <Typography sx={{ color: "#888", fontSize: "0.9rem", ml: "22px" }}>
          Score players, manage sign-up events, and print evaluation forms.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {ITEMS.map(({ label, path, icon, description }) => (
          <Grid item xs={12} sm={6} key={path}>
            <Paper
              component={Link}
              to={path}
              elevation={0}
              sx={{
                display: "block",
                textDecoration: "none",
                border: `1px solid ${COLOR}20`,
                borderRadius: 2.5,
                p: 2.5,
                height: "100%",
                bgcolor: `${COLOR}04`,
                transition: "all 0.15s",
                "&:hover": {
                  borderColor: COLOR,
                  bgcolor: `${COLOR}0a`,
                  boxShadow: `0 4px 20px ${COLOR}15`,
                  transform: "translateY(-1px)",
                },
              }}
            >
              <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: `${COLOR}15`, display: "flex", alignItems: "center", justifyContent: "center", color: COLOR, mb: 1.5 }}>
                {icon}
              </Box>
              <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 0.75 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#111", lineHeight: 1.3 }}>
                  {label}
                </Typography>
                <ArrowForwardIcon sx={{ fontSize: 16, color: COLOR, flexShrink: 0, mt: 0.2 }} />
              </Box>
              <Typography sx={{ fontSize: "0.8rem", color: "#777", lineHeight: 1.5 }}>
                {description}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
