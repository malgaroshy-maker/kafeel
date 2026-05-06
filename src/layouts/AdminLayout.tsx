import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, LayoutDashboard, LogOut } from 'lucide-react';
import AdminDashboard from '../components/AdminDashboard';

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="app-shell admin-theme">
      {/* Header */}
      <header className="app-header glass" style={{ borderBottom: '1px solid var(--success-color)' }}>
        <div className="header-inner">
          <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <div className="brand-icon" style={{ background: 'var(--success-color)' }}>
              <Car size={26} />
            </div>
            <div className="brand-text">
              <h1>كفيل</h1>
              <span className="brand-tagline">بوابة الإدارة</span>
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
            <LayoutDashboard size={18} />
            <span>لوحة التحكم</span>
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="app-main">
        <div className="main-inner">
          <AdminDashboard />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
