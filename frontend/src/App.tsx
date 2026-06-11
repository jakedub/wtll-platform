import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/600.css'

import theme from './theme'
import AppLayout from './components/AppLayout'
import PlayersPage from './pages/PlayersPage'
import PlayerDetailPage from './pages/PlayerDetailPage'
import TeamsPage from './pages/TeamsPage'
import PitchLogPage from './pages/PitchLogPage'
import AllTeamsCalendar from './pages/AllTeamsCalendar'
import TeamCalendar from './pages/TeamCalendar'
import CalendarPage from './pages/CalendarPage'
import AgendaPage from './pages/AgendaPage'
import MobileCalendarPage from './pages/MobileCalendarPage'
import UmpireSignupPage from './pages/UmpireSignupPage'
import PlayerImportPage from './pages/PlayerImportPage'
import AddressValidationPage from './pages/AddressValidationPage'
import EvaluationsPage from './pages/EvaluationsPage'
import EvaluationsHubPage from './pages/EvaluationsHubPage'
import PrintEvaluationFormsPage from './pages/PrintEvaluationFormsPage'
import DraftListPage from './pages/DraftListPage'
import DraftRoomPage from './pages/DraftRoomPage'
import BoardHubPage from './pages/BoardHub'
import BoardMembersPage from './pages/BoardMembersPage'
import DashboardPage from './pages/DashboardPage'
import DocumentsPage from './pages/DocumentsPage'
import EvaluationSignupPage from './pages/EvaluationSignupPage'
import RecyclingBinPage from './pages/RecyclingBinPage'
import TeamManagementPage from './pages/TeamManagementPage'
import ProgramYearPage from './pages/ProgramYearPage'
import SoftballInningLogPage from './pages/SoftballInningLogPage'
import SectionDashboardPage from './pages/SectionDashboardPage'
import EvaluationEventsPage from './pages/EvaluationEventsPage'
import PublicEvaluationPage from './pages/PublicEvaluationPage'
import PublicEvaluationListPage from './pages/PublicEvaluationListPage'
import CalendarManagementPage from './pages/CalendarManagementPage'
import PublicUmpireSignupPage from './pages/PublicUmpireSignupPage'
import PublicVolunteerSignupPage from './pages/PublicVolunteerSignupPage'
import PublicPitchLogPage from './pages/PublicPitchLogPage'
import PublicPitchCountPage from './pages/PublicPitchCountPage'
import PublicSoftballInningsPage from './pages/PublicSoftballInningsPage'
import VolunteerSignupPage from './pages/VolunteerSignupPage'
import AllStarsPage from './pages/AllStarsPage'
import BudgetPage from './pages/BudgetPage'
import DistrictLeadershipPage from './pages/DistrictLeadershipPage'
import BoundariesPage from './pages/BoundariesPage'
import VendorsPage from './pages/VendorsPage'
import LoginPage from './pages/LoginPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
        {/* Public-facing pages — no AppLayout sidebar, no auth required */}
        <Routes>
          <Route path="/public/umpire-signups" element={<PublicUmpireSignupPage />} />
          <Route path="/public/volunteer-signups" element={<PublicVolunteerSignupPage />} />
          <Route path="/public/evaluations" element={<PublicEvaluationListPage />} />
          <Route path="/public/evaluations/:id" element={<PublicEvaluationPage />} />
          <Route path="/public/pitch-log" element={<PublicPitchLogPage />} />
          <Route path="/public/pitch-count" element={<PublicPitchCountPage />} />
          <Route path="/public/softball-innings" element={<PublicSoftballInningsPage />} />
          {/* Auth routes — also public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/*" element={
            <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
            <Route path="/section/:sectionId" element={<SectionDashboardPage />} />
            <Route path="/players" element={<PlayersPage />} />
            <Route path="/players/:id" element={<PlayerDetailPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/pitch-log" element={<PitchLogPage />} />
            <Route path="/softball-innings" element={<SoftballInningLogPage />} />
            <Route path="/team-calendars" element={<AllTeamsCalendar />} />
            <Route path="/team-calendars/:id" element={<TeamCalendar/>}/>
            <Route path="/baseball-schedule" element={<AllTeamsCalendar sport="baseball" />} />
            <Route path="/softball-schedule" element={<AllTeamsCalendar sport="softball" />} />
            <Route path="/calendar" element={<CalendarPage/>}/>
            <Route path="/agenda" element={<AgendaPage />} />
            <Route path="/mobile-calendar" element={<MobileCalendarPage />} />
            <Route path="/umpire-signups" element={<UmpireSignupPage />} />
            <Route path="/player-import" element={<PlayerImportPage />} />
            <Route path="/address-validation" element={<AddressValidationPage />} />
            <Route path="/evaluations-hub" element={<EvaluationsHubPage />} />
            <Route path="/evaluations/print" element={<PrintEvaluationFormsPage />} />
            <Route path="/evaluations" element={<EvaluationsPage />} />
            <Route path="/draft" element={<DraftListPage />} />
            <Route path="/draft/:id" element={<DraftRoomPage />} />
            <Route path="/board-hub" element={<BoardHubPage />} />
            <Route path="/board-members" element={<BoardMembersPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/volunteer-signups" element={<VolunteerSignupPage />} />
            <Route path="/all-stars" element={<AllStarsPage />} />
            <Route path="/recycling-bin" element={<RecyclingBinPage />} />
            <Route path="/team-management" element={<TeamManagementPage />} />
            <Route path="/team-management/softball" element={<TeamManagementPage />} />
            <Route path="/program-years" element={<ProgramYearPage />} />
            <Route path="/evaluation-signups" element={<EvaluationSignupPage />} />
            <Route path="/evaluation-events" element={<EvaluationEventsPage />} />
            <Route path="/calendar-management" element={<CalendarManagementPage />} />
                <Route path="/budget" element={<BudgetPage />} />
                <Route path="/district-leadership" element={<DistrictLeadershipPage />} />
                <Route path="/boundaries" element={<BoundariesPage />} />
                <Route path="/vendors" element={<VendorsPage />} />
              </Routes>
            </AppLayout>
            </ProtectedRoute>
          } />
        </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
