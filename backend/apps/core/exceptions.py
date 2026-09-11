from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """
    Always return JSON — never let Django's HTML debug page leak through to the API.
    """
    # Try DRF's default handler first
    response = exception_handler(exc, context)

    if response is not None:
        return response

    # Unhandled exception — return JSON 500 instead of HTML
    return Response(
        {'detail': str(exc) or 'An unexpected error occurred.'},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
