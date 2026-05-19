import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, UserPlus, Users, FileCheck, Clock, Receipt, LogOut, BarChart3, Settings, LayoutDashboard, TrendingUp, Sun, Moon, Megaphone } from 'lucide-react';
import FinancialCalculator from '../components/Calculator';
import CustomerForm from '../components/CustomerForm';
import CustomerList from '../components/CustomerList';
import DocumentUploader from '../components/DocumentUploader';
import WaitingQueue from '../components/WaitingQueue';
import Settlements from '../components/Settlements';
import ReportsDashboard from '../components/ReportsDashboard';
import StaffDashboard from '../components/StaffDashboard';
import OfficeSettings from '../components/OfficeSettings';
import StaffStats from '../components/StaffStats';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type Tab = 'dashboard' | 'calculator' | 'customers' | 'beneficiary' | 'documents' | 'queue' | 'settlements' | 'reports' | 'settings' | 'staff-stats';

const tabs: { id: Tab; label: string; icon: typeof Calculator }[] = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { id: 'customers', label: 'الزبائن', icon: Users },
  { id: 'beneficiary', label: 'تسجيل جديد', icon: UserPlus },
  { id: 'calculator', label: 'الحاسبة', icon: Calculator },
  { id: 'documents', label: 'المستندات', icon: FileCheck },
  { id: 'queue', label: 'الانتظار', icon: Clock },
  { id: 'settlements', label: 'التسويات', icon: Receipt },
  { id: 'reports', label: 'التقارير', icon: BarChart3 },
  { id: 'staff-stats', label: 'إحصائيات الموظفين', icon: TrendingUp },
  { id: 'settings', label: 'الإعدادات', icon: Settings },
];

