import { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Award, 
  Target, 
  Clock, 
  ArrowUpRight, 
  Settings, 
  CheckCircle,
  Calculator
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PremiumLockOverlay } from './PremiumLock';

interface ManagerDashboardProps {
  onTabChange?: (tab: 'dashboard' | 'calculator' | 'customers' | 'beneficiary' | 'documents' | 'queue' | 'settlements' | 'reports' | 'settings' | 'staff-stats' | 'financial-request') => void;
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ onTabChange }) => {
  const { officeId, planType, officeName } = useAuth();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [defaultAgencyFee, setDefaultAgencyFee] = useState<number>(500);

  useEffect(() => {
    if (officeId) {
      const savedFee = localStorage.getItem(`kafeel_agency_fee_${officeId}`);
      if (savedFee) {
        setDefaultAgencyFee(parseFloat(savedFee) || 500);
      }
      fetchDashboardData();
    }
  }, [officeId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. Fetch user profiles (team members)
      const { data: profiles, error: pError } = await supabase
        .from('user_profiles')
        .select('id, display_name, role, is_active')
        .eq('office_id', officeId);
        
      if (pError) throw pError;
      setTeam(profiles || []);

      // 2. Fetch customers for this office
      const { data: custs, error: cError } = await supabase
        .from('customers')
        .select('id, name, created_at')
        .eq('office_id', officeId);

      if (cError) throw cError;
      setCustomers(custs || []);

      // 3. Fetch transactions for this office
      const { data: txs, error: tError } = await supabase
        .from('transactions')
        .select('id, customer_id, car_price, purchase_cost, status, created_at')
        .eq('office_id', officeId);

      if (tError) throw tError;
      setTransactions(txs || []);

    } catch (err) {
      console.error('Error fetching manager dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get deterministic hash for assigning customer creator (matches StaffStats logic)
  const getCreatorIndex = (id: string, count: number) => {
    if (count <= 0) return 0;
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % count;
  };

  // Process data for KPIs and leaderboard
  const dashboardStats = useMemo(() => {
    const operationalTeam = team.filter(m => m.is_active);
    
    // Total numbers
    const totalCustomers = customers.length;
    const totalTransactions = transactions.length;
    
    // Status counts
    const pendingReviewCount = transactions.filter(t => t.status === 'PENDING').length;
    const waitingMatchCount = transactions.filter(t => t.status === 'WAITING_MATCH').length;
    const activeTransactionsCount = transactions.filter(t => ['MATCHED', 'ACTIVE'].includes(t.status)).length;
    const completedTransactionsCount = transactions.filter(t => t.status === 'COMPLETED').length;

    // Total volumes
    const totalVolume = transactions
      .filter(tx => ['WAITING_MATCH', 'MATCHED', 'ACTIVE', 'COMPLETED'].includes(tx.status))
      .reduce((sum, tx) => sum + (parseFloat(tx.car_price) || 0), 0);

    // Gross profits from completed transactions
    let grossProfit = 0;
    transactions.forEach(tx => {
      if (tx.status === 'COMPLETED') {
        const price = parseFloat(tx.car_price) || 0;
        const purchaseCost = parseFloat((tx as any).purchase_cost) || 0;
        const resellProfit = Math.max(0, price - purchaseCost);
        grossProfit += resellProfit + defaultAgencyFee;
      }
    });

    // Salaries expense
    let salariesExpense = 0;
    const savedSalaries = localStorage.getItem(`kafeel_salaries_${officeId}`);
    let salariesConfig: Record<string, any> = {};
    if (savedSalaries) {
      try {
        salariesConfig = JSON.parse(savedSalaries);
      } catch (e) {
        console.error('Error parsing salaries cache:', e);
      }
    }

    // Map customer counts to team members for leaderboard
    const memberLeaderboard: Record<string, { id: string; name: string; count: number; role: string }> = {};
    operationalTeam.forEach(m => {
      memberLeaderboard[m.id] = { id: m.id, name: m.display_name || 'موظف المكتب', count: 0, role: m.role };
    });

    if (operationalTeam.length > 0) {
      customers.forEach(c => {
        const creatorIdx = getCreatorIndex(c.id, operationalTeam.length);
        const assignedCreator = operationalTeam[creatorIdx];
        if (assignedCreator && memberLeaderboard[assignedCreator.id]) {
          memberLeaderboard[assignedCreator.id].count += 1;
        }
      });
    }

    const leaderboard = Object.values(memberLeaderboard).sort((a, b) => b.count - a.count);

    // Compute payouts for salariesExpense
    operationalTeam.forEach(member => {
      const config = salariesConfig[member.id] || {
        salaryType: member.role === 'staff' ? 'salary_and_commission' : 'salary_only',
        baseSalary: member.role === 'manager' ? 2500 : (member.role === 'accountant' ? 2000 : 1500),
        absentDays: 0,
        commissionPercentage: member.role === 'staff' ? 10 : 0
      };

      const absentDays = Math.min(30, Math.max(0, config.absentDays || 0));
      const absentDeduction = config.salaryType !== 'commission_only' ? (config.baseSalary * absentDays) / 30 : 0;
      const earnedSalary = config.salaryType !== 'commission_only' ? config.baseSalary - absentDeduction : 0;

      // Calculate commission from completed transactions assigned to this creator
      let memberCompletedProfit = 0;
      transactions.forEach(tx => {
        if (tx.status === 'COMPLETED') {
          const creatorIdx = getCreatorIndex(tx.customer_id, operationalTeam.length);
          const assignedCreator = operationalTeam[creatorIdx];
          if (assignedCreator && assignedCreator.id === member.id) {
            const price = parseFloat(tx.car_price) || 0;
            const purchaseCost = parseFloat((tx as any).purchase_cost) || 0;
            const resellProfit = Math.max(0, price - purchaseCost);
            memberCompletedProfit += resellProfit + defaultAgencyFee;
          }
        }
      });

      const commissionPercentage = config.commissionPercentage || 0;
      const earnedCommission = config.salaryType !== 'salary_only' ? (memberCompletedProfit * commissionPercentage) / 100 : 0;
      salariesExpense += earnedSalary + earnedCommission;
    });

    const netProfit = grossProfit - salariesExpense;

    return {
      totalCustomers,
      totalTransactions,
      pendingReviewCount,
      waitingMatchCount,
      activeTransactionsCount,
      completedTransactionsCount,
      totalVolume,
      grossProfit,
      salariesExpense,
      netProfit,
      leaderboard
    };
  }, [team, customers, transactions, defaultAgencyFee, officeId]);

  if (loading) {
    return (
      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>جاري تحميل لوحة التحكم للمدير...</p>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Premium Welcome Box */}
      <div className="glass" style={{ padding: '2rem', borderRadius: '16px', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.1), rgba(var(--accent-rgb), 0.05))', border: '1px solid var(--primary-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'var(--bg-secondary)', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--glass-border)' }}>
            <Award size={32} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
              لوحة التحكم الرئيسية لمدير مكتب {officeName || ''} 👑
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0 }}>
              مرحباً بك مجدداً. راقب أداء الفرع، مستويات الإنتاجية للضمانات، واطلع على المؤشرات المالية والتشغيلية المحدثة.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>الأداء العام للفرع ومؤشرات الكفاءة 📈</h3>
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        <div className="stat-card glass" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid var(--primary)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
          <div className="stat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <span className="stat-title" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>إجمالي زبائن الفرع</span>
            <Users size={20} style={{ color: 'var(--primary)' }} />
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{dashboardStats.totalCustomers}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
              <TrendingUp size={12} /> زبائن مسجلين بالفرع
            </div>
          </div>
        </div>

        <div className="stat-card glass" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid var(--warning)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
          <div className="stat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <span className="stat-title" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>بانتظار مطابقة الضامن</span>
            <Clock size={20} style={{ color: 'var(--warning)' }} />
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{dashboardStats.waitingMatchCount}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
              زبائن في قائمة الانتظار
            </div>
          </div>
        </div>

        <div className="stat-card glass" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #ef4444', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
          <div className="stat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <span className="stat-title" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>طلبات تمويل معلقة للمراجعة</span>
            <Target size={20} style={{ color: '#ef4444' }} />
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{dashboardStats.pendingReviewCount}</div>
            <div style={{ fontSize: '0.78rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
              معاملات تحتاج مراجعة واعتماد
            </div>
          </div>
        </div>

        <div className="stat-card glass" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid var(--success)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
          <div className="stat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <span className="stat-title" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>معاملات نشطة / مكتملة</span>
            <CheckCircle size={20} style={{ color: 'var(--success)' }} />
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <div className="stat-value" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {dashboardStats.activeTransactionsCount} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-tertiary)' }}>نشطة</span>
              <span style={{ margin: '0 0.4rem', color: 'var(--glass-border)' }}>/</span>
              {dashboardStats.completedTransactionsCount} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-tertiary)' }}>مكتملة</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
              أداء تشغيلي مستقر
            </div>
          </div>
        </div>

      </div>

      {/* Financial Overview & Leaders grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
        
        {/* Financial Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>المؤشرات المالية الكلية لعمليات الفرع 💰</h3>
          <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>إجمالي حجم التمويلات الموزعة</p>
                <h4 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  {dashboardStats.totalVolume.toLocaleString('ar-LY')} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>د.ل</span>
                </h4>
              </div>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(234, 179, 8, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eab308' }}>
                <DollarSign size={20} />
              </div>
            </div>

            <PremiumLockOverlay isLocked={planType === 'BASIC'}>
              <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>الأرباح التشغيلية الإجمالية (مبيعات + عمولات)</p>
                  <h4 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--success)' }}>
                    {planType === 'BASIC' ? '—' : dashboardStats.grossProfit.toLocaleString('ar-LY')} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>د.ل</span>
                  </h4>
                </div>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                  <TrendingUp size={20} />
                </div>
              </div>
            </PremiumLockOverlay>

            <PremiumLockOverlay isLocked={planType === 'BASIC'}>
              <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>صافي الدخل التشغيلي للفرع (بعد المرتبات)</p>
                  <h4 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: dashboardStats.netProfit >= 0 ? 'var(--primary)' : '#ef4444' }}>
                    {planType === 'BASIC' ? '—' : dashboardStats.netProfit.toLocaleString('ar-LY')} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>د.ل</span>
                  </h4>
                </div>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(191,149,63,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <Award size={20} />
                </div>
              </div>
            </PremiumLockOverlay>
            
          </div>
        </div>

        {/* Staff leaderboard overview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>لوحة التميز وصدارة الموظفين 🏆</h3>
          <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {dashboardStats.leaderboard.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
                لا توجد بيانات موظفين متاحة.
              </div>
            ) : (
              dashboardStats.leaderboard.slice(0, 3).map((item, idx) => {
                const colors = ['#bf953f', '#94a3b8', '#b45309'];
                const medals = ['👑 1', '🥈 2', '🥉 3'];
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--surface-hover)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ 
                        fontSize: '0.85rem', 
                        fontWeight: 'bold', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '12px', 
                        background: `${colors[idx]}15`, 
                        color: colors[idx],
                        border: `1px solid ${colors[idx]}44`
                      }}>
                        {medals[idx]}
                      </span>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{item.name}</h4>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                          {item.role === 'manager' ? 'مدير مكتب' : item.role === 'accountant' ? 'محاسب' : 'إدخال بيانات'}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <span style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--primary)' }}>{item.count}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginRight: '0.25rem' }}>زبائن</span>
                    </div>
                  </div>
                );
              })
            )}
            {dashboardStats.leaderboard.length > 3 && (
              <button 
                onClick={() => onTabChange?.('staff-stats')}
                className="btn btn-ghost btn-sm"
                style={{ width: '100%', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', border: '1px dashed var(--glass-border)' }}
              >
                <span>عرض الترتيب الكامل والإنتاجية</span>
                <ArrowUpRight size={14} />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Quick Actions Shortcuts */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>أدوات الوصول السريع للمهام الإدارية ⚡</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        
        <div className="glass card-hover" onClick={() => onTabChange?.('calculator')} style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', borderRight: '4px solid var(--primary)', display: 'flex', gap: '0.75rem', alignItems: 'center', transition: 'transform 0.2s, box-shadow 0.2s' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
            <Calculator size={20} />
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.15rem 0', fontSize: '0.92rem', fontWeight: 'bold' }}>الحاسبة المالية</h4>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>عمليات حساب الأرباح والأقساط</p>
          </div>
        </div>

        <div className="glass card-hover" onClick={() => onTabChange?.('queue')} style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', borderRight: '4px solid var(--warning)', display: 'flex', gap: '0.75rem', alignItems: 'center', transition: 'transform 0.2s, box-shadow 0.2s' }}>
          <div style={{ background: 'rgba(234, 179, 8, 0.1)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)', flexShrink: 0 }}>
            <Clock size={20} />
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.15rem 0', fontSize: '0.92rem', fontWeight: 'bold' }}>قائمة الانتظار</h4>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>متابعة واعتماد مطابقة الضامنين</p>
          </div>
        </div>

        <div className="glass card-hover" onClick={() => onTabChange?.('reports')} style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', borderRight: '4px solid var(--success)', display: 'flex', gap: '0.75rem', alignItems: 'center', transition: 'transform 0.2s, box-shadow 0.2s' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', flexShrink: 0 }}>
            <BarChart3 size={20} />
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.15rem 0', fontSize: '0.92rem', fontWeight: 'bold' }}>التقارير المالية</h4>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>تحليل الأرباح والتمويلات بالفرع</p>
          </div>
        </div>

        <div className="glass card-hover" onClick={() => onTabChange?.('settings')} style={{ padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', borderRight: '4px solid #a1a1aa', display: 'flex', gap: '0.75rem', alignItems: 'center', transition: 'transform 0.2s, box-shadow 0.2s' }}>
          <div style={{ background: 'rgba(161, 161, 170, 0.1)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a1a1aa', flexShrink: 0 }}>
            <Settings size={20} />
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.15rem 0', fontSize: '0.92rem', fontWeight: 'bold' }}>إعدادات الفريق</h4>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>تعديل صلاحيات ومستويات موظفيك</p>
          </div>
        </div>

      </div>

    </div>
  );
};

export default ManagerDashboard;
