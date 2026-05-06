import { useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, Users, Calendar } from 'lucide-react';

interface MonthlyReport {
  month: string;
  transactionsCount: number;
  totalSales: number;
  totalCosts: number;
  commissions: number;
  netProfit: number;
}

const mockData: MonthlyReport[] = [
  { month: 'يناير', transactionsCount: 12, totalSales: 450000, totalCosts: 410000, commissions: 6000, netProfit: 46000 },
  { month: 'فبراير', transactionsCount: 15, totalSales: 620000, totalCosts: 560000, commissions: 7500, netProfit: 67500 },
  { month: 'مارس', transactionsCount: 8, totalSales: 310000, totalCosts: 285000, commissions: 4000, netProfit: 29000 },
  { month: 'أبريل', transactionsCount: 20, totalSales: 850000, totalCosts: 780000, commissions: 10000, netProfit: 80000 },
];

export default function ReportsDashboard() {
  const [selectedMonth, setSelectedMonth] = useState<string>('أبريل');

  const currentReport = mockData.find(d => d.month === selectedMonth) || mockData[3];

  const formatCurrency = (val: number) => val.toLocaleString('ar-LY') + ' د.ل';

  return (
    <div className="reports-container">
      <div className="form-header">
        <div className="form-icon-wrap" style={{ background: 'linear-gradient(135deg, var(--success-color), #059669)' }}>
          <BarChart3 size={24} />
        </div>
        <div>
          <h3>التقارير المالية والأرباح</h3>
          <p className="calc-subtitle">ملخص الأداء المالي للمكتب (خاص بالإدارة)</p>
        </div>
      </div>

      <div className="input-group" style={{ maxWidth: '300px', marginBottom: '2rem' }}>
        <label>
          <Calendar size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
          اختر الشهر
        </label>
        <select 
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}
        >
          {mockData.map(d => (
            <option key={d.month} value={d.month}>{d.month} 2026</option>
          ))}
        </select>
      </div>

      <div className="stats-grid">
        <div className="stat-card glass">
          <div className="stat-header">
            <span className="stat-title">عدد المعاملات المنجزة</span>
            <Users size={20} style={{ color: 'var(--primary)' }} />
          </div>
          <div className="stat-value">{currentReport.transactionsCount}</div>
        </div>

        <div className="stat-card glass">
          <div className="stat-header">
            <span className="stat-title">إجمالي المبيعات (للمصرف)</span>
            <DollarSign size={20} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div className="stat-value">{formatCurrency(currentReport.totalSales)}</div>
        </div>

        <div className="stat-card glass">
          <div className="stat-header">
            <span className="stat-title">إجمالي تكلفة الشراء (سرّي)</span>
            <TrendingUp size={20} style={{ color: 'var(--error)' }} />
          </div>
          <div className="stat-value" style={{ color: 'var(--error)' }}>{formatCurrency(currentReport.totalCosts)}</div>
        </div>

        <div className="stat-card glass" style={{ border: '1px solid var(--success-color)', background: 'rgba(16, 185, 129, 0.05)' }}>
          <div className="stat-header">
            <span className="stat-title" style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>صافي أرباح المكتب</span>
            <BarChart3 size={20} style={{ color: 'var(--success-color)' }} />
          </div>
          <div className="stat-value" style={{ color: 'var(--success-color)' }}>{formatCurrency(currentReport.netProfit)}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
            يشمل العمولات الإدارية ({formatCurrency(currentReport.commissions)})
          </div>
        </div>
      </div>

      <div className="glass" style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: '16px' }}>
        <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>تفاصيل المعادلة المالية</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '1.1rem', background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px' }}>
          <span style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>صافي الربح</span>
          <span>=</span>
          <span>(إجمالي المبيعات</span>
          <span style={{ color: 'var(--error)' }}>- تكلفة الشراء)</span>
          <span style={{ color: 'var(--primary)' }}>+ العمولات الإدارية</span>
        </div>
      </div>
    </div>
  );
}
