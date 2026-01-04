import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { applicationService, assessmentService, jobService } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import './Admin.css';

const ApplicationManagement = () => {
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(null);
  const [filters, setFilters] = useState({
    job: '',
    status: '',
    search: '',
  });
  
  // Debounce search filter
  const debouncedSearch = useDebounce(filters.search, 400);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [filters.job, filters.status, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      const [appsRes, jobsRes] = await Promise.all([
        applicationService.getAll(),
        jobService.getAll(),
      ]);
      setApplications(appsRes.data.results || appsRes.data);
      setJobs(jobsRes.data.results || jobsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = useCallback(async () => {
    try {
      const params = {};
      if (filters.job) params.job = filters.job;
      if (filters.status) params.status = filters.status;
      if (debouncedSearch) params.search = debouncedSearch;
      
      const response = await applicationService.getAll(params);
      setApplications(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    }
  }, [filters.job, filters.status, debouncedSearch]);

  const handleEvaluate = async (applicationId) => {
    setEvaluating(applicationId);
    try {
      await assessmentService.evaluateApplication(applicationId);
      fetchApplications();
    } catch (error) {
      console.error('Failed to evaluate application:', error);
      alert('Failed to run AI assessment. Please try again.');
    } finally {
      setEvaluating(null);
    }
  };

  const handleBatchEvaluate = async (jobId) => {
    if (!jobId) {
      alert('Please select a job first.');
      return;
    }
    
    setEvaluating('batch');
    try {
      const result = await assessmentService.batchEvaluate(jobId);
      alert(`Successfully evaluated ${result.data.total_evaluated} applications.`);
      fetchApplications();
    } catch (error) {
      console.error('Failed to batch evaluate:', error);
      alert('Failed to run batch evaluation.');
    } finally {
      setEvaluating(null);
    }
  };

  const handleStatusChange = async (applicationId, newStatus) => {
    try {
      await applicationService.updateStatus(applicationId, newStatus);
      fetchApplications();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const getScoreClass = (score) => {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'average';
    return 'poor';
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: 'warning',
      under_review: 'info',
      shortlisted: 'success',
      interview: 'info',
      offered: 'success',
      rejected: 'danger',
      withdrawn: 'gray',
    };
    return statusMap[status] || 'gray';
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Applications</h1>
        {filters.job && (
          <button 
            className="btn btn-primary"
            onClick={() => handleBatchEvaluate(filters.job)}
            disabled={evaluating === 'batch'}
          >
            {evaluating === 'batch' ? 'Evaluating...' : 'Evaluate All'}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <label>Job</label>
          <select
            className="filter-select"
            value={filters.job}
            onChange={(e) => setFilters({ ...filters, job: e.target.value })}
          >
            <option value="">All Jobs</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} ({job.reference_number})
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select
            className="filter-select"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="interview">Interview</option>
            <option value="offered">Offered</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="filter-group search-input">
          <label>Search</label>
          <input
            type="text"
            className="form-input"
            placeholder="Search candidates..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
      </div>

      {/* Applications List */}
      {applications.length > 0 ? (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Job</th>
                <th>AI Score</th>
                <th>Status</th>
                <th>Applied</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id}>
                  <td>
                    <div className="candidate-info">
                      <span className="candidate-name">{app.candidate_name}</span>
                      <span className="text-xs text-gray">{app.candidate_reg_no}</span>
                    </div>
                  </td>
                  <td>
                    <div className="candidate-info">
                      <span>{app.job_title}</span>
                      <span className="text-xs text-gray">{app.job_company}</span>
                    </div>
                  </td>
                  <td>
                    {app.assessment_score !== null ? (
                      <span className={`score-badge ${getScoreClass(app.assessment_score)}`}>
                        {app.assessment_score}%
                      </span>
                    ) : (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleEvaluate(app.id)}
                        disabled={evaluating === app.id}
                      >
                        {evaluating === app.id ? 'Running...' : 'Evaluate'}
                      </button>
                    )}
                  </td>
                  <td>
                    <select
                      className="filter-select"
                      value={app.status}
                      onChange={(e) => handleStatusChange(app.id, e.target.value)}
                      style={{ minWidth: '130px' }}
                    >
                      <option value="pending">Pending</option>
                      <option value="under_review">Under Review</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="interview">Interview</option>
                      <option value="offered">Offered</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </td>
                  <td className="text-gray text-sm">
                    {new Date(app.applied_at).toLocaleDateString()}
                  </td>
                  <td>
                    <Link 
                      to={`/admin/applications/${app.id}/assessment`}
                      className="btn btn-secondary btn-sm"
                    >
                      View Assessment
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <p className="empty-state-title">No applications found</p>
          <p>Applications will appear here when candidates apply for jobs.</p>
        </div>
      )}
    </div>
  );
};

export default ApplicationManagement;
