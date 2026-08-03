/**
 * Shared navigation configuration — used by AppLayout (rail + drawer)
 * and SectionDashboardPage (card grids).
 */
import { ReactNode } from 'react'
import DashboardIcon from '@mui/icons-material/Dashboard'
import PeopleIcon from '@mui/icons-material/People'
import GroupsIcon from '@mui/icons-material/Groups'
import SportsBaseballIcon from '@mui/icons-material/SportsBaseball'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import StarIcon from '@mui/icons-material/Star'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import BadgeIcon from '@mui/icons-material/Badge'
import StorefrontIcon from '@mui/icons-material/Storefront'
import AssessmentIcon from '@mui/icons-material/Assessment'
import TimelineIcon from '@mui/icons-material/Timeline'
import GavelIcon from '@mui/icons-material/Gavel'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import FolderIcon from '@mui/icons-material/Folder'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import AssignmentIcon from '@mui/icons-material/Assignment'
import SportsIcon from '@mui/icons-material/Sports'
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import LinkIcon from '@mui/icons-material/Link'
import DateRangeIcon from '@mui/icons-material/DateRange'
import CampaignIcon from '@mui/icons-material/Campaign'

export interface NavItem {
  label: string
  path: string
  icon: ReactNode
  description: string
}

export interface NavSection {
  id: string
  label: string
  icon: ReactNode
  /** Path for the section dashboard landing page */
  dashboardPath: string
  /** Accent color for this section */
  color: string
  items: NavItem[]
}

