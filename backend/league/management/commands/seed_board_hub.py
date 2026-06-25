"""
Management command: seed_board_hub

Populates BoardCalendarEvent and BoardChecklistItem with the initial
season-planning data.  Safe to run multiple times — skips if rows already exist.

Usage:
    python manage.py seed_board_hub
    python manage.py seed_board_hub --force   # clears existing rows first
"""
from django.core.management.base import BaseCommand
from league.models import BoardCalendarEvent, BoardChecklistItem


MONTHS = [
    {"month_year": "June 2026",     "phase": "2026 Rec Season Finish",             "year": 2026, "events": [
        {"text": "Playoffs — 1st week of June (all divisions)",                             "owner": "VP Baseball · VP Softball",                                    "color": "red"},
        {"text": "Championship Game — Saturday of first full week of June",                 "owner": "President · VP Baseball · Grounds Manager",                    "color": "red"},
        {"text": "All Star paperwork finalized & submitted to DA before end of school year","owner": "Baseball Player Agent · VP Baseball",                          "color": "purple"},
        {"text": "Teen Baseball (Juniors/Seniors) practices begin post-championship",       "owner": "Baseball Player Agent",                                        "color": "gold"},
        {"text": "End-of-season awards, trophies, sponsor recognition",                     "owner": "VP Baseball · Sponsorship Coordinator",                        "color": "blue"},
        {"text": "Collect equipment, inventory uniforms & gear",                             "owner": "Equipment Manager",                                            "color": "green"},
    ]},
    {"month_year": "July 2026",     "phase": "Fall Ball Planning · Teen Baseball",  "year": 2026, "events": [
        {"text": "Teen Baseball season ends mid-July",                                       "owner": "Baseball Player Agent",                                        "color": "red"},
        {"text": "Fall Ball registration opens early July",                                  "owner": "Baseball Player Agent · Secretary",                            "color": "gold"},
        {"text": "Confirm interleague partners for Fall Ball (AAA/Majors)",                  "owner": "President · VP Baseball",                                      "color": "orange"},
        {"text": "Identify Fall Ball coach volunteers",                                      "owner": "Baseball Player Agent",                                        "color": "blue"},
        {"text": "All Star tournaments begin (district/sectional)",                          "owner": "VP Baseball · Baseball Player Agent",                          "color": "purple"},
        {"text": "Begin Fall Ball scheduling framework",                                     "owner": "VP Baseball · Umpire in Chief",                                "color": "green"},
    ]},
    {"month_year": "August 2026",   "phase": "Fall Ball Launch",                    "year": 2026, "events": [
        {"text": "Fall Ball registration closes 2nd week of August",                         "owner": "Baseball Player Agent · Secretary",                            "color": "red"},
        {"text": "Fall Ball uniforms ordered — 2nd week of August (hat + raglan)",           "owner": "VP Baseball · Equipment Manager",                              "color": "red"},
        {"text": "Fall Ball teams formed & coaches notified",                                "owner": "Baseball Player Agent",                                        "color": "gold"},
        {"text": "Fall Ball schedule finalized with interleague partners",                   "owner": "VP Baseball",                                                  "color": "blue"},
        {"text": "Confirm umpire coverage for Fall Ball games",                              "owner": "Umpire in Chief",                                              "color": "orange"},
        {"text": "Field prep & scheduling for Fall Ball fields",                             "owner": "Grounds Manager",                                              "color": "green"},
    ]},
    {"month_year": "September 2026","phase": "Fall Ball Season",                    "year": 2026, "events": [
        {"text": "Fall Ball regular season in progress (AAA, Majors, +AA if threshold met)","owner": "VP Baseball",                                                   "color": "red"},
        {"text": "Single-day tournament — last weekend of September",                        "owner": "VP Baseball · Grounds Manager · Umpire in Chief",              "color": "gold"},
        {"text": "Begin board recruitment for 2027 season (open roles)",                     "owner": "President · Secretary",                                        "color": "blue"},
        {"text": "Sponsorship outreach for 2027 season begins",                              "owner": "Sponsorship Coordinator",                                      "color": "purple"},
        {"text": "Concessions operations during Fall Ball games",                            "owner": "Concessions Manager",                                          "color": "green"},
    ]},
    {"month_year": "October 2026",  "phase": "Fall Ball Wrap · 2027 Planning Begins","year": 2026,"events": [
        {"text": "Fall Ball season ends October 1",                                          "owner": "VP Baseball",                                                  "color": "red"},
        {"text": "Fall Ball wrap-up, equipment collection",                                  "owner": "Equipment Manager",                                            "color": "gold"},
        {"text": "Begin 2027 budget planning process",                                       "owner": "Treasurer · All VPs",                                          "color": "blue"},
        {"text": "Annual board elections / officer transitions",                             "owner": "President · Secretary",                                        "color": "orange"},
        {"text": "Fundraising planning for 2027",                                            "owner": "Fundraising Coordinator",                                      "color": "green"},
    ]},
    {"month_year": "November 2026", "phase": "Off-Season Planning",                 "year": 2026, "events": [
        {"text": "2027 budget presented to & approved by board (early November)",            "owner": "Treasurer · President",                                        "color": "red"},
        {"text": "Vendor contract renewals reviewed (fields, insurance, uniforms)",          "owner": "President · VP Baseball · VP Softball",                        "color": "gold"},
        {"text": "Draft Little League charter renewal documentation",                        "owner": "Secretary · President",                                        "color": "blue"},
        {"text": "Sponsor renewal outreach — returning sponsors priority",                   "owner": "Sponsorship Coordinator",                                      "color": "orange"},
        {"text": "Safety Officer completes annual field safety audit",                       "owner": "Safety Officer",                                               "color": "purple"},
    ]},
    {"month_year": "December 2026", "phase": "Pre-Season Contracts",                "year": 2026, "events": [
        {"text": "Indoor evaluation venue contracted by early December",                     "owner": "VP Baseball · Grounds Manager",                                "color": "red"},
        {"text": "Finalize umpire recruitment plan for 2027 season",                         "owner": "Umpire in Chief",                                              "color": "gold"},
        {"text": "Uniform vendor selection for 2027 spring season (AAA/Majors)",             "owner": "VP Baseball · Equipment Manager",                              "color": "blue"},
        {"text": "Registration platform configured for January launch",                      "owner": "Secretary · Player Agents",                                    "color": "orange"},
        {"text": "Coach recruitment campaign drafted (social/email)",                        "owner": "Marketing & Comms · Baseball Player Agent",                    "color": "green"},
    ]},
    {"month_year": "January 2027",  "phase": "Registration Opens",                  "year": 2027, "events": [
        {"text": "Registration opens 2nd week of January (second semester start)",           "owner": "Secretary · Baseball Player Agent · Softball Player Agent",    "color": "red"},
        {"text": "School enrollment form required at registration",                          "owner": "Baseball Player Agent · Softball Player Agent",                "color": "red"},
        {"text": "Spring registration launch marketing push (flyer, social, school newsletter)","owner": "Marketing & Comms Manager",                                "color": "gold"},
        {"text": "Coach recruitment posts go live",                                          "owner": "Marketing & Comms · Baseball Player Agent",                    "color": "blue"},
        {"text": "Teen Baseball (Juniors/Seniors) registration opens",                       "owner": "Baseball Player Agent",                                        "color": "orange"},
    ]},
    {"month_year": "February 2027", "phase": "Registration Active",                 "year": 2027, "events": [
        {"text": "Registration ongoing; follow-up outreach to families",                     "owner": "Marketing & Comms · Secretary",                                "color": "red"},
        {"text": "Evaluations announcement published (date, location, what to bring)",       "owner": "Marketing & Comms · Baseball Player Agent",                    "color": "gold"},
        {"text": "Umpire training / certification sessions scheduled",                       "owner": "Umpire in Chief",                                              "color": "blue"},
        {"text": "Pitcher/catcher clinic promo & sign-ups",                                  "owner": "Marketing & Comms · VP Baseball",                              "color": "orange"},
        {"text": "Safety plan updated; background checks processed for coaches",             "owner": "Safety Officer · Baseball Player Agent",                       "color": "green"},
    ]},
    {"month_year": "March 2027",    "phase": "Evals · Draft · Rosters",             "year": 2027, "events": [
        {"text": "Registration closes mid-March; eligibility check runs",                    "owner": "Baseball Player Agent · Softball Player Agent",                "color": "red"},
        {"text": "AAA/Majors evaluations — 1st Saturday of March (indoors)",                 "owner": "VP Baseball · Baseball Player Agent",                          "color": "red"},
        {"text": "Draft complete before last Saturday of March; rosters finalized that Saturday","owner": "VP Baseball · Baseball Player Agent",                     "color": "red"},
        {"text": "Spring uniforms ordered late March (AAA/Majors)",                          "owner": "VP Baseball · Equipment Manager",                              "color": "gold"},
        {"text": "Field maintenance, lining, dugout prep begins",                            "owner": "Grounds Manager",                                              "color": "green"},
    ]},
    {"month_year": "April 2027",    "phase": "Spring Season Launch",                "year": 2027, "events": [
        {"text": "Opening Day — 2nd Saturday of April",                                      "owner": "President · VP Baseball · VP Softball · Marketing",            "color": "red"},
        {"text": "Opening Day announcement & social campaign",                               "owner": "Marketing & Comms Manager",                                    "color": "gold"},
        {"text": "Regular season begins (PeeWee, AA, AAA, Majors, Softball)",                "owner": "VP Baseball · VP Softball",                                    "color": "blue"},
        {"text": "Concessions open for season; volunteers scheduled",                        "owner": "Concessions Manager · Volunteer Coordinator",                  "color": "orange"},
        {"text": "GameChanger setup & weekly recap posts begin",                             "owner": "Marketing & Comms Manager",                                    "color": "green"},
    ]},
    {"month_year": "May 2027",      "phase": "All Stars · Teen Baseball",           "year": 2027, "events": [
        {"text": "All Star nominations — 1st week of May (coaches nominate)",                "owner": "Baseball Player Agent · VP Baseball",                          "color": "purple"},
        {"text": "All Star selection — 2nd week of May",                                    "owner": "All Star Coaches · VP Baseball · Baseball Player Agent",        "color": "purple"},
        {"text": "Teen Baseball registration closes 2nd week of May (no eval/draft)",        "owner": "Baseball Player Agent",                                        "color": "red"},
        {"text": "No games on Memorial Day",                                                 "owner": "VP Baseball · VP Softball",                                    "color": "gold"},
        {"text": "All Star paperwork preparation begins",                                    "owner": "Baseball Player Agent",                                        "color": "blue"},
    ]},
    {"month_year": "June 2027",     "phase": "Playoffs · Championship · All Stars", "year": 2027, "events": [
        {"text": "Playoffs — 1st week of June",                                              "owner": "VP Baseball · VP Softball · Umpire in Chief",                  "color": "red"},
        {"text": "Championship — Saturday of first full week of June",                       "owner": "President · VP Baseball · VP Softball · Grounds Manager",     "color": "red"},
        {"text": "All Star paperwork submitted to DA before end of school year",             "owner": "Baseball Player Agent · VP Baseball",                          "color": "purple"},
        {"text": "Teen Baseball practices begin post-championship",                          "owner": "Baseball Player Agent",                                        "color": "gold"},
        {"text": "End-of-season awards, trophies distributed",                               "owner": "VP Baseball · VP Softball",                                   "color": "green"},
    ]},
    {"month_year": "July 2027",     "phase": "All Stars · Teen Baseball · Fall Ball Prep","year": 2027,"events": [
        {"text": "All Star tournament play (district/sectional/state)",                      "owner": "VP Baseball · Baseball Player Agent",                          "color": "purple"},
        {"text": "Teen Baseball season ends mid-July",                                       "owner": "Baseball Player Agent",                                        "color": "red"},
        {"text": "Fall Ball registration opens early July",                                  "owner": "Baseball Player Agent · Secretary",                            "color": "gold"},
        {"text": "Begin Fall Ball planning cycle (coaches, interleague, schedule)",          "owner": "VP Baseball",                                                  "color": "blue"},
        {"text": "Post-season equipment audit & storage",                                    "owner": "Equipment Manager",                                            "color": "orange"},
    ]},
]

