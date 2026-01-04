"""
Serializers for Candidate profiles and applications.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    CandidateProfile, Education, WorkExperience, Application,
    MajorProject, HonorAndAward, ITSkillCertification
)

User = get_user_model()


class NullableDateField(serializers.DateField):
    """Custom DateField that treats empty strings as None."""
    
    def to_internal_value(self, value):
        if value in ('', None, 'null', 'undefined'):
            return None
        return super().to_internal_value(value)


class MajorProjectSerializer(serializers.ModelSerializer):
    """Serializer for major projects."""
    start_date = NullableDateField(required=False, allow_null=True)
    end_date = NullableDateField(required=False, allow_null=True)
    
    class Meta:
        model = MajorProject
        fields = ['id', 'title', 'description', 'role', 'start_date', 'end_date']


class HonorAndAwardSerializer(serializers.ModelSerializer):
    """Serializer for honors and awards."""
    date_issued = NullableDateField(required=False, allow_null=True)
    
    class Meta:
        model = HonorAndAward
        fields = ['id', 'title', 'issuer', 'date_issued']


class ITSkillCertificationSerializer(serializers.ModelSerializer):
    """Serializer for IT skills and certifications."""
    issue_date = NullableDateField(required=False, allow_null=True)
    expiry_date = NullableDateField(required=False, allow_null=True)
    
    class Meta:
        model = ITSkillCertification
        fields = [
            'id', 'skill_name', 'version', 'last_used',
            'certification_name', 'issuing_organization',
            'issue_date', 'expiry_date'
        ]


class EducationSerializer(serializers.ModelSerializer):
    """Serializer for education entries."""
    start_date = NullableDateField(required=False, allow_null=True)
    end_date = NullableDateField(required=False, allow_null=True)
    
    class Meta:
        model = Education
        fields = [
            'id', 'education_level', 'course', 'specialization', 
            'university', 'country', 'start_date', 'end_date', 'year'
        ]


class WorkExperienceSerializer(serializers.ModelSerializer):
    """Serializer for work experience entries."""
    start_date = NullableDateField(required=False, allow_null=True)
    end_date = NullableDateField(required=False, allow_null=True)
    
    class Meta:
        model = WorkExperience
        fields = [
            'id', 'company_name', 'job_title', 'location',
            'industry', 'functional_area',
            'start_date', 'end_date', 'is_current',
            'responsibilities', 'achievements'
        ]


class CandidateProfileSerializer(serializers.ModelSerializer):
    """Full serializer for candidate profile."""
    
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_first_name = serializers.CharField(source='user.first_name', read_only=True)
    user_last_name = serializers.CharField(source='user.last_name', read_only=True)
    education_entries = EducationSerializer(source='education_history', many=True, read_only=True)
    experience_entries = WorkExperienceSerializer(source='work_experiences', many=True, read_only=True)
    major_projects = MajorProjectSerializer(many=True, read_only=True)
    honors_awards = HonorAndAwardSerializer(source='honors_and_awards', many=True, read_only=True)
    it_skill_certifications = ITSkillCertificationSerializer(many=True, read_only=True)
    total_experience_years = serializers.FloatField(read_only=True)
    gcc_experience_years = serializers.FloatField(read_only=True)
    all_skills = serializers.ListField(read_only=True)
    
    class Meta:
        model = CandidateProfile
        fields = '__all__'
        read_only_fields = ['id', 'user', 'registration_number', 'created_at', 'updated_at']


class CandidateProfileListSerializer(serializers.ModelSerializer):
    """Minimal serializer for candidate listing."""
    
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    total_experience_years = serializers.FloatField(read_only=True)
    gcc_experience_years = serializers.FloatField(read_only=True)
    
    class Meta:
        model = CandidateProfile
        fields = [
            'id', 'registration_number', 'full_name', 'email',
            'current_location', 'total_experience_years',
            'gcc_experience_years', 'desired_monthly_salary', 'photo',
            'created_at'
        ]


class CandidateProfileCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating candidate profile."""
    
    education = EducationSerializer(many=True, required=False)
    experience = WorkExperienceSerializer(many=True, required=False)
    major_projects = MajorProjectSerializer(many=True, required=False)
    honors_awards = HonorAndAwardSerializer(many=True, required=False)
    it_skill_certifications = ITSkillCertificationSerializer(many=True, required=False)
    
    class Meta:
        model = CandidateProfile
        fields = [
            'date_of_birth', 'gender', 'marital_status', 'nationality',
            'religion', 'professional_summary', 'mobile_number', 
            'alternative_mobile', 'alternative_email', 'linkedin_profile',
            'current_location', 'preferred_locations', 
            'languages_known', 'languages_spoken',
            'driving_license', 'driving_license_issued_from',
            'visa_status', 'visa_expiry',
            'total_experience_months', 'gcc_experience_months',
            'desired_availability_to_join', 'current_salary', 'desired_monthly_salary',
            'salary_currency', 'professional_skills', 'functional_skills',
            'it_skills', 'cv_file', 'cv_text', 'photo',
            'desired_industry', 'desired_sub_industry', 'desired_functional_area',
            'desired_designation_role', 'desired_job_location', 'job_search_status',
            'education', 'experience', 'major_projects', 'honors_awards', 
            'it_skill_certifications'
        ]
    
    def create(self, validated_data):
        education_data = validated_data.pop('education', [])
        experience_data = validated_data.pop('experience', [])
        projects_data = validated_data.pop('major_projects', [])
        honors_data = validated_data.pop('honors_awards', [])
        it_skills_data = validated_data.pop('it_skill_certifications', [])
        
        profile = CandidateProfile.objects.create(
            user=self.context['request'].user,
            **validated_data
        )
        
        for edu in education_data:
            Education.objects.create(candidate=profile, **edu)
        
        for exp in experience_data:
            WorkExperience.objects.create(candidate=profile, **exp)
        
        for proj in projects_data:
            MajorProject.objects.create(candidate=profile, **proj)
        
        for honor in honors_data:
            HonorAndAward.objects.create(candidate=profile, **honor)
        
        for skill in it_skills_data:
            ITSkillCertification.objects.create(candidate=profile, **skill)
        
        return profile
    
    def update(self, instance, validated_data):
        education_data = validated_data.pop('education', None)
        experience_data = validated_data.pop('experience', None)
        projects_data = validated_data.pop('major_projects', None)
        honors_data = validated_data.pop('honors_awards', None)
        it_skills_data = validated_data.pop('it_skill_certifications', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if education_data is not None:
            instance.education_history.all().delete()
            for edu in education_data:
                Education.objects.create(candidate=instance, **edu)
        
        if experience_data is not None:
            instance.work_experiences.all().delete()
            for exp in experience_data:
                WorkExperience.objects.create(candidate=instance, **exp)
        
        if projects_data is not None:
            instance.major_projects.all().delete()
            for proj in projects_data:
                MajorProject.objects.create(candidate=instance, **proj)
        
        if honors_data is not None:
            instance.honors_and_awards.all().delete()
            for honor in honors_data:
                HonorAndAward.objects.create(candidate=instance, **honor)
        
        if it_skills_data is not None:
            instance.it_skill_certifications.all().delete()
            for skill in it_skills_data:
                ITSkillCertification.objects.create(candidate=instance, **skill)
        
        return instance


class ApplicationSerializer(serializers.ModelSerializer):
    """Serializer for job applications."""
    
    candidate_name = serializers.CharField(
        source='candidate.user.get_full_name',
        read_only=True
    )
    candidate_reg_no = serializers.CharField(
        source='candidate.registration_number',
        read_only=True
    )
    job_title = serializers.CharField(source='job.title', read_only=True)
    job_company = serializers.CharField(source='job.company_name', read_only=True)
    
    class Meta:
        model = Application
        fields = [
            'id', 'candidate', 'job', 'candidate_name', 'candidate_reg_no',
            'job_title', 'job_company', 'status', 'cover_letter',
            'applied_at', 'updated_at', 'assessment_score',
            'assessment_data', 'assessed_at'
        ]
        read_only_fields = [
            'id', 'applied_at', 'updated_at', 
            'assessment_score', 'assessment_data', 'assessed_at'
        ]


class ApplicationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating applications."""
    
    class Meta:
        model = Application
        fields = ['job', 'cover_letter']
    
    def validate_job(self, value):
        user = self.context['request'].user
        try:
            profile = user.candidate_profile
        except CandidateProfile.DoesNotExist:
            raise serializers.ValidationError(
                'Please complete your profile before applying for jobs.'
            )
        
        if Application.objects.filter(
            candidate=profile,
            job=value
        ).exists():
            raise serializers.ValidationError(
                'You have already applied for this job.'
            )
        return value
    
    def create(self, validated_data):
        try:
            validated_data['candidate'] = self.context['request'].user.candidate_profile
        except CandidateProfile.DoesNotExist:
            raise serializers.ValidationError(
                'Please complete your profile before applying for jobs.'
            )
        return super().create(validated_data)
