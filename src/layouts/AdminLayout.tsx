import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut } from 'lucide-react';
import AdminDashboard from '../components/AdminDashboard';
import { useAuth } from '../contexts/AuthContext';

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="app-shell admin-theme" style={{ position: 'relative', background: 'var(--bg-primary)', color: 'var(--text-primary)', transition: 'background-color 0.4s ease, color 0.4s ease' }}>
      {/* Subtle Faded Branding Watermark Backdrop */}
      <div className="global-watermark"></div>

      {/* Header */}
      <header className="app-header glass" style={{ display: 'none' }}>
        <div className="header-inner">
          <div className="brand">
            <img src="/logo.png" alt="كفيل" className="brand-img" />
            <div className="brand-text">
              <span className="brand-tagline">بوابة الإدارة</span>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={handleLogout}>
            <LogOut size={16} />
            <span>خروج</span>
          </button>
        </div>
      </header>

      {/* Tab Navigation (Single tab for now) */}
      <nav className="tab-nav" style={{ display: 'none' }}>
        <div className="tab-nav-inner">
          <button className="tab-btn active">
            <LayoutDashboard size={18} />
            <span>لوحة التحكم</span>
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="app-main" style={{ padding: 0, margin: 0, background: 'transparent' }}>
        <div className="main-inner" style={{ padding: 0, margin: 0, maxWidth: '100%' }}>
          <AdminDashboard />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
