"""
URL patterns for jobs app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import JobViewSet, PublicJobViewSet

router = DefaultRouter()
router.register('manage', JobViewSet, basename='job-manage')
router.register('public', PublicJobViewSet, basename='job-public')

urlpatterns = [
    path('', include(router.urls)),
]
