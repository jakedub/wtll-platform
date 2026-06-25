"""
Fundraising API views — multi-plan edition.

Plans       — CRUD for FundraisingPlan
Line items  — CRUD + bulk reorder/move for FundraisingLineItem
Campaigns   — CRUD for FundraisingCampaign
Deposits    — CRUD for FundraisingDeposit
Summary     — aggregated progress by plan + phase + item
"""
from decimal import Decimal
from typing import Optional
from django.db.models import Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated


def _require_board(request) -> Optional[Response]:
    if not request.user or not (
        request.user.is_staff or getattr(request.user, "is_board_member", False)
    ):
        return Response({"error": "Board access required."}, status=status.HTTP_403_FORBIDDEN)
    return None


def _require_admin(request) -> Optional[Response]:
    if not request.user or not request.user.is_staff:
        return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
    return None


# ── Serializers ───────────────────────────────────────────────────────────────

def _serialize_plan(plan) -> dict:
    return {
        "id":          plan.id,
        "name":        plan.name,
        "description": plan.description,
        "uses_phases": plan.uses_phases,
        "color":       plan.color,
        "is_active":   plan.is_active,
        "sort_order":  plan.sort_order,
        "created_at":  plan.created_at.isoformat(),
    }


def _serialize_item(item, raised: Decimal = Decimal("0")) -> dict:
    return {
        "id":            item.id,
        "plan_id":       item.plan_id,
        "phase":         item.phase,
        "location":      item.location,
        "description":   item.description,
        "category":      item.category,
        "estimate_low":  float(item.estimate_low),
        "estimate_high": float(item.estimate_high),
        "quoted_price":  float(item.quoted_price) if item.quoted_price is not None else None,
        "notes":         item.notes,
        "sort_order":    item.sort_order,
        "is_complete":   item.is_complete,
        "raised":        float(raised),
    }


def _serialize_campaign(campaign) -> dict:
    deps = list(campaign.deposits.all())
    cash_total   = sum(float(d.amount) for d in deps if not d.is_in_kind)
    in_kind_count = sum(1 for d in deps if d.is_in_kind)
    return {
        "id":            campaign.id,
        "name":          campaign.name,
        "description":   campaign.description,
        "campaign_type": campaign.campaign_type,
        "goal":          float(campaign.goal) if campaign.goal is not None else None,
        "is_active":     campaign.is_active,
        "created_at":    campaign.created_at.isoformat(),
        "total_raised":  cash_total,
        "in_kind_count": in_kind_count,
    }


def _serialize_deposit(dep) -> dict:
    return {
        "id":               dep.id,
        "campaign_id":      dep.campaign_id,
        "line_item_id":     dep.line_item_id,
        "line_item_label":  (
            f"[{dep.line_item.plan.name}] {dep.line_item.location} — {dep.line_item.description}"
            if dep.line_item else None
        ),
        "amount":              float(dep.amount),
        "date":                dep.date.isoformat(),
        "notes":               dep.notes,
        "is_in_kind":          dep.is_in_kind,
        "in_kind_description": dep.in_kind_description,
    }


# ── Plans ─────────────────────────────────────────────────────────────────────

class PlanListCreateView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        err = _require_board(request)
        if err:
            return err
        from league.models.fundraising import FundraisingPlan
        plans = FundraisingPlan.objects.all()
        return Response([_serialize_plan(p) for p in plans])

    def post(self, request):
        err = _require_board(request)
        if err:
            return err
        from league.models.fundraising import FundraisingPlan
        d = request.data
        plan = FundraisingPlan(
            name=d.get("name", ""),
            description=d.get("description", ""),
            uses_phases=d.get("uses_phases", False),
            color=d.get("color", ""),
            is_active=d.get("is_active", True),
            sort_order=d.get("sort_order", FundraisingPlan.objects.count()),
        )
        plan.save()  # triggers auto-color assignment if color blank
        return Response(_serialize_plan(plan), status=status.HTTP_201_CREATED)


