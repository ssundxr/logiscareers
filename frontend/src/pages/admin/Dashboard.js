import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobService, applicationService, assessmentService } from '../../services/api';
import './Admin.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    jobs: { total: 0, active: 0, draft: 0, closed: 0 },
    applications: { total: 0, pending: 0, shortlisted: 0 },
    mlEngineStatus: { available: false, version: '' },
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [jobStats, applications, engineStatus] = await Promise.all([
        jobService.getStats(),
        applicationService.getAll({ page_size: 5 }),
        assessmentService.getStatus().catch(() => ({ data: { available: false } })),
      ]);

      setStats({
        jobs: jobStats.data,
        applications: {
          total: applications.data.count || 0,
          pending: applications.data.results?.filter(a => a.status === 'pending').length || 0,
          shortlisted: applications.data.results?.filter(a => a.status === 'shortlisted').length || 0,
        },
        mlEngineStatus: engineStatus.data,
      });
      setRecentApplications(applications.data.results || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3 className="stat-label">Total Jobs</h3>
          <p className="stat-value">{stats.jobs.total}</p>
          <div className="stat-breakdown">
            <span className="stat-item">
              <span className="stat-dot active"></span>
              {stats.jobs.active} Active
            </span>
            <span className="stat-item">
              <span className="stat-dot draft"></span>
              {stats.jobs.draft} Draft
            </span>
          </div>
        </div>

        <div className="stat-card">
          <h3 className="stat-label">Applications</h3>
          <p className="stat-value">{stats.applications.total}</p>
          <div className="stat-breakdown">
            <span className="stat-item">
              <span className="stat-dot pending"></span>
              {stats.applications.pending} Pending
            </span>
            <span className="stat-item">
              <span className="stat-dot success"></span>
              {stats.applications.shortlisted} Shortlisted
            </span>
          </div>
        </div>

        <div className="stat-card">
          <h3 className="stat-label">AI Engine Status</h3>
          <p className={`stat-value ${stats.mlEngineStatus.available ? 'text-success' : 'text-danger'}`}>
            {stats.mlEngineStatus.available ? 'Online' : 'Offline'}
          </p>
          {stats.mlEngineStatus.version && (
            <div className="stat-breakdown">
              <span className="stat-item">Version {stats.mlEngineStatus.version}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="quick-actions">
          <Link to="/admin/jobs/new" className="action-card">
            <h4>Post New Job</h4>
            <p>Create a new job posting</p>
          </Link>
          <Link to="/admin/candidates" className="action-card">
            <h4>View Candidates</h4>
            <p>Browse candidate profiles</p>
          </Link>
          <Link to="/admin/applications" className="action-card">
            <h4>Review Applications</h4>
            <p>Process pending applications</p>
          </Link>
        </div>
      </div>

      {/* Recent Applications */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Recent Applications</h2>
          <Link to="/admin/applications" className="btn btn-secondary btn-sm">
            View All
          </Link>
        </div>
        
        {recentApplications.length > 0 ? (
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Job</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Applied</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentApplications.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <div className="candidate-info">
                        <span className="candidate-name">{app.candidate_name}</span>
                        <span className="candidate-id">{app.candidate_reg_no}</span>
                      </div>
                    </td>
                    <td>{app.job_title}</td>
                    <td>
                      {app.assessment_score !== null ? (
                        <span className={`score-badge ${getScoreClass(app.assessment_score)}`}>
                          {app.assessment_score}%
                        </span>
                      ) : (
                        <span className="text-gray">Not assessed</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${getStatusClass(app.status)}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="text-gray text-sm">
                      {new Date(app.applied_at).toLocaleDateString()}
                    </td>
                    <td>
                      <Link 
                        to={`/admin/applications/${app.id}/assessment`}
                        className="btn btn-secondary btn-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-state-title">No applications yet</p>
            <p>Applications will appear here when candidates apply for jobs.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const getScoreClass = (score) => {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'average';
  return 'poor';
};

const getStatusClass = (status) => {
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

export default Dashboard;
