from rest_framework import serializers


class DocumentSerializer(serializers.Serializer):
    """Minimal compatibility serializer for MongoEngine documents.

    The project uses MongoEngine documents for persistence, and the original
    DRF-MongoEngine package is unavailable in this environment. This shim
    provides the DocumentSerializer import used by the existing views and
    lets the API layer continue to work with a serializer API similar to DRF.
    """

    def create(self, validated_data):
        model_class = getattr(self.Meta, 'model', None)
        if model_class is None:
            raise NotImplementedError('DocumentSerializer requires a Meta.model')
        instance = model_class(**validated_data)
        instance.save()
        return instance

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
