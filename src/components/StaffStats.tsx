import { useState, useEffect, useMemo } from 'react';
import { Users, Trophy, BarChart3, TrendingUp, DollarSign, Award, Target, Star, Shield, ArrowUpRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PremiumLockOverlay, PremiumLockBanner } from './PremiumLock';

interface StaffMetric {
  id: string;
  name: string;
  role: string;
  customerCount: number;
  activeTransactionsCount: number;
  completedTransactionsCount: number;
  totalVolume: number;
  rank: number;
  potentialCount: number;
  convertedCount: number;
  conversionRate: number;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  manager: { label: 'مدير مكتب', color: 'var(--primary)' },
  accountant: { label: 'محاسب', color: 'var(--success)' },
  staff: { label: 'إدخال بيانات', color: 'var(--text-tertiary)' },
};

export default function StaffStats() {
  const { officeId, planType } = useAuth();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [potentialCustomers, setPotentialCustomers] = useState<any[]>([]);
  
  interface StaffFinancialConfig {
    salaryType: 'salary_only' | 'salary_and_commission' | 'commission_only';
    baseSalary: number;
    absentDays: number;
    commissionPercentage: number;
  }

  const [salaries, setSalaries] = useState<Record<string, StaffFinancialConfig>>({});
  const [defaultAgencyFee, setDefaultAgencyFee] = useState<number>(500);

  useEffect(() => {
    if (officeId && team.length > 0) {
      const savedFee = localStorage.getItem(`kafeel_agency_fee_${officeId}`);
      if (savedFee) {
        setDefaultAgencyFee(parseFloat(savedFee) || 500);
      }

      const saved = localStorage.getItem(`kafeel_salaries_${officeId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const converted: Record<string, StaffFinancialConfig> = {};
          
          team.forEach(member => {
            const val = parsed[member.id];
            if (typeof val === 'number') {
              converted[member.id] = {
                salaryType: 'salary_only',
                baseSalary: val,
                absentDays: 0,
                commissionPercentage: member.role === 'staff' ? 10 : 0
              };
            } else if (val && typeof val === 'object') {
              converted[member.id] = val;
            } else {
              converted[member.id] = {
                salaryType: member.role === 'staff' ? 'salary_and_commission' : 'salary_only',
                baseSalary: member.role === 'manager' ? 2500 : (member.role === 'accountant' ? 2000 : 1500),
                absentDays: 0,
                commissionPercentage: member.role === 'staff' ? 10 : 0
              };
            }
          });
          setSalaries(converted);
        } catch {
          const initial: Record<string, StaffFinancialConfig> = {};
          team.forEach(member => {
            initial[member.id] = {
              salaryType: member.role === 'staff' ? 'salary_and_commission' : 'salary_only',
              baseSalary: member.role === 'manager' ? 2500 : (member.role === 'accountant' ? 2000 : 1500),
              absentDays: 0,
              commissionPercentage: member.role === 'staff' ? 10 : 0
            };
          });
          setSalaries(initial);
        }
      } else {
        const initial: Record<string, StaffFinancialConfig> = {};
        team.forEach(member => {
          initial[member.id] = {
            salaryType: member.role === 'staff' ? 'salary_and_commission' : 'salary_only',
            baseSalary: member.role === 'manager' ? 2500 : (member.role === 'accountant' ? 2000 : 1500),
            absentDays: 0,
            commissionPercentage: member.role === 'staff' ? 10 : 0
          };
        });
        setSalaries(initial);
        localStorage.setItem(`kafeel_salaries_${officeId}`, JSON.stringify(initial));
      }
    }
  }, [officeId, team]);

  const handleUpdateConfig = (memberId: string, field: keyof StaffFinancialConfig, value: any) => {
    const prev = salaries[memberId] || {
      salaryType: 'salary_only',
      baseSalary: 1500,
      absentDays: 0,
      commissionPercentage: 0
    };
    const updated = {
      ...salaries,
      [memberId]: {
        ...prev,
        [field]: value
      }
    };
    setSalaries(updated);
    localStorage.setItem(`kafeel_salaries_${officeId}`, JSON.stringify(updated));
  };

  const handleUpdateAgencyFee = (fee: number) => {
    setDefaultAgencyFee(fee);
    localStorage.setItem(`kafeel_agency_fee_${officeId}`, fee.toString());
  };

  useEffect(() => {
    if (officeId) {
      fetchStatsData();
    }
  }, [officeId]);

  const fetchStatsData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch all user profiles for this office
      const { data: profiles, error: pError } = await supabase
        .from('user_profiles')
        .select('id, display_name, role, is_active')
        .eq('office_id', officeId);
        
      if (pError) throw pError;
      setTeam(profiles || []);

      // 2. Fetch all customers for this office
      const { data: custs, error: cError } = await supabase
        .from('customers')
        .select('id, name, created_at')
        .eq('office_id', officeId);

      if (cError) throw cError;
      setCustomers(custs || []);

      // 3. Fetch all transactions for this office
      const { data: txs, error: tError } = await supabase
        .from('transactions')
        .select('id, customer_id, car_price, purchase_cost, status')
        .eq('office_id', officeId);

      if (tError) throw tError;
      setTransactions(txs || []);

      // 4. Fetch all potential customers (with fallback)
      let potCustsData = [];
      try {
        const { data, error } = await supabase
          .from('potential_customers')
          .select('id, name, created_at, is_converted, converted_at, created_by')
          .eq('office_id', officeId);
        if (!error && data) {
          potCustsData = data;
        } else {
          const saved = localStorage.getItem(`kafeel_potential_customers_${officeId}`);
          if (saved) potCustsData = JSON.parse(saved);
        }
      } catch (err) {
        const saved = localStorage.getItem(`kafeel_potential_customers_${officeId}`);
        if (saved) potCustsData = JSON.parse(saved);
      }
      setPotentialCustomers(potCustsData || []);

    } catch (err) {
      console.error('Error fetching statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  // Deterministic hashing to map a customer ID to a staff member
  const getCreatorIndex = (id: string, count: number) => {
    if (count <= 0) return 0;
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % count;
  };

  const stats: StaffMetric[] = useMemo(() => {
    if (team.length === 0) return [];

    const operationalTeam = team.filter(member => member.is_active);

    const memberMetrics: Record<string, Omit<StaffMetric, 'rank'>> = {};
    
    operationalTeam.forEach(member => {
      memberMetrics[member.id] = {
        id: member.id,
        name: member.display_name || 'موظف غير مسمى',
        role: member.role,
        customerCount: 0,
        activeTransactionsCount: 0,
        completedTransactionsCount: 0,
        totalVolume: 0,
        totalTransactionProfit: 0,
        earnedCommission: 0,
        earnedSalary: 0,
        absentDeduction: 0,
        totalPayout: 0,
        potentialCount: 0,
        convertedCount: 0,
        conversionRate: 0
      } as any;
    });

    if (operationalTeam.length > 0) {
      customers.forEach(cust => {
        const creatorIndex = getCreatorIndex(cust.id, operationalTeam.length);
        const assignedCreator = operationalTeam[creatorIndex];
        if (assignedCreator && memberMetrics[assignedCreator.id]) {
          memberMetrics[assignedCreator.id].customerCount += 1;
        }
      });

      transactions.forEach(tx => {
        const creatorIndex = getCreatorIndex(tx.customer_id, operationalTeam.length);
        const assignedCreator = operationalTeam[creatorIndex];
        if (assignedCreator && memberMetrics[assignedCreator.id]) {
          const price = parseFloat(tx.car_price) || 0;
          const purchaseCost = parseFloat((tx as any).purchase_cost) || 0;
          memberMetrics[assignedCreator.id].totalVolume += price;

          const resellProfit = Math.max(0, price - purchaseCost);
          const transProfit = resellProfit + defaultAgencyFee;

          if (tx.status === 'COMPLETED') {
            memberMetrics[assignedCreator.id].completedTransactionsCount += 1;
            (memberMetrics[assignedCreator.id] as any).totalTransactionProfit += transProfit;
          } else if (['WAITING_MATCH', 'MATCHED', 'ACTIVE'].includes(tx.status)) {
            memberMetrics[assignedCreator.id].activeTransactionsCount += 1;
          }
        }
      });

      potentialCustomers.forEach(pc => {
        let assignedMemberId = null;
        if (pc.created_by && operationalTeam.some(m => m.id === pc.created_by)) {
          assignedMemberId = pc.created_by;
        } else {
          const creatorIndex = getCreatorIndex(pc.id, operationalTeam.length);
          const assignedCreator = operationalTeam[creatorIndex];
          if (assignedCreator) {
            assignedMemberId = assignedCreator.id;
          }
        }
        
        if (assignedMemberId && memberMetrics[assignedMemberId]) {
          memberMetrics[assignedMemberId].potentialCount += 1;
          if (pc.is_converted) {
            memberMetrics[assignedMemberId].convertedCount += 1;
          }
        }
      });
    }

    const sorted = Object.values(memberMetrics).map(item => {
      const config = salaries[item.id] || {
        salaryType: 'salary_only',
        baseSalary: 1500,
        absentDays: 0,
        commissionPercentage: 0
      };

      const absentDays = Math.min(30, Math.max(0, config.absentDays || 0));
      const absentDeduction = config.salaryType !== 'commission_only' 
        ? (config.baseSalary * absentDays) / 30 
        : 0;
      const earnedSalary = config.salaryType !== 'commission_only'
        ? config.baseSalary - absentDeduction
        : 0;

      const commissionPercentage = config.commissionPercentage || 0;
      const earnedCommission = config.salaryType !== 'salary_only'
        ? ((item as any).totalTransactionProfit * commissionPercentage) / 100
        : 0;

      const totalPayout = earnedSalary + earnedCommission;
      const potentialCount = (item as any).potentialCount || 0;
      const convertedCount = (item as any).convertedCount || 0;
      const conversionRate = potentialCount > 0 ? (convertedCount / potentialCount) * 100 : 0;

      return {
        ...item,
        earnedSalary,
        absentDeduction,
        earnedCommission,
        totalPayout,
        salaryType: config.salaryType,
        baseSalary: config.baseSalary,
        absentDays,
        commissionPercentage,
        potentialCount,
        convertedCount,
        conversionRate
      };
    }).sort((a, b) => b.customerCount - a.customerCount);

    return sorted.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  }, [team, customers, transactions, potentialCustomers, salaries, defaultAgencyFee]);

  const totalOfficeCustomers = customers.length;
  const topEmployee = stats.length > 0 ? stats[0] : null;
  const averageCustomersPerEmployee = stats.length > 0 ? (totalOfficeCustomers / stats.length).toFixed(1) : '0';
  
  const totalSalesVolume = useMemo(() => {
    return transactions
      .filter(tx => ['WAITING_MATCH', 'MATCHED', 'ACTIVE', 'COMPLETED'].includes(tx.status))
      .reduce((sum, tx) => sum + (parseFloat(tx.car_price) || 0), 0);
  }, [transactions]);

  const totalSalariesExpense = useMemo(() => {
    return stats.reduce((sum, member) => sum + (member as any).totalPayout, 0);
  }, [stats]);

  const totalOfficeProfit = useMemo(() => {
    const grossProfit = stats.reduce((sum, member) => sum + ((member as any).totalTransactionProfit || 0), 0);
    return grossProfit - totalSalariesExpense;
  }, [stats, totalSalariesExpense]);

  if (loading) {
    return (
      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>جاري تحميل إحصائيات الموظفين...</p>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ padding: '1rem' }}>
      {/* Header */}
      <div className="section-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
            <BarChart3 size={24} style={{ color: 'var(--primary)' }} />
            إنتاجية الموظفين وإحصائيات العمل
          </h2>
          <p className="text-tertiary" style={{ margin: '0.5rem 0 0 0' }}>
            تقارير تفصيلية ترصد كفاءة الموظفين وحجم الزبائن والتمويلات المسجلة بواسطة كل منهم.
          </p>
        </div>
        <button 
          className="btn" 
          onClick={fetchStatsData}
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <span>تحديث البيانات</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        <div className="stat-card glass" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid var(--primary)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
          <div className="stat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <span className="stat-title" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>إجمالي زبائن الفرع</span>
            <Users size={20} style={{ color: 'var(--primary)' }} />
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalOfficeCustomers}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
              <TrendingUp size={12} /> زبائن مسجلين بالمنظومة
            </div>
          </div>
        </div>

        <div className="stat-card glass" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid var(--success)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
          <div className="stat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <span className="stat-title" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>أعلى الموظفين نشاطاً</span>
            <Trophy size={20} style={{ color: 'var(--success)' }} />
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <div className="stat-value" style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {topEmployee ? topEmployee.name : '—'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
              <Star size={12} /> {topEmployee ? `${topEmployee.customerCount} زبون` : '—'}
            </div>
          </div>
        </div>

        <div className="stat-card glass" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #3b82f6', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
          <div className="stat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <span className="stat-title" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>متوسط إدخال الموظف</span>
            <Target size={20} style={{ color: '#3b82f6' }} />
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{averageCustomersPerEmployee}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
              زبائن / موظف
            </div>
          </div>
        </div>

        <div className="stat-card glass" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #10b981', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
          <div className="stat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <span className="stat-title" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>معدل تحويل الزبائن</span>
            <Target size={20} style={{ color: '#10b981' }} />
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {(() => {
                const totalPot = potentialCustomers.length;
                const totalConv = potentialCustomers.filter(c => c.is_converted).length;
                return totalPot > 0 ? `${((totalConv / totalPot) * 100).toFixed(0)}%` : '0%';
              })()}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
              تحويل الزبائن المحتملين إلى زبائن نشطين
            </div>
          </div>
        </div>

        <div className="stat-card glass" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #eab308', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
          <div className="stat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <span className="stat-title" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>حجم التمويلات الموزعة</span>
            <DollarSign size={20} style={{ color: '#eab308' }} />
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <div className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {totalSalesVolume.toLocaleString('ar-LY')} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>د.ل</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
              <ArrowUpRight size={12} /> إجمالي المبيعات
            </div>
          </div>
        </div>

        {/* Premium Lockable Salaries Card */}
        <PremiumLockOverlay isLocked={planType === 'BASIC'}>
          <div className="stat-card glass" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #ef4444', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
            <div className="stat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
              <span className="stat-title" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>مصروف المرتبات الشهري</span>
              <DollarSign size={20} style={{ color: '#ef4444' }} />
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <div className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>
                {planType === 'BASIC' ? '—' : totalSalariesExpense.toLocaleString('ar-LY')} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>د.ل</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                إجمالي مستحقات الفريق
              </div>
            </div>
          </div>
        </PremiumLockOverlay>

        {/* Premium Lockable Net Profit Card */}
        <PremiumLockOverlay isLocked={planType === 'BASIC'}>
          <div className="stat-card glass" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid var(--primary)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px', background: 'linear-gradient(135deg, rgba(191,149,63,0.05) 0%, transparent 100%)' }}>
            <div className="stat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
              <span className="stat-title" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>صافي الأرباح التشغيلية</span>
              <Award size={20} style={{ color: 'var(--primary)' }} />
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <div className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 800, color: totalOfficeProfit >= 0 ? 'var(--success)' : '#ef4444' }}>
                {planType === 'BASIC' ? '—' : totalOfficeProfit.toLocaleString('ar-LY')} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>د.ل</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                {totalOfficeProfit >= 0 ? 'فائض أرباح الفرع' : 'عجز تشغيلي بالفرع'}
              </div>
            </div>
          </div>
        </PremiumLockOverlay>

      </div>

      {/* Top 3 Trophies / Podiums */}
      {stats.length > 0 && (
        <div className="glass" style={{ padding: '2rem 1.5rem', borderRadius: '20px', marginBottom: '2.5rem', border: '1px solid rgba(191, 149, 63, 0.18)' }}>
          <h3 style={{ margin: '0 0 2rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', color: 'var(--primary)' }}>
            <Award size={20} />
            لوحة الصدارة والتميز (الأكثر تسجيلاً للزبائن)
          </h3>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-end', gap: '2rem' }}>
            {/* 2nd Place */}
            {stats[1] && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', order: 1 }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.3rem', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.15)', border: '2px solid #cbd5e1' }}>
                  🥈
                </div>
                <div className="glass" style={{ width: '160px', padding: '1rem', marginTop: '0.75rem', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stats[1].name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>{ROLE_LABELS[stats[1].role]?.label || stats[1].role}</div>
                  <div style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '0.5rem' }}>{stats[1].customerCount} زبون</div>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {stats[0] && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', order: 0, transform: 'scale(1.08)' }}>
                <div style={{ width: '74px', height: '74px', borderRadius: '50%', background: 'linear-gradient(135deg, #bf953f 0%, #fcf6ba 50%, #b38728 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.8rem', fontWeight: 'bold', boxShadow: '0 8px 20px rgba(170, 119, 28, 0.35)', border: '3px solid #fbf5b7' }}>
                  👑
                </div>
                <div className="glass" style={{ width: '180px', padding: '1.25rem', marginTop: '0.75rem', borderRadius: '16px', textAlign: 'center', border: '2px solid rgba(191, 149, 63, 0.3)', boxShadow: '0 8px 25px rgba(0,0,0,0.2)' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#fcf6ba' }}>{stats[0].name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>{ROLE_LABELS[stats[0].role]?.label || stats[0].role}</div>
                  <div style={{ color: '#fcf6ba', fontWeight: '900', fontSize: '1.3rem', marginTop: '0.5rem', textShadow: '0 0 10px rgba(179,135,40,0.4)' }}>{stats[0].customerCount} زبون</div>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {stats[2] && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', order: 2 }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.15)', border: '2px solid #f59e0b' }}>
                  🥉
                </div>
                <div className="glass" style={{ width: '150px', padding: '1rem', marginTop: '0.75rem', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stats[2].name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>{ROLE_LABELS[stats[2].role]?.label || stats[2].role}</div>
                  <div style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.05rem', marginTop: '0.5rem' }}>{stats[2].customerCount} زبون</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Premium Salaries configuration block with SaaS Lock */}
      {planType === 'BASIC' ? (
        <PremiumLockBanner 
          title="قسم إدارة الرواتب والعمولات المتقدم (خاص بالاشتراك المتوسط والعالي)"
          description="أنت حالياً تستخدم الباقة الأساسية للمنظومة. للوصول إلى نظام احتساب الرواتب التلقائي للمرابحات، إدراج غيابات الموظفين (نظام 30 يوم)، تقسيم نسب الأرباح من المعارض ووكلاء السيارات، وصافي الأرباح التشغيلية لفرعك، يرجى ترقية اشتراكك."
          plans={['الخطة المتوسطة (PREMIUM)', 'الخطة غير المحدودة (UNLIMITED)']}
        />
      ) : (
        <div className="glass" style={{ padding: '2rem 1.5rem', borderRadius: '20px', marginBottom: '2.5rem', border: '1px solid rgba(191,149,63,0.18)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', color: 'var(--primary)' }}>
                <DollarSign size={20} />
                كشف رواتب وعمولات الموظفين ومربح المكاتب
              </h3>
              <p className="text-tertiary" style={{ fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                احتساب المرتبات بنظام 30 يوم مع خصم الغياب وتوزيع النسبة من عمولة الوكيل وفارق بيع السيارات.
              </p>
            </div>
            
            {/* Global agency fee setup */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(0,0,0,0.15)', padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>عمولة الوكيل المعيارية:</span>
              <div style={{ display: 'flex', alignItems: 'center', width: '120px', position: 'relative' }}>
                <input 
                  type="number"
                  value={defaultAgencyFee}
                  onChange={(e) => handleUpdateAgencyFee(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '0.35rem 0.6rem', paddingLeft: '2rem', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', fontWeight: 'bold', outline: 'none', textAlign: 'left' }}
                />
                <span style={{ position: 'absolute', left: '8px', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>د.ل</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {team.filter(member => member.is_active).map(member => {
              const config = salaries[member.id] || {
                salaryType: 'salary_and_commission',
                baseSalary: 1500,
                absentDays: 0,
                commissionPercentage: 10
              };
              const rl = ROLE_LABELS[member.role] || { label: 'موظف المكتب', color: 'var(--text-tertiary)' };
              
              return (
                <div 
                  key={member.id} 
                  className="glass" 
                  style={{ 
                    padding: '1.25rem', 
                    borderRadius: '12px', 
                    border: '1px solid var(--glass-border)', 
                    background: 'var(--surface-hover)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {member.display_name || 'موظف'}
                    </div>
                    <span className="badge" style={{ background: `${rl.color}15`, color: rl.color, fontSize: '0.75rem' }}>
                      {rl.label}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    
                    {/* Salary Type Selector */}
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>نظام التعويض المالي للموظف</label>
                      <select 
                        value={config.salaryType}
                        onChange={(e) => handleUpdateConfig(member.id, 'salaryType', e.target.value as any)}
                        className="workplace-input"
                        style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                      >
                        <option value="salary_only">مرتب أساسي فقط</option>
                        <option value="salary_and_commission">مرتب أساسي + نسبة أرباح</option>
                        <option value="commission_only">نسبة أرباح فقط (بدون مرتب أساسي)</option>
                      </select>
                    </div>

                    {/* Base Salary input */}
                    {config.salaryType !== 'commission_only' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>المرتب الأساسي</label>
                        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                          <input 
                            type="number"
                            value={config.baseSalary || ''}
                            onChange={(e) => handleUpdateConfig(member.id, 'baseSalary', parseFloat(e.target.value) || 0)}
                            style={{ width: '100%', padding: '0.35rem 0.5rem', paddingLeft: '1.75rem', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.15)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 'bold', outline: 'none', textAlign: 'left' }}
                          />
                          <span style={{ position: 'absolute', left: '6px', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>د.ل</span>
                        </div>
                      </div>
                    )}

                    {/* Absent days */}
                    {config.salaryType !== 'commission_only' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>أيام الغياب (خصم)</label>
                        <input 
                          type="number"
                          min={0}
                          max={30}
                          value={config.absentDays || 0}
                          onChange={(e) => handleUpdateConfig(member.id, 'absentDays', parseInt(e.target.value) || 0)}
                          style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.15)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', textAlign: 'center' }}
                        />
                      </div>
                    )}

                    {/* Commission percentage */}
                    {config.salaryType !== 'salary_only' && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>نسبة الموظف من الأرباح (الوكيل + فارق السيارة)</label>
                        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                          <input 
                            type="number"
                            min={0}
                            max={100}
                            value={config.commissionPercentage || 0}
                            onChange={(e) => handleUpdateConfig(member.id, 'commissionPercentage', parseFloat(e.target.value) || 0)}
                            style={{ width: '100%', padding: '0.35rem 0.5rem', paddingLeft: '1.5rem', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.15)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 'bold', outline: 'none', textAlign: 'left' }}
                          />
                          <span style={{ position: 'absolute', left: '8px', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>%</span>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Productivity Table */}
      <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px' }}>
        <h3 style={{ margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
          <Shield size={18} style={{ color: 'var(--primary)' }} />
          مقارنة كفاءة الموظفين والأداء التشغيلي
        </h3>

        <div className="admin-table-wrap">
          <table className="monitor-table">
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>الترتيب</th>
                <th>اسم الموظف</th>
                <th>الدور والصلاحية</th>
                {planType !== 'BASIC' && (
                  <>
                    <th style={{ textAlign: 'center' }}>نوع المرتب</th>
                    <th style={{ textAlign: 'center' }}>المرتب الأساسي</th>
                    <th style={{ textAlign: 'center' }}>الغياب</th>
                    <th style={{ textAlign: 'center' }}>العمولة المستحقة</th>
                    <th style={{ textAlign: 'center' }}>إجمالي المستحق</th>
                  </>
                )}
                <th style={{ textAlign: 'center' }}>الزبائن المسجلين</th>
                <th style={{ textAlign: 'center' }}>الزبائن المحتملين</th>
                <th style={{ textAlign: 'center' }}>معدل التحويل</th>
                <th style={{ width: '180px' }}>نسبة المساهمة في الفرع</th>
                <th style={{ textAlign: 'center' }}>معاملات نشطة</th>
                <th style={{ textAlign: 'center' }}>معاملات منتهية</th>
                <th style={{ textAlign: 'left', paddingLeft: '1.5rem' }}>إجمالي حجم المبيعات</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((row) => {
                const rl = ROLE_LABELS[row.role] || { label: 'غير معروف', color: 'var(--text-tertiary)' };
                const pct = totalOfficeCustomers > 0 ? (row.customerCount / totalOfficeCustomers) * 100 : 0;
                
                return (
                  <tr key={row.id}>
                    <td style={{ textAlign: 'center' }}>
                      <span 
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          width: '26px', 
                          height: '26px', 
                          borderRadius: '50%', 
                          background: row.rank === 1 ? 'rgba(191,149,63,0.18)' : 'rgba(255,255,255,0.06)',
                          color: row.rank === 1 ? 'var(--primary)' : 'var(--text-secondary)',
                          fontWeight: 'bold',
                          fontSize: '0.9rem'
                        }}
                      >
                        {row.rank}
                      </span>
                    </td>
                    <td style={{ fontWeight: 'bold' }}>{row.name}</td>
                    <td>
                      <span className="badge" style={{ background: `${rl.color}15`, color: rl.color }}>
                        {rl.label}
                      </span>
                    </td>
                    
                    {planType !== 'BASIC' && (
                      <>
                        <td style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {(row as any).salaryType === 'salary_only' ? 'مرتب فقط' : 
                           (row as any).salaryType === 'commission_only' ? 'نسبة فقط' : 'مرتب + نسبة'}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '500', color: 'var(--text-primary)' }}>
                          {(row as any).salaryType === 'commission_only' ? '—' : `${(row as any).baseSalary?.toLocaleString('ar-LY')} د.ل`}
                        </td>
                        <td style={{ textAlign: 'center', color: (row as any).absentDays > 0 ? '#ef4444' : 'var(--text-secondary)' }}>
                          {(row as any).salaryType === 'commission_only' ? '—' : `${(row as any).absentDays} أيام`}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--success)' }}>
                          {(row as any).salaryType === 'salary_only' ? '—' : `${(row as any).earnedCommission?.toLocaleString('ar-LY')} د.ل`}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '900', color: 'var(--primary)' }}>
                          {(row as any).totalPayout?.toLocaleString('ar-LY')} د.ل
                        </td>
                      </>
                    )}

                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                      {row.customerCount}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                      {row.potentialCount}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: row.conversionRate >= 50 ? 'var(--success)' : (row.conversionRate > 0 ? 'var(--warning)' : 'var(--text-tertiary)') }}>
                      {row.conversionRate.toFixed(0)}%
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary) 0%, #fcf6ba 100%)', borderRadius: '4px' }}></div>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', minWidth: '35px', textAlign: 'left' }}>
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--warning)', fontWeight: 600 }}>
                      {row.activeTransactionsCount}
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>
                      {row.completedTransactionsCount}
                    </td>
                    <td style={{ textAlign: 'left', fontWeight: 'bold', color: 'var(--primary)', paddingLeft: '1.5rem' }} dir="ltr">
                      {row.totalVolume.toLocaleString('en-US')} LYD
                    </td>
                  </tr>
                );
              })}
              {stats.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                    لا توجد بيانات إحصائية متاحة حالياً
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
