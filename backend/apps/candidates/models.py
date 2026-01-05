"""
Candidate Profile Models for Logis Career AI Platform.
"""

from django.db import models
from django.conf import settings


class CandidateProfile(models.Model):
    """
    Extended candidate profile aligned with ML engine schema.
    """
    
    class Gender(models.TextChoices):
        MALE = 'male', 'Male'
        FEMALE = 'female', 'Female'
        OTHER = 'other', 'Other'
    
    class MaritalStatus(models.TextChoices):
        SINGLE = 'single', 'Single'
        MARRIED = 'married', 'Married'
        DIVORCED = 'divorced', 'Divorced'
    
    # Link to User
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='candidate_profile'
    )
    
    # Registration Number
    registration_number = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        null=True
    )
    
    # Personal Details
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(
        max_length=10,
        choices=Gender.choices,
        blank=True
    )
    marital_status = models.CharField(
        max_length=20,
        choices=MaritalStatus.choices,
        blank=True
    )
    nationality = models.CharField(max_length=100, blank=True)
    religion = models.CharField(max_length=100, blank=True)
    professional_summary = models.TextField(blank=True)

    # Contact
    mobile_number = models.CharField(max_length=20, blank=True)
    alternative_mobile = models.CharField(max_length=20, blank=True)
    alternative_email = models.EmailField(blank=True)
    linkedin_profile = models.URLField(blank=True)

    # Location
    current_location = models.CharField(max_length=200, blank=True)
    preferred_locations = models.JSONField(default=list)
    
    # Languages (detailed list)
    languages_known = models.JSONField(default=list)  # List of language names
    languages_spoken = models.TextField(blank=True, null=True)  # Comma-separated string for display
    
    # Documents
    driving_license = models.BooleanField(default=False)
    driving_license_issued_from = models.CharField(max_length=100, blank=True)

    # Visa
    visa_status = models.CharField(max_length=100, blank=True)
    visa_expiry = models.DateField(null=True, blank=True)

    # Experience
    total_experience_months = models.PositiveIntegerField(default=0)
    gcc_experience_months = models.PositiveIntegerField(default=0)
    desired_availability_to_join = models.CharField(max_length=100, blank=True)

    # Salary
    current_salary = models.PositiveIntegerField(null=True, blank=True)
    desired_monthly_salary = models.PositiveIntegerField(null=True, blank=True)
    salary_currency = models.CharField(max_length=10, default='AED')

    # Desired Job
    desired_industry = models.CharField(max_length=100, blank=True)
    desired_sub_industry = models.CharField(max_length=100, blank=True)
    desired_functional_area = models.CharField(max_length=100, blank=True)
    desired_designation_role = models.CharField(max_length=100, blank=True)
    desired_job_location = models.CharField(max_length=100, blank=True)
    job_search_status = models.CharField(max_length=100, blank=True)

    # Skills (stored as JSON)
    professional_skills = models.JSONField(default=list)
    functional_skills = models.JSONField(default=list)
    it_skills = models.JSONField(default=list)
    
    # CV/Resume
    cv_file = models.FileField(upload_to='cvs/', blank=True, null=True)
    cv_text = models.TextField(blank=True)
    
    # Profile Picture
    photo = models.ImageField(upload_to='candidate_photos/', blank=True, null=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'candidate_profiles'
        verbose_name = "Candidate Profile"
        verbose_name_plural = "Candidate Profiles"
        ordering = ['-created_at']  # Default ordering to fix pagination warnings
    
    def __str__(self):
        return f"{self.user.get_full_name()} ({self.registration_number})"
    
    def save(self, *args, **kwargs):
        if not self.registration_number:
            # Generate registration number
            last_candidate = CandidateProfile.objects.order_by('-id').first()
            next_id = (last_candidate.id + 1) if last_candidate else 1
            self.registration_number = f"CAN{1001770 + next_id}"
        super().save(*args, **kwargs)
    
    @property
    def total_experience_years(self):
        return self.total_experience_months / 12
    
    @property
    def gcc_experience_years(self):
        return self.gcc_experience_months / 12
    
    @property
    def all_skills(self):
        return self.professional_skills + self.functional_skills + self.it_skills
    
    def _get_highest_education(self):
        """Get highest education level from education entries."""
        education_order = ['phd', 'doctorate', 'masters', 'master', 'bachelors', 'bachelor', 'diploma', 'high school']
        highest = None
        for edu in self.education_history.all():
            # Check education_level field first (user's explicit selection)
            if edu.education_level:
                level_lower = edu.education_level.lower()
                for level in education_order:
                    if level in level_lower:
                        if highest is None or education_order.index(level) < education_order.index(highest):
                            highest = level
                        break
            # Fallback to course field if education_level is not set
            elif edu.course:
                course_lower = edu.course.lower()
                for level in education_order:
                    if level in course_lower:
                        if highest is None or education_order.index(level) < education_order.index(highest):
                            highest = level
                        break
        return highest.title() if highest else None
    
    def _parse_location_country(self):
        """Extract country from current_location field."""
        if not self.current_location:
            return 'UAE'
        location = self.current_location.lower()
        if 'uae' in location or 'emirates' in location or 'dubai' in location or 'abu dhabi' in location:
            return 'UAE'
        if 'saudi' in location:
            return 'Saudi Arabia'
        if 'qatar' in location or 'doha' in location:
            return 'Qatar'
        if 'kuwait' in location:
            return 'Kuwait'
        if 'bahrain' in location:
            return 'Bahrain'
        if 'oman' in location:
            return 'Oman'
        if 'india' in location:
            return 'India'
        return self.current_location.split(',')[-1].strip() if ',' in self.current_location else self.current_location
    
    def _parse_availability_days(self):
        """Convert availability string to days."""
        if not self.desired_availability_to_join:
            return 30  # Default
        availability = self.desired_availability_to_join.lower()
        if 'immediate' in availability:
            return 0
        if '1 week' in availability or '7 day' in availability:
            return 7
        if '2 week' in availability or '14 day' in availability:
            return 14
        if '1 month' in availability or '30 day' in availability:
            return 30
        if '2 month' in availability or '60 day' in availability:
            return 60
        if '3 month' in availability or '90 day' in availability:
            return 90
        return 30
    
    def to_ml_engine_format(self):
        """
        Convert to ML engine Candidate schema format.
        Maps Django model fields to Pydantic schema expected by ML engine.
        """
        # Build employment summary from work experiences
        employment_entries = []
        for exp in self.work_experiences.all():
            entry = f"{exp.job_title} at {exp.company_name}"
            if exp.responsibilities:
                entry += f": {exp.responsibilities}"
            employment_entries.append(entry)
        employment_summary = ". ".join(employment_entries) if employment_entries else ""
        
        # Build education details
        education_details = []
        for edu in self.education_history.all():
            education_details.append({
                'education_level': edu.course,
                'field_of_study': edu.specialization,
                'university': edu.university,
                'country': None,
                'graduation_year': edu.end_date.year if edu.end_date else None,
            })
        
        # Build employment history
        employment_history = []
        for exp in self.work_experiences.all():
            employment_history.append({
                'company_name': exp.company_name,
                'job_title': exp.job_title,
                'industry': None,
                'functional_area': None,
                'location': None,
                'start_date': exp.start_date.strftime('%Y-%m') if exp.start_date else None,
                'end_date': 'Present' if exp.is_current else (exp.end_date.strftime('%Y-%m') if exp.end_date else None),
                'duration_months': None,
                'responsibilities': exp.responsibilities,
                'is_current': exp.is_current,
            })
        
        return {
            # Identity
            'candidate_id': str(self.id),
            'registration_number': self.registration_number,
            
            # Personal Information
            'full_name': self.user.get_full_name(),
            'date_of_birth': str(self.date_of_birth) if self.date_of_birth else None,
            'gender': self.gender.capitalize() if self.gender else None,
            'nationality': self.nationality or 'Not Specified',
            'marital_status': self.marital_status,
            
            # Location & Contact
            'current_country': self._parse_location_country(),
            'current_state': None,
            'current_city': self.current_location,
            'mobile_number': self.mobile_number,
            'alternative_mobile': self.alternative_mobile,
            'email': self.user.email,
            
            # Visa & Work Authorization
            'visa_status': self.visa_status,
            'visa_expiry': str(self.visa_expiry) if self.visa_expiry else None,
            'driving_license': 'Yes' if self.driving_license else None,
            'driving_license_country': self.driving_license_issued_from,
            
            # Language Skills
            'languages_known': self.languages_known,
            
            # Availability
            'availability_to_join_days': self._parse_availability_days(),
            
            # Compensation
            'current_salary': self.current_salary,
            'expected_salary': self.desired_monthly_salary if self.desired_monthly_salary is not None else 0,
            'currency': self.salary_currency,
            
            # Professional Profile
            'total_experience_years': float(self.total_experience_years),
            'gcc_experience_years': float(self.gcc_experience_years),
            'work_level': None,
            
            # Skills & Certifications
            'skills': self.all_skills,
            'professional_skills': self.professional_skills,
            'it_skills_certifications': self.it_skills,
            
            # Education
            'education_level': self._get_highest_education(),
            'education_details': education_details,
            
            # Employment History
            'employment_summary': employment_summary or self.professional_summary,
            'employment_history': employment_history,
            
            # Achievements & Portfolio
            'achievements': None,
            'honors_awards': None,
            
            # Preferences
            'preferred_industry': self.desired_industry,
            'preferred_sub_industry': self.desired_sub_industry,
            'preferred_functional_area': self.desired_functional_area,
            'preferred_designation': self.desired_designation_role,
            'preferred_job_location': self.desired_job_location,
            'job_search_status': self.job_search_status,
            
            # Social & External Links
            'linkedin_url': self.linkedin_profile if self.linkedin_profile else None,
            
            # CV Content (ML Input)
            'cv_text': self.cv_text,
            'cv_file_path': self.cv_file.path if self.cv_file else None,
        }


class WorkExperience(models.Model):
    """
    Candidate work experience with detailed fields.
    """
    candidate = models.ForeignKey(
        CandidateProfile,
        on_delete=models.CASCADE,
        related_name='work_experiences'
    )
    job_title = models.CharField(max_length=200)
    company_name = models.CharField(max_length=200)
    location = models.CharField(max_length=200, blank=True, null=True)  # e.g., "Dubai, United Arab Emirates"
    industry = models.CharField(max_length=200, blank=True, null=True)  # e.g., "Logistics, Shipping & Transport"
    functional_area = models.CharField(max_length=200, blank=True, null=True)  # e.g., "Freight Forwarding / Air / Sea / Land"
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=False)
    responsibilities = models.TextField(blank=True)
    achievements = models.TextField(blank=True, null=True)  # Bullet points of achievements

    class Meta:
        db_table = 'candidate_work_experience'
        verbose_name = "Work Experience"
        verbose_name_plural = "Work Experiences"
        ordering = ['-start_date']
    
    def __str__(self):
        return f"{self.job_title} at {self.company_name}"


