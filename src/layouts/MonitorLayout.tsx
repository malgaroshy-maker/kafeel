import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, LogOut } from 'lucide-react';
import MonitorDashboard from '../components/MonitorDashboard';
import { useAuth } from '../contexts/AuthContext';

const MonitorLayout: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="app-shell monitor-theme">
      {/* Header */}
      <header className="app-header glass">
        <div className="header-inner">
          <div className="brand">
            <img src="/logo.png" alt="كفيل" className="brand-img" />
            <div className="brand-text">
              <span className="brand-tagline">بوابة المراقب</span>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={handleLogout}>
            <LogOut size={16} />
            <span>خروج</span>
          </button>
        </div>
      </header>

      {/* Tab Navigation (Single tab for now) */}
      <nav className="tab-nav">
        <div className="tab-nav-inner">
          <button className="tab-btn active">
            <Shield size={18} />
            <span>المراقبة والربط</span>
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="app-main">
        <div className="main-inner">
          <MonitorDashboard />
        </div>
      </main>
    </div>
  );
};

export default MonitorLayout;
