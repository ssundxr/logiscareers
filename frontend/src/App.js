import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import CandidateLayout from './layouts/CandidateLayout';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import JobManagement from './pages/admin/JobManagement';
import JobForm from './pages/admin/JobForm';
import CandidateManagement from './pages/admin/CandidateManagement';
import CandidateDetail from './pages/admin/CandidateDetail';
import ApplicationManagement from './pages/admin/ApplicationManagement';
import AssessmentView from './pages/admin/AssessmentView';

// Candidate Pages
import CandidateDashboard from './pages/candidate/Dashboard';
import JobListing from './pages/candidate/JobListing';
import JobDetail from './pages/candidate/JobDetail';
import MyApplications from './pages/candidate/MyApplications';
import MyProfile from './pages/candidate/MyProfile';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin', 'recruiter']}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="jobs" element={<JobManagement />} />
          <Route path="jobs/new" element={<JobForm />} />
          <Route path="jobs/:id/edit" element={<JobForm />} />
          <Route path="candidates" element={<CandidateManagement />} />
          <Route path="candidates/:id" element={<CandidateDetail />} />
          <Route path="applications" element={<ApplicationManagement />} />
          <Route path="applications/:id/assessment" element={<AssessmentView />} />
        </Route>
        
        {/* Candidate Routes */}
        <Route path="/candidate" element={
          <ProtectedRoute allowedRoles={['candidate']}>
            <CandidateLayout />
          </ProtectedRoute>
        }>
          <Route index element={<CandidateDashboard />} />
          <Route path="jobs" element={<JobListing />} />
          <Route path="jobs/:id" element={<JobDetail />} />
          <Route path="applications" element={<MyApplications />} />
          <Route path="profile" element={<MyProfile />} />
        </Route>
        
        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
