"""
Migration: Update budget categories, add sub_group field, and load FY26 data.
FY25 Execution = actual; FY26 Budget = estimate.
Tuple format: (category, item, sub_group, owner_role, is_revenue, actual_fy25, estimate_fy26, override)
"""
from django.db import migrations, models
from decimal import Decimal


FY26_LINES = [
    # ── BASEBALL INCOME ────────────────────────────────────────────────────────
    ("BASEBALL","Winter Workout Income",   "Winter Workout",    "VP Baseball",          True,  Decimal("0"),        Decimal("2000"),    True),
    ("BASEBALL","Regular Season Income",   "Regular Season",    "VP Baseball",          True,  Decimal("23199.33"), Decimal("19130"),   True),
    ("BASEBALL","All Stars Income",        "All Stars",         "VP Baseball",          True,  Decimal("0"),        Decimal("770"),     True),
    ("BASEBALL","Fall Ball Income",        "Fall Ball",         "VP Baseball",          True,  Decimal("5732.50"),  Decimal("6000"),    True),
    ("BASEBALL","Raffle Redemption",       "Adjustments",       "VP Baseball",          True,  Decimal("-1050"),    Decimal("-700"),    True),
    ("BASEBALL","Bad Debt",                "Adjustments",       "Treasurer",            True,  Decimal("-1091"),    Decimal("-500"),    True),
    ("BASEBALL","Player Grants",           "Adjustments",       "VP Baseball",          True,  Decimal("-2094.83"), Decimal("-2000"),   True),
    # ── BASEBALL EXPENSES ──────────────────────────────────────────────────────
    ("BASEBALL","Winter Workout - Coaching",  "Winter Workout", "VP Baseball",          False, Decimal("0"),        Decimal("525"),     True),
    ("BASEBALL","Winter Workout - Facilities","Winter Workout", "Grounds Manager",      False, Decimal("0"),        Decimal("200"),     True),
    ("BASEBALL","Regular Season - Facilities","Regular Season", "Grounds Manager",      False, Decimal("175"),      Decimal("500"),     True),
    ("BASEBALL","Regular Season - Photos",    "Regular Season", "Marketing Manager",    False, Decimal("1496.15"),  Decimal("2016"),    True),
    ("BASEBALL","Regular Season - Coaching",  "Regular Season", "VP Baseball",          False, Decimal("0"),        Decimal("200"),     True),
    ("BASEBALL","Regular Season - Trophies",  "Regular Season", "VP Baseball",          False, Decimal("373.13"),   Decimal("507.35"), True),
    ("BASEBALL","Regular Season - Umpires",   "Regular Season", "Umpire in Chief",      False, Decimal("2630"),     Decimal("2500"),    True),
    ("BASEBALL","Regular Season - Uniforms",  "Regular Season", "Equipment Manager",    False, Decimal("4983.50"),  Decimal("6121.86"),True),
    ("BASEBALL","All Stars - Tournament Fees","All Stars",      "VP Baseball",          False, Decimal("621.76"),   Decimal("1050"),    True),
    ("BASEBALL","All Stars - Uniforms",       "All Stars",      "Equipment Manager",    False, Decimal("612.61"),   Decimal("770"),     True),
    ("BASEBALL","Fall Ball - Umpires",        "Fall Ball",      "Umpire in Chief",      False, Decimal("60"),       Decimal("450"),     True),
    ("BASEBALL","Fall Ball - Uniforms",       "Fall Ball",      "Equipment Manager",    False, Decimal("3263.75"),  Decimal("1645.37"),True),
    # ── SOFTBALL INCOME ────────────────────────────────────────────────────────
    ("SOFTBALL","Regular Season Income",   "Regular Season",    "VP Softball",          True,  Decimal("14029.50"), Decimal("14265"),   True),
    ("SOFTBALL","All Stars Income",        "All Stars",         "VP Softball",          True,  Decimal("0"),        Decimal("1200"),    True),
    ("SOFTBALL","Fall Ball Income",        "Fall Ball",         "VP Softball",          True,  Decimal("2298"),     Decimal("3000"),    True),
    ("SOFTBALL","Bad Debt",                "Adjustments",       "Treasurer",            True,  Decimal("-368.50"),  Decimal("-200"),    True),
    ("SOFTBALL","Player Grants",           "Adjustments",       "VP Softball",          True,  Decimal("-2355.50"), Decimal("-2500"),   True),
    # ── SOFTBALL EXPENSES ──────────────────────────────────────────────────────
    ("SOFTBALL","Regular Season - Coaching",  "Regular Season", "VP Softball",          False, Decimal("0"),        Decimal("500"),     True),
    ("SOFTBALL","Regular Season - Facilities","Regular Season", "Grounds Manager",      False, Decimal("170"),      Decimal("200"),     True),
    ("SOFTBALL","Regular Season - Team Photos","Regular Season","Marketing Manager",    False, Decimal("279.85"),   Decimal("432"),     True),
    ("SOFTBALL","Regular Season - Trophies",  "Regular Season", "VP Softball",          False, Decimal("142.99"),   Decimal("387.17"), True),
    ("SOFTBALL","Regular Season - Umpires",   "Regular Season", "Umpire in Chief",      False, Decimal("2650"),     Decimal("2200"),    True),
    ("SOFTBALL","Regular Season - Uniforms",  "Regular Season", "Equipment Manager",    False, Decimal("3490.29"),  Decimal("3691.65"),True),
    ("SOFTBALL","All Stars - Tournament Fees","All Stars",      "VP Softball",          False, Decimal("0"),        Decimal("650"),     True),
    ("SOFTBALL","All Stars - Uniforms",       "All Stars",      "Equipment Manager",    False, Decimal("644.01"),   Decimal("1071.68"),True),
    ("SOFTBALL","Fall Ball - Trophies",       "Fall Ball",      "VP Softball",          False, Decimal("0"),        Decimal("145.19"), True),
    ("SOFTBALL","Fall Ball - Umpires",        "Fall Ball",      "Umpire in Chief",      False, Decimal("75"),       Decimal("360"),     True),
    ("SOFTBALL","Fall Ball - Uniforms",       "Fall Ball",      "Equipment Manager",    False, Decimal("800.75"),   Decimal("960.90"), True),
    # ── LITTLE LEAGUE FEES ─────────────────────────────────────────────────────
    ("LL_FEES","Little League Fees (Excl. All Stars)","",       "President",            False, Decimal("2305.42"),  Decimal("2500"),    True),
    # ── CONCESSIONS INCOME ─────────────────────────────────────────────────────
    ("CONCESSIONS","Spring Sales",         "Sales",             "Concessions Manager",  True,  Decimal("5913"),     Decimal("6000"),    True),
    ("CONCESSIONS","Fall Sales",           "Sales",             "Concessions Manager",  True,  Decimal("1633.33"),  Decimal("1700"),    True),
    # ── CONCESSIONS EXPENSES ───────────────────────────────────────────────────
    ("CONCESSIONS","Equipment",            "Operations",        "Concessions Manager",  False, Decimal("0"),        Decimal("500"),     True),
    ("CONCESSIONS","Supplies",             "Operations",        "Concessions Manager",  False, Decimal("32"),       Decimal("100"),     True),
    ("CONCESSIONS","Inventory - Regular Season","Inventory",    "Concessions Manager",  False, Decimal("2945.48"),  Decimal("3000"),    True),
    ("CONCESSIONS","Inventory - Fall Ball","Inventory",         "Concessions Manager",  False, Decimal("427.89"),   Decimal("500"),     True),
    ("CONCESSIONS","Signage",              "Operations",        "Concessions Manager",  False, Decimal("0"),        Decimal("250"),     True),
    # ── SPONSORSHIP ────────────────────────────────────────────────────────────
    ("SPONSORSHIP","Sponsorship Income",   "Income",            "Sponsorship Coordinator",True,Decimal("2250"),     Decimal("9000"),    True),
    ("SPONSORSHIP","Fundraiser Income",    "Income",            "Fundraising Coordinator",True,Decimal("0"),        Decimal("990"),     True),
    ("SPONSORSHIP","Sponsorship Expenses", "Expenses",          "Sponsorship Coordinator",False,Decimal("75.21"),   Decimal("1050"),    True),
    # ── EQUIPMENT ─────────────────────────────────────────────────────────────
    ("EQUIPMENT","Equipment - Baseball",   "Baseball",          "Equipment Manager",    False, Decimal("1752.23"),  Decimal("2100"),    True),
    ("EQUIPMENT","Equipment - Softball",   "Softball",          "Equipment Manager",    False, Decimal("885.47"),   Decimal("750"),     True),
    ("EQUIPMENT","Equipment - Shared",     "Shared",            "Equipment Manager",    False, Decimal("2780.90"),  Decimal("550"),     True),
    # ── MARKETING ─────────────────────────────────────────────────────────────
    ("MARKETING","Facebook Advertising",   "Digital",           "Marketing Manager",    False, Decimal("161.71"),   Decimal("400"),     True),
    ("MARKETING","Google Advertising",     "Digital",           "Marketing Manager",    False, Decimal("0"),        Decimal("0"),       True),
    ("MARKETING","Flyers",                 "Print",             "Marketing Manager",    False, Decimal("0"),        Decimal("500"),     True),
    ("MARKETING","Postcards",              "Print",             "Marketing Manager",    False, Decimal("0"),        Decimal("50"),      True),
    ("MARKETING","Banners / Signs",        "Print",             "Marketing Manager",    False, Decimal("0"),        Decimal("100"),     True),
    ("MARKETING","Other Marketing",        "Other",             "Marketing Manager",    False, Decimal("0"),        Decimal("150"),     True),
    # ── GROUNDS ───────────────────────────────────────────────────────────────
    ("GROUNDS","Grounds Equipment",        "Equipment",         "Grounds Manager",      False, Decimal("156.16"),   Decimal("0"),       True),
    ("GROUNDS","Outdoor Power Equipment Maintenance","Equipment","Grounds Manager",     False, Decimal("5.94"),     Decimal("800"),     True),
    ("GROUNDS","Grounds Maintenance",      "Maintenance",       "Grounds Manager",      False, Decimal("3010.10"),  Decimal("3200"),    True),
    ("GROUNDS","Structural Maintenance",   "Maintenance",       "Grounds Manager",      False, Decimal("100.54"),   Decimal("250"),     True),
    ("GROUNDS","Misc / Supplies",          "Supplies",          "Grounds Manager",      False, Decimal("410.55"),   Decimal("500"),     True),
    # ── RENT & UTILITIES ──────────────────────────────────────────────────────
    ("RENT_UTIL","Rent",                   "Rent",              "President",            False, Decimal("2700"),     Decimal("2700"),    True),
    ("RENT_UTIL","Utilities",              "Utilities",         "Grounds Manager",      False, Decimal("9922.34"),  Decimal("9050"),    True),
    # ── SAFETY ────────────────────────────────────────────────────────────────
    ("SAFETY","Safety Supplies",           "",                  "Safety Officer",       False, Decimal("212.82"),   Decimal("400"),     True),
    # ── ADMIN ─────────────────────────────────────────────────────────────────
    ("ADMIN","Bank / PayPal Fees",         "Banking Fees",      "Treasurer",            False, Decimal("41.79"),    Decimal("40"),      True),
    ("ADMIN","Square Fees",                "Banking Fees",      "Treasurer",            False, Decimal("241.74"),   Decimal("240"),     True),
    ("ADMIN","Blue Sombrero Registration Fees","Software & Platforms","Secretary",      False, Decimal("1739.89"),  Decimal("1788.14"),True),
    ("ADMIN","QuickBooks Fees",            "Software & Platforms","Treasurer",          False, Decimal("80"),       Decimal("80"),      True),
    ("ADMIN","Google Meet Fees",           "Software & Platforms","Secretary",          False, Decimal("119.88"),   Decimal("120"),     True),
    ("ADMIN","Supplies and Software",      "Software & Platforms","Secretary",          False, Decimal("30.32"),    Decimal("50"),      True),
    ("ADMIN","DBAT Membership Fees",       "Memberships",       "President",            False, Decimal("816"),      Decimal("204"),     True),
    ("ADMIN","PO Box and Postage",         "Operations",        "Secretary",            False, Decimal("192"),      Decimal("180"),     True),
    ("ADMIN","Other Administrative",       "Operations",        "Secretary",            False, Decimal("22"),       Decimal("200"),     True),
    # ── APPAREL ───────────────────────────────────────────────────────────────
    ("APPAREL","WTLL Apparel Income",      "",                  "Marketing Manager",    True,  Decimal("465"),      Decimal("400"),     True),
    ("APPAREL","WTLL Apparel & Coach Shirts","",               "Marketing Manager",    False, Decimal("0"),        Decimal("1480.12"),True),
    # ── SCHOLARSHIPS ──────────────────────────────────────────────────────────
    ("SCHOLARSHIPS","Scholarship Expenses","",                  "President",            False, Decimal("2000"),     Decimal("2000"),    True),
    # ── DONATIONS ─────────────────────────────────────────────────────────────
    ("DONATIONS","Corporate Donations",    "",                  "Sponsorship Coordinator",True,Decimal("847.92"),   Decimal("900"),     True),
    ("DONATIONS","Individual Donations",   "",                  "Fundraising Coordinator",True,Decimal("2845.50"),  Decimal("2900"),    True),
    ("DONATIONS","Player Grants Received", "",                  "VP Baseball",          True,  Decimal("1258"),     Decimal("1300"),    True),
    # ── OTHER ─────────────────────────────────────────────────────────────────
    ("OTHER","Field Rental Income",        "",                  "Grounds Manager",      True,  Decimal("750"),      Decimal("1000"),    True),
    ("OTHER","Program Credits",            "",                  "Treasurer",            True,  Decimal("0"),        Decimal("-100"),    True),
    ("OTHER","Investment Income",          "",                  "Treasurer",            True,  Decimal("0.39"),     Decimal("1"),       True),
    ("OTHER","Other Income",               "",                  "Treasurer",            True,  Decimal("70.35"),    Decimal("70"),      True),
    ("OTHER","Opening Day Expenses",       "",                  "President",            False, Decimal("0"),        Decimal("500"),     True),
]


