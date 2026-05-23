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
  shippingCost?: number
  staffCommission?: number
  promissoryNotesCount?: number
  promissoryNotesDetails?: string
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
      shippingCost: 0,
      staffCommission: 0,
      promissoryNotesCount: 0,
      promissoryNotesDetails: ''
    }
  })
  const [timers, setTimers] = useState<ExternalSaleTimer[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeTxList, setActiveTxList] = useState<any[]>([])
  const [selectedTxId, setSelectedTxId] = useState<string>('')
  const [showExitPassModal, setShowExitPassModal] = useState(false)
  const [lastSettledData, setLastSettledData] = useState<any>(null)

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
    const isStringField = field === 'customerName' || field === 'promissoryNotesDetails'
    setData((prev) => ({ ...prev, [field]: isStringField ? value : parseFloat(value) || 0 }))
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

  // Quick Settle Handler
  const selectQuickSettleTx = useCallback(async (txId: string) => {
    if (!txId || !officeId) return;
    
    // Check if already in activeTxList
    const existing = activeTxList.find(t => t.id === txId);
    if (existing) {
      handleTxChange(txId);
      return;
    }
    
    // Otherwise, fetch it directly
    try {
      const { data: tx, error } = await supabase
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
        .eq('id', txId)
        .single();
        
      if (error) throw error;
      if (tx) {
        setActiveTxList(prev => {
          if (prev.some(p => p.id === tx.id)) return prev;
          return [...prev, tx];
        });
        setSelectedTxId(txId);
        const cust = tx.customers as any;
        setData(prev => ({
          ...prev,
          customerName: (Array.isArray(cust) ? cust[0]?.name : cust?.name) || '',
          carPrice: Number(tx.car_price) || 0,
          downPayment: Number(tx.down_payment) || 0,
          debtAmount: (Number(tx.car_price) || 0) - (Number(tx.down_payment) || 0),
        }));
      }
    } catch (err) {
      console.error('Error fetching quick settle transaction:', err);
    }
  }, [activeTxList, officeId]);

  useEffect(() => {
    const quickSettleTxId = localStorage.getItem('quick_settle_tx_id');
    if (quickSettleTxId) {
      selectQuickSettleTx(quickSettleTxId);
      localStorage.removeItem('quick_settle_tx_id');
    }
  }, [activeTxList, selectQuickSettleTx]);

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
        netCash = data.carPrice - data.downPayment - data.debtAmount - data.officeCommission - (data.shippingCost || 0) - (data.staffCommission || 0)
      } else if (activeType === 'EXTERNAL_SALE') {
        netCash = data.salePrice - data.carPrice - data.officeCommission - (data.shippingCost || 0) - (data.staffCommission || 0)
      } else {
        netCash = data.downPayment - (data.shippingCost || 0) - (data.staffCommission || 0)
      }

      const deadline = activeType === 'EXTERNAL_SALE'
        ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        : null

      const settlementStatus = activeType === 'EXTERNAL_SALE' ? 'IN_PROGRESS' : 'COMPLETED'

      const notesJson = JSON.stringify({
        shipping_cost: data.shippingCost || 0,
        staff_commission: data.staffCommission || 0,
        promissory_notes_count: data.promissoryNotesCount || 0,
        promissory_notes_details: data.promissoryNotesDetails || ''
      })

      const insertObj: any = {
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
        check_image_url: data.checkImageUrl,
        shipping_cost: data.shippingCost || 0,
        staff_commission: data.staffCommission || 0,
        promissory_notes_count: data.promissoryNotesCount || 0,
        promissory_notes_details: data.promissoryNotesDetails || '',
        notes: notesJson
      }

      let { error } = await supabase
        .from('settlements')
        .insert(insertObj)
      
      if (error && error.message && error.message.includes('column') && error.message.includes('does not exist')) {
        const fallbackObj = {
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
          check_image_url: data.checkImageUrl,
          notes: notesJson
        }
        const { error: retryError } = await supabase
          .from('settlements')
          .insert(fallbackObj)
        error = retryError
      }
      
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

      setLastSettledData({
        ...data,
        type: activeType,
        netCash: netCash,
        shippingCost: data.shippingCost || 0,
        staffCommission: data.staffCommission || 0,
        promissoryNotesCount: data.promissoryNotesCount || 0,
        promissoryNotesDetails: data.promissoryNotesDetails || ''
      })
      
      setSubmitted(true)
      setShowExitPassModal(true)
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
        shippingCost: 0,
        staffCommission: 0,
        promissoryNotesCount: 0,
        promissoryNotesDetails: ''
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
              onFocus={(e) => e.target.select()}
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
                onFocus={(e) => e.target.select()}
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
              onFocus={(e) => e.target.select()}
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
                onFocus={(e) => e.target.select()}
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
                onFocus={(e) => e.target.select()}
              />
            </div>
          )}
        </div>

        {/* Advanced Accounting Parameters / تفاصيل تسوية محاسبية متقدمة */}
        <div style={{
          marginTop: '1.5rem',
          padding: '1.5rem',
          border: '1.5px solid var(--glass-border)',
          borderRadius: '12px',
          background: 'rgba(251, 245, 183, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#bf953f', margin: 0, fontSize: '0.95rem', fontWeight: 'bold' }}>
            <Receipt size={16} />
            تفاصيل التسوية المحاسبية المتقدمة
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label>مصاريف شحن ونقل المركبة (د.ل)</label>
              <input
                type="number"
                placeholder="0"
                value={data.shippingCost || ''}
                onChange={(e) => handleInput('shippingCost', e.target.value)}
                onFocus={(e) => e.target.select()}
                style={{ width: '100%' }}
              />
            </div>
            <div className="input-group">
              <label>عمولة المبيعات الفردية للموظف (د.ل)</label>
              <input
                type="number"
                placeholder="0"
                value={data.staffCommission || ''}
                onChange={(e) => handleInput('staffCommission', e.target.value)}
                onFocus={(e) => e.target.select()}
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label>عدد الكمبيالات</label>
              <input
                type="number"
                placeholder="0"
                value={data.promissoryNotesCount || ''}
                onChange={(e) => handleInput('promissoryNotesCount', e.target.value)}
                onFocus={(e) => e.target.select()}
                style={{ width: '100%' }}
              />
            </div>
            <div className="input-group">
              <label>تفاصيل وأرقام الكمبيالات وتواريخ استحقاقها</label>
              <input
                type="text"
                placeholder="مثال: كمبيالة رقم 102 استحقاق 2026/09/01..."
                value={data.promissoryNotesDetails || ''}
                onChange={(e) => handleInput('promissoryNotesDetails', e.target.value)}
                onFocus={(e) => e.target.select()}
                style={{ width: '100%' }}
              />
            </div>
          </div>
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

      {/* Branded PDF Exit Pass & Statement modal overlay */}
      {showExitPassModal && lastSettledData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', overflowY: 'auto' }} className="printable-report-actions-overlay">
          <div style={{ background: 'var(--surface)', borderRadius: '24px', border: '2px solid #bf953f', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', width: '100%', maxWidth: '800px', padding: '2.5rem', position: 'relative', display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="printable-report-modal-card">
            
            {/* The printable exit pass document */}
            <div className="printable-report-area" dir="rtl" style={{
              background: '#fff',
              color: '#1e293b',
              padding: '2.5rem',
              borderRadius: '16px',
              border: '4px double #aa771c',
              position: 'relative',
              boxShadow: 'inset 0 0 40px rgba(170,119,28,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              {/* Decorative gold double borders */}
              <div style={{ position: 'absolute', top: '10px', right: '10px', left: '10px', bottom: '10px', border: '1px solid rgba(170,119,28,0.25)', pointerEvents: 'none' }}></div>
              
              {/* Branded Official Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid #bf953f', paddingBottom: '1rem', flexWrap: 'nowrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <img 
                    src="/logo.png" 
                    alt="Logo" 
                    onError={(e) => { (e.target as any).src = 'https://raw.githubusercontent.com/malgaroshy-maker/kafeel/shams/public/logo.png' }}
                    style={{ height: '55px', width: 'auto', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.3px' }}>منظومة كفيل السحابية</h3>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>Kafeel Finance Platform</span>
                  </div>
                </div>
                <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ background: '#fef08a', color: '#854d0e', padding: '4px 12px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '800', border: '1px solid #fef08a' }}>إذن خروج مركبة نهائي</span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>رقم الحركة: {selectedTxId || 'KAFEEL-TX-MAIN'}</span>
                </div>
              </div>

              {/* Exit Pass Details */}
              <div style={{ margin: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.92rem', lineHeight: '1.8', color: '#334155' }}>
                <p style={{ margin: 0 }}>
                  يرخص بموجب هذا المستند للمركبة المبينة تفاصيلها أدناه بالخروج النهائي من معرض السيارات المعتمد، بعد استيفاء وتصفية كافة الالتزامات المالية والضمانات والكمبيالات المترتبة لصالح المنظومة.
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '0.5rem' }}>
                  <div><strong>اسم الزبون المستفيد:</strong> {lastSettledData.customerName}</div>
                  <div><strong>نوع التسوية:</strong> {lastSettledData.type === 'PERSONAL_USE' ? 'استعمال شخصي' : lastSettledData.type === 'CASH_OUT' ? 'بيع للمكتب (تسييل)' : 'بيع خارجي'}</div>
                  <div><strong>سعر المركبة الأساسي:</strong> {Number(lastSettledData.carPrice).toLocaleString('ar-LY')} د.ل</div>
                  <div><strong>عدد الكمبيالات المستلمة:</strong> {lastSettledData.promissoryNotesCount || 0} كمبيالات</div>
                </div>

                {lastSettledData.promissoryNotesDetails && (
                  <p style={{ margin: 0, padding: '0.5rem 1rem', background: '#fffbeb', borderRight: '3px solid #d97706', borderRadius: '4px', fontSize: '0.85rem' }}>
                    <strong>بيان الكمبيالات المستلمة:</strong> {lastSettledData.promissoryNotesDetails}
                  </p>
                )}
              </div>

              {/* Financial Breakdown Table */}
              <div style={{ marginTop: '0.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>كشف حساب التسوية المالي الموحد</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'right' }}>بيان الحركة المالية</th>
                      <th style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left' }}>القيمة (د.ل)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>سعر شراء/تقييم السيارة الأساسي</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left' }}>{Number(lastSettledData.carPrice).toLocaleString('ar-LY')} د.ل</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>المقدم المالي المحصّل</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left' }}>{Number(lastSettledData.downPayment).toLocaleString('ar-LY')} د.ل</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>الديون والذمم المتبقية المترتبة</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left' }}>{Number(lastSettledData.debtAmount).toLocaleString('ar-LY')} د.ل</td>
                    </tr>
                    {lastSettledData.type === 'EXTERNAL_SALE' && (
                      <tr>
                        <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>سعر البيع الخارجي للمشتري</td>
                        <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left' }}>{Number(lastSettledData.salePrice).toLocaleString('ar-LY')} د.ل</td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>مصاريف شحن ونقل المركبة من الموانئ / مصراتة</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left' }}>{Number(lastSettledData.shippingCost).toLocaleString('ar-LY')} د.ل</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>عمولة المبيعات الفردية للموظف</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left' }}>{Number(lastSettledData.staffCommission).toLocaleString('ar-LY')} د.ل</td>
                    </tr>
                    <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>صافي التدفق النقدي للمعاملة (Net Cash)</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left', color: '#10b981' }}>{Number(lastSettledData.netCash).toLocaleString('ar-LY')} د.ل</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', fontSize: '0.85rem' }}>
                <div style={{ textAlign: 'center', width: '200px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  <span style={{ color: '#64748b' }}>توقيع المحاسب المعتمد</span>
                  <span style={{ borderBottom: '1.5px solid #cbd5e1', width: '100%' }}></span>
                </div>
                <div style={{ textAlign: 'center', width: '200px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  <span style={{ color: '#64748b' }}>توقيع وختم مدير المعرض</span>
                  <span style={{ borderBottom: '1.5px solid #cbd5e1', width: '100%' }}></span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }} className="printable-report-actions">
              <button 
                onClick={() => window.print()}
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #bf953f, #d4af37)', color: '#000', fontWeight: 'bold' }}
              >
                طباعة إذن الخروج الورقي 🖨️
              </button>
              <button 
                onClick={() => setShowExitPassModal(false)}
                className="btn btn-secondary"
              >
                إغلاق النافذة
              </button>
            </div>

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
