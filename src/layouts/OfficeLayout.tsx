import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, UserPlus, Users, FileCheck, Clock, Receipt, LogOut, BarChart3, Settings, LayoutDashboard, TrendingUp, Sun, Moon, Megaphone, Coins, X } from 'lucide-react';
import FinancialCalculator from '../components/Calculator';
import CustomerForm from '../components/CustomerForm';
import CustomerList from '../components/CustomerList';
import DocumentUploader from '../components/DocumentUploader';
import WaitingQueue from '../components/WaitingQueue';
import Settlements from '../components/Settlements';
import ReportsDashboard from '../components/ReportsDashboard';
import StaffDashboard from '../components/StaffDashboard';
import ManagerDashboard from '../components/ManagerDashboard';
import OfficeSettings from '../components/OfficeSettings';
import StaffStats from '../components/StaffStats';
import FinancialRequest from '../components/FinancialRequest';
import PotentialCustomers from '../components/PotentialCustomers';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type Tab = 'dashboard' | 'calculator' | 'customers' | 'potential-customers' | 'beneficiary' | 'documents' | 'queue' | 'settlements' | 'reports' | 'settings' | 'staff-stats' | 'financial-request';

const tabs: { id: Tab; label: string; icon: typeof Calculator }[] = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { id: 'customers', label: 'الزبائن', icon: Users },
  { id: 'beneficiary', label: 'تسجيل زبون', icon: UserPlus },
  { id: 'calculator', label: 'الحاسبة', icon: Calculator },
  { id: 'financial-request', label: 'طلب قيمة مالية', icon: Coins },
  { id: 'documents', label: 'المستندات', icon: FileCheck },
  { id: 'queue', label: 'قائمة الانتظار', icon: Clock },
  { id: 'settlements', label: 'التسويات', icon: Receipt },
  { id: 'reports', label: 'التقارير', icon: BarChart3 },
  { id: 'staff-stats', label: 'إحصائيات الموظفين', icon: TrendingUp },
  { id: 'settings', label: 'الإعدادات', icon: Settings },
];

