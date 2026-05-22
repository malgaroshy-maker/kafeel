import { useState, useEffect } from 'react';
import { Trophy, Target, Star, Users, CheckCircle, Plus, Calculator, Search, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface RecentCustomer {
  id: string;
  name: string;
  national_id: string;
  created_at: string;
  transactions?: {
    id: string;
    status: string;
    is_files_complete: boolean;
  }[];
}

interface StaffDashboardProps {
  onTabChange?: (tab: 'dashboard' | 'calculator' | 'customers' | 'beneficiary' | 'documents' | 'queue' | 'settlements' | 'reports' | 'settings') => void;
}

const StaffDashboard: React.FC<StaffDashboardProps> = ({ onTabChange }) => {
  const { officeId } = useAuth();
  const [recentCustomers, setRecentCustomers] = useState<RecentCustomer[]>([]);
  const [stats, setStats] = useState({ today: 0, thisWeek: 0 });
  const [loading, setLoading] = useState(true);

  const DAILY_GOAL = 5; // Daily registrations target

  useEffect(() => {
    if (officeId) {
      fetchDashboardData();
    }
  }, [officeId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch recent customers with their transactions in a single query
      const { data: customers, error } = await supabase
        .from('customers')
        .select(`
          id, 
          name, 
          national_id, 
          created_at,
          transactions (
            id,
            status,
            is_files_complete
          )
        `)
        .eq('office_id', officeId)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (error) throw error;
      
      setRecentCustomers((customers as any) || []);
      
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      
      const lastWeek = new Date();
      lastWeek.setDate(now.getDate() - 7);
      const startOfWeek = lastWeek.toISOString();
      
      const todayCount = (customers || []).filter(c => c.created_at >= startOfDay).length;
      const weekCount = (customers || []).filter(c => c.created_at >= startOfWeek).length;
      
      setStats({ today: todayCount, thisWeek: weekCount });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  // Gamification logic
  let message = "مرحباً بك في لوحة التحكم التفاعلية 🌟";
  let description = "تابع إنجازاتك اليومية وسجل زبائنك لرفع مؤشرات أدائك.";
  let icon = <Star size={32} style={{ color: 'var(--warning)' }} />;
  
  if (stats.today >= DAILY_GOAL) {
    message = "بطل اليوم! أنجزت الهدف بالكامل 👑🏆";
    description = "لقد تخطيت الهدف اليومي لتسجيل الزبائن بنجاح! واصل هذا التميز.";
    icon = <Trophy size={32} style={{ color: '#eab308' }} />;
  } else if (stats.today >= 3) {
    message = "أداء ممتاز! اقتربت جداً من تحقيق الهدف 🔥";
    description = `أنت على بعد ${DAILY_GOAL - stats.today} زبائن فقط من إكمال تحدي اليوم.`;
    icon = <Sparkles size={32} style={{ color: 'var(--primary)' }} />;
  } else if (stats.today >= 1) {
    message = "عمل جيد! خطوة ممتازة نحو البداية 🚀";
    description = "تم تسجيل زبائن اليوم، استمر للحفاظ على نشاطك اليومي.";
    icon = <Target size={32} style={{ color: 'var(--accent)' }} />;
  }

  const dailyProgress = Math.min((stats.today / DAILY_GOAL) * 100, 100);

  // Status mapping
  const getStatusBadge = (txs?: any[]) => {
    if (!txs || txs.length === 0) return { label: 'زبون مسجل (بدون معاملة)', bg: 'rgba(255,255,255,0.05)', color: 'var(--text-tertiary)' };
    const tx = txs[0];
    if (!tx.is_files_complete) return { label: 'بانتظار إكمال الملفات 📁', bg: 'rgba(234, 179, 8, 0.1)', color: 'var(--warning)' };
    
    switch (tx.status) {
      case 'PENDING':
        return { label: 'انتظار المراجعة الإدارية ⏳', bg: 'rgba(234, 179, 8, 0.1)', color: 'var(--warning)' };
      case 'WAITING_MATCH':
        return { label: 'بانتظار مطابقة كفيل 🔍', bg: 'rgba(249, 115, 22, 0.1)', color: '#f97316' };
      case 'MATCHED':
        return { label: 'تمت المطابقة بنجاح 🎉', bg: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)' };
      case 'ACTIVE':
        return { label: 'معاملة نشطة 💳', bg: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' };
      case 'COMPLETED':
        return { label: 'مكتملة ومسواة ✅', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' };
      default:
        return { label: tx.status, bg: 'rgba(255,255,255,0.05)', color: 'var(--text-tertiary)' };
    }
  };

  return (
    <div className="fade-in" style={{ padding: '1rem', maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* Gamified Header Welcome Box */}
      <div className="glass" style={{ padding: '2rem', borderRadius: '16px', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.1), rgba(var(--accent-rgb), 0.05))', border: '1px solid var(--primary-light)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'var(--bg-secondary)', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--glass-border)' }}>
            {icon}
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
              {message}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0 }}>
              {description}
            </p>
          </div>
        </div>

        {/* Daily Goal Progress Bar */}
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
            <span style={{ color: 'var(--text-secondary)' }}>تحدي الإنجاز اليومي (الهدف: {DAILY_GOAL} زبائن)</span>
            <span style={{ color: dailyProgress === 100 ? '#eab308' : 'var(--primary)' }}>
              {stats.today} / {DAILY_GOAL} ({Math.round(dailyProgress)}%)
            </span>
          </div>
          <div style={{ width: '100%', height: '10px', background: 'var(--surface-hover)', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
            <div style={{ width: `${dailyProgress}%`, height: '100%', background: dailyProgress === 100 ? 'linear-gradient(90deg, #bf953f, #fcf6ba, #aa771c)' : 'linear-gradient(90deg, var(--primary), var(--accent))', borderRadius: '10px', transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
          </div>
        </div>
      </div>

      {/* Quick Action Cards Block */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>وصول سريع للمهام الإدارية ⚡</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        <div className="glass card-hover" onClick={() => onTabChange?.('beneficiary')} style={{ padding: '1.5rem', borderRadius: '12px', cursor: 'pointer', borderRight: '4px solid var(--primary)', display: 'flex', gap: '1rem', alignItems: 'center', transition: 'transform 0.2s, box-shadow 0.2s' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
            <Plus size={24} />
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 'bold' }}>تسجيل زبون جديد</h4>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>تسجيل مستفيد جديد مع ضامنيه ومستنداته</p>
          </div>
        </div>

        <div className="glass card-hover" onClick={() => onTabChange?.('calculator')} style={{ padding: '1.5rem', borderRadius: '12px', cursor: 'pointer', borderRight: '4px solid var(--accent)', display: 'flex', gap: '1rem', alignItems: 'center', transition: 'transform 0.2s, box-shadow 0.2s' }}>
          <div style={{ background: 'rgba(191, 149, 63, 0.1)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
            <Calculator size={24} />
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 'bold' }}>الحاسبة المالية</h4>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>حساب هامش الأرباح والأقساط الشهرية</p>
          </div>
        </div>

        <div className="glass card-hover" onClick={() => onTabChange?.('customers')} style={{ padding: '1.5rem', borderRadius: '12px', cursor: 'pointer', borderRight: '4px solid #10b981', display: 'flex', gap: '1rem', alignItems: 'center', transition: 'transform 0.2s, box-shadow 0.2s' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', flexShrink: 0 }}>
            <Search size={24} />
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 'bold' }}>إدارة وبحث الزبائن</h4>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>البحث عن الزبائن، التعديل أو رفع الملفات</p>
          </div>
        </div>

      </div>

      {/* Grid of stats and recent list */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        
        {/* Simple Performance Stats Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>نشاطك البرمجي الأسبوعي 📈</h3>
          <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>مجموع إضافات اليوم</p>
                <h4 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>{stats.today} زبائن</h4>
              </div>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                <Users size={20} />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>مجموع الإضافات هذا الأسبوع</p>
                <h4 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>{stats.thisWeek} زبائن</h4>
              </div>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <CheckCircle size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Registrations List with Real-time Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>آخر التسجيلات وحالة المطابقة 📂</h3>
          <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px', flex: 1 }}>
            
            {recentCustomers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                لم تقم بإضافة أي زبائن مؤخراً.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {recentCustomers.map(customer => {
                  const status = getStatusBadge(customer.transactions);
                  return (
                    <div 
                      key={customer.id} 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '0.5rem', 
                        padding: '1rem', 
                        background: 'var(--surface-hover)', 
                        borderRadius: '8px', 
                        border: '1px solid var(--glass-border)' 
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-ghost)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                            {customer.name.substring(0, 1)}
                          </div>
                          <div>
                            <h4 style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{customer.name}</h4>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{customer.national_id}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                          {new Date(customer.created_at).toLocaleDateString('ar-LY')}
                        </div>
                      </div>

                      {/* Dynamic Status Badge */}
                      <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '0.2rem' }}>
                        <span 
                          style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 'bold', 
                            padding: '0.25rem 0.6rem', 
                            borderRadius: '6px', 
                            background: status.bg, 
                            color: status.color,
                            border: `1px solid ${status.color}33`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          {status.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default StaffDashboard;