class PlanDetailView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        from league.models.fundraising import FundraisingPlan
        try:
            return FundraisingPlan.objects.get(pk=pk), None
        except FundraisingPlan.DoesNotExist:
            return None, Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, pk):
        err = _require_board(request)
        if err:
            return err
        plan, err = self._get(pk)
        if err:
            return err
        for field in ("name", "description", "uses_phases", "color", "is_active", "sort_order"):
            if field in request.data:
                setattr(plan, field, request.data[field])
        plan.save()
        return Response(_serialize_plan(plan))

    def delete(self, request, pk):
        err = _require_admin(request)
        if err:
            return err
        plan, err = self._get(pk)
        if err:
            return err
        plan.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Line Items ────────────────────────────────────────────────────────────────

class LineItemListCreateView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        err = _require_board(request)
        if err:
            return err
        from league.models.fundraising import FundraisingLineItem
        items = FundraisingLineItem.objects.select_related("plan").all()
        return Response([_serialize_item(i) for i in items])

    def post(self, request):
        err = _require_board(request)
        if err:
            return err
        from league.models.fundraising import FundraisingLineItem
        d = request.data
        item = FundraisingLineItem.objects.create(
            plan_id=d.get("plan_id"),
            phase=d.get("phase") or None,
            location=d.get("location", ""),
            description=d.get("description", ""),
            category=d.get("category", "INFRA"),
            estimate_low=d.get("estimate_low", 0),
            estimate_high=d.get("estimate_high", 0),
            quoted_price=d.get("quoted_price") or None,
            notes=d.get("notes", ""),
            sort_order=d.get("sort_order", 0),
        )
        return Response(_serialize_item(item), status=status.HTTP_201_CREATED)


class LineItemDetailView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        from league.models.fundraising import FundraisingLineItem
        try:
            return FundraisingLineItem.objects.select_related("plan").get(pk=pk), None
        except FundraisingLineItem.DoesNotExist:
            return None, Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, pk):
        err = _require_board(request)
        if err:
            return err
        item, err = self._get(pk)
        if err:
            return err
        allowed = {
            "plan_id", "phase", "location", "description", "category",
            "estimate_low", "estimate_high", "quoted_price",
            "notes", "sort_order", "is_complete",
        }
        for field, value in request.data.items():
            if field in allowed:
                if field == "quoted_price":
                    setattr(item, field, value if value not in (None, "", 0) else None)
                elif field == "phase":
                    setattr(item, field, value or None)
                else:
                    setattr(item, field, value)
        item.save()
        return Response(_serialize_item(item))

    def delete(self, request, pk):
        err = _require_admin(request)
        if err:
            return err
        item, err = self._get(pk)
        if err:
            return err
        item.deposits.update(line_item=None)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LineItemReorderView(APIView):
    """
    PATCH /api/fundraising/line-items/reorder/
    Body: [{ id, sort_order, plan_id }]
    Used for drag-and-drop reordering and cross-plan moves.
    """
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        err = _require_board(request)
        if err:
            return err
        from league.models.fundraising import FundraisingLineItem
        updates = request.data
        if not isinstance(updates, list):
            return Response({"error": "Expected a list."}, status=400)
        ids = [u["id"] for u in updates]
        items = {i.id: i for i in FundraisingLineItem.objects.filter(id__in=ids)}
        for u in updates:
            item = items.get(u["id"])
            if not item:
                continue
            item.sort_order = u.get("sort_order", item.sort_order)
            if "plan_id" in u:
                item.plan_id = u["plan_id"]
            if "phase" in u:
                item.phase = u["phase"] or None
        FundraisingLineItem.objects.bulk_update(
            list(items.values()), ["sort_order", "plan_id", "phase"]
        )
        return Response({"updated": len(items)})


# ── Campaigns ────────────────────────────────────────────────────────────────

