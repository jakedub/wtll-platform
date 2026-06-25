"""
Fundraising API views.

Line items  — CRUD for the editable facilities plan
Campaigns   — CRUD for named fundraising efforts
Deposits    — CRUD for logged amounts within a campaign
Summary     — aggregated progress by phase + item for the Progress tab
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
    """Allow is_staff or is_board_member."""
    if not request.user or not (request.user.is_staff or getattr(request.user, "is_board_member", False)):
        return Response({"error": "Board access required."}, status=status.HTTP_403_FORBIDDEN)
    return None


def _require_admin(request) -> Optional[Response]:
    if not request.user or not request.user.is_staff:
        return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
    return None


def _serialize_item(item, raised: Decimal = Decimal("0")) -> dict:
    return {
        "id":            item.id,
        "phase":         item.phase,
        "location":      item.location,
        "description":   item.description,
        "category":      item.category,
        "estimate_low":  float(item.estimate_low),
        "estimate_high": float(item.estimate_high),
        "notes":         item.notes,
        "sort_order":    item.sort_order,
        "is_complete":   item.is_complete,
        "raised":        float(raised),
    }


def _serialize_campaign(campaign) -> dict:
    total = campaign.deposits.aggregate(t=Sum("amount"))["t"] or Decimal("0")
    return {
        "id":          campaign.id,
        "name":        campaign.name,
        "description": campaign.description,
        "goal":        float(campaign.goal) if campaign.goal is not None else None,
        "is_active":   campaign.is_active,
        "created_at":  campaign.created_at.isoformat(),
        "total_raised": float(total),
    }


def _serialize_deposit(dep) -> dict:
    return {
        "id":           dep.id,
        "campaign_id":  dep.campaign_id,
        "line_item_id": dep.line_item_id,
        "line_item_label": (
            f"{dep.line_item.location} — {dep.line_item.description}"
            if dep.line_item else None
        ),
        "amount":  float(dep.amount),
        "date":    dep.date.isoformat(),
        "notes":   dep.notes,
    }


# ── Line Items ────────────────────────────────────────────────────────────────

class LineItemListCreateView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        err = _require_board(request)
        if err:
            return err
        from league.models.fundraising import FacilitiesLineItem
        items = FacilitiesLineItem.objects.all()
        return Response([_serialize_item(i) for i in items])

    def post(self, request):
        err = _require_admin(request)
        if err:
            return err
        from league.models.fundraising import FacilitiesLineItem
        d = request.data
        item = FacilitiesLineItem.objects.create(
            phase=d.get("phase", 1),
            location=d.get("location", ""),
            description=d.get("description", ""),
            category=d.get("category", "INFRA"),
            estimate_low=d.get("estimate_low", 0),
            estimate_high=d.get("estimate_high", 0),
            notes=d.get("notes", ""),
            sort_order=d.get("sort_order", 0),
        )
        return Response(_serialize_item(item), status=status.HTTP_201_CREATED)


class LineItemDetailView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        from league.models.fundraising import FacilitiesLineItem
        try:
            return FacilitiesLineItem.objects.get(pk=pk), None
        except FacilitiesLineItem.DoesNotExist:
            return None, Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, pk):
        err = _require_board(request)
        if err:
            return err
        item, err = self._get(pk)
        if err:
            return err
        allowed = {"phase", "location", "description", "category",
                   "estimate_low", "estimate_high", "notes", "sort_order", "is_complete"}
        for field, value in request.data.items():
            if field in allowed:
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
        # Warn if deposits are earmarked; nullify them before deleting
        item.deposits.update(line_item=None)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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
        for field in ("name", "description", "goal", "is_active"):
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
            return Response({"error": "Campaign not found."}, status=status.HTTP_404_NOT_FOUND)
        deps = campaign.deposits.select_related("line_item").all()
        return Response([_serialize_deposit(d) for d in deps])

    def post(self, request, campaign_pk):
        err = _require_board(request)
        if err:
            return err
        from league.models.fundraising import FundraisingCampaign, FundraisingDeposit
        try:
            campaign = FundraisingCampaign.objects.get(pk=campaign_pk)
        except FundraisingCampaign.DoesNotExist:
            return Response({"error": "Campaign not found."}, status=status.HTTP_404_NOT_FOUND)
        d = request.data
        dep = FundraisingDeposit.objects.create(
            campaign=campaign,
            amount=d.get("amount", 0),
            date=d.get("date"),
            notes=d.get("notes", ""),
            line_item_id=d.get("line_item_id") or None,
        )
        dep.refresh_from_db()
        return Response(_serialize_deposit(dep), status=status.HTTP_201_CREATED)


class DepositDetailView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        from league.models.fundraising import FundraisingDeposit
        try:
            return FundraisingDeposit.objects.select_related("line_item").get(pk=pk), None
        except FundraisingDeposit.DoesNotExist:
            return None, Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, pk):
        err = _require_board(request)
        if err:
            return err
        dep, err = self._get(pk)
        if err:
            return err
        for field in ("amount", "date", "notes"):
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
    Aggregated totals by phase and line item for the Progress tab.
    """
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        err = _require_board(request)
        if err:
            return err
        from league.models.fundraising import FacilitiesLineItem, FundraisingDeposit

        # Build a map of line_item_id → raised amount
        earmarked = dict(
            FundraisingDeposit.objects
            .filter(line_item__isnull=False)
            .values_list("line_item_id")
            .annotate(t=Sum("amount"))
            .values_list("line_item_id", "t")
        )

        # General (unearmarked) total
        general = FundraisingDeposit.objects.filter(line_item__isnull=True).aggregate(
            t=Sum("amount")
        )["t"] or Decimal("0")

        grand_total = (
            FundraisingDeposit.objects.aggregate(t=Sum("amount"))["t"] or Decimal("0")
        )

        items = FacilitiesLineItem.objects.all()

        # Group by phase
        phases_dict: dict = {}
        for item in items:
            p = item.phase
            if p not in phases_dict:
                phases_dict[p] = {
                    "phase": p,
                    "estimate_low": Decimal("0"),
                    "estimate_high": Decimal("0"),
                    "raised": Decimal("0"),
                    "items": [],
                }
            raised = earmarked.get(item.id, Decimal("0"))
            phases_dict[p]["estimate_low"]  += item.estimate_low
            phases_dict[p]["estimate_high"] += item.estimate_high
            phases_dict[p]["raised"]        += raised
            phases_dict[p]["items"].append(_serialize_item(item, raised))

        phases = [
            {
                **v,
                "estimate_low":  float(v["estimate_low"]),
                "estimate_high": float(v["estimate_high"]),
                "raised":        float(v["raised"]),
            }
            for v in sorted(phases_dict.values(), key=lambda x: x["phase"])
        ]

        return Response({
            "grand_total_raised": float(grand_total),
            "general_unallocated": float(general),
            "phases": phases,
        })
