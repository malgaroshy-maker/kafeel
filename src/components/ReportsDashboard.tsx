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

import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Months in Arabic
const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export default function ReportsDashboard() {
  const { officeId } = useAuth();
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!officeId) return;
    setLoading(true);
    try {
      // Fetch all transactions for this office
      const { data, error } = await supabase
        .from('transactions')
        .select('car_price, purchase_cost, created_at')
        .eq('office_id', officeId);
      
      if (error) throw error;

      // Group by month and aggregate
      const monthlyStats: Record<number, MonthlyReport> = {};
      
      data?.forEach(t => {
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
      });

      setReports(Object.values(monthlyStats));
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
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        >
          {ARABIC_MONTHS.map((name, index) => (
            <option key={name} value={index}>{name} 2026</option>
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
