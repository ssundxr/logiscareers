import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { candidateService } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import './Admin.css';

const CandidateManagement = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    min_experience: '',
  });
  
  // Debounce filters to reduce API calls
  const debouncedFilters = useDebounce(filters, 400);

  useEffect(() => {
    fetchCandidates();
  }, [debouncedFilters]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const params = {};
      if (debouncedFilters.search) params.search = debouncedFilters.search;
      if (debouncedFilters.min_experience) params.min_experience = debouncedFilters.min_experience;
      
      const response = await candidateService.getAll(params);
      setCandidates(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Candidates</h1>
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="filter-group search-input">
          <label>Search</label>
          <input
            type="text"
            className="form-input"
            placeholder="Search by name, email, registration..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <div className="filter-group">
          <label>Min Experience (Years)</label>
          <input
            type="number"
            className="form-input"
            style={{ width: '120px' }}
            placeholder="0"
            value={filters.min_experience}
            onChange={(e) => setFilters({ ...filters, min_experience: e.target.value })}
            min="0"
          />
        </div>
      </div>

      {/* Candidates List */}
      {candidates.length > 0 ? (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Reg. No.</th>
                <th>Name</th>
                <th>Location</th>
                <th>Experience</th>
                <th>GCC Exp.</th>
                <th>Expected Salary</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr key={candidate.id}>
                  <td className="font-medium">{candidate.registration_number}</td>
                  <td>
                    <div className="candidate-info">
                      <span className="candidate-name">{candidate.full_name}</span>
                      <span className="text-xs text-gray">{candidate.email}</span>
                    </div>
                  </td>
                  <td>{candidate.current_location || '-'}</td>
                  <td>{candidate.total_experience_years?.toFixed(1) || 0} years</td>
                  <td>{candidate.gcc_experience_years?.toFixed(1) || 0} years</td>
                  <td>
                    {candidate.desired_monthly_salary 
                      ? `AED ${candidate.desired_monthly_salary.toLocaleString()}`
                      : '-'
                    }
                  </td>
                  <td>
                    <Link 
                      to={`/admin/candidates/${candidate.id}`}
                      className="btn btn-secondary btn-sm"
                    >
                      View Profile
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <p className="empty-state-title">No candidates found</p>
          <p>Candidates will appear here when they register.</p>
        </div>
      )}
    </div>
  );
};

export default CandidateManagement;
