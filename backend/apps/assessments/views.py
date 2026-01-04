"""
Views for AI Assessment functionality.
Provides comprehensive field-by-field AI assessment with explanations.

Author: Senior SDE/ML Architect
Date: January 4, 2026
"""

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone

from apps.candidates.models import CandidateProfile, Application
from apps.jobs.models import Job
from .ml_engine_service import ml_engine


class IsAdminUser(permissions.BasePermission):
    """Permission for admin/recruiter users."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_admin_user


class AssessmentViewSet(viewsets.ViewSet):
    """
    ViewSet for AI Assessment operations.
    Provides comprehensive field-by-field assessment with explanations.
    """
    permission_classes = [IsAdminUser]
    
    @action(detail=False, methods=['post'])
    def evaluate(self, request):
        """
        Evaluate a candidate against a job with comprehensive field-by-field assessment.
        
        Request body:
        {
            "candidate_id": 1,
            "job_id": 1
        }
        
        Returns detailed per-field scoring with AI explanations.
        """
        candidate_id = request.data.get('candidate_id')
        job_id = request.data.get('job_id')
        
        if not candidate_id or not job_id:
            return Response(
                {'detail': 'Both candidate_id and job_id are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get candidate and job
        candidate = get_object_or_404(CandidateProfile, id=candidate_id)
        job = get_object_or_404(Job, id=job_id)
        
        # Convert to ML engine format
        candidate_data = candidate.to_ml_engine_format()
        job_data = job.to_ml_engine_format()
        
        # Run comprehensive evaluation
        result = ml_engine.evaluate_candidate(candidate_data, job_data)
        
        # Add metadata
        result['candidate'] = {
            'id': candidate.id,
            'registration_number': candidate.registration_number,
            'name': candidate.user.get_full_name(),
            'email': candidate.user.email,
            'mobile_number': candidate.mobile_number,
            'photo': candidate.photo.url if candidate.photo else None,
        }
        result['job'] = {
            'id': job.id,
            'title': job.title,
            'reference_number': job.reference_number,
            'company_name': job.company_name,
        }
        result['evaluated_at'] = timezone.now().isoformat()
        
        return Response(result)
    
    @action(detail=False, methods=['post'])
    def evaluate_application(self, request):
        """
        Evaluate an existing application.
        
        Request body:
        {
            "application_id": 1
        }
        """
        application_id = request.data.get('application_id')
        
        if not application_id:
            return Response(
                {'detail': 'application_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Fetch fresh data with all related objects to avoid using cached/stale data
        application = get_object_or_404(
            Application.objects.select_related('candidate__user', 'job').prefetch_related(
                'candidate__work_experiences',
                'candidate__education_history',
                'candidate__it_skill_certifications',
                'candidate__major_projects',
                'candidate__honors_and_awards'
            ),
            id=application_id
        )
        
        # Force refresh from database to get latest updates
        application.candidate.refresh_from_db()
        
        # Convert to ML engine format
        candidate_data = application.candidate.to_ml_engine_format()
        job_data = application.job.to_ml_engine_format()
        
        # Run evaluation
        result = ml_engine.evaluate_candidate(candidate_data, job_data)
        
        # Save assessment to application
        application.assessment_score = result['total_score']
        application.assessment_data = result
        application.assessed_at = timezone.now()
        application.save()
        
        # Add metadata
        result['application_id'] = application.id
        result['candidate'] = {
            'id': application.candidate.id,
            'registration_number': application.candidate.registration_number,
            'name': application.candidate.user.get_full_name(),
        }
        result['job'] = {
            'id': application.job.id,
            'title': application.job.title,
            'reference_number': application.job.reference_number,
        }
        result['evaluated_at'] = application.assessed_at.isoformat()
        
        return Response(result)
    
    @action(detail=False, methods=['post'])
    def batch_evaluate(self, request):
        """
        Evaluate multiple applications for a job.
        
        Request body:
        {
            "job_id": 1,
            "application_ids": [1, 2, 3]  // Optional, evaluates all if not provided
        }
        """
        job_id = request.data.get('job_id')
        application_ids = request.data.get('application_ids')
        
        if not job_id:
            return Response(
                {'detail': 'job_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        job = get_object_or_404(Job, id=job_id)
        job_data = job.to_ml_engine_format()
        
        # Get applications with prefetched related data to avoid N+1 queries
        applications = Application.objects.filter(job=job).select_related(
            'candidate__user'
        ).prefetch_related(
            'candidate__work_experiences',
            'candidate__education',
            'candidate__certifications',
            'candidate__skills',
            'candidate__major_projects',
            'candidate__honors_and_awards'
        )
        if application_ids:
            applications = applications.filter(id__in=application_ids)
        
        results = []
        applications_to_update = []
        now = timezone.now()
        
        for application in applications:
            try:
                candidate_data = application.candidate.to_ml_engine_format()
                result = ml_engine.evaluate_candidate(candidate_data, job_data)
                
                # Prepare for bulk update
                application.assessment_score = result['total_score']
                application.assessment_data = result
                application.assessed_at = now
                applications_to_update.append(application)
                
                results.append({
                    'application_id': application.id,
                    'candidate_id': application.candidate.id,
                    'candidate_name': application.candidate.user.get_full_name(),
                    'registration_number': application.candidate.registration_number,
                    'total_score': result['total_score'],
                    'is_rejected': result.get('is_rejected', False),
                    'confidence_level': result.get('confidence', {}).get('level', 'unknown'),
                    'status': 'success'
                })
            except Exception as e:
                results.append({
                    'application_id': application.id,
                    'candidate_id': application.candidate.id,
                    'candidate_name': application.candidate.user.get_full_name(),
                    'status': 'error',
                    'error': str(e)
                })
        
        # Bulk update applications
        if applications_to_update:
            Application.objects.bulk_update(
                applications_to_update,
                ['assessment_score', 'assessment_data', 'assessed_at']
            )
        
        # Sort by score descending
        results.sort(key=lambda x: x.get('total_score', 0), reverse=True)
        
        return Response({
            'job': {
                'id': job.id,
                'title': job.title,
            },
            'total_evaluated': len(results),
            'results': results,
            'evaluated_at': timezone.now().isoformat(),
        })
    
    @action(detail=False, methods=['get'])
    def get_assessment(self, request):
        """
        Get comprehensive assessment details for an application.
        Returns per-field scoring with AI explanations.
        
        Query params:
        - application_id: ID of the application
        """
        application_id = request.query_params.get('application_id')
        
        if not application_id:
            return Response(
                {'detail': 'application_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        application = get_object_or_404(
            Application.objects.select_related('candidate__user', 'job'),
            id=application_id
        )
        
        if not application.assessment_data:
            return Response(
                {'detail': 'No assessment found for this application.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Build comprehensive response with all assessment data
        assessment = application.assessment_data
        candidate = application.candidate
        job = application.job
        
        # Build detailed candidate profile for comparison
        candidate_profile = {
            'id': candidate.id,
            'registration_number': candidate.registration_number,
            'name': candidate.user.get_full_name(),
            'email': candidate.user.email,
            'mobile_number': candidate.mobile_number,
            'current_location': candidate.current_location,
            'current_salary': candidate.current_salary,
            'expected_salary': candidate.desired_monthly_salary,
            'total_experience_months': candidate.total_experience_months,
            'total_experience_years': round(candidate.total_experience_months / 12, 1),
            'gcc_experience_months': candidate.gcc_experience_months,
            'gcc_experience_years': round(candidate.gcc_experience_months / 12, 1),
            'availability_to_join': candidate.desired_availability_to_join,
            'photo': candidate.photo.url if candidate.photo else None,
            'nationality': candidate.nationality,
            'visa_status': candidate.visa_status,
            'gender': candidate.gender,
            'professional_skills': candidate.professional_skills,
            'functional_skills': candidate.functional_skills,
            'it_skills': candidate.it_skills,
        }
        
        # Build job details for comparison
        job_details = {
            'id': job.id,
            'title': job.title,
            'reference_number': job.reference_number,
            'company_name': job.company_name,
            'location': job.location,
            'salary_min': job.salary_min,
            'salary_max': job.salary_max,
            'salary_currency': job.salary_currency,
            'min_experience_years': job.min_experience_years,
            'max_experience_years': job.max_experience_years,
            'required_skills': job.required_skills,
            'preferred_skills': job.preferred_skills,
            'required_education': job.required_education,
            'industry': job.industry,
            'sub_industry': job.sub_industry,
            'functional_area': job.functional_area,
        }
        
        response = {
            'application_id': application.id,
            'candidate': candidate_profile,
            'job': job_details,
            'assessment': {
                'total_score': assessment.get('total_score', 0),
                'raw_score': assessment.get('raw_score', 0),
                'is_rejected': assessment.get('is_rejected', False),
                'rejection_reasons': assessment.get('rejection_reasons', []),
                'section_scores': assessment.get('section_scores', {}),
                'field_assessments': assessment.get('field_assessments', []),
                'cv_assessment': assessment.get('cv_assessment'),
                'contextual_adjustments': assessment.get('contextual_adjustments', []),
                'total_adjustment': assessment.get('total_adjustment', 0),
                'feature_interactions': assessment.get('feature_interactions', []),
                'confidence': assessment.get('confidence', {}),
                'recommendation': assessment.get('recommendation', ''),
                'overall_explanation': assessment.get('overall_explanation', ''),
            },
            'assessed_at': application.assessed_at.isoformat() if application.assessed_at else None,
            'cv_data': self._build_cv_comparison(candidate),
            'jd_data': self._build_jd_comparison(job),
        }
        
        return Response(response)
    
    def _build_cv_comparison(self, candidate: CandidateProfile) -> dict:
        """Build comprehensive CV data for side-by-side comparison."""
        # Get work experience details
        work_experiences = []
        for exp in candidate.work_experiences.all():
            work_experiences.append({
                'job_title': exp.job_title,
                'company_name': exp.company_name,
                'location': exp.location,
                'industry': exp.industry,
                'functional_area': exp.functional_area,
                'start_date': str(exp.start_date) if exp.start_date else None,
                'end_date': str(exp.end_date) if exp.end_date else 'Present',
                'is_current': exp.is_current,
                'responsibilities': exp.responsibilities,
                'achievements': exp.achievements,
            })
        
        # Get education details
        education_list = []
        for edu in candidate.education_history.all():
            education_list.append({
                'level': edu.education_level or edu.course,
                'degree': edu.course,
                'specialization': edu.specialization,
                'institution': edu.university,
                'country': edu.country,
                'year': edu.end_date.year if edu.end_date else edu.year,
            })
        
        # Get certifications
        certifications = []
        for cert in candidate.it_skill_certifications.all():
            certifications.append({
                'skill_name': cert.skill_name,
                'version': cert.version,
                'certification_name': cert.certification_name,
                'issuing_organization': cert.issuing_organization,
                'issue_date': str(cert.issue_date) if cert.issue_date else None,
                'expiry_date': str(cert.expiry_date) if cert.expiry_date else None,
            })
        
        # Get projects
        projects = []
        for proj in candidate.major_projects.all():
            projects.append({
                'title': proj.title,
                'description': proj.description,
                'role': proj.role,
            })
        
        # Get honors and awards
        awards = []
        for award in candidate.honors_and_awards.all():
            awards.append({
                'title': award.title,
                'issuer': award.issuer,
                'date_issued': str(award.date_issued) if award.date_issued else None,
            })
        
        return {
            'personal_details': {
                'date_of_birth': str(candidate.date_of_birth) if candidate.date_of_birth else '',
                'marital_status': candidate.marital_status,
                'gender': candidate.gender,
                'nationality': candidate.nationality,
                'languages_known': ', '.join(candidate.languages_known) if candidate.languages_known else (candidate.languages_spoken or ''),
                'religion': candidate.religion,
                'driving_license': 'Yes' if candidate.driving_license else 'No',
                'driving_license_country': candidate.driving_license_issued_from,
                'visa_status': candidate.visa_status,
                'visa_expiry': str(candidate.visa_expiry) if candidate.visa_expiry else '',
                'expected_salary': candidate.desired_monthly_salary,
                'current_salary': candidate.current_salary,
                'current_location': candidate.current_location,
                'availability_to_join': candidate.desired_availability_to_join,
            },
            'education': education_list,
            'experience': {
                'total_experience': f"{round(candidate.total_experience_months / 12, 1)} Years ({candidate.total_experience_months} Months)",
                'gcc_experience': f"{round(candidate.gcc_experience_months / 12, 1)} Years ({candidate.gcc_experience_months} Months)",
                'entries': work_experiences,
            },
            'skills': {
                'professional_skills': candidate.professional_skills,
                'functional_skills': candidate.functional_skills,
                'it_skills': candidate.it_skills,
                'all_skills': list(set(candidate.professional_skills + candidate.functional_skills + candidate.it_skills)),
            },
            'certifications': certifications,
            'projects': projects,
            'awards': awards,
            'keywords': self._extract_keywords_from_experience(candidate),
            'cv_text': candidate.cv_text[:500] + '...' if candidate.cv_text and len(candidate.cv_text) > 500 else candidate.cv_text,
        }
    
    def _build_jd_comparison(self, job: Job) -> dict:
        """Build comprehensive JD data for side-by-side comparison."""
        return {
            'personal_details': {
                'salary': f"From {job.salary_currency} {job.salary_min:,} - {job.salary_currency} {job.salary_max:,}" if job.salary_min and job.salary_max else 'Negotiable',
                'salary_min': job.salary_min,
                'salary_max': job.salary_max,
                'salary_currency': job.salary_currency,
                'current_location': job.location,
                'preferred_locations': job.preferred_locations,
                'preferred_nationality': job.nationality,
                'gender_preference': job.gender_preference,
                'required_date_of_joining': job.required_date_of_joining,
            },
            'education': {
                'required': job.required_education,
                'preferred': job.preferred_education,
            },
            'experience': {
                'total_experience': f"{job.min_experience_years} - {job.max_experience_years} Years",
                'min_years': job.min_experience_years,
                'max_years': job.max_experience_years,
                'gcc_experience': f"{job.min_gcc_experience_years} Years minimum" if job.min_gcc_experience_years > 0 else 'Not required',
                'min_gcc_years': job.min_gcc_experience_years,
                'industry': job.industry,
                'sub_industry': job.sub_industry,
                'functional_area': job.functional_area,
                'designation': job.designation,
                'job_level': job.job_level,
            },
            'skills': {
                'required_skills': job.required_skills,
                'preferred_skills': job.preferred_skills,
                'required_count': len(job.required_skills) if job.required_skills else 0,
                'preferred_count': len(job.preferred_skills) if job.preferred_skills else 0,
            },
            'keywords': {
                'responsibilities': job.responsibilities,
                'description': job.description,
                'candidate_profile': job.candidate_profile,
                'keywords': job.keywords,
            },
            'job_info': {
                'title': job.title,
                'company_name': job.company_name,
                'department': job.department,
                'job_type': job.job_type,
                'vacancies': job.vacancies,
                'is_remote': job.is_remote,
                'benefits': job.benefits,
            }
        }
    
    def _extract_keywords_from_experience(self, candidate: CandidateProfile) -> str:
        """Extract responsibility keywords from work experience."""
        responsibilities = []
        for exp in candidate.work_experiences.all():
            if exp.responsibilities:
                responsibilities.append(exp.responsibilities)
        return '\n\n'.join(responsibilities)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def engine_status(request):
    """Check ML engine status."""
    return Response({
        'available': ml_engine.is_available,
        'version': '2.0.0',
        'features': [
            'skills_scoring',
            'experience_scoring',
            'education_scoring',
            'salary_scoring',
            'domain_scoring',
            'contextual_adjustments',
            'confidence_calculation',
            'feature_interactions',
            'smart_weights',
        ]
    })
