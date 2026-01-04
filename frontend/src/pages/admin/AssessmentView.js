import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assessmentService } from '../../services/api';
import './AssessmentView.css';

/**
 * Enhanced AI Assessment View Component
 * Displays comprehensive field-by-field scoring with AI explanations
 */
const AssessmentView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assessment');
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    fetchAssessment();
  }, [id]);

  const fetchAssessment = async () => {
    try {
      const response = await assessmentService.getAssessment(id);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch assessment:', error);
      try {
        await assessmentService.evaluateApplication(id);
        const response = await assessmentService.getAssessment(id);
        setData(response.data);
      } catch (evalError) {
        console.error('Failed to evaluate:', evalError);
      }
    } finally {
      setLoading(false);
    }
  };

  const getScoreClass = (score) => {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'average';
    return 'poor';
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#84cc16';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const getMatchLevelIcon = (level) => {
    switch (level) {
      case 'excellent': return '✓✓';
      case 'good': return '✓';
      case 'partial': return '~';
      case 'poor': return '✗';
      default: return '-';
    }
  };

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const formatLabel = (key) => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Running AI Assessment...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">Assessment not available</p>
        <p>Unable to load or generate assessment for this application.</p>
        <button className="btn btn-secondary mt-4" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    );
  }

  const { candidate, job, assessment, cv_data, jd_data } = data;
  const sectionScores = assessment.section_scores || {};
  const fieldAssessments = assessment.field_assessments || [];
  const cvAssessment = assessment.cv_assessment;

  // Group field assessments by section
  const groupedFields = fieldAssessments.reduce((acc, field) => {
    if (!acc[field.section]) {
      acc[field.section] = [];
    }
    acc[field.section].push(field);
    return acc;
  }, {});

  return (
    <div className="assessment-page">
      {/* Header */}
      <div className="assessment-header">
        <div className="candidate-header-info">
          <div className="candidate-avatar">
            {candidate.photo ? (
              <img src={candidate.photo} alt={candidate.name} />
            ) : (
              <div className="avatar-placeholder">
                {candidate.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="candidate-header-details">
            <h1>{candidate.name}</h1>
            <p className="candidate-position">{job.title}, {job.company_name}</p>
            <div className="candidate-meta">
              <span>Email: {candidate.email}</span>
              <span>Mobile: {candidate.mobile_number || '-'}</span>
              <span>Location: {candidate.current_location || '-'}</span>
            </div>
            <div className="candidate-meta">
              <span>Current: AED {candidate.current_salary?.toLocaleString() || '-'}</span>
              <span>Expected: AED {candidate.expected_salary?.toLocaleString() || '-'}</span>
              <span>Exp: {candidate.total_experience_years || '-'} yrs</span>
              <span>GCC: {candidate.gcc_experience_years || '-'} yrs</span>
            </div>
          </div>
          <div className="candidate-reg">
            <span className="reg-label">REG NO</span>
            <span className="reg-number">{candidate.registration_number}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="assessment-tabs">
          <button 
            className={`tab ${activeTab === 'assessment' ? 'active' : ''}`}
            onClick={() => setActiveTab('assessment')}
          >
            AI Assessment
          </button>
          <button 
            className={`tab ${activeTab === 'cv_analysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('cv_analysis')}
          >
            CV Analysis
          </button>
          <button 
            className={`tab ${activeTab === 'comparison' ? 'active' : ''}`}
            onClick={() => setActiveTab('comparison')}
          >
            CV vs JD
          </button>
        </div>
      </div>

      {/* Assessment Content */}
      {activeTab === 'assessment' && (
        <div className="assessment-content">
          {/* Left Column - Overall Scores */}
          <div className="scores-column">
            {/* Total Score */}
            <div className="total-score-card">
              <h3>AI Assessment Score</h3>
              <div 
                className={`score-circle-large ${assessment.is_rejected ? 'poor' : getScoreClass(assessment.total_score)}`}
                style={{ borderColor: assessment.is_rejected ? '#ef4444' : getScoreColor(assessment.total_score) }}
              >
                <span style={{ color: assessment.is_rejected ? '#ef4444' : getScoreColor(assessment.total_score) }}>
                  {assessment.is_rejected ? 'REJECTED' : `${Math.round(assessment.total_score)}%`}
                </span>
              </div>
              {assessment.is_rejected && assessment.raw_score > 0 && (
                <p className="raw-score-info">
                  Raw Score: {Math.round(assessment.raw_score)}%
                </p>
              )}
              <p className="recommendation-badge" style={{
                backgroundColor: assessment.is_rejected ? '#ef4444' :
                               assessment.recommendation?.includes('HIGHLY') ? '#22c55e' :
                               assessment.recommendation?.includes('RECOMMENDED') ? '#84cc16' :
                               assessment.recommendation?.includes('CONSIDER') ? '#f59e0b' : '#f59e0b'
              }}>
                {assessment.is_rejected ? 'NOT RECOMMENDED' : (assessment.recommendation?.split(' - ')[0] || 'PENDING')}
              </p>
            </div>

            {/* Rejection Reasons */}
            {assessment.is_rejected && assessment.rejection_reasons?.length > 0 && (
              <div className="rejection-card">
                <h4>Hard Rejection Criteria</h4>
                <ul className="rejection-list">
                  {assessment.rejection_reasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Overall Explanation */}
            <div className="explanation-card">
              <h4>🤖 AI Analysis Summary</h4>
              <p>{assessment.overall_explanation || 'Assessment completed. Review field-by-field analysis for details.'}</p>
            </div>

            {/* Section Score Bars */}
            <div className="section-scores-card">
              <h4>Section Breakdown</h4>
              {Object.entries(sectionScores).map(([key, section]) => (
                <div key={key} className="section-score-row">
                  <span className="section-label">{formatLabel(key)}</span>
                  <div className="section-bar-container">
                    <div 
                      className={`section-bar-fill ${getScoreClass(section.score)}`}
                      style={{ width: `${section.score}%` }}
                    ></div>
                  </div>
                  <span className="section-percentage">{Math.round(section.score)}%</span>
                </div>
              ))}
            </div>

            {/* Contextual Adjustments */}
            {assessment.contextual_adjustments?.length > 0 && (
              <div className="adjustments-card">
                <h4>AI Adjustments</h4>
                {assessment.contextual_adjustments.map((adj, index) => (
                  <div key={index} className={`adjustment-item ${adj.points > 0 ? 'positive' : 'negative'}`}>
                    <div className="adjustment-content">
                      <span className="adjustment-rule">{adj.rule}</span>
                      <span className="adjustment-reason">{adj.reason}</span>
                    </div>
                    <span className="adjustment-points">
                      {adj.points > 0 ? '+' : ''}{adj.points}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Confidence */}
            {assessment.confidence && (
              <div className="confidence-card">
                <h4>Assessment Confidence</h4>
                <div className={`confidence-badge ${assessment.confidence.level}`}>
                  {assessment.confidence.level?.toUpperCase()}
                </div>
                <p className="confidence-score">
                  Data completeness: {Math.round((assessment.confidence.score || 0) * 100)}%
                </p>
              </div>
            )}
          </div>

          {/* Right Column - Field-by-Field Details */}
          <div className="details-column">
            <h3 className="details-header">Field-by-Field AI Assessment</h3>
            
            {Object.entries(groupedFields).map(([sectionName, fields]) => (
              <div key={sectionName} className="field-section-card">
                <div 
                  className="field-section-header"
                  onClick={() => toggleSection(sectionName)}
                >
                  <h4>{sectionName}</h4>
                  <span className="section-toggle">{expandedSections[sectionName] === false ? '▶' : '▼'}</span>
                </div>
                
                {expandedSections[sectionName] !== false && (
                  <div className="field-list">
                    {fields.map((field, index) => (
                      <div key={index} className={`field-assessment-row ${field.match_level}`}>
                        <div className="field-header">
                          <span className="field-name">{field.field}</span>
                          <div className="field-score-badge">
                            <span className={`match-icon ${field.match_level}`}>
                              {getMatchLevelIcon(field.match_level)}
                            </span>
                            <span className={`field-score ${getScoreClass(field.score)}`}>
                              {field.score}%
                            </span>
                          </div>
                        </div>
                        <div className="field-comparison">
                          <div className="field-value candidate">
                            <span className="label">Candidate:</span>
                            <span className="value">
                              {Array.isArray(field.candidate_value) 
                                ? field.candidate_value.join(', ') 
                                : String(field.candidate_value || '-')}
                            </span>
                          </div>
                          <div className="field-value job">
                            <span className="label">Required:</span>
                            <span className="value">
                              {Array.isArray(field.job_requirement) 
                                ? field.job_requirement.join(', ') 
                                : String(field.job_requirement || '-')}
                            </span>
                          </div>
                        </div>
                        <div className="field-explanation">
                          <span className="ai-icon">🤖</span>
                          <p>{field.explanation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CV Analysis Tab */}
      {activeTab === 'cv_analysis' && cvAssessment && (
        <div className="cv-analysis-content">
          <div className="cv-scores-grid">
            <div className="cv-score-card">
              <h4>Overall CV Score</h4>
              <div className={`cv-score-circle ${getScoreClass(cvAssessment.cv_score)}`}>
                {cvAssessment.cv_score}%
              </div>
            </div>
            <div className="cv-score-card">
              <h4>CV Quality</h4>
              <div className={`cv-score-circle ${getScoreClass(cvAssessment.cv_quality_score)}`}>
                {cvAssessment.cv_quality_score}%
              </div>
            </div>
            <div className="cv-score-card">
              <h4>Content Relevance</h4>
              <div className={`cv-score-circle ${getScoreClass(cvAssessment.content_relevance_score)}`}>
                {cvAssessment.content_relevance_score}%
              </div>
            </div>
            <div className="cv-score-card">
              <h4>Keyword Match</h4>
              <div className={`cv-score-circle ${getScoreClass(cvAssessment.keyword_match_score)}`}>
                {cvAssessment.keyword_match_score}%
              </div>
            </div>
          </div>

          <div className="cv-details-grid">
            <div className="cv-keywords-card">
              <h4>✓ Matched Keywords</h4>
              <div className="keywords-list matched">
                {cvAssessment.matched_keywords?.map((keyword, i) => (
                  <span key={i} className="keyword-tag matched">{keyword}</span>
                ))}
                {(!cvAssessment.matched_keywords || cvAssessment.matched_keywords.length === 0) && (
                  <p className="no-keywords">No keywords matched</p>
                )}
              </div>
            </div>
            <div className="cv-keywords-card">
              <h4>✗ Missing Keywords</h4>
              <div className="keywords-list missing">
                {cvAssessment.missing_keywords?.map((keyword, i) => (
                  <span key={i} className="keyword-tag missing">{keyword}</span>
                ))}
                {(!cvAssessment.missing_keywords || cvAssessment.missing_keywords.length === 0) && (
                  <p className="no-keywords">No critical keywords missing</p>
                )}
              </div>
            </div>
          </div>

          <div className="cv-explanation-card">
            <h4>🤖 CV Analysis Summary</h4>
            <p>{cvAssessment.explanation}</p>
          </div>

          {cvAssessment.cv_insights && (
            <div className="cv-insights-card">
              <h4>CV Quality Insights</h4>
              <div className="insights-grid">
                <div className="insight-item">
                  <span className="insight-label">Word Count</span>
                  <span className="insight-value">{cvAssessment.cv_insights.word_count || 'N/A'}</span>
                </div>
                <div className="insight-item">
                  <span className="insight-label">Has Email</span>
                  <span className={`insight-value ${cvAssessment.cv_insights.has_email ? 'yes' : 'no'}`}>
                    {cvAssessment.cv_insights.has_email ? '✓' : '✗'}
                  </span>
                </div>
                <div className="insight-item">
                  <span className="insight-label">Has Phone</span>
                  <span className={`insight-value ${cvAssessment.cv_insights.has_phone ? 'yes' : 'no'}`}>
                    {cvAssessment.cv_insights.has_phone ? '✓' : '✗'}
                  </span>
                </div>
                <div className="insight-item">
                  <span className="insight-label">Has LinkedIn</span>
                  <span className={`insight-value ${cvAssessment.cv_insights.has_linkedin ? 'yes' : 'no'}`}>
                    {cvAssessment.cv_insights.has_linkedin ? '✓' : '✗'}
                  </span>
                </div>
                <div className="insight-item">
                  <span className="insight-label">Structured</span>
                  <span className={`insight-value ${cvAssessment.cv_insights.has_structured_sections ? 'yes' : 'no'}`}>
                    {cvAssessment.cv_insights.has_structured_sections ? '✓' : '✗'}
                  </span>
                </div>
                <div className="insight-item">
                  <span className="insight-label">Achievements</span>
                  <span className={`insight-value ${cvAssessment.cv_insights.has_achievements ? 'yes' : 'no'}`}>
                    {cvAssessment.cv_insights.has_achievements ? '✓' : '✗'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comparison Tab */}
      {activeTab === 'comparison' && (
        <div className="comparison-content">
          <h3>CV vs Job Requirements Comparison</h3>
          
          {/* Experience Comparison */}
          <div className="comparison-section">
            <h4>Experience</h4>
            <div className="comparison-grid">
              <div className="comparison-column cv">
                <h5>Candidate</h5>
                <p><strong>Total:</strong> {cv_data?.experience?.total_experience}</p>
                <p><strong>GCC:</strong> {cv_data?.experience?.gcc_experience}</p>
              </div>
              <div className="comparison-column jd">
                <h5>Required</h5>
                <p><strong>Total:</strong> {jd_data?.experience?.total_experience}</p>
                <p><strong>GCC:</strong> {jd_data?.experience?.gcc_experience}</p>
                <p><strong>Industry:</strong> {jd_data?.experience?.industry}</p>
              </div>
            </div>
          </div>

          {/* Skills Comparison */}
          <div className="comparison-section">
            <h4>Skills</h4>
            <div className="comparison-grid">
              <div className="comparison-column cv">
                <h5>Candidate Skills</h5>
                <div className="skill-tags">
                  {cv_data?.skills?.all_skills?.slice(0, 15).map((skill, i) => (
                    <span key={i} className="skill-tag cv">{skill}</span>
                  ))}
                </div>
              </div>
              <div className="comparison-column jd">
                <h5>Required Skills</h5>
                <div className="skill-tags">
                  {jd_data?.skills?.required_skills?.map((skill, i) => (
                    <span key={i} className="skill-tag jd required">{skill}</span>
                  ))}
                </div>
                <h6 style={{marginTop: '10px'}}>Preferred</h6>
                <div className="skill-tags">
                  {jd_data?.skills?.preferred_skills?.map((skill, i) => (
                    <span key={i} className="skill-tag jd preferred">{skill}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Education Comparison */}
          <div className="comparison-section">
            <h4>Education</h4>
            <div className="comparison-grid">
              <div className="comparison-column cv">
                <h5>Candidate</h5>
                {cv_data?.education?.map((edu, i) => (
                  <div key={i} className="edu-entry">
                    <p><strong>{edu.degree || edu.level}</strong></p>
                    <p>{edu.institution}</p>
                  </div>
                ))}
              </div>
              <div className="comparison-column jd">
                <h5>Required</h5>
                <p><strong>Required:</strong> {jd_data?.education?.required || 'Any'}</p>
                <p><strong>Preferred:</strong> {jd_data?.education?.preferred || '-'}</p>
              </div>
            </div>
          </div>

          {/* Salary Comparison */}
          <div className="comparison-section">
            <h4>Salary</h4>
            <div className="comparison-grid">
              <div className="comparison-column cv">
                <h5>Candidate</h5>
                <p><strong>Current:</strong> AED {cv_data?.personal_details?.current_salary?.toLocaleString() || '-'}</p>
                <p><strong>Expected:</strong> AED {cv_data?.personal_details?.expected_salary?.toLocaleString() || '-'}</p>
              </div>
              <div className="comparison-column jd">
                <h5>Budget</h5>
                <p><strong>Range:</strong> {jd_data?.personal_details?.salary || 'Not specified'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="assessment-footer">
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          Back to Applications
        </button>
        <button className="btn btn-primary" onClick={fetchAssessment}>
          Re-run Assessment
        </button>
      </div>
    </div>
  );
};

export default AssessmentView;
