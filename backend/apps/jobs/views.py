"""
Views for Job management.
"""

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters import rest_framework as filters
from django.db.models import Count

from .models import Job
from .serializers import (
    JobListSerializer,
    JobDetailSerializer,
    JobCreateSerializer,
    PublicJobSerializer
)


class IsAdminUser(permissions.BasePermission):
    """Permission for admin/recruiter users."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_admin_user


class JobFilter(filters.FilterSet):
    """Filter for jobs."""
    min_salary = filters.NumberFilter(field_name='salary_min', lookup_expr='gte')
    max_salary = filters.NumberFilter(field_name='salary_max', lookup_expr='lte')
    min_experience = filters.NumberFilter(field_name='min_experience_years', lookup_expr='lte')
    location = filters.CharFilter(lookup_expr='icontains')
    title = filters.CharFilter(lookup_expr='icontains')
    
    class Meta:
        model = Job
        fields = ['status', 'job_level', 'industry', 'is_remote', 'is_gcc_location']


class JobViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Job CRUD operations (Admin).
    """
    queryset = Job.objects.all()
    permission_classes = [IsAdminUser]
    filter_class = JobFilter
    search_fields = ['title', 'description', 'company_name', 'location']
    ordering_fields = ['created_at', 'title', 'salary_min']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return JobListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return JobCreateSerializer
        return JobDetailSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.annotate(applications_count=Count('applications'))
        return queryset
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a job posting."""
        job = self.get_object()
        job.status = Job.Status.ACTIVE
        job.save()
        return Response({'status': 'Job activated successfully.'})
    
    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Close a job posting."""
        job = self.get_object()
        job.status = Job.Status.CLOSED
        job.save()
        return Response({'status': 'Job closed successfully.'})
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get job statistics."""
        total = Job.objects.count()
        active = Job.objects.filter(status=Job.Status.ACTIVE).count()
        draft = Job.objects.filter(status=Job.Status.DRAFT).count()
        closed = Job.objects.filter(status=Job.Status.CLOSED).count()
        
        return Response({
            'total': total,
            'active': active,
            'draft': draft,
            'closed': closed
        })


class PublicJobViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for public job listing (Candidates).
    """
    queryset = Job.objects.filter(status=Job.Status.ACTIVE)
    serializer_class = PublicJobSerializer
    permission_classes = [permissions.AllowAny]
    filter_class = JobFilter
    search_fields = ['title', 'description', 'company_name', 'location']
    ordering_fields = ['created_at', 'title', 'salary_min']