// Baseball bat silhouette — pointing lower-left (knob) to upper-right (barrel)
const BatIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    {/*
      Outline (clockwise):
        knob bottom (2,19) → arc around knob to knob top (4,21)
        → handle top-side up to barrel (14.5,9.5) → (22,6)
        → arc around barrel tip to (18,2)
        → handle bottom-side back to (13.5,8.5)
        → Z (closes back to knob bottom)
    */}
    <path d="M2 19A1.5 1.5 0 0 1 4 21L14.5 9.5 22 6A2.5 2.5 0 0 0 18 2L13.5 8.5Z" />
  </svg>
)

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'board',
    label: 'Board',
    icon: <DashboardIcon />,
    dashboardPath: '/section/board',
    color: '#C41230',   // WTLL red
    items: [
      { label: 'Operations Hub',    path: '/board-hub',       icon: <DashboardIcon />,             description: 'Planning calendar, assignments, and board overview.' },
      { label: 'Board Members',     path: '/board-members',   icon: <PeopleIcon />,                description: 'Board roster with roles. President name auto-fills TVF forms.' },
      { label: 'Program Years',     path: '/program-years',   icon: <RocketLaunchIcon />,           description: 'Start new seasons and close completed programs.' },
      { label: 'Documents & Bylaws',  path: '/documents',           icon: <FolderIcon />,             description: 'League bylaws, All Star forms, and board documents.' },
      { label: 'District Leadership', path: '/district-leadership',  icon: <BadgeIcon />,              description: 'District and HQ contacts — phone, email, and position.' },
      { label: 'Boundaries',          path: '/boundaries',           icon: <LocationOnIcon />,         description: 'Interactive map of WTLL, District 8, and District 7 league boundaries.' },
      { label: 'Vendors',             path: '/vendors',              icon: <StorefrontIcon />,          description: 'Vendor and supplier contacts — uniforms, equipment, trophies, and more.' },
      { label: 'Locations',           path: '/locations',            icon: <LocationOnIcon />,          description: 'Manage parks, complexes, and fields used by WTLL and other leagues.' },
      { label: 'Recycling Bin',       path: '/recycling-bin',        icon: <DeleteSweepIcon />,        description: 'Archived and deleted player records.' },
    ],
  },
  {
    id: 'preseason',
    label: 'Pre-Season',
    icon: <AssessmentIcon />,
    dashboardPath: '/section/preseason',
    color: '#6a1b9a',   // purple
    items: [
      { label: 'Season Pipeline',  path: '/season-pipeline',      icon: <TimelineIcon />,      description: 'Track each program through its season lifecycle — divisions, teams, draft, schedule, and close.' },
      { label: 'Player Import',    path: '/player-import',        icon: <UploadFileIcon />,    description: 'Import players from SportsConnect enrollment CSV.' },
      { label: 'Eligibility',      path: '/address-validation',   icon: <LocationOnIcon />,    description: 'Geocode addresses and verify district eligibility.' },
      { label: 'Evaluations',      path: '/evaluations-hub',      icon: <AssessmentIcon />,    description: 'Baseball & softball evals, sign-up events, and print forms.' },
      { label: 'Team Management',  path: '/team-management',      icon: <ManageAccountsIcon />,description: 'Edit coaches, rosters, and team assignments for all sports.' },
      { label: 'Baseball Draft',   path: '/draft',                icon: <GavelIcon />,         description: 'Run the baseball player draft by division.' },
      { label: 'Softball Draft',   path: '/draft?sport=softball', icon: <GavelIcon />,         description: 'Run the softball player draft by division.' },
    ],
  },
  {
    id: 'baseball',
    label: 'Baseball Ops',
    icon: <SportsBaseballIcon />,
    dashboardPath: '/section/baseball',
    color: '#1565c0',   // deep blue
    items: [
      { label: 'Players',      path: '/players',     icon: <PeopleIcon />,         description: 'Roster by division and team — all baseball players.' },
      { label: 'Pitch Count',  path: '/teams',       icon: <GroupsIcon />,         description: 'Pitch count summary by team and player.' },
      { label: 'Log Pitches',  path: '/pitch-log',   icon: <SportsBaseballIcon />, description: 'Log game pitches for AAA and Majors pitchers.' },
      { label: 'All Stars',    path: '/all-stars',   icon: <StarIcon />,           description: 'All Star selections, eligibility, and paperwork.' },
    ],
  },
  {
    id: 'softball',
    label: 'Softball Ops',
    icon: <BatIcon />,
    dashboardPath: '/section/softball',
    color: '#d81b60',   // deep pink/magenta
    items: [
      { label: 'Players',      path: '/players?sport=softball',   icon: <PeopleIcon />,         description: 'Roster by division and team — all softball players.' },
      { label: 'Log Innings',  path: '/softball-innings',         icon: <SportsBaseballIcon />, description: 'Log innings pitched for Minors and Majors softball.' },
      { label: 'All Stars',    path: '/all-stars?sport=softball', icon: <StarIcon />,           description: 'Softball All Star selections and paperwork.' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: <AttachMoneyIcon />,
    dashboardPath: '/section/finance',
    color: '#2e7d32',   // deep green
    items: [
      { label: 'Budget',      path: '/budget',      icon: <AccountBalanceWalletIcon />, description: 'Annual operating budget — income, expenses, and actuals.' },
      { label: 'Fundraising', path: '/fundraising', icon: <CampaignIcon />,             description: 'Capital improvement campaigns, plans, and project progress tracker.' },
    ],
  },
  {
    id: 'schedule',
    label: 'Schedule',
    icon: <CalendarMonthIcon />,
    dashboardPath: '/section/schedule',
    color: '#00838f',   // teal
    items: [
      { label: 'Baseball Schedule',      path: '/baseball-schedule',    icon: <SportsBaseballIcon />, description: 'Baseball game and practice schedule with ICS sync.' },
      { label: 'Softball Schedule',      path: '/softball-schedule',    icon: <CalendarMonthIcon />,  description: 'Softball game and practice schedule with ICS sync.' },
      { label: 'Entire Schedule',        path: '/team-calendars',       icon: <DateRangeIcon />,      description: 'All teams combined calendar view.' },
      { label: 'Schedule Generator',     path: '/schedule-generator',   icon: <AssignmentIcon />,     description: 'Build round-robin schedules and export to SportsConnect.' },
      { label: 'Calendar Subscriptions', path: '/calendar-management',  icon: <LinkIcon />,           description: 'Manage ICS feed URLs for team calendars.' },
    ],
  },
  {
    id: 'involvement',
    label: 'Involvement',
    icon: <VolunteerActivismIcon />,
    dashboardPath: '/section/involvement',
    color: '#e65100',   // deep orange
    items: [
      { label: 'Umpire Sign-Ups',     path: '/umpire-signups',     icon: <SportsIcon />,            description: 'Manage umpire availability and game assignments.' },
      { label: 'Volunteer Sign-Ups',  path: '/volunteer-signups',  icon: <VolunteerActivismIcon />, description: 'Grounds crew and concessions volunteer coordination.' },
      { label: 'Evaluation Sign-Ups', path: '/evaluation-signups', icon: <AssignmentIcon />,        description: 'Public player evaluation registration portal.' },
    ],
  },
]

/** Pages that support full-size (nav collapse) mode */
export const FULLSIZE_PATHS = [
  '/evaluations',
  '/draft',
  '/baseball-schedule',
  '/softball-schedule',
  '/team-calendars',
  '/calendar-management',
  '/softball-innings',
  '/pitch-log',
]

export function isFullSizeEligible(pathname: string): boolean {
  return FULLSIZE_PATHS.some(p => {
    // Strip any trailing slash from the pattern so both '/draft' and '/draft/'
    // in the array work the same way, then match exact OR child paths only.
    // e.g. '/evaluations' matches '/evaluations' and '/evaluations/print'
    //      but NOT '/evaluations-hub'.
    const clean = p.replace(/\/$/, '')
    return pathname === clean || pathname.startsWith(clean + '/')
  })
}
