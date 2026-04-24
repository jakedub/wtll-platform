"""
Usage: python manage.py seed_dev_data

Seeds the database with sample WTLL divisions, teams, players, and pitch counts
for local development. Safe to run multiple times (uses get_or_create).
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
import random

from league.models.divisions import Division
from league.models.teams import Team
from league.models.players import Player
from league.models.pitch_count import PitchCount
from league.services.pitching_engine import compute_rest_required


DIVISIONS = [
    ("AA", "7-8"),
    ("AAA", "9-10"),
    ("Majors", "11-12"),
    ("Softball", "9-12"),
    ("PeeWee", "5-6"),
]

TEAMS = {
    "AA": [("Cardinals", "Red", "CARD"), ("Cubs", "Blue", "CUBS")],
    "AAA": [("Tigers", "Orange", "TIGR"), ("Marlins", "Teal", "MARL")],
    "Majors": [("Yankees", "Navy", "YANK"), ("Red Sox", "Red", "RSOX")],
}

PLAYER_NAMES = [
    ("Liam", "Anderson"), ("Noah", "Martinez"), ("Oliver", "Thompson"),
    ("Elijah", "Garcia"), ("James", "Wilson"), ("Aiden", "Davis"),
    ("Lucas", "Rodriguez"), ("Mason", "Lee"), ("Ethan", "Walker"),
    ("Logan", "Hall"), ("Jackson", "Allen"), ("Sebastian", "Young"),
    ("Carter", "Hernandez"), ("Owen", "King"), ("Wyatt", "Wright"),
    ("Henry", "Lopez"), ("Levi", "Hill"), ("Grayson", "Scott"),
    ("Julian", "Green"), ("Mateo", "Adams"),
]


class Command(BaseCommand):
    help = "Seed the database with sample WTLL data for development"

    def handle(self, *args, **options):
        self.stdout.write("Seeding divisions...")
        division_objs = {}
        for name, age_group in DIVISIONS:
            div, _ = Division.objects.get_or_create(name=name, defaults={"age_group": age_group})
            division_objs[name] = div

        self.stdout.write("Seeding teams...")
        team_objs = []
        for div_name, teams in TEAMS.items():
            div = division_objs[div_name]
            for team_name, color, code in teams:
                team, _ = Team.objects.get_or_create(
                    name=team_name,
                    year=2025,
                    defaults={
                        "division": div,
                        "jersey_color": color,
                        "jersey_code": code,
                        "coach": f"Coach {team_name}",
                        "is_active": True,
                    },
                )
                team_objs.append(team)

        self.stdout.write("Seeding players...")
        player_objs = []
        majors_teams = [t for t in team_objs if t.division.name == "Majors"]
        for i, (first, last) in enumerate(PLAYER_NAMES):
            team = majors_teams[i % len(majors_teams)]
            player, _ = Player.objects.get_or_create(
                first_name=first,
                last_name=last,
                defaults={
                    "team": team,
                    "division": team.division,
                    "batting_hand": random.choice(["R", "L"]),
                    "throwing_hand": "R",
                    "is_eligible": True,
                    "date_of_birth": date(2013, random.randint(1, 12), random.randint(1, 28)),
                },
            )
            player_objs.append(player)

        self.stdout.write("Seeding pitch counts...")
        today = date.today()
        for player in player_objs[:8]:
            # Give some players recent pitch history
            for days_ago in [random.randint(1, 10), random.randint(11, 20)]:
                pitches = random.choice([15, 22, 38, 45, 55, 67, 72])
                game_date = today - timedelta(days=days_ago)
                PitchCount.objects.get_or_create(
                    player=player,
                    game_date=game_date,
                    defaults={
                        "pitches_thrown": pitches,
                        "days_rest_required": compute_rest_required(pitches),
                        "team": player.team,
                    },
                )

        self.stdout.write(self.style.SUCCESS(
            f"Done. Created {Division.objects.count()} divisions, "
            f"{Team.objects.count()} teams, "
            f"{Player.objects.count()} players, "
            f"{PitchCount.objects.count()} pitch count entries."
        ))
