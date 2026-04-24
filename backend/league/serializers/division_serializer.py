from rest_framework import serializers
from league.models.divisions import Division

class DivisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Division
        fields = ['id', 'name']