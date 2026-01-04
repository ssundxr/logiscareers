"""
Job Posting Models for Logis Career AI Platform.
GCC Logistics focused job management.
"""

from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class Job(models.Model):
    """
    Job posting model aligned with ML engine schema.
    """
    
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        ACTIVE = 'active', 'Active'
        PAUSED = 'paused', 'Paused'
        CLOSED = 'closed', 'Closed'
    
    class JobType(models.TextChoices):
        FULL_TIME = 'full_time', 'Full Time'
        PART_TIME = 'part_time', 'Part Time'
        CONTRACT = 'contract', 'Contract'
        TEMPORARY = 'temporary', 'Temporary'
        INTERNSHIP = 'internship', 'Internship'

    class JobLevel(models.TextChoices):
        ENTRY = 'entry', 'Entry Level'
        MID = 'mid', 'Mid Level'
        SENIOR = 'senior', 'Senior Level'
        EXECUTIVE = 'executive', 'Executive'
    
    # Basic Information
    title = models.CharField(max_length=200)
    reference_number = models.CharField(max_length=50, unique=True)
    description = models.TextField()
    responsibilities = models.TextField(blank=True)
    candidate_profile = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT
    )
    job_type = models.CharField(
        max_length=20,
        choices=JobType.choices,
        default=JobType.FULL_TIME
    )
    designation = models.CharField(max_length=150, blank=True)
    keywords = models.JSONField(default=list)
    
    # Company Information
    company_name = models.CharField(max_length=200)
    department = models.CharField(max_length=100, blank=True)
    vacancies = models.PositiveIntegerField(default=1)
    
    # Location
    location = models.CharField(max_length=200)
    is_gcc_location = models.BooleanField(default=True)
    state = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    job_country = models.CharField(max_length=100, blank=True)
    
    # Experience Requirements
    min_experience_years = models.PositiveIntegerField(default=0)
    max_experience_years = models.PositiveIntegerField(default=20)
    min_gcc_experience_years = models.PositiveIntegerField(default=0)
    
    # Education Requirements
    required_education = models.CharField(max_length=100, blank=True)
    preferred_education = models.CharField(max_length=100, blank=True)
    
    # Skills (stored as JSON)
    required_skills = models.JSONField(default=list)
    preferred_skills = models.JSONField(default=list)
    preferred_locations = models.JSONField(default=list)
    nationality = models.CharField(max_length=100, blank=True)
    gender_preference = models.CharField(
        max_length=20,
        choices=[
            ('male', 'Male'),
            ('female', 'Female'),
            ('no_preference', 'No Preference')
        ],
        default='no_preference'
    )
    
    # Salary Range
    salary_min = models.PositiveIntegerField(null=True, blank=True)
    salary_max = models.PositiveIntegerField(null=True, blank=True)
    salary_currency = models.CharField(max_length=10, default='AED')
    hide_salary = models.BooleanField(default=False)
    benefits = models.TextField(blank=True)

    # Job Level and Type
    job_level = models.CharField(
        max_length=20,
        choices=JobLevel.choices,
        default=JobLevel.MID
    )
    is_remote = models.BooleanField(default=False)
    
    # Industry
    industry = models.CharField(max_length=100, default='Logistics')
    sub_industry = models.CharField(max_length=100, blank=True)
    functional_area = models.CharField(max_length=100, blank=True)
    
    # Application Details
    required_date_of_joining = models.CharField(max_length=100, blank=True)
    process = models.CharField(max_length=200, blank=True)
    mode_of_application = models.CharField(max_length=100, blank=True)

    # Metadata
    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_jobs'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'jobs'
        ordering = ['-created_at']
        verbose_name = 'Job'
        verbose_name_plural = 'Jobs'
    
    def __str__(self):
        return f"{self.title} - {self.company_name}"
    
    def to_ml_engine_format(self):
        """
        Convert to ML engine Job schema format.
        Maps Django model fields to Pydantic schema expected by ML engine.
        """
        # Map gender_preference to ML engine format
        gender_map = {
            'male': 'Male',
            'female': 'Female',
            'no_preference': 'No Preference',
        }
        
        return {
            # Identity
            'job_id': str(self.id),
            
            # Employer Information
            'company_name': self.company_name,
            'company_type': 'Employer',
            
            # Location & Compliance
            'country': self.job_country or 'UAE',
            'state': self.state,
            'city': self.city,
            'preferred_locations': self.preferred_locations,
            
            # Role Metadata
            'title': self.title,
            'job_type': self.job_type,
            'industry': self.industry or 'Logistics',
            'sub_industry': self.sub_industry,
            'functional_area': self.functional_area or 'Operations',
            'designation': self.designation or self.job_level,
            'job_status': self.status,
            
            # Experience Requirements
            'min_experience_years': self.min_experience_years,
            'max_experience_years': self.max_experience_years,
            'require_gcc_experience': self.min_gcc_experience_years > 0,
            
            # Compensation
            'salary_min': self.salary_min or 0,
            'salary_max': self.salary_max or 50000,
            'currency': self.salary_currency,
            'hide_salary': self.hide_salary,
            'other_benefits': self.benefits,
            
            # Skills & Keywords
            'required_skills': self.required_skills,
            'preferred_skills': self.preferred_skills,
            'keywords': self.keywords,
            
            # Eligibility Criteria
            'required_education': self.required_education,
            'preferred_nationality': [self.nationality] if self.nationality else [],
            'gender_preference': gender_map.get(self.gender_preference, 'No Preference'),
            'visa_requirement': None,
            
            # Text Fields (ML Input)
            'job_description': self.description,
            'desired_candidate_profile': self.candidate_profile,
            'recruiter_instructions': self.responsibilities,
            
            # Additional Metadata
            'no_of_vacancies': self.vacancies,
            'job_expiry_date': self.expires_at.isoformat() if self.expires_at else None,
            'mode_of_application': self.mode_of_application,
            'custom_questions': [],
        }
