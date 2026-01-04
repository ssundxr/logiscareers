import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { candidateService } from '../../services/api';
import './Admin.css';

const CandidateDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCandidate();
  }, [id]);

  const fetchCandidate = async () => {
    try {
      const response = await candidateService.getFullProfile(id);
      setCandidate(response.data);
    } catch (error) {
      console.error('Failed to fetch candidate:', error);
      navigate('/admin/candidates');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  if (!candidate) {
    return null;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{candidate.user_first_name} {candidate.user_last_name}</h1>
          <p className="text-gray">{candidate.registration_number}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>

      <div className="candidate-detail-grid">
        {/* Personal Information */}
        <div className="card">
          <div className="card-header">
            <h3>Personal Information</h3>
          </div>
          <div className="card-body">
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Email</span>
                <span className="detail-value">{candidate.user_email}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Phone</span>
                <span className="detail-value">{candidate.mobile_number || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Location</span>
                <span className="detail-value">{candidate.current_location || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Nationality</span>
                <span className="detail-value">{candidate.nationality || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Gender</span>
                <span className="detail-value">{candidate.gender || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Visa Status</span>
                <span className="detail-value">{candidate.visa_status || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Experience */}
        <div className="card">
          <div className="card-header">
            <h3>Experience</h3>
          </div>
          <div className="card-body">
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Total Experience</span>
                <span className="detail-value">{candidate.total_experience_years?.toFixed(1) || 0} years</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">GCC Experience</span>
                <span className="detail-value">{candidate.gcc_experience_years?.toFixed(1) || 0} years</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Current Salary</span>
                <span className="detail-value">
                  {candidate.current_salary 
                    ? `${candidate.salary_currency} ${candidate.current_salary.toLocaleString()}`
                    : '-'
                  }
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Expected Salary</span>
                <span className="detail-value">
                  {candidate.desired_monthly_salary 
                    ? `${candidate.salary_currency} ${candidate.desired_monthly_salary.toLocaleString()}`
                    : '-'
                  }
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Availability</span>
                <span className="detail-value">{candidate.desired_availability_to_join || '-'}</span>
              </div>
            </div>

            {candidate.experience_entries?.length > 0 && (
              <div className="mt-6">
                <h4 className="mb-4">Work History</h4>
                {candidate.experience_entries.map((exp, index) => (
                  <div key={index} className="experience-item">
                    <h5 className="font-semibold">{exp.job_title}</h5>
                    <p className="text-gray">{exp.company_name}</p>
                    <p className="text-sm text-gray">
                      {exp.start_date} - {exp.is_current ? 'Present' : exp.end_date}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Education */}
        <div className="card">
          <div className="card-header">
            <h3>Education</h3>
          </div>
          <div className="card-body">
            {candidate.education_entries?.length > 0 ? (
              candidate.education_entries.map((edu, index) => (
                <div key={index} className="education-item">
                  <h5 className="font-semibold">{edu.course}</h5>
                  <p className="text-gray">{edu.university}</p>
                  {edu.specialization && (
                    <p className="text-sm text-gray">{edu.specialization}</p>
                  )}
                  {edu.end_date && (
                    <p className="text-sm text-gray">Completed: {edu.end_date}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray">No education details available.</p>
            )}
          </div>
        </div>

        {/* Skills */}
        <div className="card">
          <div className="card-header">
            <h3>Skills</h3>
          </div>
          <div className="card-body">
            {candidate.professional_skills?.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-medium mb-2">Professional Skills</h5>
                <div className="skills-list">
                  {candidate.professional_skills.map((skill, index) => (
                    <span key={index} className="skill-tag">{skill}</span>
                  ))}
                </div>
              </div>
            )}
            
            {candidate.functional_skills?.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-medium mb-2">Functional Skills</h5>
                <div className="skills-list">
                  {candidate.functional_skills.map((skill, index) => (
                    <span key={index} className="skill-tag">{skill}</span>
                  ))}
                </div>
              </div>
            )}
            
            {candidate.it_skills?.length > 0 && (
              <div>
                <h5 className="text-sm font-medium mb-2">IT Skills</h5>
                <div className="skills-list">
                  {candidate.it_skills.map((skill, index) => (
                    <span key={index} className="skill-tag">{skill}</span>
                  ))}
                </div>
              </div>
            )}
            
            {!candidate.professional_skills?.length && 
             !candidate.functional_skills?.length && 
             !candidate.it_skills?.length && (
              <p className="text-gray">No skills listed.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateDetail;
