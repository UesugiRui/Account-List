import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login/Login';
import Dashboard from './components/Dashboard/Dashboard';
import UserVerification from './components/UserVerification/UserVerification';
import UserRouteGuard from './components/RouteGuard/AccountRouteGuard';
import Account from './components/Account/Account';
import Edit from './components/Edit/Edit';
import Backup from './components/Backup/Backup';
import ForgotPassword from './components/ForgotPassword/ForgotPassword';
import ResetPassword from './components/ResetPassword/ResetPassword';
import './App.css';

const App: React.FC = () => {
  // Clear any existing tokens on initial load to ensure login is shown
  React.useEffect(() => {
    if (window.location.pathname === '/') {
      localStorage.removeItem('token');
    }
  }, []);

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/verify" element={<UserVerification />} />
        <Route path="/user-verification" element={<UserVerification />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Root route now always redirects to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Protected routes */}
        <Route path="/dashboard" element={<UserRouteGuard><Dashboard /></UserRouteGuard>} />
        <Route path="/account" element={<UserRouteGuard><Account /></UserRouteGuard>} />
        <Route path="/accounts/:platformName" element={<UserRouteGuard><Account /></UserRouteGuard>} />
        <Route path="/edit/:tableName" element={<UserRouteGuard><Edit /></UserRouteGuard>} />
        <Route path="/backup" element={<UserRouteGuard><Backup /></UserRouteGuard>} />
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;