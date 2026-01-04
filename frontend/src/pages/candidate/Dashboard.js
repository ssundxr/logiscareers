import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { applicationService } from '../../services/api';
import './Candidate.css';

const CandidateDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total_applications: 0,
    pending: 0,
    under_review: 0,
    shortlisted: 0,
    interviewed: 0,
    rejected: 0
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await applicationService.getMyApplications();
      const applications = response.data.results || response.data;
      
      // Calculate stats
      const stats = {
        total_applications: applications.length,
        pending: applications.filter(a => a.status === 'pending').length,
        under_review: applications.filter(a => a.status === 'under_review').length,
        shortlisted: applications.filter(a => a.status === 'shortlisted').length,
        interviewed: applications.filter(a => a.status === 'interviewed').length,
        rejected: applications.filter(a => a.status === 'rejected').length,
      };
      setStats(stats);
      setRecentApplications(applications.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch data:', error);
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

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  return (
    <div className="candidate-dashboard">
      {/* Welcome Section */}
      <div className="welcome-section">
        <h1>Welcome back, {user?.first_name || 'Candidate'}</h1>
        <p>Track your applications and explore new opportunities</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-number">{stats.total_applications}</span>
            <span className="stat-label">Total Applications</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon pending">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-number">{stats.pending + stats.under_review}</span>
            <span className="stat-label">In Progress</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22,4 12,14.01 9,11.01"/>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-number">{stats.shortlisted + stats.interviewed}</span>
            <span className="stat-label">Shortlisted</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon danger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-number">{stats.rejected}</span>
            <span className="stat-label">Not Selected</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <Link to="/candidate/jobs" className="action-btn primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Browse Jobs
          </Link>
          <Link to="/candidate/applications" className="action-btn secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
            </svg>
            My Applications
          </Link>
          <Link to="/candidate/profile" className="action-btn secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Update Profile
          </Link>
        </div>
      </div>

      {/* Recent Applications */}
      <div className="recent-section">
        <div className="section-header">
          <h2>Recent Applications</h2>
          <Link to="/candidate/applications" className="view-all-link">View All</Link>
        </div>

        {recentApplications.length === 0 ? (
          <div className="empty-state-card">
            <p>You haven't applied to any jobs yet.</p>
            <Link to="/candidate/jobs" className="btn btn-primary">
              Start Exploring Jobs
            </Link>
          </div>
        ) : (
          <div className="applications-list">
            {recentApplications.map((application) => (
              <div key={application.id} className="application-card">
                <div className="application-info">
                  <h4>{application.job?.title || 'Job Title'}</h4>
                  <p>{application.job?.company_name || 'Company'}</p>
                  <span className="application-date">
                    Applied on {new Date(application.applied_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="application-status">
                  <span className={`status-badge ${getStatusBadgeClass(application.status)}`}>
                    {application.status?.replace('_', ' ')}
                  </span>
                  {application.ai_score && (
                    <span className="ai-score">
                      AI Score: {Math.round(application.ai_score)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidateDashboard;
