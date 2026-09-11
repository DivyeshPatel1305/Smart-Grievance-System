from rest_framework.permissions import BasePermission


class IsCitizen(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'citizen'


class IsOfficer(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'officer'


class IsDepartmentHead(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'department_head'


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'super_admin'


class IsOfficerOrAbove(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['officer', 'department_head', 'super_admin']


class IsDepartmentHeadOrAbove(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['department_head', 'super_admin']


class IsOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'super_admin':
            return True
        return obj.user == request.user
