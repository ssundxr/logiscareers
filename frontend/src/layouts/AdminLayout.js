import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminLayout.css';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/admin', label: 'Dashboard', exact: true },
    { path: '/admin/jobs', label: 'Jobs' },
    { path: '/admin/candidates', label: 'Candidates' },
    { path: '/admin/applications', label: 'Applications' },
  ];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-logo">Logis Career AI</h1>
          <span className="sidebar-subtitle">Admin Portal</span>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive(item.path, item.exact) ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        
        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-name">{user?.first_name} {user?.last_name}</span>
            <span className="user-role">{user?.role}</span>
          </div>
          <button className="btn btn-secondary btn-sm w-full" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </aside>
      
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
