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
    <div className="app-shell monitor-theme" style={{ position: 'relative', background: 'var(--bg-primary)', color: 'var(--text-primary)', transition: 'background-color 0.4s ease, color 0.4s ease' }}>
      {/* Subtle Faded Branding Watermark Backdrop */}
      <div className="global-watermark"></div>

      {/* Header */}
      <header style={{ borderBottom: '2px solid #aa771c', background: 'linear-gradient(135deg, #bf953f 0%, #fcf6ba 25%, #b38728 50%, #fbf5b7 75%, #aa771c 100%)', padding: '0.4rem 2rem', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 3px 15px rgba(170, 119, 28, 0.25)' }}>
        <div className="header-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
          <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img 
              src="/logo.png" 
              alt="كفيل" 
              style={{ 
                height: '52px', 
                objectFit: 'contain', 
                filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.12))',
                borderRadius: '6px'
              }} 
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>بوابة مراقب كفيل</h2>
              <span style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 'bold' }}>منظومة المرابحة الإسلامية للسيارات</span>
            </div>
          </div>
          <button 
            className="btn" 
            onClick={handleLogout}
            style={{ 
              background: '#0f172a', 
              color: '#fff', 
              border: 'none', 
              padding: '0.45rem 1rem', 
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.85rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
            }}
          >
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
