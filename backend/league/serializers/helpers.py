from rest_framework.response import Response
from rest_framework import status as http_status


def success(data, status=http_status.HTTP_200_OK):
    return Response({"success": True, "data": data}, status=status)


def error(message, status=http_status.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "error": message}, status=status)