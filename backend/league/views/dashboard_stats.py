"""
Dashboard stats — single endpoint returning key league metrics.
"""
import datetime
from decimal import Decimal
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum

from league.models import Player, Draft, Evaluation
from league.models.budget import BudgetLine
from league.models.program import Program
from league.utils.district import eligibility_reason


class DashboardStatsView(APIView):
    """GET /api/dashboard/stats/"""

    def get(self, request):
        today = datetime.date.today()
        year  = today.year

        # ── Players ────────────────────────────────────────────────────────────
        active_qs = Player.objects.filter(is_active=True, is_archived=False)
        total_active   = active_qs.count()
        total_baseball = active_qs.filter(sport__in=["baseball", "", None]).count()
        total_softball = active_qs.filter(sport="softball").count()

        # Eligibility breakdown (live, from current field values)
        reasons = {"address_in_district": 0, "school_enrollment": 0,
                   "ineligible": 0, "not_checked": 0}
        for p in active_qs.only(
            "in_district", "district_checked_at", "school_name"
        ):
            reasons[eligibility_reason(p)] += 1

        # ── Drafts ─────────────────────────────────────────────────────────────
        drafts_qs    = Draft.objects.filter(year=year)
        total_drafts = drafts_qs.count()
        open_drafts  = drafts_qs.filter(is_complete=False).count()
        done_drafts  = drafts_qs.filter(is_complete=True).count()

        # ── Evaluations ────────────────────────────────────────────────────────
        evals_this_year = Evaluation.objects.filter(season_year=year).count()

        # ── Programs ───────────────────────────────────────────────────────────
        programs = list(
            Program.objects
            .filter(season_year=year, is_active=True)
            .values("id", "name", "program_type", "season_closed")
            .order_by("program_type")
        )

        # ── Budget ─────────────────────────────────────────────────────────────
        budget_lines = BudgetLine.objects.filter(year=year)
        revenue_lines  = budget_lines.filter(is_revenue=True)
        expense_lines  = budget_lines.filter(is_revenue=False)

        def _sum_effective(lines):
            total = Decimal("0.00")
            for line in lines:
                est = line.effective_estimate
                if est is not None:
                    total += est
            return float(total)

        def _sum_actual(lines):
            result = lines.aggregate(total=Sum("actual"))["total"]
            return float(result) if result is not None else 0.0

        revenue_est  = _sum_effective(revenue_lines)
        expense_est  = _sum_effective(expense_lines)
        revenue_act  = _sum_actual(revenue_lines)
        expense_act  = _sum_actual(expense_lines)
        has_budget   = budget_lines.exists()

        return Response({
            "players": {
                "total":    total_active,
                "baseball": total_baseball,
                "softball": total_softball,
            },
            "eligibility": reasons,
            "drafts": {
                "total":    total_drafts,
                "open":     open_drafts,
                "complete": done_drafts,
            },
            "evaluations_this_year": evals_this_year,
            "programs": programs,
            "season_year": year,
            "budget": {
                "has_data":    has_budget,
                "revenue_est": revenue_est,
                "expense_est": expense_est,
                "net_est":     round(revenue_est - expense_est, 2),
                "revenue_act": revenue_act,
                "expense_act": expense_act,
                "net_act":     round(revenue_act - expense_act, 2),
            },
        })
