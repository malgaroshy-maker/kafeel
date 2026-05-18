import { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, DollarSign, Users, Calendar, ShieldCheck, FileText, Printer, Search, PieChart, Landmark, ArrowUpRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PremiumLockOverlay, PremiumLockBanner } from './PremiumLock';

interface MonthlyReport {
  month: string;
  transactionsCount: number;
  totalSales: number;
  totalCosts: number;
  commissions: number;
  netProfit: number;
}

interface SettlementReport {
  type: string;
  count: number;
  totalCarPrice: number;
  totalDownPayment: number;
  totalDebt: number;
  totalSalePrice: number;
  totalCommission: number;
}

interface TransactionLedgerItem {
  id: string;
  date: string;
  carPrice: number;
  purchaseCost: number;
  commission: number;
  netProfit: number;
  status: string;
}

// Months in Arabic
const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export default function ReportsDashboard() {
  const { officeId, isAccountant, planType } = useAuth();
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [settlementStats, setSettlementStats] = useState<SettlementReport[]>([]);
  const [ledger, setLedger] = useState<TransactionLedgerItem[]>([]);
  const [activeTab, setActiveTab] = useState<'summary' | 'audit' | 'ledger'>('summary');
  
  // Ledger Search filter
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!officeId) return;
    setLoading(true);
    try {
      // 1. Fetch all transactions for this office
      const { data: txs, error: txError } = await supabase
        .from('transactions')
        .select('id, car_price, purchase_cost, created_at, status')
        .eq('office_id', officeId);
      
      if (txError) throw txError;

      // 2. Fetch all settlements for this office
      const { data: sets, error: setError } = await supabase
        .from('settlements')
        .select('*')
        .eq('office_id', officeId);

      if (setError) throw setError;

      // Group by month and aggregate for Transactions
      const monthlyStats: Record<number, MonthlyReport> = {};
      const ledgerItems: TransactionLedgerItem[] = [];
      
      txs?.forEach(t => {
        const date = new Date(t.created_at);
        const month = date.getMonth();
        
        if (!monthlyStats[month]) {
          monthlyStats[month] = {
            month: ARABIC_MONTHS[month],
            transactionsCount: 0,
            totalSales: 0,
            totalCosts: 0,
            commissions: 0,
            netProfit: 0
          };
        }
        
        const salePrice = t.car_price || 0;
        const costPrice = t.purchase_cost || 0;
        const commission = 500; // Default commission per transaction

        monthlyStats[month].transactionsCount += 1;
        monthlyStats[month].totalSales += salePrice;
        monthlyStats[month].totalCosts += costPrice;
        monthlyStats[month].commissions += commission;
        monthlyStats[month].netProfit += (salePrice - costPrice) + commission;

        ledgerItems.push({
          id: t.id,
          date: date.toLocaleDateString('ar-LY'),
          carPrice: salePrice,
          purchaseCost: costPrice,
          commission: commission,
          netProfit: (salePrice - costPrice) + commission,
          status: t.status
        });
      });

      setReports(Object.values(monthlyStats));
      setLedger(ledgerItems.sort((a, b) => b.id.localeCompare(a.id)));

      // Aggregate stats for settlements
      const settlementGroups: Record<string, SettlementReport> = {
        'PERSONAL_USE': { type: 'استعمال شخصي', count: 0, totalCarPrice: 0, totalDownPayment: 0, totalDebt: 0, totalSalePrice: 0, totalCommission: 0 },
        'CASH_OUT': { type: 'بيع للمكتب', count: 0, totalCarPrice: 0, totalDownPayment: 0, totalDebt: 0, totalSalePrice: 0, totalCommission: 0 },
        'EXTERNAL_SALE': { type: 'بيع خارجي', count: 0, totalCarPrice: 0, totalDownPayment: 0, totalDebt: 0, totalSalePrice: 0, totalCommission: 0 }
      };

      sets?.forEach(s => {
        const t = s.type;
        if (settlementGroups[t]) {
          settlementGroups[t].count += 1;
          settlementGroups[t].totalCarPrice += s.car_price || 0;
          settlementGroups[t].totalDownPayment += s.down_payment || 0;
          settlementGroups[t].totalDebt += s.debt_amount || 0;
          settlementGroups[t].totalSalePrice += s.sale_price || 0;
          settlementGroups[t].totalCommission += s.office_commission || 0;
        }
      });

      setSettlementStats(Object.values(settlementGroups));

    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  }, [officeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentReport = reports.find(r => ARABIC_MONTHS.indexOf(r.month) === selectedMonth) || {
    month: ARABIC_MONTHS[selectedMonth],
    transactionsCount: 0,
    totalSales: 0,
    totalCosts: 0,
    commissions: 0,
    netProfit: 0
  };

  const formatCurrency = (val: number) => val.toLocaleString('ar-LY') + ' د.ل';

  // Capital Liquidity Calculations
  const totalInvestedCapital = ledger.reduce((acc, curr) => acc + curr.purchaseCost, 0);
  const totalReceivables = settlementStats.reduce((acc, curr) => acc + curr.totalDebt, 0);
  const averageProfitMargin = currentReport.totalSales > 0 ? (currentReport.netProfit / currentReport.totalSales) * 100 : 0;

  // Filter Ledger Items
  const filteredLedger = ledger.filter(item => {
    const term = searchQuery.toLowerCase();
    return (
      item.id.toLowerCase().includes(term) ||
      item.date.includes(term) ||
      item.carPrice.toString().includes(term) ||
      item.status.toLowerCase().includes(term)
    );
  });

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div className="reports-container fade-in" style={{ padding: '1rem', maxWidth: '1150px', margin: '0 auto' }}>
      
      {/* Header Block */}
      <div className="form-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="form-icon-wrap" style={{ background: 'linear-gradient(135deg, var(--success-color), #059669)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <BarChart3 size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>التقارير المالية والتدقيق</h3>
            <p className="calc-subtitle" style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
              {isAccountant ? 'لوحة تدقيق المحاسب المعتمد للمكتب' : 'ملخص الأداء المالي للمكتب (خاص بالإدارة)'}
            </p>
          </div>
        </div>

        {/* Custom Accountant Badge to highlight the Accountant login benefits */}
        {isAccountant && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success-color)', borderRadius: '8px', padding: '0.5rem 1rem', color: 'var(--success-color)', fontSize: '0.88rem', fontWeight: 'bold' }}>
            <ShieldCheck size={18} />
            بوابة تدقيق المحاسبة المعتمدة
          </div>
        )}
      </div>

      {/* Interactive Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', overflowX: 'auto' }}>
        <button
          onClick={() => setActiveTab('summary')}
          className={`btn ${activeTab === 'summary' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
        >
          <Calendar size={16} />
          ملخص الأرباح الشهري
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
        >
          <PieChart size={16} />
          تحليل تسويات السيارات
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`btn ${activeTab === 'ledger' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
        >
          <FileText size={16} />
          دفتر الحسابات العام
        </button>
      </div>

      {/* Content Panels */}
      {activeTab === 'summary' && (
        <div className="fade-in">
          {/* Month Selector */}
          <div className="input-group" style={{ maxWidth: '300px', marginBottom: '2rem' }}>
            <label style={{ fontSize: '0.88rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <Calendar size={16} />
              اختر الشهر المالي
            </label>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--surface-hover)', color: 'var(--text-primary)', outline: 'none' }}
            >
              {ARABIC_MONTHS.map((name, index) => (
                <option key={name} value={index}>{name} 2026</option>
              ))}
            </select>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            
            <div className="stat-card glass" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid var(--primary)' }}>
              <div className="stat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: 'var(--text-tertiary)' }}>
                <span className="stat-title" style={{ fontSize: '0.9rem' }}>المعاملات المنجزة بالشهر</span>
                <Users size={18} style={{ color: 'var(--primary)' }} />
              </div>
              <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 800 }}>{currentReport.transactionsCount}</div>
            </div>

            <div className="stat-card glass" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid var(--text-secondary)' }}>
              <div className="stat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: 'var(--text-tertiary)' }}>
                <span className="stat-title" style={{ fontSize: '0.9rem' }}>إجمالي المبيعات (للمصرف)</span>
                <DollarSign size={18} style={{ color: 'var(--text-secondary)' }} />
              </div>
              <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 800 }}>{formatCurrency(currentReport.totalSales)}</div>
            </div>

            <PremiumLockOverlay isLocked={planType === 'BASIC'} message="ترقية الاشتراك لرؤية التكاليف 🔐" style={{ minHeight: '120px' }}>
              <div className="stat-card glass" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid var(--error)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div className="stat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: 'var(--text-tertiary)' }}>
                  <span className="stat-title" style={{ fontSize: '0.9rem' }}>تكلفة الشراء الفعلية (سرّي)</span>
                  <TrendingUp size={18} style={{ color: 'var(--error)' }} />
                </div>
                <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--error)' }}>
                  {planType === 'BASIC' ? '— د.ل' : formatCurrency(currentReport.totalCosts)}
                </div>
              </div>
            </PremiumLockOverlay>

            <PremiumLockOverlay isLocked={planType === 'BASIC'} message="ترقية الاشتراك لرؤية الأرباح 🔐" style={{ minHeight: '120px' }}>
              <div className="stat-card glass" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid var(--success-color)', background: 'rgba(16, 185, 129, 0.05)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div className="stat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: 'var(--text-tertiary)' }}>
                  <span className="stat-title" style={{ fontSize: '0.9rem', color: 'var(--success-color)', fontWeight: 'bold' }}>صافي الأرباح الصافية</span>
                  <BarChart3 size={18} style={{ color: 'var(--success-color)' }} />
                </div>
                <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success-color)' }}>
                  {planType === 'BASIC' ? '— د.ل' : formatCurrency(currentReport.netProfit)}
                </div>
              </div>
            </PremiumLockOverlay>

          </div>

          {/* Equation Breakdown */}
          <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px', marginBottom: '2.5rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 'bold' }}>تفاصيل المعادلة المالية لحساب الأرباح</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', fontSize: '1rem', background: 'var(--surface-hover)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              <span style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>صافي الربح</span>
              <span>=</span>
              <span>(إجمالي المبيعات للمصارف</span>
              <span style={{ color: 'var(--error)' }}>- تكلفة شراء السيارات)</span>
              <span>+</span>
              <span style={{ color: 'var(--primary)' }}>العمولات الإدارية للمكتب ({formatCurrency(currentReport.commissions)})</span>
            </div>
          </div>

          {/* Capital Health Metrics - A strong selling point for accountants */}
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>مؤشرات السيولة والملاءة المالية للمكتب 📊</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            
            <div className="glass" style={{ padding: '1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                <Landmark size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>رأس المال الموظف بالسيارات</span>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0.2rem 0 0 0' }}>{formatCurrency(totalInvestedCapital)}</h4>
              </div>
            </div>

            <div className="glass" style={{ padding: '1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(234, 179, 8, 0.1)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)', flexShrink: 0 }}>
                <TrendingUp size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>إجمالي الذمم والديون المستحقة</span>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0.2rem 0 0 0' }}>{formatCurrency(totalReceivables)}</h4>
              </div>
            </div>

            <div className="glass" style={{ padding: '1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success-color)', flexShrink: 0 }}>
                <ArrowUpRight size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>متوسط هامش الربح بالشهر المختار</span>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0.2rem 0 0 0' }}>{averageProfitMargin.toFixed(1)}%</h4>
              </div>
            </div>

          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="fade-in">
          {planType === 'BASIC' ? (
            <PremiumLockBanner 
              title="قسم تحليلات تسويات سيارات المكتب المتقدم" 
              description="هذا القسم مخصص لبناء وفلترة تسويات مبيعات السيارات وتحصيل العمولات الخاصة بمصارف المرابحة. يرجى ترقية اشتراك المكتب لتفعيل هذه المزايا."
              plans={['الاشتراك الممتاز (PREMIUM)', 'الاشتراك غير المحدود (UNLIMITED)']}
            />
          ) : (
            <>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem' }}>تحليلات وهيكلية تسويات مبيعات السيارات 📝</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {settlementStats.map((stat, i) => (
                  <div key={i} className="glass" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                      <h4 style={{ margin: 0, fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--primary)' }}>نوع التسوية: {stat.type}</h4>
                      <span style={{ background: 'var(--primary-ghost)', color: 'var(--primary)', padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        عدد العمليات: {stat.count}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                      
                      <div style={{ background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>سعر السيارات الإجمالي</span>
                        <h5 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0.25rem 0 0 0' }}>{formatCurrency(stat.totalCarPrice)}</h5>
                      </div>

                      <div style={{ background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>الديون المجدولة</span>
                        <h5 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0.25rem 0 0 0', color: 'var(--error)' }}>{formatCurrency(stat.totalDebt)}</h5>
                      </div>

                      {stat.type !== 'بيع خارجي' && (
                        <div style={{ background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>المقدم المحصل</span>
                          <h5 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0.25rem 0 0 0', color: 'var(--success-color)' }}>{formatCurrency(stat.totalDownPayment)}</h5>
                        </div>
                      )}

                      {stat.type === 'بيع خارجي' && (
                        <div style={{ background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>سعر البيع الخارجي</span>
                          <h5 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0.25rem 0 0 0', color: 'var(--success-color)' }}>{formatCurrency(stat.totalSalePrice)}</h5>
                        </div>
                      )}

                      <div style={{ background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>عمولة المكتب المحصلة</span>
                        <h5 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0.25rem 0 0 0', color: 'var(--primary)' }}>{formatCurrency(stat.totalCommission)}</h5>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="fade-in printable-ledger">
          {planType === 'BASIC' ? (
            <PremiumLockBanner 
              title="دفتر الحسابات والتدقيق العام للمكتب" 
              description="قسم الرقابة والتدقيق التفاعلي لطباعة وتصفح الدفاتر الحسابية التفصيلية لجميع المعاملات المالية بالمنظومة. يرجى ترقية اشتراك المكتب لتفعيل هذه المزايا."
              plans={['الاشتراك الممتاز (PREMIUM)', 'الاشتراك غير المحدود (UNLIMITED)']}
            />
          ) : (
            <>
              {/* Controls Block */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                
                {/* Search filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-hover)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', width: '320px' }}>
                  <Search size={18} style={{ color: 'var(--text-tertiary)' }} />
                  <input
                    type="text"
                    placeholder="ابحث بالقيمة، التاريخ أو الحالة..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', width: '100%', fontSize: '0.85rem' }}
                  />
                </div>

                {/* Print Ledger Action - A powerful accountant utility */}
                <button 
                  className="btn btn-ghost" 
                  onClick={handlePrint}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}
                >
                  <Printer size={16} />
                  طباعة كشف الحساب والتدقيق
                </button>

              </div>

              {/* Ledger Table */}
              <div className="glass" style={{ padding: '1rem', borderRadius: '16px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '1rem 0.5rem' }}>رقم المعاملة</th>
                      <th style={{ padding: '1rem 0.5rem' }}>تاريخ التسجيل</th>
                      <th style={{ padding: '1rem 0.5rem' }}>سعر البيع (للمصرف)</th>
                      <th style={{ padding: '1rem 0.5rem' }}>سعر تكلفة الشراء</th>
                      <th style={{ padding: '1rem 0.5rem' }}>العمولة الإدارية</th>
                      <th style={{ padding: '1rem 0.5rem' }}>صافي أرباح المكتب</th>
                      <th style={{ padding: '1rem 0.5rem' }}>الحالة المالية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLedger.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                          لا توجد أي معاملات مسجلة تطابق بحثك.
                        </td>
                      </tr>
                    ) : (
                      filteredLedger.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }} className="table-row-hover">
                          <td style={{ padding: '1rem 0.5rem', fontFamily: 'monospace', fontWeight: 'bold' }}>{item.id.substring(0, 8)}...</td>
                          <td style={{ padding: '1rem 0.5rem' }}>{item.date}</td>
                          <td style={{ padding: '1rem 0.5rem' }}>{formatCurrency(item.carPrice)}</td>
                          <td style={{ padding: '1rem 0.5rem', color: 'var(--error)' }}>{formatCurrency(item.purchaseCost)}</td>
                          <td style={{ padding: '1rem 0.5rem', color: 'var(--primary)' }}>{formatCurrency(item.commission)}</td>
                          <td style={{ padding: '1rem 0.5rem', fontWeight: 'bold', color: 'var(--success-color)' }}>{formatCurrency(item.netProfit)}</td>
                          <td style={{ padding: '1rem 0.5rem' }}>
                            <span style={{ 
                              fontSize: '0.75rem', 
                              padding: '0.2rem 0.5rem', 
                              borderRadius: '4px', 
                              background: item.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              color: item.status === 'COMPLETED' ? 'var(--success-color)' : 'var(--primary)',
                              fontWeight: 'bold'
                            }}>
                              {item.status === 'COMPLETED' ? 'مكتملة ومسواة' : 'نشطة'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Styled Printable Styles override to clean output for accountant printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-ledger, .printable-ledger * {
            visibility: visible;
          }
          .printable-ledger {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            direction: rtl;
          }
          .btn, input {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
}