const OfficeLayout: React.FC = () => {
  const { isManager, isStaff, isAccountant, signOut, officeName, officeId } = useAuth();

  // Set default active tab based on role
  const [activeTab, setActiveTab] = useState<Tab>(
    isStaff ? 'dashboard' : (isManager ? 'dashboard' : (isAccountant ? 'reports' : 'beneficiary'))
  );

  const [selectedBeneficiary, setSelectedBeneficiary] = useState<any>(null);
  const [selectedGuarantor, setSelectedGuarantor] = useState<any>(null);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [docCustomerId, setDocCustomerId] = useState<any>(null);
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);
  const [cameFromRegistration, setCameFromRegistration] = useState(false);
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

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (!currentPassword) {
      setPwError('يرجى إدخال كلمة المرور الحالية');
      return;
    }
    if (newPassword.length < 6) {
      setPwError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('كلمة المرور الجديدة غير متطابقة');
      return;
    }

    setPwLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setPwError('حدث خطأ في جلب بيانات المستخدم');
        setPwLoading(false);
        return;
      }

      // Re-authenticate user to verify current password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (authError) {
        setPwError('كلمة المرور الحالية غير صحيحة');
        setPwLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        setPwError(updateError.message);
      } else {
        setPwSuccess('تم تغيير كلمة المرور بنجاح!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setPwError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setPwLoading(false);
    }
  };


  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [waitingQueueCount, setWaitingQueueCount] = useState(0);
  const [rejectedDocsCount, setRejectedDocsCount] = useState(0);
  const [financialRequestCount, setFinancialRequestCount] = useState(0);

  const fetchNotificationCounts = async () => {
    if (!officeId) return;
    try {
      // 1. Get queue count (WAITING_MATCH)
      const { count: queueCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('office_id', officeId)
        .eq('status', 'WAITING_MATCH');

      // 2. Get rejected docs count (REJECTED or rejected verification status)
      const { count: rejectedCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('office_id', officeId)
        .or('status.eq.REJECTED,verification_status.eq.rejected');

      // 3. Get pending financial requests count (PENDING)
      let pendingFinCount = 0;
      try {
        const { count: finCount, error: finErr } = await supabase
          .from('financial_requests')
          .select('*', { count: 'exact', head: true })
          .eq('office_id', officeId)
          .eq('status', 'PENDING');

        if (!finErr) {
          pendingFinCount = finCount || 0;
        } else {
          // Fallback to local storage count if table doesn't exist
          const localData = localStorage.getItem('kafeel_financial_requests_local');
          if (localData) {
            const localReqs = JSON.parse(localData);
            pendingFinCount = localReqs.filter((r: any) => r.status === 'PENDING').length;
          }
        }
      } catch (e) {
        // Fallback
        const localData = localStorage.getItem('kafeel_financial_requests_local');
        if (localData) {
          const localReqs = JSON.parse(localData);
          pendingFinCount = localReqs.filter((r: any) => r.status === 'PENDING').length;
        }
      }

      setWaitingQueueCount(queueCount || 0);
      setRejectedDocsCount(rejectedCount || 0);
      setFinancialRequestCount(pendingFinCount);
    } catch (err) {
      console.error('Error fetching layout notification counts:', err);
    }
  };

  useEffect(() => {
    if (!officeId) return;
    fetchNotificationCounts();

    const channel = supabase
      .channel('office-layout-notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `office_id=eq.${officeId}`
      }, () => {
        fetchNotificationCounts();
      })
      .subscribe();

    const finChannel = supabase
      .channel('office-layout-financial-notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'financial_requests',
        filter: `office_id=eq.${officeId}`
      }, () => {
        fetchNotificationCounts();
      })
      .subscribe();

    // Listen to local changes via storage event (for local fallback updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'kafeel_financial_requests_local') {
        fetchNotificationCounts();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      channel.unsubscribe();
      finChannel.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [officeId]);

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
    if (tab.id === 'dashboard' && !isStaff && !isManager) return false;
    if (tab.id === 'settings') return false;
    if (tab.id === 'reports' && isStaff) return false;
    if (tab.id === 'settlements' && isStaff) return false;
    if (tab.id === 'beneficiary' && isAccountant) return false;
    if (tab.id === 'staff-stats' && isStaff) return false;
    return true;
  });

  if (isManager) {
    const managerOrder: Tab[] = ['dashboard', 'customers', 'financial-request', 'queue', 'staff-stats', 'reports', 'calculator', 'settlements', 'beneficiary', 'documents'];
    visibleTabs = [...visibleTabs].sort((a, b) => {
      const idxA = managerOrder.indexOf(a.id);
      const idxB = managerOrder.indexOf(b.id);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
  }

  if (isAccountant) {
    const accountantOrder: Tab[] = ['reports', 'customers', 'staff-stats', 'queue', 'settlements', 'calculator', 'financial-request', 'documents'];
    visibleTabs = [...visibleTabs].sort((a, b) => {
      const idxA = accountantOrder.indexOf(a.id);
      const idxB = accountantOrder.indexOf(b.id);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
  }

  if (isStaff) {
    const staffOrder: Tab[] = ['dashboard', 'beneficiary', 'calculator', 'financial-request', 'customers', 'queue', 'documents'];
    visibleTabs = [...visibleTabs].sort((a, b) => {
      const idxA = staffOrder.indexOf(a.id);
      const idxB = staffOrder.indexOf(b.id);
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
                {isManager
                  ? `مرحبا مدير مكتب ( ${officeName || ''} )`
                  : isAccountant
                    ? `مرحبا محاسب مكتب ( ${officeName || ''} )`
                    : isStaff
                      ? `مرحبا موظف مكتب ( ${officeName || ''} )`
                      : 'بوابة مكاتب كفيل'}
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
            {/* Theme Toggle Button (Sun and Moon sign next to settings) */}
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

            {/* Settings Button */}
            <button
              className="btn"
              onClick={() => {
                setCameFromRegistration(false);
                setActiveTab('settings');
              }}
              style={{
                background: activeTab === 'settings' ? 'var(--accent)' : '#0f172a',
                color: '#fff',
                border: '1px solid #aa771c',
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                transition: 'all 0.2s ease'
              }}
            >
              <Settings size={16} />
              <span>الإعدادات</span>
            </button>

            {/* Logout Button */}
            <button
              className="btn"
              onClick={handleLogout}
              style={{
                background: '#7f1d1d',
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



      {/* Tab Navigation */}
      <nav className="tab-nav">
        <div className="tab-nav-inner">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id || (tab.id === 'customers' && activeTab === 'potential-customers');
            const count = tab.id === 'queue'
              ? waitingQueueCount
              : tab.id === 'documents'
                ? rejectedDocsCount
                : tab.id === 'financial-request'
                  ? financialRequestCount
                  : 0;
            const badgeClass = tab.id === 'queue' ? 'tab-badge-floating amber' : 'tab-badge-floating';
            return (
              <button
                key={tab.id}
                className={`tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (tab.id === 'documents' && !docCustomerId && selectedBeneficiary) {
                    setDocCustomerId(selectedBeneficiary);
                  }
                  setCameFromRegistration(false);
                  setActiveTab(tab.id);
                }}
              >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} />
                  {count > 0 && <span className={badgeClass}>{count}</span>}
                </div>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Sub-navigation for Customers */}
      {(activeTab === 'customers' || activeTab === 'potential-customers') && (
        <nav className="tab-nav" style={{ position: 'relative', top: 'auto', borderTop: 'none', borderBottom: '1px solid var(--glass-border)', background: 'var(--surface-hover)' }}>
          <div className="tab-nav-inner" style={{ justifyContent: 'center' }}>
            <button
              className={`tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
              onClick={() => {
                setCameFromRegistration(false);
                setActiveTab('customers');
              }}
              style={{ flex: '0 1 auto', padding: '0.85rem 2.5rem' }}
            >
              <Users size={18} />
              <span>الزبائن الحاليين</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'potential-customers' ? 'active' : ''}`}
              onClick={() => {
                setCameFromRegistration(false);
                setActiveTab('potential-customers');
              }}
              style={{ flex: '0 1 auto', padding: '0.85rem 2.5rem' }}
            >
              <Users size={18} />
              <span>الزبائن المحتملين</span>
            </button>
          </div>
        </nav>
      )}

      {/* Broadcasts Marquee Banner */}
      {broadcasts.length > 0 && (() => {
        const isArabicBroadcast = /[\u0600-\u06FF]/.test(broadcasts.map(b => b.message).join(' '));
        return (
          <div style={{ borderBottom: '1px solid var(--glass-border)', padding: '0.65rem 1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--surface)', position: 'relative', overflow: 'hidden', zIndex: 90 }}>
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', flex: 1 }}>
              <div style={{ display: 'inline-flex', gap: '15rem', animation: `${isArabicBroadcast ? 'marqueeLTR' : 'marqueeRTL'} 35s linear infinite` }}>
                {broadcasts.map(b => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem', color: b.type === 'urgent' ? 'var(--error)' : b.type === 'warning' ? 'var(--warning)' : 'var(--primary)', fontWeight: 700 }}>
                    <Megaphone size={18} />
                    <span>{b.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Content */}
      <main className="app-main">
        <div className="main-inner">
          {activeTab === 'customers' && (
            <CustomerList
              onSelect={async (id) => {
                setSelectedBeneficiary(id);
                setSelectedGuarantor(null); // Reset
                setActiveTab('calculator');

                try {
                  const { data: tx } = await supabase
                    .from('transactions')
                    .select('id, status, transaction_guarantors(guarantor_id, guarantor_national_id, match_status)')
                    .eq('customer_id', id)
                    .in('status', ['MATCHED', 'ACTIVE', 'COMPLETED'])
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                  if (tx && tx.transaction_guarantors && tx.transaction_guarantors.length > 0) {
                    const confirmedGuar = tx.transaction_guarantors.find((tg: any) => tg.match_status === 'CONFIRMED');
                    if (confirmedGuar) {
                      if (confirmedGuar.guarantor_id) {
                        setSelectedGuarantor(confirmedGuar.guarantor_id);
                      } else if (confirmedGuar.guarantor_national_id) {
                        const { data: gCust } = await supabase
                          .from('customers')
                          .select('id')
                          .eq('national_id', confirmedGuar.guarantor_national_id)
                          .maybeSingle();
                        if (gCust) {
                          setSelectedGuarantor(gCust.id);
                        }
                      }
                    }
                  }
                } catch (err) {
                  console.error('Error fetching linked guarantor for calculator:', err);
                }
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
          {activeTab === 'potential-customers' && (
            <PotentialCustomers
              onConvert={(customer) => {
                setEditingCustomer({
                  id: '',
                  name: customer.name,
                  phone: customer.phone || '',
                  salary: customer.salary ? customer.salary.toString() : '',
                  workplace_id: customer.workplace_id || '',
                });
                setCameFromRegistration(true);
                setActiveTab('beneficiary');
              }}
            />
          )}
          {activeTab === 'calculator' && (
            <FinancialCalculator
              beneficiaryId={selectedBeneficiary}
              guarantorId={selectedGuarantor}
              showSaveButton={cameFromRegistration}
              onSaveSuccess={(txId) => {
                setActiveTransactionId(txId);
                setDocCustomerId(selectedBeneficiary);
                setActiveTab('financial-request');
              }}
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
                setCameFromRegistration(true);
                setActiveTab('calculator');
              }}
            />
          )}
          {activeTab === 'financial-request' && (
            <FinancialRequest
              beneficiaryId={selectedBeneficiary}
              onProceedToDocs={() => {
                setDocCustomerId(selectedBeneficiary);
                setActiveTab('documents');
              }}
            />
          )}
          {activeTab === 'documents' && <DocumentUploader customerId={docCustomerId} transactionId={activeTransactionId} />}
          {activeTab === 'queue' && <WaitingQueue />}
          {activeTab === 'settlements' && <Settlements />}
          {activeTab === 'reports' && <ReportsDashboard onTabChange={setActiveTab} />}
          {activeTab === 'dashboard' && (
            isManager ? (
              <ManagerDashboard onTabChange={setActiveTab} />
            ) : (
              <StaffDashboard onTabChange={setActiveTab} />
            )
          )}
          {activeTab === 'staff-stats' && <StaffStats />}
          {activeTab === 'settings' && <OfficeSettings />}
        </div>
      </main>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--surface)',
            border: '2px solid var(--glass-border)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            padding: '2rem',
            boxShadow: 'var(--shadow-lg)',
            position: 'relative',
            direction: 'rtl'
          }}>
            {/* Close Button */}
            <button
              onClick={() => {
                setShowSettingsModal(false);
                setPwError('');
                setPwSuccess('');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              style={{
                position: 'absolute',
                top: '1rem',
                left: '1rem',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="إغلاق"
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '1.5rem', borderBottom: '2px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
              إعدادات الحساب والمظهر
            </h2>

            {/* Change Password Form */}
            <form onSubmit={handlePasswordChange}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.75rem', color: 'var(--accent)', borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem' }}>
                تغيير كلمة المرور
              </h3>

              {pwError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', border: '1px solid var(--error)', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  {pwError}
                </div>
              )}

              {pwSuccess && (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: '1px solid var(--success)', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  {pwSuccess}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    كلمة المرور الحالية
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور الحالية للتحقق"
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--glass-border)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem'
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    كلمة المرور الجديدة
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="6 أحرف على الأقل"
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--glass-border)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem'
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    تأكيد كلمة المرور الجديدة
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="أعد إدخال كلمة المرور الجديدة"
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--glass-border)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem'
                    }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsModal(false);
                    setPwError('');
                    setPwSuccess('');
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="btn"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-primary)',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.85rem'
                  }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="btn"
                  style={{
                    background: '#0f172a',
                    color: '#fff',
                    border: 'none',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '100px'
                  }}
                >
                  {pwLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficeLayout;
