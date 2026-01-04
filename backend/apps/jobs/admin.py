from django.contrib import admin
from .models import Job


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'reference_number', 'company_name', 
        'status', 'job_level', 'location', 'created_at'
    ]
    list_filter = ['status', 'job_level', 'is_gcc_location', 'industry']
    search_fields = ['title', 'description', 'company_name', 'reference_number']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