CHECKLIST_ITEMS = [
    {"date_window": "1st week of June 2026",             "item": "Playoffs conducted (all divisions)",                                               "owner": "VP Baseball · VP Softball",                          "item_type": "hard",    "group": "general"},
    {"date_window": "Sat, first full week of June 2026", "item": "Championship games — all divisions",                                              "owner": "President · VP Baseball · Grounds Manager",          "item_type": "hard",    "group": "general"},
    {"date_window": "Before end of school year 2026",    "item": "All Star paperwork submitted to DA",                                               "owner": "Baseball Player Agent · VP Baseball",                "item_type": "allstar", "group": "allstars"},
    {"date_window": "Early July 2026",                   "item": "Fall Ball registration opens; Early Bird flyer published",                         "owner": "Baseball Player Agent · Marketing",                  "item_type": "action",  "group": "fallball"},
    {"date_window": "July 2026",                         "item": "Interleague partners confirmed for Fall Ball",                                     "owner": "President · VP Baseball",                            "item_type": "action",  "group": "fallball"},
    {"date_window": "2nd week of August 2026",           "item": "Fall Ball registration closes",                                                    "owner": "Baseball Player Agent · Secretary",                  "item_type": "hard",    "group": "fallball"},
    {"date_window": "2nd week of August 2026",           "item": "Fall Ball uniforms ordered (hat + raglan)",                                        "owner": "VP Baseball · Equipment Manager",                    "item_type": "hard",    "group": "fallball"},
    {"date_window": "Last weekend of September 2026",    "item": "Fall Ball single-day tournament",                                                  "owner": "VP Baseball · Grounds Manager · Umpire in Chief",    "item_type": "action",  "group": "fallball"},
    {"date_window": "October 1, 2026",                   "item": "Fall Ball season ends",                                                            "owner": "VP Baseball",                                        "item_type": "hard",    "group": "fallball"},
    {"date_window": "Early November 2026",               "item": "2027 budget presented to board",                                                   "owner": "Treasurer · President",                              "item_type": "hard",    "group": "budget"},
    {"date_window": "Early December 2026",               "item": "Indoor evaluation venue contracted",                                               "owner": "VP Baseball · Grounds Manager",                      "item_type": "hard",    "group": "general"},
    {"date_window": "December 2026",                     "item": "Uniform vendor selected for 2027 spring (AAA/Majors)",                             "owner": "VP Baseball · Equipment Manager",                    "item_type": "action",  "group": "general"},
    {"date_window": "December 2026",                     "item": "Registration platform configured for January launch",                              "owner": "Secretary · Player Agents",                          "item_type": "action",  "group": "general"},
    {"date_window": "2nd week of January 2027",          "item": "Spring registration opens (second semester)",                                      "owner": "Secretary · Baseball Player Agent · Softball Player Agent","item_type": "hard","group": "general"},
    {"date_window": "January 2027",                      "item": "School enrollment form required — communicated at registration",                   "owner": "Baseball Player Agent · Softball Player Agent",      "item_type": "action",  "group": "general"},
    {"date_window": "February 2027",                     "item": "Pitcher/catcher clinic promoted and scheduled",                                    "owner": "VP Baseball · Marketing",                            "item_type": "action",  "group": "general"},
    {"date_window": "February 2027",                     "item": "Umpire training / certification sessions scheduled",                               "owner": "Umpire in Chief",                                    "item_type": "action",  "group": "general"},
    {"date_window": "1st Saturday of March 2027",        "item": "AAA/Majors indoor evaluations",                                                    "owner": "VP Baseball · Baseball Player Agent",                "item_type": "hard",    "group": "general"},
    {"date_window": "Mid-March 2027",                    "item": "Registration closes; eligibility check runs",                                      "owner": "Baseball Player Agent · Softball Player Agent",      "item_type": "hard",    "group": "general"},
    {"date_window": "Before last Saturday of March 2027","item": "Draft complete",                                                                   "owner": "VP Baseball · Baseball Player Agent",                "item_type": "hard",    "group": "general"},
    {"date_window": "Last Saturday of March 2027",       "item": "Rosters finalized",                                                                "owner": "VP Baseball · Baseball Player Agent",                "item_type": "hard",    "group": "general"},
    {"date_window": "Late March 2027",                   "item": "Spring uniforms ordered (AAA/Majors)",                                             "owner": "VP Baseball · Equipment Manager",                    "item_type": "hard",    "group": "general"},
    {"date_window": "2nd Saturday of April 2027",        "item": "Opening Day",                                                                      "owner": "President · VP Baseball · VP Softball",              "item_type": "hard",    "group": "general"},
    {"date_window": "Memorial Day 2027",                 "item": "No games scheduled",                                                               "owner": "VP Baseball · VP Softball",                          "item_type": "hard",    "group": "general"},
    {"date_window": "1st week of May 2027",              "item": "All Star nominations distributed to coaches",                                      "owner": "Baseball Player Agent",                              "item_type": "allstar", "group": "allstars"},
    {"date_window": "2nd week of May 2027",              "item": "Teen Baseball registration closes",                                                "owner": "Baseball Player Agent",                              "item_type": "hard",    "group": "general"},
    {"date_window": "2nd week of May 2027",              "item": "All Star teams selected",                                                          "owner": "Selection Committee · VP Baseball",                  "item_type": "allstar", "group": "allstars"},
    {"date_window": "1st week of June 2027",             "item": "Playoffs (all divisions)",                                                         "owner": "VP Baseball · VP Softball · Umpire in Chief",        "item_type": "hard",    "group": "general"},
    {"date_window": "Before end of school year 2027",    "item": "All Star paperwork submitted to DA",                                               "owner": "Baseball Player Agent · VP Baseball",                "item_type": "allstar", "group": "allstars"},
    {"date_window": "Sat, first full week of June 2027", "item": "Championship games",                                                               "owner": "President · VP Baseball · VP Softball",              "item_type": "hard",    "group": "general"},
    {"date_window": "Post-championship, June 2027",      "item": "Teen Baseball practices begin; season ends mid-July",                              "owner": "Baseball Player Agent",                              "item_type": "action",  "group": "general"},
    {"date_window": "Early July 2027",                   "item": "Fall Ball 2027 registration opens; planning cycle begins",                         "owner": "Baseball Player Agent · VP Baseball",                "item_type": "action",  "group": "fallball"},
    # Marketing items
    {"date_window": "Early July 2026",                   "item": "Fall Ball Early Bird flyer deployed (GameChanger, Facebook, school newsletter)",   "owner": "Marketing & Comms · Baseball Player Agent",          "item_type": "action",  "group": "marketing"},
    {"date_window": "Early January 2027",                "item": "Spring Registration Launch flyer published",                                       "owner": "Marketing & Comms Manager",                          "item_type": "hard",    "group": "marketing"},
    {"date_window": "January–February 2027",             "item": "School newsletter inserts submitted to feeder schools",                            "owner": "Marketing & Comms",                                  "item_type": "action",  "group": "marketing"},
    {"date_window": "January 2027",                      "item": "Coach recruitment posts go live on social + GameChanger",                          "owner": "Marketing & Comms · Baseball Player Agent",          "item_type": "action",  "group": "marketing"},
    {"date_window": "February 2027",                     "item": "Evaluations announcement published",                                               "owner": "Marketing & Comms · Baseball Player Agent",          "item_type": "action",  "group": "marketing"},
    {"date_window": "2 weeks before Opening Day",        "item": "Opening Day announcement campaign launched",                                       "owner": "Marketing & Comms · President",                      "item_type": "action",  "group": "marketing"},
    {"date_window": "Weekly during season",              "item": "Weekly GameChanger recap posts published",                                         "owner": "Marketing & Comms Manager",                          "item_type": "action",  "group": "marketing"},
    {"date_window": "Late May / Early June",             "item": "Playoffs & Championship bracket graphics and hype posts",                          "owner": "Marketing & Comms Manager",                          "item_type": "action",  "group": "marketing"},
    {"date_window": "October–November 2026",             "item": "Sponsorship deck + fundraising materials finalized",                               "owner": "Sponsorship Coordinator · Fundraising Coordinator",  "item_type": "action",  "group": "marketing"},
    # Budget items
    {"date_window": "Early November 2026",               "item": "All VP budget submissions collected",                                              "owner": "Treasurer",                                          "item_type": "hard",    "group": "budget"},
    {"date_window": "Early November 2026",               "item": "Budget draft reviewed with President",                                             "owner": "Treasurer · President",                              "item_type": "action",  "group": "budget"},
    {"date_window": "Early November 2026",               "item": "Budget approved at board meeting",                                                 "owner": "Board",                                              "item_type": "hard",    "group": "budget"},
    {"date_window": "October 2026",                      "item": "Prior year actuals reconciled",                                                    "owner": "Treasurer",                                          "item_type": "action",  "group": "budget"},
    # Showcase items (initial seed)
    {"date_window": "TBD",                               "item": "Showcase date and venue confirmed",                                                "owner": "President · VP Baseball",                            "item_type": "hard",    "group": "showcase"},
    {"date_window": "TBD",                               "item": "Showcase participating teams invited and confirmed",                               "owner": "VP Baseball",                                        "item_type": "action",  "group": "showcase"},
    {"date_window": "TBD",                               "item": "Showcase schedule published to families",                                          "owner": "Marketing & Comms",                                  "item_type": "action",  "group": "showcase"},
    {"date_window": "TBD",                               "item": "Umpires assigned for all Showcase games",                                          "owner": "Umpire in Chief",                                    "item_type": "hard",    "group": "showcase"},
    {"date_window": "TBD",                               "item": "Grounds prepared; concessions staffed for Showcase",                               "owner": "Grounds Manager · Concessions Manager",              "item_type": "action",  "group": "showcase"},
    # Fundraising items
    {"date_window": "October 2026",                      "item": "Annual fundraising plan approved by board",                                        "owner": "Fundraising Coordinator · President",                "item_type": "hard",    "group": "fundraising"},
    {"date_window": "November 2026",                     "item": "Sponsorship packages distributed to prospective sponsors",                         "owner": "Sponsorship Coordinator",                            "item_type": "action",  "group": "fundraising"},
    {"date_window": "January 2027",                      "item": "Opening Day fundraiser logistics confirmed",                                       "owner": "Fundraising Coordinator",                            "item_type": "action",  "group": "fundraising"},
    {"date_window": "April 2027",                        "item": "Opening Day fundraiser executed",                                                  "owner": "Fundraising Coordinator · Concessions Manager",      "item_type": "hard",    "group": "fundraising"},
    {"date_window": "May 2027",                          "item": "End-of-season sponsor recap report prepared",                                      "owner": "Sponsorship Coordinator · Treasurer",                "item_type": "action",  "group": "fundraising"},
    # Tee Ball items
    {"date_window": "January 2027",                      "item": "Tee Ball registration opens with main spring registration",                        "owner": "Baseball Player Agent",                              "item_type": "hard",    "group": "tee_ball"},
    {"date_window": "Mid-March 2027",                    "item": "Tee Ball rosters formed (no evaluation required)",                                 "owner": "Baseball Player Agent",                              "item_type": "hard",    "group": "tee_ball"},
    {"date_window": "Late March 2027",                   "item": "Tee Ball coaches confirmed and notified",                                          "owner": "Baseball Player Agent",                              "item_type": "action",  "group": "tee_ball"},
    {"date_window": "2nd Saturday of April 2027",        "item": "Tee Ball participates in Opening Day",                                             "owner": "Baseball Player Agent · President",                  "item_type": "hard",    "group": "tee_ball"},
    {"date_window": "April–May 2027",                    "item": "Tee Ball weekly practice/game schedule in progress",                               "owner": "Baseball Player Agent",                              "item_type": "action",  "group": "tee_ball"},
    {"date_window": "End of season",                     "item": "Tee Ball end-of-season celebration / trophies",                                    "owner": "Baseball Player Agent · VP Baseball",                "item_type": "action",  "group": "tee_ball"},
]


