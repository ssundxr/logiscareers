import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { jobService, applicationService } from '../../services/api';
import './Candidate.css';

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchJobAndCheckApplication();
  }, [id]);

  const fetchJobAndCheckApplication = async () => {
    try {
      const [jobResponse, applicationsResponse] = await Promise.all([
        jobService.getPublicJob(id),
        applicationService.getMyApplications()
      ]);
      
      setJob(jobResponse.data);
      
      // Check if user has already applied
      const applications = applicationsResponse.data.results || applicationsResponse.data;
      const applied = applications.some(app => app.job?.id === parseInt(id));
      setHasApplied(applied);
    } catch (error) {
      console.error('Failed to fetch job:', error);
      setError('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    setError('');
    
    try {
      await applicationService.apply({ job: parseInt(id) });
      setHasApplied(true);
    } catch (error) {
      console.error('Failed to apply:', error);
      setError(error.response?.data?.detail || 'Failed to submit application. Please complete your profile first.');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  if (!job) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">Job not found</p>
        <button className="btn btn-secondary" onClick={() => navigate('/candidate/jobs')}>
          Browse Jobs
        </button>
      </div>
    );
  }

  return (
    <div className="job-detail-page">
      {/* Back Link */}
      <Link to="/candidate/jobs" className="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="19" y1="12" x2="5" y2="12"/>
          <polyline points="12,19 5,12 12,5"/>
        </svg>
        Back to Jobs
      </Link>

      <div className="job-detail-card">
        {/* Header */}
        <div className="job-detail-header">
          <h1>{job.title}</h1>
          <p className="company-name">{job.company_name}</p>
          
          <div className="job-detail-meta">
            <div className="meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              {job.location}
            </div>
            <div className="meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
              {job.employment_type?.replace('_', ' ') || 'Full-time'}
            </div>
            <div className="meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              {job.salary_min && job.salary_max 
                ? `AED ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`
                : 'Competitive'}
            </div>
            <div className="meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
              {job.min_experience_years} - {job.max_experience_years} years experience
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="job-detail-body">
          {/* Description */}
          <div className="job-section">
            <h2>Job Description</h2>
            <p style={{ whiteSpace: 'pre-wrap' }}>{job.description}</p>
          </div>

          {/* Responsibilities */}
          {job.responsibilities && (
            <div className="job-section">
              <h2>Responsibilities</h2>
              <p style={{ whiteSpace: 'pre-wrap' }}>{job.responsibilities}</p>
            </div>
          )}

          {/* Requirements */}
          <div className="job-section">
            <h2>Requirements</h2>
            <ul>
              <li>Minimum {job.min_experience_years} years of experience</li>
              {job.min_gcc_experience_years > 0 && (
                <li>At least {job.min_gcc_experience_years} years GCC experience</li>
              )}
              <li>{job.education_requirement || 'Bachelor\'s degree or equivalent'}</li>
              {job.certifications_required?.length > 0 && (
                <li>Certifications: {job.certifications_required.join(', ')}</li>
              )}
            </ul>
          </div>

          {/* Required Skills */}
          {job.required_skills?.length > 0 && (
            <div className="job-section">
              <h2>Required Skills</h2>
              <ul className="skills-list">
                {job.required_skills.map((skill, index) => (
                  <li key={index}>{skill}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preferred Skills */}
          {job.preferred_skills?.length > 0 && (
            <div className="job-section">
              <h2>Preferred Skills</h2>
              <ul className="skills-list">
                {job.preferred_skills.map((skill, index) => (
                  <li key={index}>{skill}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Industry */}
          {(job.industry || job.sub_industry) && (
            <div className="job-section">
              <h2>Industry</h2>
              <p>
                {job.industry}
                {job.sub_industry && ` - ${job.sub_industry}`}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="job-detail-footer">
          <span className="posted-date">
            Posted on {new Date(job.created_at).toLocaleDateString()}
          </span>
          
          {error && <p className="text-danger">{error}</p>}
          
          {hasApplied ? (
            <span className="already-applied">Application Submitted</span>
          ) : (
            <button 
              className="btn btn-primary apply-btn"
              onClick={handleApply}
              disabled={applying}
            >
              {applying ? 'Applying...' : 'Apply Now'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
