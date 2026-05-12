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
    <div className="app-shell admin-theme">
      {/* Header */}
      <header className="app-header glass">
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
