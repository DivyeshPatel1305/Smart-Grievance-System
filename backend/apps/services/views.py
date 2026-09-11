from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound

from .models import ServiceRequest
from .serializers import ServiceRequestSerializer


class ServiceRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'citizen':
            return ServiceRequest.objects(citizen=user)
        return ServiceRequest.objects.all()

    # MongoEngine override
    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        # filter by status if provided
        status_filter = request.query_params.get('status', '').strip()
        if status_filter:
            qs = qs.filter(status=status_filter)
        return Response(ServiceRequestSerializer(list(qs), many=True, context={'request': request}).data)

    # MongoEngine override
    def get_object(self):
        pk = self.kwargs.get('pk')
        obj = ServiceRequest.objects(id=pk).first()
        if not obj:
            raise NotFound('Service request not found.')
        self.check_object_permissions(self.request, obj)
        return obj

    def perform_create(self, serializer):
        serializer.save(citizen=self.request.user)
