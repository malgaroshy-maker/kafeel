import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import JoinPage from './pages/JoinPage';
import OfficeLayout from './layouts/OfficeLayout';
import AdminLayout from './layouts/AdminLayout';
import MonitorLayout from './layouts/MonitorLayout';

import { SecurityErrorBoundary } from './components/SecurityErrorBoundary';
import { TermsOverlay } from './components/TermsOverlay';
import SupportWidget from './components/SupportWidget';

function App() {
  useEffect(() => {
    // Sync theme on app mount
    const savedTheme = localStorage.getItem('theme') || localStorage.getItem('landing-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  return (
    <SecurityErrorBoundary>
      <AuthProvider>
        <Router>
          <TermsOverlay />
          <SupportWidget />
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/join" element={<JoinPage />} />

          {/* Protected Routes */}
          <Route 
            path="/office/*" 
            element={
              <ProtectedRoute allowedRoles={['manager', 'staff', 'accountant']}>
                <OfficeLayout />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/monitor/*" 
            element={
              <ProtectedRoute allowedRoles={['monitor']}>
                <MonitorLayout />
              </ProtectedRoute>
            } 
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      </AuthProvider>
    </SecurityErrorBoundary>
  );
}

export default App;
