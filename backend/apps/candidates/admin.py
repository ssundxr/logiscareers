from django.contrib import admin
from .models import (
    CandidateProfile, Education, WorkExperience, Application,
    MajorProject, HonorAndAward, ITSkillCertification
)


class EducationInline(admin.TabularInline):
    model = Education
    extra = 0


class WorkExperienceInline(admin.TabularInline):
    model = WorkExperience
    extra = 0


class MajorProjectInline(admin.TabularInline):
    model = MajorProject
    extra = 0


class HonorAndAwardInline(admin.TabularInline):
    model = HonorAndAward
    extra = 0


class ITSkillCertificationInline(admin.TabularInline):
    model = ITSkillCertification
    extra = 0


@admin.register(CandidateProfile)
class CandidateProfileAdmin(admin.ModelAdmin):
    list_display = [
        'registration_number', 'get_full_name', 'current_location',
        'total_experience_months', 'gcc_experience_months',
        'created_at'
    ]
    list_filter = ['nationality', 'visa_status', 'gender', 'marital_status']
    search_fields = [
        'user__first_name', 'user__last_name', 
        'user__email', 'registration_number'
    ]
    inlines = [
        EducationInline, WorkExperienceInline, 
        MajorProjectInline, HonorAndAwardInline, 
        ITSkillCertificationInline
    ]
    readonly_fields = ['registration_number', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Personal Information', {
            'fields': ('user', 'registration_number', 'date_of_birth', 'gender', 
                      'marital_status', 'nationality', 'religion', 'photo')
        }),
        ('Contact Details', {
            'fields': ('mobile_number', 'alternative_mobile', 'alternative_email', 
                      'linkedin_profile', 'current_location', 'preferred_locations')
        }),
        ('Professional Summary', {
            'fields': ('professional_summary',)
        }),
        ('Languages & Skills', {
            'fields': ('languages_known', 'languages_spoken', 'professional_skills', 
                      'functional_skills', 'it_skills')
        }),
        ('Work Authorization', {
            'fields': ('driving_license', 'driving_license_issued_from', 
                      'visa_status', 'visa_expiry')
        }),
        ('Experience', {
            'fields': ('total_experience_months', 'gcc_experience_months')
        }),
        ('Salary & Availability', {
            'fields': ('current_salary', 'desired_monthly_salary', 'salary_currency',
                      'desired_availability_to_join')
        }),
        ('Career Preferences', {
            'fields': ('desired_industry', 'desired_sub_industry', 
                      'desired_functional_area', 'desired_designation_role',
                      'desired_job_location', 'job_search_status')
        }),
        ('CV/Resume', {
            'fields': ('cv_file', 'cv_text')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def get_full_name(self, obj):
        return obj.user.get_full_name()
    get_full_name.short_description = 'Full Name'


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = [
        'candidate', 'job', 'status', 'assessment_score',
        'applied_at', 'updated_at'
    ]
    list_filter = ['status', 'job']
    search_fields = [
        'candidate__user__first_name',
        'candidate__user__last_name',
        'candidate__registration_number'
    ]
    ordering = ['-applied_at']
