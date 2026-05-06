import { useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { Calculator as CalcIcon, TrendingUp, Banknote, CreditCard, AlertTriangle } from 'lucide-react'
import { calculateMurabaha, TERM_MONTHS } from '../lib/financialEngine'

interface CalcState {
  carPrice: string
  bankCeiling: string
  netSalary: string
  marginRate: '0.16' | '0.24'
  deductionRate: '0.35' | '0.50'
  hasNotaryPledge: boolean
}

const defaultState: CalcState = {
  carPrice: '',
  bankCeiling: '',
  netSalary: '',
  marginRate: '0.16',
  deductionRate: '0.35',
  hasNotaryPledge: false,
}

export default function FinancialCalculator() {
  const [form, setForm] = useLocalStorage<CalcState>('kafeel_calc_draft', defaultState)

  const update = (field: keyof CalcState, value: string | boolean) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      // Sync deduction rate with notary pledge
      if (field === 'hasNotaryPledge') {
        next.deductionRate = value ? '0.50' : '0.35'
      }
      return next
    })
  }

  const n = (v: string) => parseFloat(v) || 0

  const results = useMemo(() => {
    return calculateMurabaha({
      carPrice: n(form.carPrice),
      bankCeiling: n(form.bankCeiling),
      netSalary: n(form.netSalary),
      marginRate: parseFloat(form.marginRate),
      deductionRate: parseFloat(form.deductionRate),
    })
  }, [form])

  const fmt = (v: number) =>
    v.toLocaleString('ar-LY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="calculator-container">
      <div className="calc-header">
        <div className="calc-icon-wrap">
          <CalcIcon size={28} />
        </div>
        <div>
          <h2>الحاسبة المالية التفاعلية</h2>
          <p className="calc-subtitle">حسابات لحظية — بدون زر إرسال</p>
        </div>
      </div>

      <div className="calc-grid">
        {/* Inputs Panel */}
        <div className="calc-panel inputs-panel">
          <h3 className="panel-title">المدخلات</h3>

          <div className="input-group">
            <label htmlFor="carPrice">سعر السيارة (د.ل)</label>
            <input
              id="carPrice"
              type="number"
              inputMode="decimal"
              placeholder="مثال: 95,000"
              value={form.carPrice}
              onChange={(e) => update('carPrice', e.target.value)}
              tabIndex={1}
            />
          </div>

          <div className="input-group">
            <label htmlFor="bankCeiling">سقف المصرف (د.ل)</label>
            <input
              id="bankCeiling"
              type="number"
              inputMode="decimal"
              placeholder="مثال: 120,000"
              value={form.bankCeiling}
              onChange={(e) => update('bankCeiling', e.target.value)}
              tabIndex={2}
            />
          </div>

          <div className="input-group">
            <label htmlFor="netSalary">صافي المرتب (د.ل)</label>
            <input
              id="netSalary"
              type="number"
              inputMode="decimal"
              placeholder="مثال: 2,500"
              value={form.netSalary}
              onChange={(e) => update('netSalary', e.target.value)}
              tabIndex={3}
            />
          </div>

          <div className="input-group">
            <label>نسبة المرابحة</label>
            <div className="toggle-group">
              <button
                type="button"
                className={`toggle-btn ${form.marginRate === '0.16' ? 'active' : ''}`}
                onClick={() => update('marginRate', '0.16')}
                tabIndex={4}
              >
                16%
              </button>
              <button
                type="button"
                className={`toggle-btn ${form.marginRate === '0.24' ? 'active' : ''}`}
                onClick={() => update('marginRate', '0.24')}
                tabIndex={5}
              >
                24%
              </button>
            </div>
          </div>

          <div className="input-group checkbox-group">
            <label htmlFor="notaryPledge" className="checkbox-label">
              <input
                id="notaryPledge"
                type="checkbox"
                checked={form.hasNotaryPledge}
                onChange={(e) => update('hasNotaryPledge', e.target.checked)}
                tabIndex={6}
              />
              <span>تعهد محرر عقود (مصرف الجمهورية — خصم 50%)</span>
            </label>
          </div>

          <div className="deduction-badge">
            نسبة الخصم: <strong>{form.hasNotaryPledge ? '50%' : '35%'}</strong>
          </div>
        </div>

        {/* Results Panel */}
        <div className="calc-panel results-panel">
          <h3 className="panel-title">النتائج</h3>

          {results ? (
            <div className="results-grid">
              <div className="result-card">
                <div className="result-icon" style={{ background: 'var(--primary)' }}>
                  <Banknote size={20} />
                </div>
                <div className="result-info">
                  <span className="result-label">الحد الأقصى للقسط</span>
                  <span className="result-value">{fmt(results.maxInstallment)} د.ل</span>
                </div>
              </div>

              <div className="result-card">
                <div className="result-icon" style={{ background: 'var(--success)' }}>
                  <TrendingUp size={20} />
                </div>
                <div className="result-info">
                  <span className="result-label">قيمة التمويل الفعلي</span>
                  <span className="result-value">{fmt(results.actualFinancedAmount)} د.ل</span>
                </div>
              </div>

              {results.isOverCapacity && (
                <div className="result-card warning-card">
                  <div className="result-icon" style={{ background: 'var(--warning)' }}>
                    <AlertTriangle size={20} />
                  </div>
                  <div className="result-info">
                    <span className="result-label">القدرة التمويلية أقل من السقف</span>
                    <span className="result-value secondary">
                      القدرة: {fmt(results.maxFundingCapacity / (1 + parseFloat(form.marginRate)))} د.ل
                    </span>
                  </div>
                </div>
              )}

              <div className="result-card highlight-card">
                <div className="result-icon" style={{ background: 'var(--primary-dark)' }}>
                  <CreditCard size={20} />
                </div>
                <div className="result-info">
                  <span className="result-label">القسط الشهري الفعلي</span>
                  <span className="result-value big">{fmt(results.actualInstallment)} د.ل</span>
                </div>
              </div>

              <div className={`result-card ${results.debt > 0 ? 'debt-card' : ''}`}>
                <div className="result-info full">
                  <span className="result-label">الفرق / السلفة (الدين)</span>
                  <span className={`result-value ${results.debt > 0 ? 'debt' : 'success'}`}>
                    {results.debt > 0 ? fmt(results.debt) + ' د.ل' : 'لا يوجد فرق'}
                  </span>
                </div>
              </div>

              <div className="result-card">
                <div className="result-info full">
                  <span className="result-label">إجمالي السداد</span>
                  <span className="result-value">{fmt(results.totalRepayment)} د.ل</span>
                </div>
              </div>

              <div className="result-card">
                <div className="result-info full">
                  <span className="result-label">أرباح المرابحة</span>
                  <span className="result-value">{fmt(results.profitAmount)} د.ل</span>
                </div>
              </div>

              <div className="term-info">
                <span>مدة التقسيط: <strong>{TERM_MONTHS} شهر (8 سنوات)</strong></span>
              </div>
            </div>
          ) : (
            <div className="results-empty">
              <CalcIcon size={48} strokeWidth={1} />
              <p>أدخل القيم لعرض النتائج لحظياً</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
