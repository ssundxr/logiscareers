import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobService } from '../../services/api';
import './Admin.css';

const JobManagement = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
  });

  useEffect(() => {
    fetchJobs();
  }, [filters]);

  const fetchJobs = async () => {
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      
      const response = await jobService.getAll(params);
      setJobs(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (jobId, action) => {
    try {
      if (action === 'activate') {
        await jobService.activate(jobId);
      } else if (action === 'close') {
        await jobService.close(jobId);
      }
      fetchJobs();
    } catch (error) {
      console.error('Failed to update job status:', error);
    }
  };

  const handleDelete = async (jobId) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        await jobService.delete(jobId);
        fetchJobs();
      } catch (error) {
        console.error('Failed to delete job:', error);
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      active: 'success',
      draft: 'gray',
      paused: 'warning',
      closed: 'danger',
    };
    return statusMap[status] || 'gray';
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Job Management</h1>
        <Link to="/admin/jobs/new" className="btn btn-primary">
          Post New Job
        </Link>
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="filter-group search-input">
          <label>Search</label>
          <input
            type="text"
            className="form-input"
            placeholder="Search by title, company..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select
            className="filter-select"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="paused">Paused</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Jobs List */}
      {jobs.length > 0 ? (
        <div>
          {jobs.map((job) => (
            <div key={job.id} className="job-card">
              <div className="job-info">
                <div className="job-title-row">
                  <h3 className="job-title">{job.title}</h3>
                  <span className={`badge badge-${getStatusBadge(job.status)}`}>
                    {job.status}
                  </span>
                </div>
                <div className="job-meta">
                  <span>{job.company_name}</span>
                  <span>{job.location}</span>
                  <span>{job.job_level}</span>
                  {job.salary_min && (
                    <span>
                      {job.salary_currency} {job.salary_min.toLocaleString()} - {job.salary_max?.toLocaleString()}
                    </span>
                  )}
                  <span>{job.application_count || 0} applications</span>
                </div>
              </div>
              <div className="job-actions">
                <Link 
                  to={`/admin/jobs/${job.id}/edit`}
                  className="btn btn-secondary btn-sm"
                >
                  Edit
                </Link>
                {job.status === 'draft' && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleStatusChange(job.id, 'activate')}
                  >
                    Publish
                  </button>
                )}
                {job.status === 'active' && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleStatusChange(job.id, 'close')}
                  >
                    Close
                  </button>
                )}
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => handleDelete(job.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p className="empty-state-title">No jobs found</p>
          <p>Create your first job posting to get started.</p>
          <Link to="/admin/jobs/new" className="btn btn-primary mt-4">
            Post New Job
          </Link>
        </div>
      )}
    </div>
  );
};

export default JobManagement;
