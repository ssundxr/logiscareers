import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assessmentService } from '../../services/api';
import './AssessmentView.css';
import './CVAnalysisProfessional.css';

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

  const handleRerunAssessment = async () => {
    setLoading(true);
    try {
      // Force a new evaluation
      await assessmentService.evaluateApplication(id);
      // Fetch the updated assessment
      const response = await assessmentService.getAssessment(id);
      setData(response.data);
    } catch (error) {
      console.error('Failed to re-run assessment:', error);
      alert('Failed to re-run assessment. Please try again.');
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

  const formatCVText = (text) => {
    if (!text) return '';
    
    // Preserve line breaks and structure
    return text.split('\n').map((line, index) => (
      <div key={index} className="cv-line">
        {line || '\u00A0'}
      </div>
    ));
  };

  const highlightATSKeywords = (text, matchedKeywords, requiredSkills, preferredSkills) => {
    if (!text) return '';
    
    console.log('Highlighting CV with:', {
      matchedKeywords,
      requiredSkills,
      preferredSkills,
      textLength: text.length
    });
    
    // Collect all keywords to search for
    const allKeywords = new Set();
    
    // Add all job keywords
    if (requiredSkills && requiredSkills.length > 0) {
      requiredSkills.forEach(skill => {
        allKeywords.add(skill.toLowerCase());
        // Also add variations without special characters
        const normalized = skill.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalized) allKeywords.add(normalized);
      });
    }
    if (preferredSkills && preferredSkills.length > 0) {
      preferredSkills.forEach(skill => {
        allKeywords.add(skill.toLowerCase());
        const normalized = skill.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalized) allKeywords.add(normalized);
      });
    }
    
    // Also add matched keywords
    if (matchedKeywords && matchedKeywords.length > 0) {
      matchedKeywords.forEach(keyword => {
        allKeywords.add(keyword.toLowerCase());
        const normalized = keyword.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalized) allKeywords.add(normalized);
      });
    }
    
    if (allKeywords.size === 0) {
      console.log('No keywords to highlight');
      return formatCVText(text);
    }
    
    console.log('Total keywords to search:', allKeywords.size, Array.from(allKeywords).slice(0, 20));
    
    // Convert to array and sort by length (longest first to avoid partial matches)
    const keywords = Array.from(allKeywords).sort((a, b) => b.length - a.length);
    
    // Determine match level for each keyword
    const getMatchLevel = (keyword) => {
      const keywordLower = keyword.toLowerCase();
      
      // Check if it's in matched keywords (high confidence)
      if (matchedKeywords && matchedKeywords.some(k => k.toLowerCase() === keywordLower || k.toLowerCase().replace(/[^a-z0-9]/g, '') === keywordLower)) {
        return 'high'; // 90-100%
      }
      
      // Check if it's a required skill
      if (requiredSkills && requiredSkills.some(k => k.toLowerCase() === keywordLower || k.toLowerCase().replace(/[^a-z0-9]/g, '') === keywordLower)) {
        return 'medium'; // 70-89%
      }
      
      // Preferred skill
      return 'low'; // 50-69%
    };
    
    // Process text line by line
    const lines = text.split('\n');
    let totalHighlights = 0;
    
    const result = lines.map((line, lineIndex) => {
      if (!line.trim()) {
        return <div key={lineIndex} className="cv-line">{'\u00A0'}</div>;
      }
      
      const matches = [];
      
      // Find all keyword matches in this line
      keywords.forEach(keyword => {
        if (keyword.length < 2) return; // Skip very short keywords
        
        // Escape special regex characters
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Create regex patterns - both with and without word boundaries
        const patterns = [
          new RegExp(`\\b${escapedKeyword}\\b`, 'gi'),
          new RegExp(`${escapedKeyword}`, 'gi')
        ];
        
        patterns.forEach((regex, patternIndex) => {
          regex.lastIndex = 0;
          let match;
          
          while ((match = regex.exec(line)) !== null) {
            const matchText = match[0];
            const matchStart = match.index;
            const matchEnd = matchStart + matchText.length;
            
            // Check if this position is already covered
            const overlaps = matches.some(m => 
              (matchStart >= m.start && matchStart < m.end) ||
              (matchEnd > m.start && matchEnd <= m.end) ||
              (matchStart <= m.start && matchEnd >= m.end)
            );
            
            if (!overlaps) {
              matches.push({
                start: matchStart,
                end: matchEnd,
                text: matchText,
                level: getMatchLevel(keyword),
                keyword: keyword,
                priority: patternIndex === 0 ? 1 : 0 // Word boundary matches have higher priority
              });
            }
          }
        });
      });
      
      // Sort matches by position
      matches.sort((a, b) => a.start - b.start);
      totalHighlights += matches.length;
      
      // Build the highlighted line
      if (matches.length === 0) {
        return <div key={lineIndex} className="cv-line">{line}</div>;
      }
      
      const parts = [];
      let lastIndex = 0;
      
      matches.forEach((match, index) => {
        // Add text before highlight
        if (match.start > lastIndex) {
          parts.push(
            <span key={`text-${index}`}>
              {line.substring(lastIndex, match.start)}
            </span>
          );
        }
        
        // Add highlighted text
        const highlightClass = 
          match.level === 'high' ? 'highlight-high' :
          match.level === 'medium' ? 'highlight-medium' :
          'highlight-low';
        
        const confidence = 
          match.level === 'high' ? '90-100%' :
          match.level === 'medium' ? '70-89%' :
          '50-69%';
        
        parts.push(
          <mark 
            key={`highlight-${index}`} 
            className={highlightClass} 
            title={`Match: ${match.keyword} (Confidence: ${confidence})`}
          >
            {match.text}
          </mark>
        );
        
        lastIndex = match.end;
      });
      
      // Add remaining text
      if (lastIndex < line.length) {
        parts.push(
          <span key="text-end">
            {line.substring(lastIndex)}
          </span>
        );
      }
      
      return (
        <div key={lineIndex} className="cv-line">
          {parts}
        </div>
      );
    });
    
    console.log(`Total highlights applied: ${totalHighlights}`);
    return result;
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
            className={`tab active`}
          >
            AI Assessment
          </button>
        </div>
      </div>

      {/* Assessment Content */}
      {activeTab === 'assessment' && (
        <div className="assessment-content">
          {/* Data Quality Alert - Full Width */}
          {data?.assessment?.data_quality && (
            <div className={`data-quality-alert ${
              data.assessment.data_quality.assessment_quality === 'EXCELLENT' ? 'quality-excellent' :
              data.assessment.data_quality.assessment_quality === 'GOOD' ? 'quality-good' :
              data.assessment.data_quality.assessment_quality === 'FAIR' ? 'quality-fair' :
              data.assessment.data_quality.assessment_quality === 'POOR' ? 'quality-poor' :
              'quality-unacceptable'
            }`}>
              <div className="quality-header">
                <span className={`quality-icon-text ${
                  data.assessment.data_quality.assessment_quality === 'EXCELLENT' ? 'quality-excellent-icon' :
                  data.assessment.data_quality.assessment_quality === 'GOOD' ? 'quality-good-icon' :
                  data.assessment.data_quality.assessment_quality === 'FAIR' ? 'quality-fair-icon' :
                  data.assessment.data_quality.assessment_quality === 'POOR' ? 'quality-poor-icon' : 'quality-unacceptable-icon'
                }`}>
                  {data.assessment.data_quality.assessment_quality === 'EXCELLENT' ? 'VERIFIED' :
                   data.assessment.data_quality.assessment_quality === 'GOOD' ? 'GOOD' :
                   data.assessment.data_quality.assessment_quality === 'FAIR' ? 'FAIR' :
                   data.assessment.data_quality.assessment_quality === 'POOR' ? 'WARNING' : 'CRITICAL'}
                </span>
                <div className="quality-info">
                  <strong>Assessment Quality: {data.assessment.data_quality.assessment_quality}</strong>
                  <span className="quality-accuracy">Expected Accuracy: {data.assessment.data_quality.expected_accuracy}</span>
                </div>
              </div>
              <p className="quality-message">{data.assessment.data_quality.message}</p>
              
              {data.assessment.data_quality.missing_important_fields && 
               data.assessment.data_quality.missing_important_fields.length > 0 && (
                <details className="missing-fields-details">
                  <summary>
                    Important: {data.assessment.data_quality.missing_important_fields.length} Important Fields Missing 
                    (Click to see)
                  </summary>
                  <ul className="missing-fields-list">
                    {data.assessment.data_quality.missing_important_fields.map((field, idx) => (
                      <li key={idx}>{field}</li>
                    ))}
                  </ul>
                  <p className="completion-scores">
                    Candidate Profile: {data.assessment.data_quality.candidate_completeness}% | 
                    Job Posting: {data.assessment.data_quality.job_completeness}%
                  </p>
                </details>
              )}
              
              {data.assessment.data_quality.missing_critical_fields &&
               data.assessment.data_quality.missing_critical_fields.length > 0 && (
                <div className="critical-missing-alert">
                  <strong>CRITICAL: {data.assessment.data_quality.missing_critical_fields.length} Critical Fields Missing:</strong>
                  <ul className="critical-fields-list">
                    {data.assessment.data_quality.missing_critical_fields.map((field, idx) => (
                      <li key={idx}>{field}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
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
              <h4 className="ai-analysis-header">AI Analysis Summary</h4>
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

            {/* Confidence with Interval */}
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

            {/* Smart Recommendation - NEW */}
            {assessment.smart_recommendation && (
              <div className="smart-recommendation-card">
                <h4>AI Smart Recommendation</h4>
                
                {/* Confidence Interval */}
                {assessment.smart_recommendation.confidence_interval && (
                  <div className="confidence-interval">
                    <div className="interval-header">
                      <span className="interval-label">Score with Statistical Confidence:</span>
                    </div>
                    <div className="interval-display">
                      <span className="point-estimate">
                        {Math.round(assessment.smart_recommendation.confidence_interval.point_estimate)}%
                      </span>
                      <span className="margin">±{Math.round(assessment.smart_recommendation.confidence_interval.margin_of_error)}</span>
                      <span className="confidence-level">
                        ({Math.round(assessment.smart_recommendation.confidence_interval.confidence_level * 100)}% confidence)
                      </span>
                    </div>
                    <div className="interval-range">
                      Range: {Math.round(assessment.smart_recommendation.confidence_interval.lower_bound)}% - {Math.round(assessment.smart_recommendation.confidence_interval.upper_bound)}%
                    </div>
                  </div>
                )}

                {/* Hiring Action */}
                <div className={`hiring-action-badge action-${assessment.smart_recommendation.action?.toLowerCase().replace(/_/g, '-')}`}>
                  <span className="action-label">Action:</span>
                  <span className="action-value">
                    {assessment.smart_recommendation.action?.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Priority & Risk */}
                <div className="recommendation-metrics">
                  <div className="metric-item">
                    <span className="metric-label">Priority:</span>
                    <span className={`priority-badge priority-${assessment.smart_recommendation.priority?.toLowerCase()}`}>
                      {assessment.smart_recommendation.priority}
                    </span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Risk Level:</span>
                    <span className={`risk-badge risk-${assessment.smart_recommendation.risk_level?.toLowerCase()}`}>
                      {assessment.smart_recommendation.risk_level}
                    </span>
                  </div>
                  {assessment.smart_recommendation.estimated_success_probability && (
                    <div className="metric-item">
                      <span className="metric-label">Success Probability:</span>
                      <span className="success-probability">
                        {Math.round(assessment.smart_recommendation.estimated_success_probability)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Next Steps */}
                {assessment.smart_recommendation.next_steps && assessment.smart_recommendation.next_steps.length > 0 && (
                  <div className="next-steps">
                    <h5>Next Steps:</h5>
                    <ol className="next-steps-list">
                      {assessment.smart_recommendation.next_steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Interview Focus */}
                {assessment.smart_recommendation.interview_questions_focus && 
                 assessment.smart_recommendation.interview_questions_focus.length > 0 && (
                  <div className="interview-focus">
                    <h5>Interview Focus Areas:</h5>
                    <ul className="focus-list">
                      {assessment.smart_recommendation.interview_questions_focus.map((area, i) => (
                        <li key={i}>{area}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Growth Potential - NEW */}
            {assessment.growth_potential && (
              <div className="growth-potential-card">
                <h4>Growth Potential Analysis</h4>
                
                <div className="growth-score-display">
                  <div className={`growth-score-circle ${assessment.growth_potential.tier?.toLowerCase()}`}>
                    <span className="growth-score">
                      {Math.round(assessment.growth_potential.growth_potential_score || 0)}%
                    </span>
                    <span className="growth-label">Growth Score</span>
                  </div>
                  <div className={`growth-tier-badge tier-${assessment.growth_potential.tier?.toLowerCase().replace(/_/g, '-')}`}>
                    {assessment.growth_potential.tier?.replace(/_/g, ' ')}
                  </div>
                </div>

                {/* Growth Metrics Breakdown */}
                <div className="growth-metrics">
                  <div className="growth-metric-row">
                    <span className="metric-name">Learning Agility:</span>
                    <div className="metric-bar-container">
                      <div 
                        className={`metric-bar-fill ${getScoreClass(assessment.growth_potential.learning_agility || 0)}`}
                        style={{ width: `${assessment.growth_potential.learning_agility || 0}%` }}
                      ></div>
                    </div>
                    <span className="metric-value">{Math.round(assessment.growth_potential.learning_agility || 0)}%</span>
                  </div>
                  <div className="growth-metric-row">
                    <span className="metric-name">Career Trajectory:</span>
                    <div className="metric-bar-container">
                      <div 
                        className={`metric-bar-fill ${getScoreClass(assessment.growth_potential.career_trajectory_score || 0)}`}
                        style={{ width: `${assessment.growth_potential.career_trajectory_score || 0}%` }}
                      ></div>
                    </div>
                    <span className="metric-value">{Math.round(assessment.growth_potential.career_trajectory_score || 0)}%</span>
                  </div>
                  <div className="growth-metric-row">
                    <span className="metric-name">Skill Acquisition:</span>
                    <div className="metric-bar-container">
                      <div 
                        className={`metric-bar-fill ${getScoreClass(assessment.growth_potential.skill_acquisition_rate || 0)}`}
                        style={{ width: `${assessment.growth_potential.skill_acquisition_rate || 0}%` }}
                      ></div>
                    </div>
                    <span className="metric-value">{Math.round(assessment.growth_potential.skill_acquisition_rate || 0)}%</span>
                  </div>
                  <div className="growth-metric-row">
                    <span className="metric-name">Adaptability:</span>
                    <div className="metric-bar-container">
                      <div 
                        className={`metric-bar-fill ${getScoreClass(assessment.growth_potential.adaptability_score || 0)}`}
                        style={{ width: `${assessment.growth_potential.adaptability_score || 0}%` }}
                      ></div>
                    </div>
                    <span className="metric-value">{Math.round(assessment.growth_potential.adaptability_score || 0)}%</span>
                  </div>
                </div>

                {/* Key Indicators */}
                {assessment.growth_potential.indicators && assessment.growth_potential.indicators.length > 0 && (
                  <div className="growth-indicators">
                    <h5>Key Indicators:</h5>
                    <ul className="indicators-list">
                      {assessment.growth_potential.indicators.map((indicator, i) => (
                        <li key={i}>✓ {indicator}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Growth Recommendation */}
                {assessment.growth_potential.recommendation && (
                  <div className="growth-recommendation">
                    <p>{assessment.growth_potential.recommendation}</p>
                  </div>
                )}
              </div>
            )}

            {/* HR Recommendation - Detailed */}
            {data?.assessment?.insights?.recommendation && (
              <div className="hr-recommendation-card">
                <div className="recommendation-card-header">
                  <h4>HR Recommendation</h4>
                  <span className="recommendation-subtitle">Detailed Analysis</span>
                </div>
                
                <div className={`decision-badge-compact ${
                  data.assessment.insights.recommendation.includes('HIGHLY RECOMMENDED') ? 'highly-recommended' :
                  data.assessment.insights.recommendation.includes('RECOMMENDED') && !data.assessment.insights.recommendation.includes('NOT') ? 'recommended' :
                  data.assessment.insights.recommendation.includes('CONSIDER') ? 'consider' :
                  data.assessment.insights.recommendation.includes('NOT RECOMMENDED') || data.assessment.insights.recommendation.includes('DO NOT') ? 'not-recommended' : 'borderline'
                }`}>
                  {data.assessment.insights.recommendation}
                </div>

                {/* Red Flags */}
                {data.assessment.insights.red_flags && data.assessment.insights.red_flags.length > 0 && (
                  <div className="rec-section">
                    <h5>Concerns ({data.assessment.insights.red_flags.length})</h5>
                    {data.assessment.insights.red_flags.slice(0, 2).map((flag, i) => (
                      <div key={i} className={`rec-item concern severity-${flag.severity.toLowerCase()}`}>
                        <span className="rec-badge">{flag.severity}</span>
                        <p>{flag.description}</p>
                      </div>
                    ))}
                    {data.assessment.insights.red_flags.length > 2 && (
                      <p className="rec-more">+ {data.assessment.insights.red_flags.length - 2} more</p>
                    )}
                  </div>
                )}

                {/* Key Strengths */}
                {data.assessment.insights.strengths && data.assessment.insights.strengths.length > 0 && (
                  <div className="rec-section">
                    <h5>Strengths</h5>
                    {data.assessment.insights.strengths.slice(0, 3).map((strength, i) => (
                      <div key={i} className="rec-item strength">• {strength}</div>
                    ))}
                  </div>
                )}

                {/* Weaknesses */}
                {data.assessment.insights.weaknesses && data.assessment.insights.weaknesses.length > 0 && (
                  <div className="rec-section">
                    <h5>Development Areas</h5>
                    {data.assessment.insights.weaknesses.slice(0, 3).map((weakness, i) => (
                      <div key={i} className="rec-item weakness">• {weakness}</div>
                    ))}
                  </div>
                )}

                {/* Additional Metrics - Only show if we have meaningful data */}
                {(data.assessment.insights.career_progression && 
                  data.assessment.insights.career_progression !== 'UNCLEAR' && 
                  data.assessment.insights.skill_currency_score > 0 &&
                  data.assessment.insights.learning_potential > 0 &&
                  data.assessment.insights.cultural_fit_score > 0) && (
                  <div className="rec-section">
                    <h5>Additional Metrics</h5>
                    <div className="rec-metrics">
                      <div className="rec-metric-row">
                        <span>Career Progression:</span>
                        <span className={`metric-val ${data.assessment.insights.career_progression}`}>
                          {data.assessment.insights.career_progression === 'STRONG_UPWARD' ? 'Strong Growth ↑' :
                           data.assessment.insights.career_progression === 'STEADY_UPWARD' ? 'Steady Growth ↑' :
                           data.assessment.insights.career_progression === 'LATERAL' ? 'Lateral Move →' :
                           data.assessment.insights.career_progression === 'STAGNANT' ? 'Stagnant −' :
                           data.assessment.insights.career_progression === 'DECLINING' ? 'Declining ↓' :
                           data.assessment.insights.career_progression?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="rec-metric-row">
                        <span>Skill Currency:</span>
                        <span className={`metric-val ${getScoreClass(data.assessment.insights.skill_currency_score)}`}>
                          {data.assessment.insights.skill_currency_score >= 80 ? 'Modern' :
                           data.assessment.insights.skill_currency_score >= 60 ? 'Current' :
                           data.assessment.insights.skill_currency_score >= 40 ? 'Needs Update' : 'Outdated'}
                        </span>
                      </div>
                      <div className="rec-metric-row">
                        <span>Learning Potential:</span>
                        <span className={`metric-val ${getScoreClass(data.assessment.insights.learning_potential)}`}>
                          {data.assessment.insights.learning_potential >= 80 ? 'Excellent' :
                           data.assessment.insights.learning_potential >= 60 ? 'Good' :
                           data.assessment.insights.learning_potential >= 40 ? 'Average' : 'Limited'}
                        </span>
                      </div>
                      <div className="rec-metric-row">
                        <span>Cultural Fit:</span>
                        <span className={`metric-val ${getScoreClass(data.assessment.insights.cultural_fit_score)}`}>
                          {data.assessment.insights.cultural_fit_score >= 80 ? 'Strong Match' :
                           data.assessment.insights.cultural_fit_score >= 60 ? 'Good Match' :
                           data.assessment.insights.cultural_fit_score >= 40 ? 'Fair Match' : 'Poor Match'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action */}
                <div className="rec-action">
                  <h5>Next Step</h5>
                  <p>
                    {data.assessment.insights.recommendation.includes('HIGHLY RECOMMENDED') ? 
                      'Schedule interview immediately. Excellent match across all areas.' :
                    data.assessment.insights.recommendation.includes('RECOMMENDED') && !data.assessment.insights.recommendation.includes('NOT') ?
                      'Proceed with interview. Address identified weaknesses during discussion.' :
                    data.assessment.insights.recommendation.includes('CONSIDER') ?
                      'Reserve list. Interview only if top candidates unavailable.' :
                    'Do not proceed. Does not meet minimum requirements.'}
                  </p>
                </div>
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
                          <span className="ai-label">AI Analysis:</span>
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

      {/* Footer */}
      <div className="assessment-footer">
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          Back to Applications
        </button>
        <button 
          className="btn btn-primary" 
          onClick={handleRerunAssessment}
          disabled={loading}
        >
          {loading ? 'Re-running...' : 'Re-run Assessment'}
        </button>
      </div>
    </div>
  );
};

export default AssessmentView;
