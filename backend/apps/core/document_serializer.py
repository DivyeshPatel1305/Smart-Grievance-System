"""
DocumentSerializer — a ModelSerializer-like base for MongoEngine Documents.

Automatically generates DRF fields from the MongoEngine Document's field
definitions, so subclasses only need to declare Meta.model and Meta.fields
(or Meta.exclude), exactly like Django's ModelSerializer.

Supported MongoEngine field → DRF field mappings:
  StringField / EmailField / URLField  → CharField / EmailField
  IntField / LongField                 → IntegerField
  FloatField / DecimalField            → FloatField
  BooleanField                         → BooleanField
  DateTimeField                        → DateTimeField
  ReferenceField                       → CharField (serialises as id string)
  ListField / EmbeddedDocumentListField → ListField(CharField)
  DictField                            → DictField
  All others                           → CharField(allow_blank, required=False)

Explicitly declared fields on the subclass always take priority.
"""
from rest_framework import serializers
import mongoengine.fields as me_fields


# MongoEngine field type → DRF field constructor
_FIELD_MAP = {
    me_fields.StringField:               lambda f: serializers.CharField(allow_blank=True, required=False),
    me_fields.EmailField:                lambda f: serializers.EmailField(required=False),
    me_fields.URLField:                  lambda f: serializers.URLField(required=False),
    me_fields.IntField:                  lambda f: serializers.IntegerField(required=False, allow_null=True),
    me_fields.LongField:                 lambda f: serializers.IntegerField(required=False, allow_null=True),
    me_fields.FloatField:                lambda f: serializers.FloatField(required=False, allow_null=True),
    me_fields.DecimalField:              lambda f: serializers.FloatField(required=False, allow_null=True),
    me_fields.BooleanField:              lambda f: serializers.BooleanField(required=False),
    me_fields.DateTimeField:             lambda f: serializers.DateTimeField(required=False, allow_null=True),
    me_fields.ReferenceField:            lambda f: serializers.CharField(required=False, allow_null=True),
    me_fields.LazyReferenceField:        lambda f: serializers.CharField(required=False, allow_null=True),
    me_fields.ObjectIdField:             lambda f: serializers.CharField(required=False),
    me_fields.UUIDField:                 lambda f: serializers.CharField(required=False),
    me_fields.ListField:                 lambda f: serializers.ListField(required=False),
    me_fields.EmbeddedDocumentListField: lambda f: serializers.ListField(required=False),
    me_fields.DictField:                 lambda f: serializers.DictField(required=False),
    me_fields.MapField:                  lambda f: serializers.DictField(required=False),
}


def _drf_field_for(me_field):
    """Return a DRF field instance matching the MongoEngine field type."""
    for me_type, factory in _FIELD_MAP.items():
        if isinstance(me_field, me_type):
            return factory(me_field)
    # fallback
    return serializers.CharField(allow_blank=True, required=False, allow_null=True)


def _get_field_value(obj, field_name):
    """
    Safely get a field value from a MongoEngine document,
    converting ReferenceFields to their string id.
    """
    try:
        val = getattr(obj, field_name)
    except Exception:
        return None

    # Dereference MongoEngine documents to their id
    if hasattr(val, 'id') and hasattr(val, '_fields'):
        return str(val.id)

    return val


class DocumentSerializerMeta(type(serializers.Serializer)):
    """
    Metaclass that auto-populates fields from the MongoEngine model
    declared in Meta.model / Meta.fields / Meta.exclude.
    Works identically to DRF's ModelSerializer metaclass.
    """
    def __new__(mcs, name, bases, attrs):
        meta = attrs.get('Meta')
        if meta and hasattr(meta, 'model'):
            model = meta.model
            declared_fields = set(
                k for k, v in attrs.items()
                if isinstance(v, serializers.Field)
            )

            # Collect inherited declared fields
            for base in bases:
                for k, v in vars(base).items():
                    if isinstance(v, serializers.Field):
                        declared_fields.add(k)

            # Determine which fields to expose
            all_model_fields = list(model._fields.keys()) if hasattr(model, '_fields') else []

            if hasattr(meta, 'fields') and meta.fields != '__all__':
                wanted = list(meta.fields)
            elif hasattr(meta, 'exclude'):
                exclude = set(meta.exclude)
                wanted = [f for f in all_model_fields if f not in exclude]
            else:
                wanted = all_model_fields

            # Auto-generate DRF fields for model fields not already declared
            for field_name in wanted:
                if field_name in declared_fields:
                    continue
                if field_name not in (model._fields if hasattr(model, '_fields') else {}):
                    continue
                me_field = model._fields[field_name]
                attrs[field_name] = _drf_field_for(me_field)

        cls = super().__new__(mcs, name, bases, attrs)
        return cls


class DocumentSerializer(serializers.Serializer, metaclass=DocumentSerializerMeta):
    """
    Base serializer for MongoEngine Documents.
    Behaves like ModelSerializer — declare Meta.model + Meta.fields.
    Explicitly declared fields (SerializerMethodField, etc.) always win.
    """

    def to_representation(self, instance):
        """
        Override to_representation so ReferenceFields are safely
        resolved to their id string rather than crashing.
        """
        ret = {}
        fields = self._readable_fields

        for field in fields:
            try:
                attribute = field.get_attribute(instance)
            except serializers.SkipField:
                continue
            except Exception:
                # ReferenceField not dereferenced — try direct attribute access
                try:
                    raw = getattr(instance, field.field_name, None)
                    if raw is not None and hasattr(raw, 'id'):
                        attribute = str(raw.id)
                    else:
                        attribute = raw
                except Exception:
                    attribute = None

            # Check for None representation
            if attribute is None:
                ret[field.field_name] = None
            else:
                try:
                    ret[field.field_name] = field.to_representation(attribute)
                except Exception:
                    ret[field.field_name] = str(attribute) if attribute is not None else None

        return ret

    def create(self, validated_data):
        ModelClass = self.Meta.model
        instance = ModelClass(**validated_data)
        instance.save()
        return instance

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