class CampaignListCreateView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        err = _require_board(request)
        if err:
            return err
        from league.models.fundraising import FundraisingCampaign
        campaigns = FundraisingCampaign.objects.prefetch_related("deposits")
        return Response([_serialize_campaign(c) for c in campaigns])

    def post(self, request):
        err = _require_board(request)
        if err:
            return err
        from league.models.fundraising import FundraisingCampaign
        d = request.data
        campaign = FundraisingCampaign.objects.create(
            name=d.get("name", ""),
            description=d.get("description", ""),
            campaign_type=d.get("campaign_type", "DONATION"),
            goal=d.get("goal") or None,
            is_active=d.get("is_active", True),
        )
        return Response(_serialize_campaign(campaign), status=status.HTTP_201_CREATED)


class CampaignDetailView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        from league.models.fundraising import FundraisingCampaign
        try:
            return FundraisingCampaign.objects.prefetch_related("deposits").get(pk=pk), None
        except FundraisingCampaign.DoesNotExist:
            return None, Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, pk):
        err = _require_board(request)
        if err:
            return err
        campaign, err = self._get(pk)
        if err:
            return err
        for field in ("name", "description", "campaign_type", "goal", "is_active"):
            if field in request.data:
                val = request.data[field]
                setattr(campaign, field, val if field != "goal" else (val or None))
        campaign.save()
        return Response(_serialize_campaign(campaign))

    def delete(self, request, pk):
        err = _require_admin(request)
        if err:
            return err
        campaign, err = self._get(pk)
        if err:
            return err
        campaign.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Deposits ─────────────────────────────────────────────────────────────────

class DepositListCreateView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, campaign_pk):
        err = _require_board(request)
        if err:
            return err
        from league.models.fundraising import FundraisingCampaign
        try:
            campaign = FundraisingCampaign.objects.get(pk=campaign_pk)
        except FundraisingCampaign.DoesNotExist:
            return Response({"error": "Campaign not found."}, status=404)
        deps = campaign.deposits.select_related("line_item__plan").all()
        return Response([_serialize_deposit(d) for d in deps])

    def post(self, request, campaign_pk):
        err = _require_board(request)
        if err:
            return err
        from league.models.fundraising import FundraisingCampaign, FundraisingDeposit
        try:
            campaign = FundraisingCampaign.objects.get(pk=campaign_pk)
        except FundraisingCampaign.DoesNotExist:
            return Response({"error": "Campaign not found."}, status=404)
        d = request.data
        dep = FundraisingDeposit.objects.create(
            campaign=campaign,
            amount=d.get("amount", 0),
            date=d.get("date"),
            notes=d.get("notes", ""),
            line_item_id=d.get("line_item_id") or None,
            is_in_kind=d.get("is_in_kind", False),
            in_kind_description=d.get("in_kind_description", ""),
        )
        dep.refresh_from_db()
        return Response(_serialize_deposit(dep), status=status.HTTP_201_CREATED)


class DepositDetailView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        from league.models.fundraising import FundraisingDeposit
        try:
            return FundraisingDeposit.objects.select_related("line_item__plan").get(pk=pk), None
        except FundraisingDeposit.DoesNotExist:
            return None, Response({"error": "Not found."}, status=404)

    def patch(self, request, pk):
        err = _require_board(request)
        if err:
            return err
        dep, err = self._get(pk)
        if err:
            return err
        for field in ("amount", "date", "notes", "is_in_kind", "in_kind_description"):
            if field in request.data:
                setattr(dep, field, request.data[field])
        if "line_item_id" in request.data:
            dep.line_item_id = request.data["line_item_id"] or None
        dep.save()
        dep.refresh_from_db()
        return Response(_serialize_deposit(dep))

    def delete(self, request, pk):
        err = _require_board(request)
        if err:
            return err
        dep, err = self._get(pk)
        if err:
            return err
        dep.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Summary ───────────────────────────────────────────────────────────────────

