/**
 * GuidePage — Step-by-step operational guides for each section of the WTLL platform.
 */
import React, { useState } from "react"
import {
  Accordion, AccordionDetails, AccordionSummary,
  Box, Chip, Paper, Typography,
} from "@mui/material"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import DashboardIcon from "@mui/icons-material/Dashboard"
import PeopleIcon from "@mui/icons-material/People"
import SportsBaseballIcon from "@mui/icons-material/SportsBaseball"
import AssessmentIcon from "@mui/icons-material/Assessment"
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth"
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism"

// ── Guide data ────────────────────────────────────────────────────────────────

interface Step {
  title: string
  description: string
  path?: string
  tip?: string
}

interface GuideSection {
  id: string
  label: string
  color: string
  icon: React.ReactNode
  subtitle: string
  workflows: {
    title: string
    steps: Step[]
  }[]
}

const GUIDES: GuideSection[] = [
  {
    id: "preseason",
    label: "Pre-Season",
    color: "#6a1b9a",
    icon: <AssessmentIcon />,
    subtitle: "Everything needed to prepare players and teams before the season begins.",
    workflows: [
      {
        title: "Recreation Division — Season Startup",
        steps: [
          {
            title: "Import Players",
            description: "Download the enrollment CSV from SportsConnect, then upload it on the Player Import page. The system will automatically map players to divisions based on age and sport.",
            path: "/player-import",
            tip: "Use the most recent SportsConnect export. Players missing a birth date will be flagged for manual review.",
          },
          {
            title: "Run Eligibility Check",
            description: "Go to Address Validation and geocode all imported players. The system checks each home address against the WTLL district boundary KML to confirm eligibility.",
            path: "/address-validation",
            tip: "Players flagged as outside the boundary need a manual exception review before being drafted.",
          },
          {
            title: "Create Teams",
            description: "On Team Management, create teams for each division (e.g., Majors, AAA, AA, Pee Wee). Set the team name, division, year, and jersey color/code.",
            path: "/team-management",
          },
          {
            title: "Assign Coaches",
            description: "On each team's detail in Team Management, assign a head coach and one or more assistant coaches (comma-separated). Coaches can be linked to board members for conflict detection.",
            path: "/team-management",
            tip: "Assistant coaches can be entered as comma-separated names, e.g. 'John Smith, Jane Doe'.",
          },
          {
            title: "Set Up Evaluations",
            description: "Create an Evaluation Event for each division. This generates a public sign-up link you can share with families to select evaluation time slots.",
            path: "/evaluations-hub",
            tip: "Print evaluation forms in advance — each sheet has score boxes for every skill category.",
          },
          {
            title: "Run Evaluations",
            description: "On evaluation day, use the Evaluations page to record each player's scores per skill. Tiers are calculated automatically based on scores across all players in the division.",
            path: "/evaluations",
          },
          {
            title: "Draft Players",
            description: "Open the Draft Room for the division. Teams draft in a snake format. The tier indicators next to each player help coaches make balanced picks.",
            path: "/draft",
            tip: "The draft page is full-screen optimized — use the expand icon in the nav to maximize workspace.",
          },
        ],
      },
      {
        title: "Showcase Division — Season Startup",
        steps: [
          {
            title: "Import Players",
            description: "Same as Recreation — download enrollment CSV from SportsConnect and import on the Player Import page.",
            path: "/player-import",
          },
          {
            title: "Eligibility Check",
            description: "Run address validation to confirm all players are within district boundaries.",
            path: "/address-validation",
          },
          {
            title: "Create Teams & Assign Coaches",
            description: "Create Showcase teams on Team Management. These teams are typically pre-assigned (no draft), so assign players directly after team creation.",
            path: "/team-management",
          },
          {
            title: "Evaluations (Optional)",
            description: "Showcase evaluations are optional. If running tryouts, use the same Evaluations Hub flow as Recreation.",
            path: "/evaluations-hub",
          },
        ],
      },
    ],
  },
  {
    id: "baseball",
    label: "Baseball Ops",
    color: "#1565c0",
    icon: <SportsBaseballIcon />,
    subtitle: "In-season management for active baseball programs.",
    workflows: [
      {
        title: "Pitch Count Tracking",
        steps: [
          {
            title: "Log Game Pitches",
            description: "After each game, open Log Pitches (Pitch Log page) and enter pitches thrown by each pitcher — both the pitcher name and pitch count. The system enforces Little League pitch limits.",
            path: "/pitch-log",
          },
          {
            title: "View Pitch Count Summary",
            description: "The Pitch Count page shows current pitch counts per player. Red indicates a rest requirement is active; orange means the player is approaching the limit.",
            path: "/teams",
            tip: "Share the public Pitch Count URL with coaches and parents — it's available without a login at /public/pitch-count.",
          },
          {
            title: "Monitor Rest Days",
            description: "The system automatically calculates required rest days per pitcher based on their last outing. A pitcher cannot be used until their rest requirement clears.",
          },
        ],
      },
      {
        title: "All Stars",
        steps: [
          {
            title: "Select All Stars",
            description: "On the All Stars page, select players for the All Star roster from each eligible division. The page shows eligibility status based on games played.",
            path: "/all-stars",
          },
          {
            title: "Submit Documentation",
            description: "Download and complete the required Little League All Star forms available in the Documents page. The president's name and board contact information auto-fills from the Board Members roster.",
            path: "/documents",
          },
        ],
      },
    ],
  },
  {
    id: "softball",
    label: "Softball Ops",
    color: "#d81b60",
    icon: <SportsBaseballIcon />,
    subtitle: "In-season management for active softball programs.",
    workflows: [
      {
        title: "Innings Tracking",
        steps: [
          {
            title: "Log Innings Pitched",
            description: "After each game, go to Log Innings (Softball Inning Log) and record innings pitched per pitcher. Little League softball has inning-based limits rather than pitch counts.",
            path: "/softball-innings",
          },
          {
            title: "View Innings Summary",
            description: "The public innings tracker at /public/softball-innings shows current innings counts and rest requirements for each pitcher.",
          },
        ],
      },
    ],
  },
  {
    id: "schedule",
    label: "Scheduling",
    color: "#00838f",
    icon: <CalendarMonthIcon />,
    subtitle: "Building, generating, and distributing game and practice schedules.",
    workflows: [
      {
        title: "Generate a Game Schedule",
        steps: [
          {
            title: "Select Sport & Division",
            description: "On the Schedule Generator, pick Baseball or Softball, then select a division. The dropdown groups divisions by Recreation and Showcase.",
            path: "/schedule-generator",
          },
          {
            title: "Choose Custom or Automate",
            description: "Use Custom mode to manually configure teams and dates. Use Automate mode for a guided 5-step wizard that builds the full schedule based on games per team, available days, and times.",
          },
          {
            title: "Configure Teams",
            description: "In Custom mode, teams auto-load from the selected division as dropdowns. For Game type, Away and Home slots appear. Use 'Add Team' for additional round-robin participants.",
            tip: "Adding teams from other leagues? Use Automate mode's 'Other Leagues' step to include outside teams (e.g., ECLL, BRHLL) in the round-robin.",
          },
          {
            title: "Set Dates & Times",
            description: "Select a start date, game days of the week, and start times. Weeknight and weekend times can be configured separately in Automate mode.",
          },
          {
            title: "Generate & Review",
            description: "Click Generate Schedule. The table shows all games with round labels and editable cells. Team columns are dropdowns to quickly reassign teams. Rows can be deleted individually.",
          },
          {
            title: "Review Coach Conflicts",
            description: "After generation, conflicts are automatically detected: Red = head coach double-booked with overlapping games. Purple = assistant coach overlap. Pink = coach is a board member.",
            tip: "Conflicts only appear when two games actually overlap in time on the same date — not just when a coach appears on multiple teams.",
          },
          {
            title: "Export to SportsConnect",
            description: "Click Export xlsx to download a SportsConnect-compatible spreadsheet. Upload it directly to SportsConnect to publish the schedule.",
          },
        ],
      },
      {
        title: "Automate Mode Walkthrough",
        steps: [
          {
            title: "Step 1 — Setup",
            description: "Select sport, division, event type (Game or Practice), and how many games/practices to schedule per team.",
          },
          {
            title: "Step 2 — Other Leagues (Games only)",
            description: "Add other leagues and their teams that will be on the schedule. For example: ECLL (2 teams), BRHLL (5 teams). These teams are added to the round-robin pool.",
          },
          {
            title: "Step 3 — Dates & Days",
            description: "Set the season start date and which days of the week games should be scheduled on.",
          },
          {
            title: "Step 4 — Start Times",
            description: "Set the weeknight start time (e.g. 6:00 PM). For weekends, pick from available 30-minute slots between 9 AM and 2 PM.",
          },
          {
            title: "Step 5 — Location & Fields",
            description: "Set the default location (WT) and field. The field auto-suggests based on the division (e.g., Majors → Diamond 3).",
          },
        ],
      },
      {
        title: "Team Calendar Subscriptions",
        steps: [
          {
            title: "Manage ICS Feeds",
            description: "On the Calendar Subscriptions page, view and copy ICS feed URLs for each team. These URLs can be shared with coaches and parents to subscribe in Google Calendar, Apple Calendar, or Outlook.",
            path: "/calendar-management",
          },
        ],
      },
    ],
  },
  {
    id: "board",
    label: "Board Operations",
    color: "#C41230",
    icon: <DashboardIcon />,
    subtitle: "Administrative tools for board members and league officers.",
    workflows: [
      {
        title: "Season Setup",
        steps: [
          {
            title: "Create a Program Year",
            description: "Start a new season by creating a Program Year on the Program Years page. Set the year, sport, and whether it's a Recreation or Showcase program.",
            path: "/program-years",
          },
          {
            title: "Update Board Members",
            description: "Keep the Board Members roster current. The President's name auto-fills TVF forms and grant applications. Board member names are used for scheduling conflict detection.",
            path: "/board-members",
            tip: "Coach names that match a board member's name will be flagged pink in generated schedules — a helpful heads-up for scheduling purposes.",
          },
          {
            title: "Review Budget",
            description: "Enter income and expense line items in the Budget page. Track actuals against planned figures throughout the season.",
            path: "/budget",
          },
          {
            title: "Upload Documents",
            description: "Store league bylaws, All Star forms, board minutes, and other key documents in the Documents section.",
            path: "/documents",
          },
        ],
      },
      {
        title: "Operations Hub",
        steps: [
          {
            title: "Planning Calendar",
            description: "The Ops Hub calendar shows key season dates, deadlines, and board events. Use it to coordinate scheduling across programs.",
            path: "/board-hub",
          },
          {
            title: "Assignments Tab",
            description: "Track board member assignments, action items, and follow-ups within the Board Hub.",
          },
          {
            title: "All Stars Tab",
            description: "Use the All Stars tab in the Board Hub for consolidated All Star coordination across both baseball and softball.",
          },
        ],
      },
    ],
  },
  {
    id: "involvement",
    label: "Involvement",
    color: "#e65100",
    icon: <VolunteerActivismIcon />,
    subtitle: "Managing umpires, volunteers, and evaluation participants.",
    workflows: [
      {
        title: "Umpire Coordination",
        steps: [
          {
            title: "Create Umpire Sign-Up",
            description: "On the Umpire Sign-Ups page, create a sign-up form for an upcoming game date. The form captures umpire name, availability, and preferred game slots.",
            path: "/umpire-signups",
          },
          {
            title: "Share Public Link",
            description: "The public umpire sign-up URL can be shared with the umpire pool. No login is required for umpires to submit availability.",
          },
          {
            title: "Review Assignments",
            description: "Review submitted sign-ups and confirm umpire assignments for each game slot.",
          },
        ],
      },
      {
        title: "Volunteer Sign-Ups",
        steps: [
          {
            title: "Create Volunteer Form",
            description: "On the Volunteer Sign-Ups page, create a form for grounds crew, concessions, or other volunteer needs.",
            path: "/volunteer-signups",
          },
          {
            title: "Share & Track",
            description: "Share the public volunteer link with families. Track submissions and confirm assignments in the sign-up dashboard.",
          },
        ],
      },
      {
        title: "Evaluation Sign-Ups",
        steps: [
          {
            title: "Create Evaluation Slots",
            description: "On Evaluation Sign-Ups, create player evaluation time slots for a specific division and date. This generates a public link for families to register.",
            path: "/evaluation-signups",
            tip: "Create slots in 10–15 minute increments to keep evaluations moving.",
          },
          {
            title: "Share Public Link",
            description: "Distribute the public evaluation sign-up link via email or the league website. Players and families register for their preferred time slot.",
          },
        ],
      },
    ],
  },
]

