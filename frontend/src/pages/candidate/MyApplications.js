import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { applicationService } from '../../services/api';
import './Candidate.css';

const MyApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await applicationService.getMyApplications();
      setApplications(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      pending: 'status-badge-pending',
      under_review: 'status-badge-info',
      shortlisted: 'status-badge-success',
      interviewed: 'status-badge-success',
      rejected: 'status-badge-danger',
      hired: 'status-badge-success',
    };
    return classes[status] || 'status-badge-secondary';
  };

  const formatStatus = (status) => {
    return status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const filteredApplications = applications.filter(app => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'in_progress') {
      return ['pending', 'under_review', 'shortlisted', 'interviewed'].includes(app.status);
    }
    return app.status === activeFilter;
  });

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  return (
    <div className="applications-page">
      {/* Header */}
      <div className="page-header">
        <h1>My Applications</h1>
        <p>Track the status of your job applications</p>
      </div>

      {/* Filters */}
      <div className="applications-filter">
        <button 
          className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All ({applications.length})
        </button>
        <button 
          className={`filter-btn ${activeFilter === 'in_progress' ? 'active' : ''}`}
          onClick={() => setActiveFilter('in_progress')}
        >
          In Progress ({applications.filter(a => 
            ['pending', 'under_review', 'shortlisted', 'interviewed'].includes(a.status)
          ).length})
        </button>
        <button 
          className={`filter-btn ${activeFilter === 'shortlisted' ? 'active' : ''}`}
          onClick={() => setActiveFilter('shortlisted')}
        >
          Shortlisted ({applications.filter(a => a.status === 'shortlisted').length})
        </button>
        <button 
          className={`filter-btn ${activeFilter === 'rejected' ? 'active' : ''}`}
          onClick={() => setActiveFilter('rejected')}
        >
          Not Selected ({applications.filter(a => a.status === 'rejected').length})
        </button>
      </div>

      {/* Applications Table */}
      {filteredApplications.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">No applications found</p>
          {activeFilter === 'all' ? (
            <>
              <p>You haven't applied to any jobs yet.</p>
              <Link to="/candidate/jobs" className="btn btn-primary mt-4">
                Browse Jobs
              </Link>
            </>
          ) : (
            <p>No applications match this filter.</p>
          )}
        </div>
      ) : (
        <div className="applications-table-container">
          <table className="applications-table">
            <thead>
              <tr>
                <th>Job Title</th>
                <th>Company</th>
                <th>Location</th>
                <th>Applied On</th>
                <th>Status</th>
                <th>AI Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplications.map((application) => (
                <tr key={application.id}>
                  <td>
                    <Link 
                      to={`/candidate/jobs/${application.job?.id}`}
                      className="font-semibold hover:underline"
                    >
                      {application.job?.title || 'Job Title'}
                    </Link>
                  </td>
                  <td>{application.job?.company_name || 'Company'}</td>
                  <td>{application.job?.location || '-'}</td>
                  <td>{new Date(application.applied_at).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(application.status)}`}>
                      {formatStatus(application.status)}
                    </span>
                  </td>
                  <td>
                    {application.ai_score ? (
                      <span className={`font-semibold ${
                        application.ai_score >= 70 ? 'text-success' : 
                        application.ai_score >= 50 ? 'text-warning' : 'text-danger'
                      }`}>
                        {Math.round(application.ai_score)}%
                      </span>
                    ) : (
                      <span className="text-gray-400">Pending</span>
                    )}
                  </td>
                  <td>
                    <Link 
                      to={`/candidate/jobs/${application.job?.id}`} 
                      className="btn btn-sm btn-secondary"
                    >
                      View Job
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyApplications;
