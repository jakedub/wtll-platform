from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from league.models.team_assignment import TeamAssignment
from league.serializers.team_assignment_serializer import TeamAssignmentSerializer


class MyTeamsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        assignments = (
            TeamAssignment.objects
            .filter(user=request.user)
            .select_related("team", "team__division")
        )

        serializer = TeamAssignmentSerializer(assignments, many=True)

        return Response({
            "user": request.user.username,
            "teams": serializer.data
        })