class Command(BaseCommand):
    help = "Seeds BoardCalendarEvent and BoardChecklistItem with initial season-planning data."

    def add_arguments(self, parser):
        parser.add_argument("--force", action="store_true", help="Clear existing rows before seeding")

    def handle(self, *args, **options):
        if options["force"]:
            BoardCalendarEvent.objects.all().delete()
            BoardChecklistItem.objects.all().delete()
            self.stdout.write("Cleared existing board hub data.")

        # Calendar events
        if BoardCalendarEvent.objects.exists():
            self.stdout.write("BoardCalendarEvent already has data — skipping (use --force to overwrite).")
        else:
            count = 0
            for month in MONTHS:
                for i, ev in enumerate(month["events"]):
                    BoardCalendarEvent.objects.create(
                        month_year=month["month_year"],
                        phase=month["phase"],
                        year=month["year"],
                        text=ev["text"],
                        owner=ev["owner"],
                        color=ev["color"],
                        sort_order=i,
                    )
                    count += 1
            self.stdout.write(self.style.SUCCESS(f"Created {count} calendar events."))

        # Checklist items
        if BoardChecklistItem.objects.exists():
            self.stdout.write("BoardChecklistItem already has data — skipping (use --force to overwrite).")
        else:
            for i, row in enumerate(CHECKLIST_ITEMS):
                BoardChecklistItem.objects.create(
                    date_window=row["date_window"],
                    item=row["item"],
                    owner=row["owner"],
                    item_type=row["item_type"],
                    group=row["group"],
                    sort_order=i,
                )
            self.stdout.write(self.style.SUCCESS(f"Created {len(CHECKLIST_ITEMS)} checklist items."))
