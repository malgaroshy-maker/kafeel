import { useState, useEffect, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { Calculator as CalcIcon, TrendingUp, Banknote, CreditCard, User, ShieldCheck, Save, Store } from 'lucide-react'
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
  marketSalePrice: string
}

const defaultState: CalcState = {
  purchaseCost: '',
  carPrice: '',
  bankCeiling: '120000',
  netSalary: '',
  marginRate: '0.16',
  deductionRate: '0.50',
  hasNotaryPledge: true,
  marketSalePrice: '',
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
  showSaveButton?: boolean
  onSaveSuccess?: (txId: string) => void
}

export default function FinancialCalculator({ beneficiaryId, guarantorId, showSaveButton = true, onSaveSuccess }: Props) {
  const { isStaff, officeId } = useAuth()
  const [form, setForm] = useLocalStorage<CalcState>('kafeel_calc_draft', defaultState)
  const [beneficiaryData, setBeneficiaryData] = useState<any>(null)
  const [guarantorData, setGuarantorData] = useState<any>(null)
  const [selectedCar, setSelectedCar] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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
      .select('*, workplace:workplace_id(name, required_guarantors)')
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

  const handleSaveTransaction = async () => {
    if (!beneficiaryId) {
      alert('يرجى اختيار مستفيد أو زبون أولاً.')
      return
    }
    if (!officeId) {
      alert('يرجى تسجيل الدخول بشكل صحيح كعضو في مكتب.')
      return
    }
    setSaving(true)
    try {
      let guarantorsNeeded = 1
      if (beneficiaryData?.workplace?.required_guarantors) {
        guarantorsNeeded = beneficiaryData.workplace.required_guarantors
      }

      const { data: existingTx, error: fetchError } = await supabase
        .from('transactions')
        .select('id, status')
        .eq('customer_id', beneficiaryId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fetchError) throw fetchError

      const txData = {
        office_id: officeId,
        customer_id: beneficiaryId,
        car_price: n(form.carPrice),
        bank_ceiling: n(form.bankCeiling),
        margin_rate: parseFloat(form.marginRate),
        down_payment: results?.downPayment || 0,
        total_installments: TERM_MONTHS,
        workplace_id: beneficiaryData?.workplace_id || null,
        guarantors_needed: guarantorsNeeded,
        purchase_cost: !isStaff && n(form.purchaseCost) > 0 ? n(form.purchaseCost) : null,
        market_sale_price: !isStaff && n(form.marketSalePrice) > 0 ? n(form.marketSalePrice) : 0
      }

      let txId = ''
      if (existingTx) {
        const { error: updateError } = await supabase
          .from('transactions_raw')
          .update(txData)
          .eq('id', existingTx.id)

        if (updateError) throw updateError
        txId = existingTx.id
      } else {
        const { data: newTx, error: insertError } = await supabase
          .from('transactions_raw')
          .insert({
            ...txData,
            status: 'PENDING',
            is_files_complete: false
          })
          .select('id')
          .single()

        if (insertError) throw insertError
        txId = newTx.id
      }

      alert('تم حفظ المعاملة المالية في قاعدة البيانات بنجاح!')
      if (onSaveSuccess) {
        onSaveSuccess(txId)
      }
    } catch (err: any) {
      console.error('Error saving transaction:', err)
      alert(`فشل حفظ المعاملة الحسابية: ${err.message || 'خطأ غير معروف'}`)
    } finally {
      setSaving(false)
    }
  }

  const update = (field: keyof CalcState, value: string | boolean) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
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
    // Determine the active salary to use (use lowest if guarantor is linked)
    let activeSalary = n(form.netSalary);
    if (beneficiaryData && guarantorData) {
      activeSalary = Math.min(beneficiaryData.salary || 0, guarantorData.salary || 0);
    }

    return calculateMurabaha({
      carPrice: n(form.carPrice),
      bankCeiling: n(form.bankCeiling),
      netSalary: activeSalary,
      marginRate: parseFloat(form.marginRate),
      deductionRate: 0.50, // Always 50% limit as requested
    })
  }, [form, beneficiaryData, guarantorData])

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
            {beneficiaryData && guarantorData && (
              <div style={{
                fontSize: '0.8rem',
                color: 'var(--warning)',
                background: 'rgba(217, 119, 6, 0.1)',
                border: '1px solid rgba(217, 119, 6, 0.25)',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                marginTop: '0.5rem',
                lineHeight: '1.4',
                fontWeight: 'bold',
                direction: 'rtl',
                textAlign: 'right'
              }}>
                ⚠️ تم ربط الضامن! يتم حساب الأقساط والقدرة بناءً على <strong>الراتب الأدنى</strong>: {Math.min(beneficiaryData.salary || 0, guarantorData.salary || 0).toLocaleString('ar-LY')} د.ل (المستفيد: {beneficiaryData.salary?.toLocaleString()} | الضامن: {guarantorData.salary?.toLocaleString()})
              </div>
            )}
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
            <>
              <div className="input-group">
                <label htmlFor="purchaseCost">سعر شراء السيارة بالكاش التقريبي وقت المعاملة</label>
                <input
                  id="purchaseCost"
                  type="number"
                  inputMode="decimal"
                  placeholder="مثال: 90,000 (اختياري)"
                  value={form.purchaseCost}
                  onChange={(e) => update('purchaseCost', e.target.value)}
                  onFocus={(e) => e.target.select()}
                  tabIndex={5}
                />
              </div>
              <div className="input-group">
                <label htmlFor="marketSalePrice">سعر بيع السيارة — سعر السوق (د.ل)</label>
                <input
                  id="marketSalePrice"
                  type="number"
                  inputMode="decimal"
                  placeholder="مثال: 105,000 (اختياري)"
                  value={form.marketSalePrice}
                  onChange={(e) => update('marketSalePrice', e.target.value)}
                  onFocus={(e) => e.target.select()}
                  tabIndex={6}
                />
              </div>
            </>
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
            نسبة الخصم الفعلية: <strong>
              {results && n(form.netSalary) > 0
                ? `${((results.monthlyInstallment / n(form.netSalary)) * 100).toFixed(1)}%`
                : '50%'
              }
            </strong>
            <span style={{ fontSize: '0.8rem', opacity: 0.8, marginRight: '0.5rem' }}>
              (الحد الأقصى المسموح به: 50%)
            </span>
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
                <div className="result-icon" style={{ background: 'var(--primary)' }}>
                  <User size={20} />
                </div>
                <div className="result-info">
                  <span className="result-label">نقص القدرة (عن الـ 1250 المثالي)</span>
                  <span className="result-value">الفارق الشهري: {fmt(results.salaryGap)} د.ل</span>
                </div>
              </div>

              <div className="result-card highlight-card">
                <div className="result-icon" style={{ background: 'var(--primary-dark)' }}>
                  <CreditCard size={20} />
                </div>
                <div className="result-info">
                  <span className="result-label">القسط الشهري الفعلي</span>
                  <span className="result-value big">{fmt(results.monthlyInstallment)} د.ل</span>
                </div>
              </div>

              <div className="result-card">
                <div className="result-info full">
                  <span className="result-label">الدفعة الأولى (تجاوز سقف السيارة)</span>
                  <span className={`result-value ${results.excessValue > 0 ? 'debt' : 'success'}`}>
                    {results.excessValue > 0 ? `${fmt(results.excessValue)} د.ل` : '0.00 د.ل'}
                  </span>
                </div>
              </div>

              <div className="result-card">
                <div className="result-info full">
                  <span className="result-label">الدفعة الأولى (عجز استقطاع المرتب)</span>
                  <span className={`result-value ${results.salaryGapTotal > 0 ? 'debt' : 'success'}`}>
                    {results.salaryGapTotal > 0 ? `${fmt(results.salaryGapTotal)} د.ل` : '0.00 د.ل'}
                  </span>
                </div>
              </div>

              <div className="result-card">
                <div className="result-icon" style={{ background: 'var(--success)' }}>
                  <TrendingUp size={20} />
                </div>
                <div className="result-info">
                  <span className="result-label">إجمالي قيمة القسط (8 سنوات)</span>
                  <span className="result-value">{fmt(results.actualBankRepayment)} د.ل</span>
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

              <div className={`result-card highlight-card ${results.downPayment > 0 ? 'debt-card' : ''}`} style={{
                gridColumn: '1 / -1',
                background: results.downPayment > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                border: results.downPayment > 0 ? '2px solid rgba(239, 68, 68, 0.4)' : '2px solid rgba(16, 185, 129, 0.4)',
                padding: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                borderRadius: '12px'
              }}>
                <div className="result-info full" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                  <span className="result-label" style={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--text)' }}>
                    إجمالي الدفعة الأولى المستحقة
                  </span>
                  <span className="result-value" style={{ 
                    fontSize: '1.8rem', 
                    fontWeight: '800', 
                    color: results.downPayment > 0 ? 'var(--error-color, #ef4444)' : 'var(--success-color, #10b981)' 
                  }}>
                    {results.downPayment > 0 ? `${fmt(results.downPayment)} د.ل` : 'لا توجد دفعة أولى'}
                  </span>
                  {results.accountingNote && (
                    <div style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)',
                      marginTop: '0.5rem',
                      background: 'rgba(255,255,255,0.02)',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      border: '1px dashed var(--glass-border)',
                      textAlign: 'center',
                      width: '100%'
                    }}>
                      📝 {results.accountingNote}
                    </div>
                  )}
                </div>
              </div>

              {!isStaff && n(form.purchaseCost) > 0 && n(form.carPrice) >= n(form.purchaseCost) && (
                <div className="result-card" style={{ gridColumn: '1 / -1', border: '1px solid var(--success-color)', background: 'rgba(16, 185, 129, 0.05)' }}>
                  <div className="result-info full">
                    <span className="result-label" style={{ color: 'var(--success-color)' }}>الربح المبدئي للمكتب (سعر البيع للمصرف − سعر الشراء بالكاش)</span>
                    <span className="result-value" style={{ color: 'var(--success-color)' }}>{fmt(n(form.carPrice) - n(form.purchaseCost))} د.ل</span>
                  </div>
                </div>
              )}

              {!isStaff && n(form.marketSalePrice) > 0 && n(form.purchaseCost) > 0 && (
                <div className="result-card" style={{
                  gridColumn: '1 / -1',
                  border: (n(form.marketSalePrice) - n(form.purchaseCost)) >= 0 ? '2px solid #10b981' : '2px solid #ef4444',
                  background: (n(form.marketSalePrice) - n(form.purchaseCost)) >= 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  borderRadius: '12px',
                  padding: '1rem'
                }}>
                  <div className="result-icon" style={{ background: (n(form.marketSalePrice) - n(form.purchaseCost)) >= 0 ? '#10b981' : '#ef4444' }}>
                    <Store size={20} />
                  </div>
                  <div className="result-info">
                    <span className="result-label" style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>صافي ربح المكتب (سعر السوق − سعر الشراء بالكاش)</span>
                    <span className="result-value big" style={{
                      color: (n(form.marketSalePrice) - n(form.purchaseCost)) >= 0 ? '#10b981' : '#ef4444',
                      fontSize: '1.5rem'
                    }}>
                      {fmt(n(form.marketSalePrice) - n(form.purchaseCost))} د.ل
                    </span>
                  </div>
                </div>
              )}

              <div className="term-info">
                <span>مدة التقسيط: <strong>{TERM_MONTHS} شهر (8 سنوات)</strong></span>
              </div>

              {beneficiaryId && showSaveButton && (
                <button
                  type="button"
                  className="btn btn-primary btn-lg w-full flex items-center justify-center gap-2 mt-4"
                  onClick={handleSaveTransaction}
                  disabled={saving}
                  style={{
                    background: 'linear-gradient(135deg, #bf953f 0%, #fcf6ba 25%, #b38728 50%, #fbf5b7 75%, #aa771c 100%)',
                    color: '#0f172a',
                    border: 'none',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 15px rgba(186, 147, 61, 0.4)',
                    padding: '0.85rem',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    marginTop: '1.25rem'
                  }}
                >
                  {saving ? (
                    <>
                      <span className="animate-spin inline-block w-4.5 h-4.5 border-2 border-current border-t-transparent rounded-full"></span>
                      جاري حفظ المعاملة...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      حفظ المعاملة ومتابعة المستندات
                    </>
                  )}
                </button>
              )}
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
