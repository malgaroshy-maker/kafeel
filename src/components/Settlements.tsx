import { useState, useEffect, useCallback } from 'react'
import { Receipt, Car, Store, ShoppingBag, Timer, CheckCircle2, AlertTriangle, Clock, DollarSign } from 'lucide-react'

type SettlementType = 'PERSONAL_USE' | 'CASH_OUT' | 'EXTERNAL_SALE'

interface SettlementData {
  type: SettlementType
  customerName: string
  carPrice: number
  downPayment: number
  debtAmount: number
  salePrice: number
  officeCommission: number
  checkImageUrl: string
}

interface ExternalSaleTimer {
  id: string
  customerName: string
  deadline: Date
  remainingHours: number
  completed: boolean
}

const DRAFT_KEY = 'kafeel_settlement_draft'

import { supabase } from '../lib/supabase'
import { compressImage } from '../utils/imageCompression'
import { useAuth } from '../contexts/AuthContext'

// Types stay the same

export default function Settlements() {
  const { officeId } = useAuth()
  const [activeType, setActiveType] = useState<SettlementType>('PERSONAL_USE')
  const [data, setData] = useState<SettlementData>(() => {
    const saved = localStorage.getItem(DRAFT_KEY)
    if (saved) {
      try { return JSON.parse(saved) } catch { /* fall through */ }
    }
    return {
      type: 'PERSONAL_USE',
      customerName: '',
      carPrice: 0,
      downPayment: 0,
      debtAmount: 0,
      salePrice: 0,
      officeCommission: 0,
      checkImageUrl: '',
    }
  })
  const [timers, setTimers] = useState<ExternalSaleTimer[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [uploading, setUploading] = useState(false)

  const loadData = useCallback(async () => {
    if (!officeId) return
    try {
      const { data: timerData, error } = await supabase
        .from('settlements')
        .select(`
          id, deadline, completed,
          transactions!inner(
            customers(full_name)
          )
        `)
        .eq('type', 'EXTERNAL_SALE')
        .eq('completed', false)
      
      if (error) throw error
      
      if (timerData) {
        const formatted: ExternalSaleTimer[] = timerData.map(t => ({
          id: t.id,
          customerName: (t.transactions as any).customers.full_name,
          deadline: new Date(t.deadline),
          remainingHours: Math.max(0, (new Date(t.deadline).getTime() - Date.now()) / 3600000),
          completed: t.completed
        }))
        setTimers(formatted)
      }
    } catch (err) {
      console.error('Error loading settlement timers:', err)
    }
  }, [officeId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Save draft
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...data, type: activeType }))
  }, [data, activeType])

  // Live countdown for external sale timers
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) =>
        prev.map((t) => ({
          ...t,
          remainingHours: Math.max(0, (t.deadline.getTime() - Date.now()) / 3600000),
        }))
      )
    }, 60000) // update every minute
    return () => clearInterval(interval)
  }, [])

  const handleInput = (field: keyof SettlementData, value: string) => {
    setData((prev) => ({ ...prev, [field]: field === 'customerName' ? value : parseFloat(value) || 0 }))
    setSubmitted(false)
  }

  // Calculations
  const netCashOut = data.carPrice - data.downPayment - data.debtAmount - data.officeCommission
  const externalSaleNet = data.salePrice - data.carPrice - data.officeCommission

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    try {
      // 1. Compress
      const compressed = await compressImage(file)
      
      // 2. Upload to Supabase Storage
      const fileName = `${Date.now()}-${file.name}`
      const { error } = await supabase.storage
        .from('settlement-checks')
        .upload(fileName, compressed)
      
      if (error) throw error

      // 3. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('settlement-checks')
        .getPublicUrl(fileName)
      
      setData(prev => ({ ...prev, checkImageUrl: publicUrl }))
    } catch (err) {
      console.error('Upload failed:', err)
      alert('فشل رفع الصورة. يرجى المحاولة مرة أخرى.')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      const { error } = await supabase
        .from('settlements')
        .insert({
          type: activeType,
          customer_name: data.customerName,
          car_price: data.carPrice,
          down_payment: data.downPayment,
          debt_amount: data.debtAmount,
          sale_price: data.salePrice,
          office_commission: data.officeCommission,
          check_image_url: data.checkImageUrl,
          office_id: officeId,
          completed: true
        })
      
      if (error) throw error

      setSubmitted(true)
      localStorage.removeItem(DRAFT_KEY)
      loadData() // Refresh timers
    } catch (err) {
      console.error('Submission failed:', err)
      alert('حدث خطأ أثناء حفظ التسوية.')
    }
  }

  const typeOptions: { id: SettlementType; label: string; icon: typeof Car; color: string }[] = [
    { id: 'PERSONAL_USE', label: 'استعمال شخصي', icon: Car, color: 'var(--primary)' },
    { id: 'CASH_OUT', label: 'بيع للمكتب', icon: Store, color: 'var(--success)' },
    { id: 'EXTERNAL_SALE', label: 'بيع خارجي', icon: ShoppingBag, color: 'var(--warning)' },
  ]

  const formatHours = (h: number) => {
    const hours = Math.floor(h)
    const minutes = Math.floor((h - hours) * 60)
    return `${hours} ساعة ${minutes > 0 ? `و ${minutes} دقيقة` : ''}`
  }

  return (
    <div className="settlement-container">
      <div className="form-header">
        <div className="form-icon-wrap" style={{ background: 'linear-gradient(135deg, hsl(45, 85%, 50%), hsl(35, 85%, 40%))' }}>
          <Receipt size={24} />
        </div>
        <div>
          <h3>تسويات ما بعد التسليم</h3>
          <p className="calc-subtitle">إدارة تسويات السيارات المسلّمة</p>
        </div>
      </div>

      {/* Type Selection */}
      <div className="settlement-types">
        {typeOptions.map((opt) => {
          const Icon = opt.icon
          return (
            <button
              key={opt.id}
              className={`settlement-type-btn ${activeType === opt.id ? 'active' : ''}`}
              onClick={() => setActiveType(opt.id)}
              style={activeType === opt.id ? { borderColor: opt.color, color: opt.color } : {}}
            >
              <Icon size={20} />
              <span>{opt.label}</span>
            </button>
          )
        })}
      </div>

      {/* Form */}
      <div className="settlement-form">
        <div className="input-group">
          <label>اسم الزبون</label>
          <input
            type="text"
            placeholder="أدخل اسم الزبون"
            value={data.customerName}
            onChange={(e) => handleInput('customerName', e.target.value)}
          />
        </div>

        <div className="settlement-grid">
          <div className="input-group">
            <label>سعر السيارة (د.ل)</label>
            <input
              type="number"
              placeholder="0"
              value={data.carPrice || ''}
              onChange={(e) => handleInput('carPrice', e.target.value)}
            />
          </div>

          {activeType !== 'EXTERNAL_SALE' && (
            <div className="input-group">
              <label>المقدم المحصّل (د.ل)</label>
              <input
                type="number"
                placeholder="0"
                value={data.downPayment || ''}
                onChange={(e) => handleInput('downPayment', e.target.value)}
              />
            </div>
          )}

          <div className="input-group">
            <label>الديون المستحقة (د.ل)</label>
            <input
              type="number"
              placeholder="0"
              value={data.debtAmount || ''}
              onChange={(e) => handleInput('debtAmount', e.target.value)}
            />
          </div>

          {activeType === 'EXTERNAL_SALE' && (
            <div className="input-group">
              <label>سعر البيع الخارجي (د.ل)</label>
              <input
                type="number"
                placeholder="0"
                value={data.salePrice || ''}
                onChange={(e) => handleInput('salePrice', e.target.value)}
              />
            </div>
          )}

          {(activeType === 'CASH_OUT' || activeType === 'EXTERNAL_SALE') && (
            <div className="input-group">
              <label>عمولة المكتب (د.ل)</label>
              <input
                type="number"
                placeholder="0"
                value={data.officeCommission || ''}
                onChange={(e) => handleInput('officeCommission', e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Results */}
        {data.carPrice > 0 && (
          <div className="settlement-results">
            <h4 className="panel-title">
              <DollarSign size={16} />
              ملخص التسوية
            </h4>

            {activeType === 'PERSONAL_USE' && (
              <div className="results-grid">
                <div className="result-card">
                  <div className="result-icon" style={{ background: 'var(--primary)' }}>
                    <Car size={18} />
                  </div>
                  <div className="result-info">
                    <span className="result-label">سعر السيارة</span>
                    <span className="result-value">{data.carPrice.toLocaleString('ar-LY')} د.ل</span>
                  </div>
                </div>
                <div className="result-card">
                  <div className="result-icon" style={{ background: 'var(--success)' }}>
                    <CheckCircle2 size={18} />
                  </div>
                  <div className="result-info">
                    <span className="result-label">المقدم المحصّل</span>
                    <span className="result-value success">{data.downPayment.toLocaleString('ar-LY')} د.ل</span>
                  </div>
                </div>
                <div className="result-card debt-card">
                  <div className="result-icon" style={{ background: 'var(--error)' }}>
                    <AlertTriangle size={18} />
                  </div>
                  <div className="result-info">
                    <span className="result-label">الديون المتبقية</span>
                    <span className="result-value debt">{data.debtAmount.toLocaleString('ar-LY')} د.ل</span>
                  </div>
                </div>
              </div>
            )}

            {activeType === 'CASH_OUT' && (
              <div className="results-grid">
                <div className="result-card highlight-card">
                  <div className="result-icon" style={{ background: 'var(--success)' }}>
                    <DollarSign size={18} />
                  </div>
                  <div className="result-info">
                    <span className="result-label">الصافي النقدي للزبون</span>
                    <span className={`result-value big ${netCashOut >= 0 ? 'success' : 'debt'}`}>
                      {netCashOut.toLocaleString('ar-LY')} د.ل
                    </span>
                  </div>
                </div>
                <div className="settlement-breakdown">
                  <div className="breakdown-row">
                    <span>سعر السيارة</span>
                    <span>{data.carPrice.toLocaleString('ar-LY')} د.ل</span>
                  </div>
                  <div className="breakdown-row deduct">
                    <span>- المقدم</span>
                    <span>{data.downPayment.toLocaleString('ar-LY')} د.ل</span>
                  </div>
                  <div className="breakdown-row deduct">
                    <span>- الديون</span>
                    <span>{data.debtAmount.toLocaleString('ar-LY')} د.ل</span>
                  </div>
                  <div className="breakdown-row deduct">
                    <span>- العمولة</span>
                    <span>{data.officeCommission.toLocaleString('ar-LY')} د.ل</span>
                  </div>
                </div>
              </div>
            )}

            {activeType === 'EXTERNAL_SALE' && (
              <div className="results-grid">
                <div className="result-card highlight-card">
                  <div className="result-icon" style={{ background: 'var(--warning)' }}>
                    <ShoppingBag size={18} />
                  </div>
                  <div className="result-info">
                    <span className="result-label">صافي الربح من البيع الخارجي</span>
                    <span className={`result-value big ${externalSaleNet >= 0 ? 'success' : 'debt'}`}>
                      {externalSaleNet.toLocaleString('ar-LY')} د.ل
                    </span>
                  </div>
                </div>
                <div className="settlement-breakdown">
                  <div className="breakdown-row">
                    <span>سعر البيع</span>
                    <span>{data.salePrice.toLocaleString('ar-LY')} د.ل</span>
                  </div>
                  <div className="breakdown-row deduct">
                    <span>- سعر السيارة الأصلي</span>
                    <span>{data.carPrice.toLocaleString('ar-LY')} د.ل</span>
                  </div>
                  <div className="breakdown-row deduct">
                    <span>- العمولة</span>
                    <span>{data.officeCommission.toLocaleString('ar-LY')} د.ل</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Check Image Upload */}
        <div className="input-group" style={{ marginTop: '1.5rem', padding: '1rem', border: '1px dashed var(--primary)', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.05)' }}>
          <label style={{ color: 'var(--primary)' }}>صورة الصك المالي (إلزامي لإغلاق المعاملة)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload(file)
            }}
          />
          {uploading && <div className="spinner-sm" style={{ marginTop: '0.5rem' }}>جاري الرفع...</div>}
          {data.checkImageUrl && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={14} /> تم إرفاق الصورة
            </div>
          )}
        </div>

        <div className="form-actions" style={{ marginTop: '2rem' }}>
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit} 
            disabled={!data.customerName || !data.carPrice || !data.checkImageUrl}
          >
            <CheckCircle2 size={16} />
            تسجيل التسوية وإغلاق المعاملة
          </button>
        </div>

        {submitted && (
          <div className="queue-match-result success" style={{ marginTop: '1rem' }}>
            <CheckCircle2 size={16} />
            <span>تم تسجيل التسوية بنجاح</span>
          </div>
        )}
      </div>

      {/* External Sale Timers */}
      {timers.length > 0 && (
        <div className="timers-section">
          <h4 className="panel-title">
            <Timer size={16} />
            عدادات البيع الخارجي (3 أيام)
          </h4>
          <div className="timer-list">
            {timers.map((timer) => {
              const isUrgent = timer.remainingHours < 12
              const isExpired = timer.remainingHours <= 0
              return (
                <div key={timer.id} className={`timer-card ${isUrgent ? 'urgent' : ''} ${isExpired ? 'expired' : ''}`}>
                  <div className="timer-info">
                    <span className="timer-name">{timer.customerName}</span>
                    <span className="timer-remaining">
                      {isExpired ? (
                        <><AlertTriangle size={14} /> انتهت المهلة!</>
                      ) : (
                        <><Clock size={14} /> {formatHours(timer.remainingHours)} متبقية</>
                      )}
                    </span>
                  </div>
                  <div className="timer-bar">
                    <div
                      className="timer-bar-fill"
                      style={{
                        width: `${Math.max(0, (timer.remainingHours / 72) * 100)}%`,
                        background: isUrgent ? 'var(--error)' : 'var(--success)',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
