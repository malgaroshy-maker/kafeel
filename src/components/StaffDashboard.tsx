import React, { useState, useEffect } from 'react';
import { Trophy, Target, Star, Users, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface RecentCustomer {
  id: string;
  name: string;
  national_id: string;
  created_at: string;
}

const StaffDashboard: React.FC = () => {
  const { session, officeId } = useAuth();
  const [recentCustomers, setRecentCustomers] = useState<RecentCustomer[]>([]);
  const [stats, setStats] = useState({ today: 0, thisWeek: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (officeId) {
      fetchDashboardData();
    }
  }, [officeId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const { data: customers, error } = await supabase
        .from('customers')
        .select('id, name, national_id, created_at')
        .eq('office_id', officeId)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (error) throw error;
      
      setRecentCustomers(customers || []);
      
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
    return <div className="p-8 text-center text-text-tertiary">جاري التحميل...</div>;
  }

  // Gamification logic
  let message = "مرحباً بك في لوحة التحكم";
  let icon = <Star size={24} style={{ color: 'var(--text-tertiary)' }} />;
  if (stats.today >= 5) {
    message = "أداء استثنائي اليوم! 🔥";
    icon = <Trophy size={24} style={{ color: 'var(--warning)' }} />;
  } else if (stats.today >= 1) {
    message = "عمل رائع! استمر في إضافة الزبائن 🚀";
    icon = <Target size={24} style={{ color: 'var(--primary)' }} />;
  }

  return (
    <div className="fade-in" style={{ padding: '1rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div className="glass" style={{ padding: '2rem', borderRadius: '16px', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.1), rgba(var(--accent-rgb), 0.05))', border: '1px solid var(--primary-light)' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {icon}
            {message}
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            تابع إنجازاتك ونشاطاتك الأخيرة بكل سهولة.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid var(--success)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>إضافات اليوم</p>
              <h3 style={{ fontSize: '2rem', margin: 0, fontWeight: 800, color: 'var(--text-primary)' }}>{stats.today}</h3>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
              <Users size={24} />
            </div>
          </div>
        </div>

        <div className="glass" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>إضافات هذا الأسبوع</p>
              <h3 style={{ fontSize: '2rem', margin: 0, fontWeight: 800, color: 'var(--text-primary)' }}>{stats.thisWeek}</h3>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <CheckCircle size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={20} style={{ color: 'var(--accent)' }} />
          آخر التسجيلات
        </h3>
        
        {recentCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
            لم تقم بإضافة أي زبائن مؤخراً.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentCustomers.map(customer => (
              <div key={customer.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--surface-hover)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-ghost)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 'bold' }}>
                    {customer.name.substring(0, 1)}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>{customer.name}</h4>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>{customer.national_id}</span>
                  </div>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                  {new Date(customer.created_at).toLocaleDateString('ar-LY')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffDashboard;
