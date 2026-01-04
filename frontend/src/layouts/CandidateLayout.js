import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './CandidateLayout.css';

const CandidateLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/candidate', label: 'Dashboard', exact: true },
    { path: '/candidate/jobs', label: 'Find Jobs' },
    { path: '/candidate/applications', label: 'My Applications' },
    { path: '/candidate/profile', label: 'My Profile' },
  ];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="candidate-layout">
      <header className="candidate-header">
        <div className="header-content">
          <Link to="/candidate" className="header-logo">
            <h1>Logis Career</h1>
          </Link>
          
          <nav className="header-nav">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${isActive(item.path, item.exact) ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          
          <div className="header-actions">
            <span className="user-greeting">Hello, {user?.first_name}</span>
            <button className="btn btn-outline btn-sm" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>
      </header>
      
      <main className="candidate-main">
        <div className="container">
          <Outlet />
        </div>
      </main>
      
      <footer className="candidate-footer">
        <div className="container">
          <p>Logis Career AI - Intelligent Recruitment Platform</p>
        </div>
      </footer>
    </div>
  );
};

export default CandidateLayout;
