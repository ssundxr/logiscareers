"""
Views for Candidate management.
"""

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters import rest_framework as filters
from django.shortcuts import get_object_or_404

from .models import CandidateProfile, Education, WorkExperience, Application
from .serializers import (
    CandidateProfileSerializer,
    CandidateProfileListSerializer,
    CandidateProfileCreateSerializer,
    EducationSerializer,
    WorkExperienceSerializer,
    ApplicationSerializer,
    ApplicationCreateSerializer
)


class IsAdminUser(permissions.BasePermission):
    """Permission for admin/recruiter users."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_admin_user


class IsCandidateUser(permissions.BasePermission):
    """Permission for candidate users."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_candidate_user


class CandidateFilter(filters.FilterSet):
    """Filter for candidates."""
    min_experience = filters.NumberFilter(
        field_name='total_experience_months',
        lookup_expr='gte',
        method='filter_min_experience'
    )
    max_experience = filters.NumberFilter(
        field_name='total_experience_months',
        lookup_expr='lte',
        method='filter_max_experience'
    )
    min_gcc_experience = filters.NumberFilter(
        field_name='gcc_experience_months',
        lookup_expr='gte',
        method='filter_min_gcc_experience'
    )
    location = filters.CharFilter(
        field_name='current_location',
        lookup_expr='icontains'
    )
    skill = filters.CharFilter(method='filter_skill')
    
    class Meta:
        model = CandidateProfile
        fields = ['nationality', 'visa_status', 'gender']
    
    def filter_min_experience(self, queryset, name, value):
        return queryset.filter(total_experience_months__gte=value * 12)
    
    def filter_max_experience(self, queryset, name, value):
        return queryset.filter(total_experience_months__lte=value * 12)
    
    def filter_min_gcc_experience(self, queryset, name, value):
        return queryset.filter(gcc_experience_months__gte=value * 12)
    
    def filter_skill(self, queryset, name, value):
        # Filter by skill in any skill list
        return queryset.filter(
            models.Q(professional_skills__icontains=value) |
            models.Q(functional_skills__icontains=value) |
            models.Q(it_skills__icontains=value)
        )


class CandidateProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Candidate Profile management (Admin).
    """
    queryset = CandidateProfile.objects.select_related('user').prefetch_related(
        'education_history', 'work_experiences'
    )
    permission_classes = [IsAdminUser]
    filter_class = CandidateFilter
    search_fields = ['user__first_name', 'user__last_name', 'user__email', 'registration_number']
    ordering_fields = ['created_at', 'total_experience_months', 'expected_salary']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return CandidateProfileListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return CandidateProfileCreateSerializer
        return CandidateProfileSerializer
    
    @action(detail=True, methods=['get'])
    def full_profile(self, request, pk=None):
        """Get full candidate profile with all details."""
        profile = self.get_object()
        serializer = CandidateProfileSerializer(profile)
        return Response(serializer.data)


class MyCandidateProfileViewSet(viewsets.GenericViewSet):
    """
    ViewSet for candidate's own profile management.
    """
    permission_classes = [IsCandidateUser]
    serializer_class = CandidateProfileSerializer
    
    def get_object(self):
        try:
            return CandidateProfile.objects.select_related('user').prefetch_related(
                'education_history', 'work_experiences'
            ).get(user=self.request.user)
        except CandidateProfile.DoesNotExist:
            return None
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current candidate's profile."""
        profile = self.get_object()
        if profile:
            serializer = CandidateProfileSerializer(profile)
            return Response(serializer.data)
        return Response(
            {'detail': 'Profile not found. Please create your profile.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    @action(detail=False, methods=['post'])
    def create_profile(self, request):
        """Create candidate profile."""
        if self.get_object():
            return Response(
                {'detail': 'Profile already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = CandidateProfileCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        return Response(
            CandidateProfileSerializer(profile).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=False, methods=['put', 'patch'])
    def update_profile(self, request):
        """Update candidate profile - creates if doesn't exist."""
        profile = self.get_object()
        
        # Clean the request data - remove empty strings for numeric fields
        data = request.data.copy()
        numeric_fields = ['total_experience_months', 'gcc_experience_months', 
                         'current_salary', 'expected_salary']
        for field in numeric_fields:
            if field in data and data[field] == '':
                data[field] = None
        
        # If profile doesn't exist, create it
        if not profile:
            serializer = CandidateProfileCreateSerializer(
                data=data,
                context={'request': request}
            )
            if not serializer.is_valid():
                print(f"Validation errors (create): {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            profile = serializer.save()
            return Response(
                CandidateProfileSerializer(profile).data,
                status=status.HTTP_201_CREATED
            )
        
        # Update existing profile
        serializer = CandidateProfileCreateSerializer(
            profile,
            data=data,
            partial=True,
            context={'request': request}
        )
        if not serializer.is_valid():
            print(f"Validation errors (update): {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        profile = serializer.save()
        return Response(CandidateProfileSerializer(profile).data)
    
    @action(detail=False, methods=['post'], url_path='upload-resume')
    def upload_resume(self, request):
        """Upload resume/CV file."""
        profile = self.get_object()
        if not profile:
            # Create profile if it doesn't exist
            profile = CandidateProfile.objects.create(user=request.user)
        
        cv_file = request.FILES.get('cv_file')
        if not cv_file:
            return Response(
                {'detail': 'No file provided.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file type
        allowed_types = ['application/pdf', 'application/msword', 
                         'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        if cv_file.content_type not in allowed_types:
            return Response(
                {'detail': 'Invalid file type. Please upload PDF or Word document.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file size (5MB max)
        if cv_file.size > 5 * 1024 * 1024:
            return Response(
                {'detail': 'File too large. Maximum size is 5MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        profile.cv_file = cv_file
        profile.save()
        return Response(CandidateProfileSerializer(profile).data)
    
    @action(detail=False, methods=['post'], url_path='upload-photo')
    def upload_photo(self, request):
        """Upload profile photo."""
        profile = self.get_object()
        if not profile:
            # Create profile if it doesn't exist
            profile = CandidateProfile.objects.create(user=request.user)
        
        photo = request.FILES.get('photo')
        if not photo:
            return Response(
                {'detail': 'No photo provided.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file type
        if not photo.content_type.startswith('image/'):
            return Response(
                {'detail': 'Invalid file type. Please upload an image.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file size (2MB max)
        if photo.size > 2 * 1024 * 1024:
            return Response(
                {'detail': 'Photo too large. Maximum size is 2MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        profile.photo = photo
        profile.save()
        return Response(CandidateProfileSerializer(profile).data)


class ApplicationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Application management (Admin).
    """
    queryset = Application.objects.select_related(
        'candidate__user', 'job'
    )
    serializer_class = ApplicationSerializer
    permission_classes = [IsAdminUser]
    filterset_fields = ['status', 'job']
    search_fields = [
        'candidate__user__first_name', 
        'candidate__user__last_name',
        'candidate__registration_number'
    ]
    ordering_fields = ['applied_at', 'assessment_score']
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update application status."""
        application = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in dict(Application.Status.choices):
            return Response(
                {'detail': 'Invalid status.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        application.status = new_status
        application.save()
        return Response(ApplicationSerializer(application).data)


class MyApplicationViewSet(viewsets.GenericViewSet):
    """
    ViewSet for candidate's own applications.
    """
    permission_classes = [IsCandidateUser]
    serializer_class = ApplicationSerializer
    
    def get_queryset(self):
        try:
            profile = self.request.user.candidate_profile
            return Application.objects.filter(
                candidate=profile
            ).select_related('job')
        except CandidateProfile.DoesNotExist:
            return Application.objects.none()
    
    @action(detail=False, methods=['get'])
    def list_applications(self, request):
        """List candidate's applications."""
        applications = self.get_queryset()
        serializer = ApplicationSerializer(applications, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def apply(self, request):
        """Apply for a job."""
        # Check if user has a profile
        try:
            profile = request.user.candidate_profile
        except CandidateProfile.DoesNotExist:
            return Response(
                {'detail': 'Please complete your profile before applying for jobs.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ApplicationCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        if not serializer.is_valid():
            print(f"Application validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        application = serializer.save()
        return Response(
            ApplicationSerializer(application).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'], url_path='withdraw')
    def withdraw_application(self, request, pk=None):
        """Withdraw an application."""
        application = get_object_or_404(
            self.get_queryset(),
            pk=pk
        )
        
        if application.status not in [
            Application.Status.PENDING,
            Application.Status.UNDER_REVIEW
        ]:
            return Response(
                {'detail': 'Cannot withdraw application at this stage.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        application.status = Application.Status.WITHDRAWN
        application.save()
        return Response(ApplicationSerializer(application).data)