// ── Render ─────────────────────────────────────────────────────────────────────

export default function GuidePage() {
  const [expanded, setExpanded] = useState<string | false>("preseason")

  const toggle = (id: string) => (_: React.SyntheticEvent, isOpen: boolean) => {
    setExpanded(isOpen ? id : false)
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <Box sx={{ width: 4, height: 28, bgcolor: "#C41230", borderRadius: 1, flexShrink: 0 }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Platform Guide</Typography>
          <Typography sx={{ fontSize: "0.82rem", color: "#888", mt: 0.25 }}>
            Step-by-step workflows for each section of the WTLL Operations Platform
          </Typography>
        </Box>
      </Box>

      {/* Section accordions */}
      {GUIDES.map(section => (
        <Accordion
          key={section.id}
          expanded={expanded === section.id}
          onChange={toggle(section.id)}
          elevation={0}
          sx={{
            mb: 1.5,
            border: "1px solid #e4e4e7",
            borderRadius: "10px !important",
            "&:before": { display: "none" },
            "&.Mui-expanded": { mb: 1.5 },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              borderRadius: expanded === section.id ? "10px 10px 0 0" : "10px",
              bgcolor: expanded === section.id ? `${section.color}10` : "#fafafa",
              "& .MuiAccordionSummary-content": { alignItems: "center", gap: 1.5 },
            }}
          >
            <Box sx={{ color: section.color, display: "flex", alignItems: "center" }}>{section.icon}</Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#1a1a1a" }}>
                {section.label}
              </Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "#888" }}>{section.subtitle}</Typography>
            </Box>
          </AccordionSummary>

          <AccordionDetails sx={{ px: 3, pb: 3, pt: 2 }}>
            {section.workflows.map((workflow, wi) => (
              <Box key={wi} sx={{ mb: wi < section.workflows.length - 1 ? 3.5 : 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", color: section.color, mb: 1.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {workflow.title}
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {workflow.steps.map((step, si) => (
                    <Paper
                      key={si}
                      elevation={0}
                      sx={{
                        display: "flex", gap: 2, p: 1.75,
                        border: "1px solid #f0f0f0", borderRadius: 2,
                        "&:hover": { borderColor: `${section.color}40`, bgcolor: `${section.color}05` },
                        transition: "border-color 0.15s, background 0.15s",
                      }}
                    >
                      {/* Step number */}
                      <Box sx={{
                        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                        bgcolor: section.color, color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.72rem", fontWeight: 700, mt: 0.1,
                      }}>
                        {si + 1}
                      </Box>

                      {/* Content */}
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.4 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: "0.88rem" }}>{step.title}</Typography>
                          {step.path && (
                            <Chip
                              label={step.path}
                              size="small"
                              component="a"
                              href={step.path}
                              clickable
                              sx={{
                                height: 18, fontSize: "0.65rem", fontWeight: 600,
                                bgcolor: `${section.color}15`, color: section.color,
                                fontFamily: "monospace",
                              }}
                            />
                          )}
                        </Box>
                        <Typography sx={{ fontSize: "0.8rem", color: "#555", lineHeight: 1.5 }}>
                          {step.description}
                        </Typography>
                        {step.tip && (
                          <Box sx={{
                            mt: 0.75, px: 1.25, py: 0.5, borderRadius: 1,
                            bgcolor: "#fffde7", border: "1px solid #fff176",
                            display: "flex", alignItems: "flex-start", gap: 0.75,
                          }}>
                            <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "#f57f17", flexShrink: 0, mt: "1px" }}>TIP</Typography>
                            <Typography sx={{ fontSize: "0.76rem", color: "#5f4c00", lineHeight: 1.4 }}>{step.tip}</Typography>
                          </Box>
                        )}
                      </Box>
                    </Paper>
                  ))}
                </Box>
              </Box>
            ))}
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Footer note */}
      <Box sx={{ mt: 3, p: 2, bgcolor: "#f8f9fa", borderRadius: 2, border: "1px solid #e4e4e7" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <PeopleIcon sx={{ fontSize: "1rem", color: "#aaa" }} />
          <Typography sx={{ fontSize: "0.78rem", color: "#888" }}>
            Need help or found a bug? Reach out to your platform admin — this guide reflects the current version of the WTLL Operations Platform.
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
