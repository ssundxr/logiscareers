import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobService } from '../../services/api';
import './Candidate.css';

const JobListing = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    fetchJobs();
  }, [searchTerm, locationFilter]);

  const fetchJobs = async () => {
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (locationFilter) params.location = locationFilter;
      
      const response = await jobService.getPublicJobs(params);
      const jobsData = response.data.results || response.data;
      setJobs(jobsData);
      
      // Extract unique locations
      const uniqueLocations = [...new Set(jobsData.map(job => job.location).filter(Boolean))];
      setLocations(uniqueLocations);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diff === 0) return 'Posted today';
    if (diff === 1) return 'Posted yesterday';
    if (diff < 7) return `Posted ${diff} days ago`;
    if (diff < 30) return `Posted ${Math.floor(diff / 7)} weeks ago`;
    return `Posted on ${date.toLocaleDateString()}`;
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  return (
    <div className="job-listing-page">
      {/* Header */}
      <div className="page-header">
        <h1>Browse Jobs</h1>
        <p>Find your next opportunity</p>
      </div>

      {/* Search Bar */}
      <div className="search-bar">
        <div className="search-input-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search jobs by title, company, or keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="form-select filter-select"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
        >
          <option value="">All Locations</option>
          {locations.map((location) => (
            <option key={location} value={location}>{location}</option>
          ))}
        </select>
      </div>

      {/* Jobs Count */}
      <p className="mb-4 text-gray-600">
        Showing {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
      </p>

      {/* Jobs Grid */}
      {jobs.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">No jobs found</p>
          <p>Try adjusting your search criteria</p>
        </div>
      ) : (
        <div className="jobs-grid">
          {jobs.map((job) => (
            <div key={job.id} className="job-card">
              <div className="job-card-header">
                <h3>
                  <Link to={`/candidate/jobs/${job.id}`}>{job.title}</Link>
                </h3>
                <p className="company-name">{job.company_name}</p>
              </div>
              
              <div className="job-card-meta">
                <span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  {job.location}
                </span>
                <span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                  </svg>
                  {job.employment_type?.replace('_', ' ') || 'Full-time'}
                </span>
                <span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                  {job.salary_min && job.salary_max 
                    ? `AED ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`
                    : 'Competitive'}
                </span>
              </div>

              <div className="job-card-skills">
                {job.required_skills?.slice(0, 4).map((skill, index) => (
                  <span key={index} className="skill-tag">{skill}</span>
                ))}
                {job.required_skills?.length > 4 && (
                  <span className="skill-tag">+{job.required_skills.length - 4} more</span>
                )}
              </div>

              <div className="job-card-footer">
                <span className="posted-date">{formatDate(job.created_at)}</span>
                <Link to={`/candidate/jobs/${job.id}`} className="btn btn-primary btn-sm">
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobListing;
