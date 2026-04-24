from rest_framework import generics, status
from rest_framework.views import APIView

from league.models.pitch_count import PitchCount
from league.serializers.pitch_count_serializer import PitchCountSerializer
from .helpers import success, error


class PitchCountView(APIView):
    """
    POST /api/pitch-count/

    Log pitches for a player's game outing.

    Required body:
      player            (int)        — player ID
      game_date         (YYYY-MM-DD)
      pitches_thrown    (int)

    Optional:
      player_enrollment (int)        — enrollment ID (links to division/team context)
      notes             (str)

    days_rest_required is computed server-side in PitchCount.save() —
    do not send it, it will be ignored.
    """
    def post(self, request):
        serializer = PitchCountSerializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save()
            return success(
                PitchCountSerializer(instance).data,
                status.HTTP_201_CREATED,
            )
        return error(serializer.errors)