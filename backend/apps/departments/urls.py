from django.urls import path
from .views import DepartmentViewSet, ComplaintCategoryViewSet, AnnouncementViewSet

# Use explicit paths so 'categories/' and 'announcements/' are never
# swallowed by the DepartmentViewSet's '{id}/' pattern.

dept_list   = DepartmentViewSet.as_view({'get': 'list',   'post': 'create'})
dept_detail = DepartmentViewSet.as_view({'get': 'retrieve', 'patch': 'update', 'delete': 'destroy'})
dept_officers = DepartmentViewSet.as_view({'get': 'officers'})
dept_stats    = DepartmentViewSet.as_view({'get': 'stats'})

cat_list   = ComplaintCategoryViewSet.as_view({'get': 'list',   'post': 'create'})
cat_detail = ComplaintCategoryViewSet.as_view({'get': 'retrieve', 'patch': 'update', 'delete': 'destroy'})

ann_list   = AnnouncementViewSet.as_view({'get': 'list',   'post': 'create'})
ann_detail = AnnouncementViewSet.as_view({'get': 'retrieve', 'patch': 'update', 'delete': 'destroy'})

urlpatterns = [
    # Categories — must come BEFORE dept detail so it isn't captured as a dept id
    path('categories/',            cat_list,   name='category-list'),
    path('categories/<id>/',       cat_detail, name='category-detail'),

    # Announcements
    path('announcements/',         ann_list,   name='announcement-list'),
    path('announcements/<id>/',    ann_detail, name='announcement-detail'),

    # Departments
    path('',                       dept_list,    name='department-list'),
    path('<id>/',                  dept_detail,  name='department-detail'),
    path('<id>/officers/',         dept_officers, name='department-officers'),
    path('<id>/stats/',            dept_stats,   name='department-stats'),
]
