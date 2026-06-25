from rest_framework import serializers
from league.models.divisions import Division

class DivisionSerializer(serializers.ModelSerializer):
    sport        = serializers.CharField(source="program.sport",        read_only=True, default=None)
    program_type = serializers.CharField(source="program.program_type", read_only=True, default=None)

    class Meta:
        model = Division
        fields = ['id', 'name', 'is_calendar_only', 'sport', 'program_type']
