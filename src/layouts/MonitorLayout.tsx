import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, LogOut, Settings, Clock, Megaphone, BarChart3, Car } from 'lucide-react';
import MonitorDashboard from '../components/MonitorDashboard';
import SettingsPanel from '../components/SettingsPanel';
import { useAuth } from '../contexts/AuthContext';

type MonitorTab = 'queue' | 'pipeline' | 'broadcast' | 'analytics' | 'inventory' | 'settings';

const MonitorLayout: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<MonitorTab>('queue');

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const tabs: { id: MonitorTab; label: string; icon: React.ReactNode }[] = [
    { id: 'queue', label: 'الطابور والربط', icon: <Shield size={15} /> },
    { id: 'pipeline', label: 'متتبع المعاملات', icon: <Clock size={15} /> },
    { id: 'broadcast', label: 'النصائح والبث', icon: <Megaphone size={15} /> },
    { id: 'analytics', label: 'تحليل الطلب', icon: <BarChart3 size={15} /> },
    { id: 'inventory', label: 'المخزون', icon: <Car size={15} /> },
  ];

  return (
    <div className="app-shell monitor-theme" style={{ position: 'relative', background: 'var(--bg-primary)', color: 'var(--text-primary)', transition: 'background-color 0.4s ease, color 0.4s ease' }}>
      {/* Subtle Faded Branding Watermark Backdrop */}
      <div className="global-watermark"></div>

      {/* Header & Navigation - All in the Golden Bar */}
      <header style={{ borderBottom: '2px solid #aa771c', background: 'linear-gradient(135deg, #bf953f 0%, #fcf6ba 25%, #b38728 50%, #fbf5b7 75%, #aa771c 100%)', padding: '0.4rem 2rem', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 3px 15px rgba(170, 119, 28, 0.25)' }}>
        <div className="header-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
          {/* Brand */}
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
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>وكيل السيارات</h2>
              <span style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 'bold' }}>منظومة المرابحة الإسلامية للسيارات</span>
            </div>
          </div>

          {/* Center: Navigation Tab Pills */}
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '8px',
                  border: activeTab === tab.id ? '1.5px solid #0f172a' : '1px solid rgba(15, 23, 42, 0.2)',
                  background: activeTab === tab.id ? '#0f172a' : 'rgba(255, 255, 255, 0.5)',
                  color: activeTab === tab.id ? '#fbbf24' : '#0f172a',
                  fontWeight: activeTab === tab.id ? 800 : 600,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  boxShadow: activeTab === tab.id ? '0 2px 8px rgba(15, 23, 42, 0.3)' : 'none',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right: Greeting, Settings, Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            <span style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: 'bold' }}>مرحباً، وكيل السيارات</span>
            <button
              onClick={() => setActiveTab('settings')}
              style={{
                background: activeTab === 'settings' ? '#0f172a' : 'rgba(255,255,255,0.6)',
                color: activeTab === 'settings' ? '#fbbf24' : '#0f172a',
                border: '1px solid rgba(15,23,42,0.2)',
                borderRadius: '8px',
                padding: '0.35rem 0.6rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                transition: 'all 0.25s ease'
              }}
            >
              <Settings size={15} />
              إعدادات
            </button>
            <button 
              className="btn btn-sm" 
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
        </div>
      </header>

      {/* Content */}
      <main className="app-main">
        <div className="main-inner">
          {activeTab === 'settings' ? (
            <SettingsPanel />
          ) : (
            <MonitorDashboard activeSubTab={activeTab} />
          )}
        </div>
      </main>
    </div>
  );
};

export default MonitorLayout;
