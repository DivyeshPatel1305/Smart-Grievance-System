from django.urls import path
from .views import (
    DashboardStatsView, ComplaintTrendsView, CategoryDistributionView,
    DepartmentPerformanceView, OfficerPerformanceView, StatusDistributionView,
    PriorityDistributionView, ResolutionTimeView, SLABreachView,
    MLInsightsView, ExportReportView, HeatmapDataView,
)

urlpatterns = [
    path('dashboard/',   DashboardStatsView.as_view(),      name='dashboard-stats'),
    path('trends/',      ComplaintTrendsView.as_view(),      name='complaint-trends'),
    path('categories/',  CategoryDistributionView.as_view(), name='category-distribution'),
    path('departments/', DepartmentPerformanceView.as_view(),name='department-performance'),
    path('officers/',    OfficerPerformanceView.as_view(),   name='officer-performance'),
    path('status/',      StatusDistributionView.as_view(),   name='status-distribution'),
    path('priority/',    PriorityDistributionView.as_view(), name='priority-distribution'),
    path('resolution/',  ResolutionTimeView.as_view(),       name='resolution-time'),
    path('sla/',         SLABreachView.as_view(),            name='sla-breach'),
    path('ml-insights/', MLInsightsView.as_view(),           name='ml-insights'),
    path('export/',      ExportReportView.as_view(),         name='export-report'),
    path('heatmap/',     HeatmapDataView.as_view(),          name='heatmap-data'),
]