const OfficeLayout: React.FC = () => {
  const { isManager, isStaff, isAccountant, signOut, officeName } = useAuth();
  
  // Set default active tab based on role
  const [activeTab, setActiveTab] = useState<Tab>(
    isStaff ? 'dashboard' : (isAccountant ? 'reports' : 'beneficiary')
  );
  
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<any>(null);
  const [selectedGuarantor, setSelectedGuarantor] = useState<any>(null);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [docCustomerId, setDocCustomerId] = useState<any>(null);
  const navigate = useNavigate();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    localStorage.setItem('landing-theme', newTheme);
  };

  useEffect(() => {
    if (isStaff && activeTab === 'beneficiary') {
       setActiveTab('dashboard');
    }
  }, [isStaff]);

  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [isBannerClosed, setIsBannerClosed] = useState(false);

  useEffect(() => {
    supabase
      .from('broadcasts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        const now = new Date().toISOString();
        const active = (data || []).filter(b => {
          if (b.expires_at && b.expires_at < now) return false;
          if (b.target_role && !['all', 'office'].includes(b.target_role)) return false;
          return true;
        });
        setBroadcasts(active.slice(0, 5));
      });
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  let visibleTabs = tabs.filter(tab => {
    if (tab.id === 'dashboard' && !isStaff) return false;
    if (tab.id === 'settings' && !isManager) return false;
    if (tab.id === 'reports' && isStaff) return false;
    if (tab.id === 'settlements' && isStaff) return false;
    if (tab.id === 'beneficiary' && isAccountant) return false;
    if (tab.id === 'staff-stats' && isStaff) return false;
    return true;
  });

  if (isAccountant) {
    const accountantOrder: Tab[] = ['reports', 'customers', 'staff-stats', 'queue', 'settlements', 'calculator', 'documents'];
    visibleTabs = [...visibleTabs].sort((a, b) => {
      const idxA = accountantOrder.indexOf(a.id);
      const idxB = accountantOrder.indexOf(b.id);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
  }

  return (
    <div className="app-shell office-theme" style={{ position: 'relative', background: 'var(--bg-primary)', color: 'var(--text-primary)', transition: 'background-color 0.4s ease, color 0.4s ease' }}>
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
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
                {isAccountant ? `مرحبا محاسب مكتب ( ${officeName || ''} )` : 'بوابة مكاتب كفيل'}
              </h2>
              <span style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 'bold' }}>منظومة المرابحة الإسلامية للسيارات</span>
            </div>
            {officeName && (
              <div className="office-name-header" style={{ background: '#0f172a', color: '#fef08a', border: '1px solid #aa771c', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.75rem', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                <Users size={14} />
                <span>{officeName}</span>
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isAccountant && (
              <button 
                onClick={toggleTheme}
                style={{
                  background: '#0f172a',
                  color: theme === 'light' ? '#fbbf24' : '#fef08a',
                  border: '1px solid #aa771c',
                  padding: '0.45rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  transition: 'all 0.2s ease'
                }}
                title={theme === 'light' ? 'تفعيل الوضع الداكن' : 'تفعيل الوضع المضيء'}
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
            )}

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
        </div>
      </header>

      {/* Broadcasts Marquee Banner */}
      {broadcasts.length > 0 && !isBannerClosed && (() => {
        const isArabicBroadcast = /[\u0600-\u06FF]/.test(broadcasts.map(b => b.message).join(' '));
        return (
          <div style={{ borderBottom: '1px solid var(--glass-border)', padding: '0.6rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', position: 'relative', overflow: 'hidden', zIndex: 90 }}>
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', flex: 1, marginRight: '1rem' }}>
              <div style={{ display: 'inline-flex', gap: '3rem', animation: `${isArabicBroadcast ? 'marqueeLTR' : 'marqueeRTL'} 25s linear infinite` }}>
                {broadcasts.map(b => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem', color: b.type === 'urgent' ? 'var(--error)' : b.type === 'warning' ? 'var(--warning)' : 'var(--primary)', fontWeight: 700 }}>
                    <Megaphone size={18} />
                    <span>{b.message}</span>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => setIsBannerClosed(true)} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '0.25rem', flexShrink: 0 }} title="إغلاق">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        );
      })()}

      {/* Tab Navigation */}
      <nav className="tab-nav">
        <div className="tab-nav-inner">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <main className="app-main">
        <div className="main-inner">
          {activeTab === 'customers' && (
            <CustomerList 
              onSelect={(id) => {
                setSelectedBeneficiary(id);
                setActiveTab('calculator');
              }} 
              onEdit={(customer) => {
                setEditingCustomer(customer);
                setActiveTab('beneficiary');
              }}
              onDocuments={(id) => {
                setDocCustomerId(id);
                setActiveTab('documents');
              }}
              onSendToQueue={(id) => {
                setSelectedBeneficiary(id);
                setActiveTab('calculator');
              }}
            />
          )}
          {activeTab === 'calculator' && (
            <FinancialCalculator 
              beneficiaryId={selectedBeneficiary} 
              guarantorId={selectedGuarantor} 
            />
          )}
          {activeTab === 'beneficiary' && (
            <CustomerForm 
              role="beneficiary" 
              initialData={editingCustomer}
              onSuccess={(id, gIds) => {
                setSelectedBeneficiary(id);
                if (gIds && gIds.length > 0) {
                  setSelectedGuarantor(gIds[0]); // Primary guarantor
                }
                setEditingCustomer(null);
                setActiveTab('calculator');
              }} 
            />
          )}
          {activeTab === 'documents' && <DocumentUploader customerId={docCustomerId} />}
          {activeTab === 'queue' && <WaitingQueue />}
          {activeTab === 'settlements' && <Settlements />}
          {activeTab === 'reports' && <ReportsDashboard />}
          {activeTab === 'dashboard' && <StaffDashboard onTabChange={setActiveTab} />}
          {activeTab === 'staff-stats' && <StaffStats />}
          {activeTab === 'settings' && <OfficeSettings />}
        </div>
      </main>
    </div>
  );
};

export default OfficeLayout;
