"""
URL patterns for assessments app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AssessmentViewSet, engine_status

router = DefaultRouter()
router.register('', AssessmentViewSet, basename='assessment')

urlpatterns = [
    path('status/', engine_status, name='engine-status'),
    path('', include(router.urls)),
]
