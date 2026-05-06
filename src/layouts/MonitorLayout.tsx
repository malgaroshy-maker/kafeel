import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Shield, LogOut } from 'lucide-react';
import MonitorDashboard from '../components/MonitorDashboard';

const MonitorLayout: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="app-shell monitor-theme">
      {/* Header */}
      <header className="app-header glass" style={{ borderBottom: '1px solid var(--warning-color)' }}>
        <div className="header-inner">
          <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <div className="brand-icon" style={{ background: 'var(--warning-color)' }}>
              <Car size={26} />
            </div>
            <div className="brand-text">
              <h1>كفيل</h1>
              <span className="brand-tagline">بوابة المراقب</span>
            </div>
          </div>
          <button className="btn-secondary" onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
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
