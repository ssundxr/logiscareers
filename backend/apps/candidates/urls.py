"""
URL patterns for candidates app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CandidateProfileViewSet,
    MyCandidateProfileViewSet,
    ApplicationViewSet,
    MyApplicationViewSet
)

router = DefaultRouter()
router.register('profiles', CandidateProfileViewSet, basename='candidate-profile')
router.register('my-profile', MyCandidateProfileViewSet, basename='my-profile')
router.register('applications', ApplicationViewSet, basename='application')
router.register('my-applications', MyApplicationViewSet, basename='my-application')

urlpatterns = [
    path('', include(router.urls)),
]
