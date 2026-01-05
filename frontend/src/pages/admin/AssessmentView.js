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
            className={`tab ${activeTab === 'assessment' ? 'active' : ''}`}
            onClick={() => setActiveTab('assessment')}
          >
            AI Assessment
          </button>
          <button 
            className={`tab ${activeTab === 'insights' ? 'active' : ''}`}
            onClick={() => setActiveTab('insights')}
          >
            Candidate Insights
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
          {/* Data Quality Alert */}
          {data?.assessment?.data_quality && (
            <div className={`data-quality-alert ${
              data.assessment.data_quality.assessment_quality === 'EXCELLENT' ? 'quality-excellent' :
              data.assessment.data_quality.assessment_quality === 'GOOD' ? 'quality-good' :
              data.assessment.data_quality.assessment_quality === 'FAIR' ? 'quality-fair' :
              data.assessment.data_quality.assessment_quality === 'POOR' ? 'quality-poor' :
              'quality-unacceptable'
            }`}>
              <div className="quality-header">
                <span className="quality-icon">
                  {data.assessment.data_quality.assessment_quality === 'EXCELLENT' ? '✅' :
                   data.assessment.data_quality.assessment_quality === 'GOOD' ? '👍' :
                   data.assessment.data_quality.assessment_quality === 'FAIR' ? '⚠️' :
                   data.assessment.data_quality.assessment_quality === 'POOR' ? '⚠️' : '🚫'}
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
                    ⭐ {data.assessment.data_quality.missing_important_fields.length} Important Fields Missing 
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
                  <strong>⭐⭐ {data.assessment.data_quality.missing_critical_fields.length} Critical Fields Missing:</strong>
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

      {/* CV Analysis Tab */}
      {activeTab === 'cv_analysis' && (
        <div className="cv-analysis-content">
          {/* Summary Metrics */}
          {cvAssessment && (
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
          )}

          {/* Side-by-Side CV Comparison */}
          <div className="cv-comparison-container">
            <h3 className="comparison-title">ATS Keyword Analysis</h3>
            
            <div className="cv-dual-view">
              {/* Original CV */}
              <div className="cv-panel">
                <div className="cv-panel-header">
                  <h4>Original CV</h4>
                  <span className="panel-subtitle">Uploaded Document</span>
                </div>
                <div className="cv-panel-body scrollable">
                  {cv_data?.cv_text ? (
                    <div className="cv-text-display">
                      {formatCVText(cv_data.cv_text)}
                    </div>
                  ) : (
                    <div className="cv-empty-state">
                      <p>No CV text available</p>
                      <span>CV file may not have been parsed</span>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Highlighted CV */}
              <div className="cv-panel highlighted">
                <div className="cv-panel-header">
                  <h4>AI-Highlighted CV</h4>
                  <span className="panel-subtitle">ATS Keyword Matches</span>
                  <div className="highlight-legend">
                    <span className="legend-item">
                      <span className="legend-color high-match"></span>
                      High Match (90-100%)
                    </span>
                    <span className="legend-item">
                      <span className="legend-color medium-match"></span>
                      Medium Match (70-89%)
                    </span>
                    <span className="legend-item">
                      <span className="legend-color low-match"></span>
                      Low Match (50-69%)
                    </span>
                  </div>
                </div>
                <div className="cv-panel-body scrollable">
                  {cv_data?.cv_text ? (
                    <div className="cv-text-display highlighted">
                      {highlightATSKeywords(
                        cv_data.cv_text, 
                        cvAssessment?.matched_keywords || [],
                        jd_data?.skills?.required_skills || [],
                        jd_data?.skills?.preferred_skills || []
                      )}
                    </div>
                  ) : (
                    <div className="cv-empty-state">
                      <p>No CV text available</p>
                      <span>CV file may not have been parsed</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Keywords Analysis */}
          {cvAssessment && (
            <div className="cv-details-grid">
              <div className="cv-keywords-card">
                <h4>Matched Keywords</h4>
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
                <h4>Missing Keywords</h4>
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
          )}

          {/* NLP Explanation */}
          {cvAssessment && (
            <div className="nlp-explanation-section">
              <h3>Natural Language Processing Analysis</h3>
              
              <div className="nlp-cards-grid">
                <div className="nlp-card">
                  <h4>Keyword Matching Algorithm</h4>
                  <p>
                    Our AI system employs advanced semantic similarity analysis to match keywords from the job description 
                    with the candidate's CV. The matching process uses:
                  </p>
                  <ul>
                    <li><strong>Exact Matching:</strong> Direct word-for-word matches receive the highest confidence score (90-100%)</li>
                    <li><strong>Semantic Similarity:</strong> Contextually similar terms are matched using NLP embeddings (70-89%)</li>
                    <li><strong>Partial Matching:</strong> Related but not identical terms receive lower scores (50-69%)</li>
                  </ul>
                </div>

                <div className="nlp-card">
                  <h4>Highlighting Methodology</h4>
                  <p>The color-coded highlighting system indicates match probability:</p>
                  <ul>
                    <li><strong className="highlight-dark-green">Dark Green (90-100%):</strong> Exact or highly confident matches with required skills</li>
                    <li><strong className="highlight-light-green">Light Green (70-89%):</strong> Good semantic matches with moderate confidence</li>
                    <li><strong className="highlight-orange">Orange (50-69%):</strong> Partial or lower confidence matches</li>
                    <li><strong>Unhighlighted:</strong> Text not matching job requirements</li>
                  </ul>
                </div>

                <div className="nlp-card">
                  <h4>Analysis Summary</h4>
                  <p>{cvAssessment.explanation}</p>
                  
                  {cvAssessment.cv_insights && (
                    <div className="insights-summary">
                      <h5>Document Quality Metrics:</h5>
                      <div className="metrics-list">
                        <span>Word Count: {cvAssessment.cv_insights.word_count || 'N/A'}</span>
                        <span>Contact Info: {cvAssessment.cv_insights.has_email && cvAssessment.cv_insights.has_phone ? 'Complete' : 'Incomplete'}</span>
                        <span>Structure: {cvAssessment.cv_insights.has_structured_sections ? 'Well-organized' : 'Needs improvement'}</span>
                        <span>Achievements: {cvAssessment.cv_insights.has_achievements ? 'Present' : 'Missing'}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="nlp-card">
                  <h4>Recommendation Engine</h4>
                  <p>
                    Based on the keyword analysis and semantic matching, the system calculates an overall relevance score. 
                    This score considers:
                  </p>
                  <ul>
                    <li>Coverage of required skills and qualifications</li>
                    <li>Presence of preferred qualifications</li>
                    <li>CV quality and presentation</li>
                    <li>Contextual relevance to job requirements</li>
                  </ul>
                  <p className="recommendation-note">
                    Match Rate: {cvAssessment.matched_keywords?.length || 0} of{' '}
                    {(jd_data?.skills?.required_skills?.length || 0) + (jd_data?.skills?.preferred_skills?.length || 0)}{' '}
                    keywords found
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Candidate Insights Tab */}
      {activeTab === 'insights' && (
        <div className="insights-content">
          {!data?.assessment?.insights || 
           (data.assessment.insights.strengths?.length === 0 && 
            data.assessment.insights.weaknesses?.length === 0 && 
            data.assessment.insights.red_flags?.length === 0 &&
            !data.assessment.insights.career_progression) ? (
            <div className="no-insights-message">
              <h3>No Insights Available</h3>
              <p>This assessment was created before the Candidate Insights feature was added.</p>
              <p>Please click the <strong>"Re-run Assessment"</strong> button above to generate comprehensive insights including:</p>
              <ul>
                <li>Red Flags Detection</li>
                <li>Career Progression Analysis</li>
                <li>Skill Currency Score</li>
                <li>Strengths & Weaknesses</li>
                <li>Learning Potential & Cultural Fit</li>
                <li>Key Highlights</li>
              </ul>
              <button 
                onClick={handleRerunAssessment} 
                className="rerun-button-inline"
                style={{
                  marginTop: '20px',
                  padding: '12px 24px',
                  backgroundColor: '#00bcd4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                Re-run Assessment Now
              </button>
            </div>
          ) : (
            <>
          {/* Red Flags Section */}
          {data.assessment.insights.red_flags && data.assessment.insights.red_flags.length > 0 && (
            <div className="insights-section red-flags-section">
              <h3>Red Flags & Concerns</h3>
              <div className="red-flags-grid">
                {data.assessment.insights.red_flags.map((flag, index) => {
                  const severityClass = flag.severity.toLowerCase();
                  
                  return (
                    <div key={index} className={`red-flag-card severity-${severityClass}`}>
                      <div className="flag-header">
                        <span className="flag-type">{formatLabel(flag.type)}</span>
                        <span className={`flag-severity ${severityClass}`}>{flag.severity}</span>
                      </div>
                      <p className="flag-description">{flag.description}</p>
                      <div className="flag-impact">
                        <strong>Impact:</strong> {flag.impact}
                      </div>
                      <div className="flag-recommendation">
                        <strong>Recommendation:</strong> {flag.recommendation}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Career & Skills Analysis */}
          <div className="insights-section career-skills-section">
            <h3>Career & Skills Analysis</h3>
            <div className="analysis-grid">
              {/* Career Progression */}
              <div className="analysis-card">
                <h4>Career Progression</h4>
                <div className="progression-indicator">
                  <span className={`progression-badge ${data.assessment.insights.career_progression}`}>
                    {formatLabel(data.assessment.insights.career_progression)}
                  </span>
                </div>
              </div>

              {/* Skill Currency */}
              <div className="analysis-card">
                <h4>Skill Currency</h4>
                <div className={`score-display ${getScoreClass(data.assessment.insights.skill_currency_score)}`}>
                  {data.assessment.insights.skill_currency_score}%
                </div>
                <p className="analysis-description">
                  {data.assessment.insights.skill_currency_score >= 80 ? 
                    'Skills are modern and up-to-date' :
                    data.assessment.insights.skill_currency_score >= 60 ?
                    'Skills are mostly current with some outdated areas' :
                    'Skills need updating to current technologies'}
                </p>
              </div>

              {/* Learning Potential */}
              <div className="analysis-card">
                <h4>Learning Potential</h4>
                <div className={`score-display ${getScoreClass(data.assessment.insights.learning_potential)}`}>
                  {data.assessment.insights.learning_potential}%
                </div>
                <p className="analysis-description">
                  Ability to learn and adapt to new technologies and processes
                </p>
              </div>

              {/* Cultural Fit */}
              <div className="analysis-card">
                <h4>Cultural Fit</h4>
                <div className={`score-display ${getScoreClass(data.assessment.insights.cultural_fit_score)}`}>
                  {data.assessment.insights.cultural_fit_score}%
                </div>
                <p className="analysis-description">
                  Alignment with company values and work environment
                </p>
              </div>
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="insights-section strengths-weaknesses-section">
            <div className="two-column-layout">
              {/* Strengths */}
              <div className="column strengths-column">
                <h3>Key Strengths</h3>
                {data.assessment.insights.strengths && data.assessment.insights.strengths.length > 0 ? (
                  <ul className="strengths-list">
                    {data.assessment.insights.strengths.map((strength, index) => (
                      <li key={index} className="strength-item">
                        {strength}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-data">No specific strengths identified</p>
                )}
              </div>

              {/* Weaknesses */}
              <div className="column weaknesses-column">
                <h3>Areas of Concern</h3>
                {data.assessment.insights.weaknesses && data.assessment.insights.weaknesses.length > 0 ? (
                  <ul className="weaknesses-list">
                    {data.assessment.insights.weaknesses.map((weakness, index) => (
                      <li key={index} className="weakness-item">
                        {weakness}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-data">No major weaknesses identified</p>
                )}
              </div>
            </div>
          </div>

          {/* Key Highlights */}
          {data.assessment.insights.key_highlights && data.assessment.insights.key_highlights.length > 0 && (
            <div className="insights-section highlights-section">
              <h3>Key Highlights</h3>
              <div className="highlights-grid">
                {data.assessment.insights.key_highlights.map((highlight, index) => (
                  <div key={index} className="highlight-card">
                    <p>{highlight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final Recommendation */}
          <div className="insights-section recommendation-section">
            <h3>HR Recommendation</h3>
            <div className="recommendation-box">
              <p className="recommendation-text">
                {data.assessment.insights.recommendation}
              </p>
            </div>
          </div>
          </>
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
