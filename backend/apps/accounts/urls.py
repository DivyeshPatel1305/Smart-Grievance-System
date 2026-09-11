from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LoginView, RegisterView, LogoutView, ProfileView,
    ChangePasswordView, UserManagementViewSet, CreateOfficerView,
    ActivityLogViewSet, CitizenProfileView,
    SendOTPView, VerifyEmailView,
    ForgotPasswordView, ResetPasswordView,
)

router = DefaultRouter()
router.register('users', UserManagementViewSet, basename='users')
router.register('activity-logs', ActivityLogViewSet, basename='activity-logs')

urlpatterns = [
    path('login/',            LoginView.as_view(),          name='login'),
    path('register/',         RegisterView.as_view(),        name='register'),
    path('logout/',           LogoutView.as_view(),          name='logout'),
    path('send-otp/',         SendOTPView.as_view(),         name='send-otp'),
    path('verify-email/',     VerifyEmailView.as_view(),     name='verify-email'),
    path('forgot-password/',  ForgotPasswordView.as_view(),  name='forgot-password'),
    path('reset-password/',   ResetPasswordView.as_view(),   name='reset-password'),
    path('profile/',          ProfileView.as_view(),         name='profile'),
    path('citizen-profile/',  CitizenProfileView.as_view(),  name='citizen-profile'),
    path('change-password/',  ChangePasswordView.as_view(),  name='change-password'),
    path('create-officer/',   CreateOfficerView.as_view(),   name='create-officer'),
    path('',                  include(router.urls)),
]
