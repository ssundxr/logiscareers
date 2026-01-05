"""
URL patterns for assessments app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AssessmentViewSet, engine_status, rank_candidates

router = DefaultRouter()
router.register('', AssessmentViewSet, basename='assessment')

urlpatterns = [
    path('status/', engine_status, name='engine-status'),
    path('rank/', rank_candidates, name='rank-candidates'),
    path('', include(router.urls)),
]
