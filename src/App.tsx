import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import JoinPage from './pages/JoinPage';
import OfficeLayout from './layouts/OfficeLayout';
import AdminLayout from './layouts/AdminLayout';
import MonitorLayout from './layouts/MonitorLayout';

import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
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
    </ErrorBoundary>
  );
}

export default App;
