import { useState, useEffect, useCallback } from 'react'
import { Receipt, Car, Store, ShoppingBag, Timer, CheckCircle2, AlertTriangle, Clock, DollarSign, X } from 'lucide-react'

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
  transactionId?: string
}

const DRAFT_KEY = 'kafeel_settlement_draft'

import { supabase } from '../lib/supabase'
import { compressImage } from '../utils/imageCompression'
import { useAuth } from '../contexts/AuthContext'

// Types stay the same

export default function Settlements() {
  const { officeId } = useAuth()
  const [activeType, setActiveType] = useState<SettlementType>('PERSONAL_USE')
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null)
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
  const [activeTxList, setActiveTxList] = useState<any[]>([])
  const [selectedTxId, setSelectedTxId] = useState<string>('')

  const fetchActiveTransactions = useCallback(async () => {
    if (!officeId) return
    try {
      const { data: txs, error } = await supabase
        .from('transactions')
        .select(`
          id,
          car_price,
          down_payment,
          customers!inner (
            name,
            workplace:workplace_id (
              name
            )
          )
        `)
        .in('status', ['MATCHED', 'ACTIVE'])
        .eq('office_id', officeId)
      
      if (error) throw error
      if (txs) {
        setActiveTxList(txs)
      }
    } catch (err) {
      console.error('Error fetching active transactions:', err)
    }
  }, [officeId])

  const loadData = useCallback(async () => {
    if (!officeId) return
    try {
      const { data: timerData, error } = await supabase
        .from('settlements')
        .select(`
          id,
          transaction_id,
          external_sale_deadline,
          external_sale_completed,
          transactions!inner (
            id,
            customers (
              name
            )
          )
        `)
        .eq('settlement_type', 'EXTERNAL_SALE')
        .eq('external_sale_completed', false)
      
      if (error) throw error
      
      if (timerData) {
        const formatted: ExternalSaleTimer[] = timerData.map(t => ({
          id: t.id,
          customerName: (t.transactions as any).customers.name,
          deadline: new Date(t.external_sale_deadline),
          remainingHours: Math.max(0, (new Date(t.external_sale_deadline).getTime() - Date.now()) / 3600000),
          completed: t.external_sale_completed,
          transactionId: (t.transactions as any).id
        }))
        setTimers(formatted)
      }
    } catch (err) {
      console.error('Error loading settlement timers:', err)
    }
  }, [officeId])

  useEffect(() => {
    loadData()
    fetchActiveTransactions()
  }, [loadData, fetchActiveTransactions])

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

  const handleTxChange = (txId: string) => {
    setSelectedTxId(txId)
    setSubmitted(false)
    if (!txId) {
      setData(prev => ({
        ...prev,
        customerName: '',
        carPrice: 0,
        downPayment: 0,
        debtAmount: 0,
      }))
      return
    }
    const tx = activeTxList.find(t => t.id === txId)
    if (tx) {
      setData(prev => ({
        ...prev,
        customerName: tx.customers?.name || '',
        carPrice: Number(tx.car_price) || 0,
        downPayment: Number(tx.down_payment) || 0,
        debtAmount: (Number(tx.car_price) || 0) - (Number(tx.down_payment) || 0),
      }))
    }
  }

  // Calculations
  const netCashOut = data.carPrice - data.downPayment - data.debtAmount - data.officeCommission
  const externalSaleNet = data.salePrice - data.carPrice - data.officeCommission

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    try {
      // 1. Compress
      const compressed = await compressImage(file, 2048, 0.85)
      
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

  const handleCompleteExternalSale = async (settlementId: string, transactionId: string) => {
    if (!confirm('هل تريد إكمال هذا البيع الخارجي وإغلاق المعاملة بنجاح؟')) return
    try {
      const { error: settlementError } = await supabase
        .from('settlements')
        .update({
          external_sale_completed: true,
          status: 'COMPLETED'
        })
        .eq('id', settlementId)

      if (settlementError) throw settlementError

      if (transactionId) {
        const { error: txError } = await supabase
          .from('transactions_raw')
          .update({
            status: 'COMPLETED'
          })
          .eq('id', transactionId)

        if (txError) throw txError
      }

      alert('✅ تم إكمال البيع الخارجي بنجاح!')
      loadData()
      fetchActiveTransactions()
    } catch (err: any) {
      console.error('Error completing external sale:', err)
      alert(`فشل إكمال البيع: ${err.message || 'خطأ غير معروف'}`)
    }
  }

  const handleSubmit = async () => {
    if (!selectedTxId) {
      alert('يرجى اختيار معاملة نشطة أولاً.')
      return
    }
    if (!data.checkImageUrl) {
      alert('يرجى إرفاق صورة الصك المالي أولاً.')
      return
    }
    try {
      let netCash = 0
      if (activeType === 'CASH_OUT') {
        netCash = data.carPrice - data.downPayment - data.debtAmount - data.officeCommission
      } else if (activeType === 'EXTERNAL_SALE') {
        netCash = data.salePrice - data.carPrice - data.officeCommission
      }

      const deadline = activeType === 'EXTERNAL_SALE'
        ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        : null

      const settlementStatus = activeType === 'EXTERNAL_SALE' ? 'IN_PROGRESS' : 'COMPLETED'

      const { error } = await supabase
        .from('settlements')
        .insert({
          transaction_id: selectedTxId,
          office_id: officeId,
          settlement_type: activeType,
          down_payment_collected: data.downPayment,
          debt_amount: data.debtAmount,
          sale_price: activeType === 'EXTERNAL_SALE' ? data.salePrice : null,
          office_commission: (activeType === 'CASH_OUT' || activeType === 'EXTERNAL_SALE') ? data.officeCommission : 0,
          net_cash: netCash,
          external_sale_deadline: deadline,
          external_sale_completed: false,
          status: settlementStatus,
          check_image_url: data.checkImageUrl
        })
      
      if (error) throw error

      // If the settlement type is not EXTERNAL_SALE, we mark the transaction as COMPLETED
      if (activeType !== 'EXTERNAL_SALE') {
        const { error: txError } = await supabase
          .from('transactions_raw')
          .update({
            status: 'COMPLETED'
          })
          .eq('id', selectedTxId)

        if (txError) throw txError
      }

      setSubmitted(true)
      localStorage.removeItem(DRAFT_KEY)
      setSelectedTxId('')
      setData({
        type: activeType,
        customerName: '',
        carPrice: 0,
        downPayment: 0,
        debtAmount: 0,
        salePrice: 0,
        officeCommission: 0,
        checkImageUrl: '',
      })
      await Promise.all([
        loadData(),
        fetchActiveTransactions()
      ])
    } catch (err: any) {
      console.error('Submission failed:', err)
      alert(`حدث خطأ أثناء حفظ التسوية: ${err.message || 'خطأ غير معروف'}`)
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
          <label>اختر المعاملة النشطة (الزبون)</label>
          <select
            value={selectedTxId}
            onChange={(e) => handleTxChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: '1px solid rgba(191, 149, 63, 0.3)',
              background: 'var(--surface-hover)',
              color: 'var(--text-primary)',
              fontSize: '0.88rem',
              outline: 'none',
              transition: 'all 0.3s ease',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            <option value="">-- اختر معاملة نشطة --</option>
            {activeTxList.map((tx) => (
              <option key={tx.id} value={tx.id}>
                {tx.customers?.name} ({tx.customers?.workplace?.name || 'بدون جهة عمل'}) - سعر السيارة: {Number(tx.car_price).toLocaleString('ar-LY')} د.ل
              </option>
            ))}
          </select>
          {activeTxList.length === 0 && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <AlertTriangle size={14} />
              لا توجد معاملات نشطة بانتظار التسوية حالياً. يرجى تفعيل أو مطابقة معاملة أولاً.
            </div>
          )}
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
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={14} /> تم إرفاق الصورة بنجاح
              </div>
              <div 
                className="preview-thumbnail-container"
                onClick={() => setSelectedPreviewImage(data.checkImageUrl)}
                style={{ width: '120px', height: '120px', cursor: 'pointer' }}
              >
                <img 
                  src={data.checkImageUrl} 
                  alt="صورة الصك المالي" 
                  className="preview-thumbnail"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--glass-border)', display: 'block' }}
                />
                <div className="preview-thumbnail-hover">معاينة</div>
              </div>
            </div>
          )}
        </div>

        <div className="form-actions" style={{ marginTop: '2rem' }}>
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit} 
            disabled={!selectedTxId || !data.carPrice || !data.checkImageUrl}
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
        <div className="timers-section" style={{ marginTop: '2rem' }}>
          <h4 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Timer size={16} />
            عدادات البيع الخارجي (3 أيام)
          </h4>
          <div className="timer-list" style={{ display: 'grid', gap: '0.75rem' }}>
            {timers.map((timer) => {
              const isUrgent = timer.remainingHours < 12
              const isExpired = timer.remainingHours <= 0
              return (
                <div key={timer.id} className={`timer-card ${isUrgent ? 'urgent' : ''} ${isExpired ? 'expired' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', border: '1px solid var(--glass-border)', borderRadius: '12px', background: 'var(--surface-hover)' }}>
                  <div className="timer-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span className="timer-name" style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{timer.customerName}</span>
                      <span className="timer-remaining" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: isUrgent ? 'var(--error)' : 'var(--text-secondary)' }}>
                        {isExpired ? (
                          <><AlertTriangle size={14} style={{ color: 'var(--error)' }} /> انتهت المهلة!</>
                        ) : (
                          <><Clock size={14} /> {formatHours(timer.remainingHours)} متبقية</>
                        )}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCompleteExternalSale(timer.id, timer.transactionId || '')}
                      className="btn btn-sm btn-success"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.75rem',
                        borderRadius: '6px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: 'var(--success-color)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        transition: 'all 0.2s'
                      }}
                    >
                      <CheckCircle2 size={12} />
                      إكمال البيع
                    </button>
                  </div>
                  <div className="timer-bar" style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      className="timer-bar-fill"
                      style={{
                        height: '100%',
                        width: `${Math.max(0, (timer.remainingHours / 72) * 100)}%`,
                        background: isUrgent ? 'var(--error)' : 'var(--success)',
                        transition: 'width 0.5s ease-out'
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedPreviewImage && (
        <div className="lightbox-overlay" onClick={() => setSelectedPreviewImage(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setSelectedPreviewImage(null)}>
              <X size={20} /> إغلاق المعاينة
            </button>
            <img src={selectedPreviewImage} alt="معاينة الصك" className="lightbox-img" />
          </div>
        </div>
      )}
    </div>
  )
}
