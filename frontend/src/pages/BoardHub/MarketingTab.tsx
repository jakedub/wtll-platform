import { Box, Typography } from "@mui/material"

interface MktCard { when: string; title: string; body: string }

const CARDS: MktCard[] = [
  { when: "Deploy: Early July 2026", title: "Fall Ball Early Bird Flyer", body: "Target families whose kids played spring rec. Content: dates, divisions (AAA/Majors/AA if offered), cost, registration link. Channels: GameChanger blast, Facebook/Instagram, school e-newsletter, website homepage. Owner: Marketing & Comms + Baseball Player Agent." },
  { when: "Deploy: July 2026 (ongoing)", title: "Fall Ball Social Media Pack", body: "5–7 posts covering: registration open, team formation, schedule announcement, tournament hype, and season recap. Formats: square for Instagram, horizontal for Facebook. Include division graphics and game day highlights." },
  { when: "Deploy: Early January 2027", title: "Spring Registration Launch Flyer", body: "Full-color flyer for all divisions (PeeWee through Majors, Softball, Teen Baseball). Content: registration window (2nd week Jan – mid-March), cost by division, school enrollment form requirement, QR code. Distribute: school newsletters, social, community boards, GameChanger." },
  { when: "Deploy: January–February 2027", title: "School Newsletter Insert", body: "Half-page formatted insert for WTLL feeder school newsletters. Concise: dates, divisions, QR code, contact info. Submit to school secretaries by last week of December for January distribution. Repeat in February for late registrants." },
  { when: "Deploy: January 2027", title: "Coach Recruitment Post", body: "Social post + email campaign targeting baseball/softball parents. Content: what's involved, time commitment, training provided, contact Baseball Player Agent. Pair with registration launch. Owner: Baseball Player Agent + Marketing." },
  { when: "Deploy: February 2027", title: "Evaluations Announcement", body: "Date, time, location of AAA/Majors indoor evaluations (1st Saturday of March). What players bring: cleats optional, glove, water. Age eligibility by division. What to expect on eval day. Post to GameChanger, social, website." },
  { when: "Deploy: February 2027", title: "Pitcher / Catcher Clinic Promo", body: "Announce specialty clinic for pitchers and catchers. Content: date, instructor, cost (if any), age groups, registration link. Channels: social + GameChanger targeted by division. Owner: VP Baseball + Marketing." },
  { when: "Deploy: 2 weeks before Opening Day", title: "Opening Day Announcement", body: "Build hype: schedule, ceremonies, food, parking. Include team photos if available. Video reel from prior year. Countdown posts the week of. Owner: Marketing & Comms + President." },
  { when: "Deploy: Weekly during season", title: "Weekly GameChanger Recaps", body: "Highlight reel post each Monday: top plays, standings, upcoming big games. Pull stats from GameChanger. Keep short — 3–4 sentences + photo. Schedule in advance. Owner: Marketing & Comms Manager." },
  { when: "Deploy: Late May / Early June", title: "Playoffs & Championship Hype", body: "Bracket graphics, game previews, countdown posts, post-game recaps. Championship day: real-time updates, photos, celebration posts. Deliverables: bracket graphic, 2–3 preview posts, championship recap + photo album." },
  { when: "Deploy: After DA approval (May/June)", title: "All Stars Announcement", body: "Once selections are DA-approved: announce All Star teams by division. Player names, photos, coach introductions. Remind families of paperwork deadlines. Owner: Baseball Player Agent + Marketing." },
  { when: "Deploy: October–November 2026", title: "Sponsorship & Fundraising Materials", body: "Sponsorship deck: tiered packages (Gold/Silver/Bronze), benefits per tier, reach/impressions data. Fundraising flyer for early-season fundraiser. Owner: Sponsorship Coordinator + Fundraising Coordinator. Packages finalized before November board meeting." },
]

export default function MarketingTab() {
  return (
    <Box>
      <Typography sx={{ color: "#777", fontSize: "0.875rem", mb: 3 }}>
        Owned by <strong>Marketing & Communications Manager</strong> unless otherwise noted. Deploy windows are firm — late materials lose reach.
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 2 }}>
        {CARDS.map((c) => (
          <Box key={c.title} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 2 }}>
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.5 }}>{c.when}</Typography>
            <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", mb: 0.75 }}>{c.title}</Typography>
            <Typography sx={{ fontSize: "0.82rem", color: "#555", lineHeight: 1.6 }}>{c.body}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
