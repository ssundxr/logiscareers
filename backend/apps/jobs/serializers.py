"""
Serializers for Job postings.
"""

from rest_framework import serializers
from .models import Job


class JobListSerializer(serializers.ModelSerializer):
    """
    Serializer for job listing (minimal fields).
    """
    posted_by_name = serializers.CharField(
        source='posted_by.get_full_name',
        read_only=True
    )
    application_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Job
        fields = [
            'id', 'title', 'reference_number', 'company_name',
            'location', 'job_level', 'status', 'salary_min', 'salary_max',
            'salary_currency', 'min_experience_years', 'max_experience_years',
            'posted_by_name', 'application_count', 'created_at'
        ]
    
    def get_application_count(self, obj):
        return getattr(obj, 'applications_count', 0)


class JobDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for full job details.
    """
    posted_by_name = serializers.CharField(
        source='posted_by.get_full_name',
        read_only=True
    )
    
    class Meta:
        model = Job
        fields = '__all__'
        read_only_fields = ['id', 'posted_by', 'created_at', 'updated_at']


class JobCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating/updating jobs.
    """
    
    class Meta:
        model = Job
        fields = [
            'title', 'reference_number', 'description', 'responsibilities',
            'candidate_profile', 'status', 'company_name', 'department', 'location', 'is_gcc_location',
            'state', 'city', 'job_country', 'vacancies', 'designation', 'job_type',
            'min_experience_years', 'max_experience_years', 'min_gcc_experience_years',
            'required_education', 'preferred_education', 'nationality', 'gender_preference',
            'visa_requirement', 'required_skills', 'preferred_skills', 'preferred_locations', 'keywords',
            'salary_min', 'salary_max', 'salary_currency', 'hide_salary', 'benefits',
            'job_level', 'is_remote', 'industry', 'sub_industry',
            'functional_area', 'expires_at'
        ]
    
    def create(self, validated_data):
        validated_data['posted_by'] = self.context['request'].user
        return super().create(validated_data)


class PublicJobSerializer(serializers.ModelSerializer):
    """
    Serializer for public job listing (candidate view).
    """
    
    class Meta:
        model = Job
        fields = [
            'id', 'title', 'reference_number', 'company_name', 'description',
            'responsibilities', 'location', 'is_gcc_location',
            'min_experience_years', 'max_experience_years',
            'required_education', 'required_skills', 'preferred_skills',
            'salary_min', 'salary_max', 'salary_currency',
            'job_level', 'is_remote', 'industry', 'created_at'
        ]