def load_fy26_data(apps, schema_editor):
    BudgetLine = apps.get_model("league", "BudgetLine")
    BudgetLine.objects.filter(year=2026).delete()
    for i, row in enumerate(FY26_LINES):
        cat, item, sub_group, owner, is_rev, actual, estimate, override = row
        BudgetLine.objects.create(
            year=2026, category=cat, item=item, sub_group=sub_group,
            owner_role=owner, is_revenue=is_rev,
            actual=actual, estimate=estimate,
            estimate_override=override, sort_order=i,
        )


def remove_fy26_data(apps, schema_editor):
    apps.get_model("league", "BudgetLine").objects.filter(year=2026).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0016_public_signup_config"),
    ]

    operations = [
        # Add sub_group field
        migrations.AddField(
            model_name="budgetline",
            name="sub_group",
            field=models.CharField(
                blank=True, max_length=100,
                help_text="Optional grouping within a category (e.g. 'Regular Season', 'Winter Workout')",
                default="",
            ),
            preserve_default=False,
        ),
        # Update category choices
        migrations.AlterField(
            model_name="budgetline",
            name="category",
            field=models.CharField(
                max_length=20,
                choices=[
                    ("BASEBALL","Baseball"),("SOFTBALL","Softball"),("CONCESSIONS","Concessions"),
                    ("MARKETING","Marketing"),("GROUNDS","Grounds & Facilities"),("RENT_UTIL","Rent & Utilities"),
                    ("EQUIPMENT","Equipment"),("ADMIN","Admin & Operations"),("SPONSORSHIP","Sponsorship & Fundraising"),
                    ("LL_FEES","Little League Fees"),("SAFETY","Safety & Supplies"),("APPAREL","Apparel"),
                    ("SCHOLARSHIPS","Scholarships"),("DONATIONS","Donations"),("OTHER","Other"),
                ],
            ),
        ),
        # Load FY26 data
        migrations.RunPython(load_fy26_data, remove_fy26_data),
    ]