class Education(models.Model):
    """
    Candidate education history and professional certifications.
    """
    candidate = models.ForeignKey(
        CandidateProfile,
        on_delete=models.CASCADE,
        related_name='education_history'
    )
    education_level = models.CharField(max_length=200, blank=True, null=True)  # e.g., "Bachelor", "Diploma"
    course = models.CharField(max_length=200)  # e.g., "Bachelor of Commerce"
    specialization = models.CharField(max_length=200, blank=True, null=True)
    university = models.CharField(max_length=200)
    country = models.CharField(max_length=100, blank=True, null=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    year = models.IntegerField(null=True, blank=True)  # For display as "Year 11 Months"

    class Meta:
        db_table = 'candidate_education'
        verbose_name = "Education"
        verbose_name_plural = "Education History"
        ordering = ['-start_date']
    
    def __str__(self):
        return f"{self.course} from {self.university}"


class MajorProject(models.Model):
    """
    Candidate major projects.
    """
    candidate = models.ForeignKey(
        CandidateProfile,
        on_delete=models.CASCADE,
        related_name='major_projects'
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    role = models.CharField(max_length=100)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'candidate_major_projects'
        verbose_name = "Major Project"
        verbose_name_plural = "Major Projects"
        ordering = ['-start_date']


class HonorAndAward(models.Model):
    """
    Candidate honors and awards.
    """
    candidate = models.ForeignKey(
        CandidateProfile,
        on_delete=models.CASCADE,
        related_name='honors_and_awards'
    )
    title = models.CharField(max_length=200)
    issuer = models.CharField(max_length=200)
    date_issued = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'candidate_honors_and_awards'
        verbose_name = "Honor and Award"
        verbose_name_plural = "Honors and Awards"
        ordering = ['-date_issued']


class ITSkillCertification(models.Model):
    """
    Candidate IT skills and certifications.
    """
    candidate = models.ForeignKey(
        CandidateProfile,
        on_delete=models.CASCADE,
        related_name='it_skill_certifications'
    )
    skill_name = models.CharField(max_length=100)
    version = models.CharField(max_length=50, blank=True)
    last_used = models.PositiveIntegerField(help_text="Year last used", null=True, blank=True)
    certification_name = models.CharField(max_length=200, blank=True)
    issuing_organization = models.CharField(max_length=200, blank=True)
    issue_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'candidate_it_skills'
        verbose_name = "IT Skill & Certification"
        verbose_name_plural = "IT Skills & Certifications"
        ordering = ['-issue_date', 'skill_name']


class Application(models.Model):
    """
    Job applications from candidates.
    """
    
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        UNDER_REVIEW = 'under_review', 'Under Review'
        SHORTLISTED = 'shortlisted', 'Shortlisted'
        INTERVIEW = 'interview', 'Interview Scheduled'
        OFFERED = 'offered', 'Offered'
        REJECTED = 'rejected', 'Rejected'
        WITHDRAWN = 'withdrawn', 'Withdrawn'
    
    candidate = models.ForeignKey(
        CandidateProfile,
        on_delete=models.CASCADE,
        related_name='applications'
    )
    job = models.ForeignKey(
        'jobs.Job',
        on_delete=models.CASCADE,
        related_name='applications'
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    cover_letter = models.TextField(blank=True)
    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Assessment Score (from ML Engine)
    assessment_score = models.FloatField(null=True, blank=True)
    assessment_data = models.JSONField(null=True, blank=True)
    assessed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'applications'
        unique_together = ['candidate', 'job']
        ordering = ['-applied_at']
    
    def __str__(self):
        return f"{self.candidate} - {self.job.title}"