class FundraisingSummaryView(APIView):
    """
    GET /api/fundraising/summary/
    Returns per-plan aggregation with estimate range, quoted range, and raised amounts.
    """
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        err = _require_board(request)
        if err:
            return err
        from league.models.fundraising import (
            FundraisingPlan, FundraisingLineItem, FundraisingDeposit
        )

        # Cash raised per line item (excludes in-kind)
        earmarked = dict(
            FundraisingDeposit.objects
            .filter(line_item__isnull=False, is_in_kind=False)
            .values_list("line_item_id")
            .annotate(t=Sum("amount"))
            .values_list("line_item_id", "t")
        )

        general_cash = float(
            FundraisingDeposit.objects
            .filter(line_item__isnull=True, is_in_kind=False)
            .aggregate(t=Sum("amount"))["t"] or 0
        )
        grand_cash = float(
            FundraisingDeposit.objects
            .filter(is_in_kind=False)
            .aggregate(t=Sum("amount"))["t"] or 0
        )
        grand_in_kind = int(
            FundraisingDeposit.objects.filter(is_in_kind=True).count()
        )

        plans = list(FundraisingPlan.objects.filter(is_active=True))
        items_qs = FundraisingLineItem.objects.filter(
            plan__is_active=True
        ).select_related("plan")

        # Group items by plan
        by_plan: dict = {p.id: [] for p in plans}
        for item in items_qs:
            if item.plan_id in by_plan:
                by_plan[item.plan_id].append(item)

        def quoted_range(items):
            lo = sum(
                float(i.quoted_price if i.quoted_price is not None else i.estimate_low)
                for i in items
            )
            hi = sum(
                float(i.quoted_price if i.quoted_price is not None else i.estimate_high)
                for i in items
            )
            return lo, hi

        plans_data = []
        for plan in plans:
            plan_items = by_plan.get(plan.id, [])

            est_low  = sum(float(i.estimate_low)  for i in plan_items)
            est_high = sum(float(i.estimate_high) for i in plan_items)
            q_low, q_high = quoted_range(plan_items)
            plan_raised = sum(float(earmarked.get(i.id, 0)) for i in plan_items)
            has_quotes = any(i.quoted_price is not None for i in plan_items)

            if plan.uses_phases:
                phases_dict: dict = {}
                for item in plan_items:
                    p = item.phase or 0
                    if p not in phases_dict:
                        phases_dict[p] = []
                    phases_dict[p].append(item)

                phases_out = []
                for phase_num in sorted(phases_dict):
                    p_items = phases_dict[phase_num]
                    p_est_lo  = sum(float(i.estimate_low)  for i in p_items)
                    p_est_hi  = sum(float(i.estimate_high) for i in p_items)
                    p_q_lo, p_q_hi = quoted_range(p_items)
                    p_raised = sum(float(earmarked.get(i.id, 0)) for i in p_items)
                    p_has_quotes = any(i.quoted_price is not None for i in p_items)
                    phases_out.append({
                        "phase":         phase_num,
                        "estimate_low":  p_est_lo,
                        "estimate_high": p_est_hi,
                        "quoted_low":    p_q_lo,
                        "quoted_high":   p_q_hi,
                        "has_quotes":    p_has_quotes,
                        "raised":        p_raised,
                        "items": [
                            _serialize_item(i, earmarked.get(i.id, Decimal("0")))
                            for i in p_items
                        ],
                    })
                plan_structure = phases_out
            else:
                plan_structure = [
                    _serialize_item(i, earmarked.get(i.id, Decimal("0")))
                    for i in plan_items
                ]

            plans_data.append({
                "id":           plan.id,
                "name":         plan.name,
                "color":        plan.color,
                "uses_phases":  plan.uses_phases,
                "sort_order":   plan.sort_order,
                "estimate_low":  est_low,
                "estimate_high": est_high,
                "quoted_low":    q_low,
                "quoted_high":   q_high,
                "has_quotes":    has_quotes,
                "raised":        plan_raised,
                "structure":     plan_structure,
            })

        return Response({
            "grand_cash_raised":    grand_cash,
            "grand_in_kind_count":  grand_in_kind,
            "general_unallocated":  general_cash,
            "plans":                plans_data,
        })
