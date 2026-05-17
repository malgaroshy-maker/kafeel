import { useState, useEffect, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { Calculator as CalcIcon, TrendingUp, Banknote, CreditCard, AlertTriangle, User, ShieldCheck } from 'lucide-react'
import { calculateMurabaha, TERM_MONTHS } from '../lib/financialEngine'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface CalcState {
  purchaseCost: string
  carPrice: string
  bankCeiling: string
  netSalary: string
  marginRate: '0.16' | '0.24'
  deductionRate: '0.35' | '0.50'
  hasNotaryPledge: boolean
}

const defaultState: CalcState = {
  purchaseCost: '',
  carPrice: '',
  bankCeiling: '120000',
  netSalary: '',
  marginRate: '0.16',
  deductionRate: '0.35',
  hasNotaryPledge: false,
}

const CAR_PRESETS = [
  { name: 'Urban Cruiser', price: 133000 },
  { name: 'Corolla', price: 108500 },
  { name: 'Belta', price: 104000 },
  { name: 'Rumion', price: 99750 },
  { name: 'Starlet', price: 95000 },
  { name: 'Starlet Full', price: 110000 },
]

interface Props {
  beneficiaryId?: string | null
  guarantorId?: string | null
}

export default function FinancialCalculator({ beneficiaryId, guarantorId }: Props) {
  const { isStaff } = useAuth()
  const [form, setForm] = useLocalStorage<CalcState>('kafeel_calc_draft', defaultState)
  const [beneficiaryData, setBeneficiaryData] = useState<any>(null)
  const [guarantorData, setGuarantorData] = useState<any>(null)
  const [selectedCar, setSelectedCar] = useState<string | null>(null)

  useEffect(() => {
    if (beneficiaryId) {
      fetchBeneficiary(beneficiaryId)
    }
  }, [beneficiaryId])

  useEffect(() => {
    if (guarantorId) {
      fetchGuarantor(guarantorId)
    }
  }, [guarantorId])

  const fetchBeneficiary = async (id: string) => {
    const { data } = await supabase
      .from('customers')
      .select('*, workplace:workplace_id(name)')
      .eq('id', id)
      .single()
    
    if (data) {
      setBeneficiaryData(data)
      // Auto-fill salary from registered data
      update('netSalary', data.salary?.toString() || '')
    }
  }

  const fetchGuarantor = async (id: string) => {
    const { data } = await supabase
      .from('customers')
      .select('*, workplace:workplace_id(name)')
      .eq('id', id)
      .single()
    if (data) setGuarantorData(data)
  }

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

  const applyPreset = (price: number) => {
    setForm(prev => ({
      ...prev,
      carPrice: price.toString(),
      bankCeiling: '120000' // Standard ceiling for these offers
    }))
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
          <p className="calc-subtitle">حسابات لحظية — ارتباط نشط</p>
          {(beneficiaryData || guarantorData) && (
            <div className="linked-info flex gap-4 mt-2">
              {beneficiaryData && (
                <div className="badge badge-primary flex items-center gap-1">
                  <User size={12} /> المستفيد: {beneficiaryData.name}
                </div>
              )}
              {guarantorData && (
                <div className="badge badge-success flex items-center gap-1">
                  <ShieldCheck size={12} /> الضامن: {guarantorData.name}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="calc-grid">
        {/* Inputs Panel */}
        <div className="calc-panel inputs-panel">
          <h3 className="panel-title">المدخلات</h3>

          <div className="presets-section">
            <span className="presets-label">موديلات تويوتا (أسعار المصرف الأصلية):</span>
            <div className="car-presets">
              {CAR_PRESETS.map((car) => (
                <button
                  key={car.name}
                  type="button"
                  className={`preset-btn ${selectedCar === car.name ? 'active' : ''}`}
                  onClick={() => {
                    applyPreset(car.price)
                    setSelectedCar(car.name)
                  }}
                >
                  <span className="model-name">{car.name}</span>
                  <span className="price">{car.price.toLocaleString()}</span>
                </button>
              ))}
            </div>
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
              tabIndex={1}
            />
          </div>

          <div className="input-group">
            <label>نسبة المرابحة</label>
            <div className="toggle-group">
              <button
                type="button"
                className={`toggle-btn ${form.marginRate === '0.16' ? 'active' : ''}`}
                onClick={() => update('marginRate', '0.16')}
                tabIndex={2}
              >
                16%
              </button>
              <button
                type="button"
                className={`toggle-btn ${form.marginRate === '0.24' ? 'active' : ''}`}
                onClick={() => update('marginRate', '0.24')}
                tabIndex={3}
              >
                24%
              </button>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="carPrice">سعر البيع للمصرف (د.ل)</label>
            <input
              id="carPrice"
              type="number"
              inputMode="decimal"
              placeholder="مثال: 95,000"
              value={form.carPrice}
              onChange={(e) => {
                update('carPrice', e.target.value)
                setSelectedCar(null)
              }}
              tabIndex={4}
            />
          </div>

          <div className="input-group">
            <label htmlFor="bankCeiling">سقف المرابحة من المصرف (د.ل) - <span style={{fontSize: '0.8rem', color: 'var(--primary-light)'}}>ثابت</span></label>
            <input
              id="bankCeiling"
              type="number"
              inputMode="decimal"
              value={form.bankCeiling}
              disabled
              style={{ opacity: 0.7, cursor: 'not-allowed', backgroundColor: 'rgba(255,255,255,0.05)' }}
            />
          </div>

          {!isStaff && (
            <div className="input-group">
              <label htmlFor="purchaseCost">سعر شراء السيارة بالكاش التقريبي وقت المعاملة</label>
              <input
                id="purchaseCost"
                type="number"
                inputMode="decimal"
                placeholder="مثال: 90,000 (اختياري)"
                value={form.purchaseCost}
                onChange={(e) => update('purchaseCost', e.target.value)}
                tabIndex={5}
              />
            </div>
          )}

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
                  <span className="result-label">الحد الأقصى للقسط المتاح</span>
                  <span className="result-value">{fmt(results.maxBankCapacity / 96)} د.ل</span>
                </div>
              </div>

              <div className="result-card">
                <div className="result-icon" style={{ background: 'var(--success)' }}>
                  <TrendingUp size={20} />
                </div>
                <div className="result-info">
                  <span className="result-label">إجمالي قيمة القسط خلال 8 سنوات</span>
                  <span className="result-value">{fmt(results.actualBankRepayment)} د.ل</span>
                </div>
              </div>

              {results.isOverCeiling && (
                <div className="result-card warning-card">
                  <div className="result-icon" style={{ background: 'var(--warning)' }}>
                    <AlertTriangle size={20} />
                  </div>
                  <div className="result-info">
                    <span className="result-label">تنبيه: تم تجاوز سقف المرابحة (120 ألف)</span>
                    <span className="result-value secondary">
                      الزيادة: {fmt(results.totalMurabahaValue - 120000)} د.ل
                    </span>
                  </div>
                </div>
              )}

              {results.salaryGap > 0 && (
                <div className="result-card warning-card" style={{ borderLeftColor: 'var(--primary)' }}>
                  <div className="result-icon" style={{ background: 'var(--primary)' }}>
                    <User size={20} />
                  </div>
                  <div className="result-info">
                    <span className="result-label">نقص القدرة (عن الـ 1250 المثالي)</span>
                    <span className="result-value secondary">
                      الفارق الشهري: {fmt(results.salaryGap)} د.ل
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
                  <span className="result-value big">{fmt(results.monthlyInstallment)} د.ل</span>
                </div>
              </div>

              <div className={`result-card ${results.downPayment > 0 ? 'debt-card' : ''}`}>
                <div className="result-info full">
                  <span className="result-label">الدفعة الأولى / الفرق المستحق</span>
                  <span className={`result-value ${results.downPayment > 0 ? 'debt' : 'success'}`}>
                    {results.downPayment > 0 ? fmt(results.downPayment) + ' د.ل' : 'لا توجد دفعة أولى'}
                  </span>
                </div>
              </div>

              <div className="result-card highlight-card" style={{ border: '1px solid var(--primary-light)', background: 'rgba(59, 130, 246, 0.1)' }}>
                <div className="result-icon" style={{ background: 'var(--primary)' }}>
                  <CalcIcon size={20} />
                </div>
                <div className="result-info">
                  <span className="result-label">السعر النهائي للسيارة بربح المصرف</span>
                  <span className="result-value big" style={{ color: 'var(--primary-light)' }}>
                    {fmt(results.totalMurabahaValue)} د.ل
                  </span>
                </div>
              </div>

              <div className="result-card">
                <div className="result-info full">
                  <span className="result-label">قيمة التمويل من المصرف (أصل المبلغ)</span>
                  <span className="result-value">{fmt(results.bankPrincipal)} د.ل</span>
                </div>
              </div>

              <div className="result-card">
                <div className="result-info full">
                  <span className="result-label">أرباح المرابحة (للمصرف)</span>
                  <span className="result-value">{fmt(results.bankProfit)} د.ل</span>
                </div>
              </div>

              {!isStaff && n(form.purchaseCost) > 0 && n(form.carPrice) >= n(form.purchaseCost) && (
                <div className="result-card" style={{ border: '1px solid var(--success-color)', background: 'rgba(16, 185, 129, 0.05)' }}>
                  <div className="result-info full">
                    <span className="result-label" style={{ color: 'var(--success-color)' }}>الربح المبدئي للمكتب (الفرق)</span>
                    <span className="result-value" style={{ color: 'var(--success-color)' }}>{fmt(n(form.carPrice) - n(form.purchaseCost))} د.ل</span>
                  </div>
                </div>
              )}

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
