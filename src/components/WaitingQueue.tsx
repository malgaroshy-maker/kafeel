import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Clock, Search, CheckCircle, AlertCircle, RefreshCw, Zap, FileCheck, X, FileText } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { notificationService } from '../utils/notifications'

interface WaitingTransaction {
  id: string
  customer_id: string
  customer_name: string
  customer_national_id: string
  office_name: string
  workplace_name: string
  salary: number
  car_price: number
  guarantors_needed: number
  current_guarantors: number
  created_at: string
  verification_status?: string
  rejection_reason?: string
}

interface MatchDetails {
  message: string
  beneficiaryId?: string
  guarantorId?: string
}

interface Props {
  onGoToCalculator?: (beneficiaryId: string, guarantorId: string) => void
}

export default function WaitingQueue({ onGoToCalculator }: Props) {
  const [queue, setQueue] = useState<WaitingTransaction[]>([])
  const [searching, setSearching] = useState<string | null>(null)
  const [matchResults, setMatchResults] = useState<Record<string, MatchDetails>>({})
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState<string | null>(null)
  const { isManager, isAccountant } = useAuth()

  const [selectedTxForDocs, setSelectedTxForDocs] = useState<{ id: string; customerName: string } | null>(null)
  const [txDocs, setTxDocs] = useState<{ label: string; url: string; isImage: boolean; name: string }[]>([])
  const [loadingTxDocs, setLoadingTxDocs] = useState(false)
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null)
  const [rejectingTx, setRejectingTx] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // Load from Supabase
  const loadQueue = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id, car_price, created_at, status, verification_status, rejection_reason, customer_id,
          customers!inner(name, national_id, salary, workplaces(name, required_guarantors)),
          offices!inner(name)
        `)
        .eq('status', 'WAITING_MATCH')
        .order('created_at', { ascending: true })

      if (error) throw error
      
      if (data) {
        const formatted: WaitingTransaction[] = data.map((item: any) => ({
          id: item.id,
          customer_id: item.customer_id,
          customer_name: item.customers.name,
          customer_national_id: item.customers.national_id,
          office_name: item.offices.name,
          workplace_name: item.customers.workplaces?.name || '',
          salary: item.customers.salary,
          car_price: item.car_price,
          guarantors_needed: item.customers.workplaces?.required_guarantors || 1,
          current_guarantors: 0,
          created_at: item.created_at,
          verification_status: item.verification_status || 'verified', // Fallback to verified for old records
          rejection_reason: item.rejection_reason || ''
        }))
        setQueue(formatted)
      }
    } catch (err) {
      console.error('Error loading queue:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const verifyTransaction = async (transactionId: string) => {
    setVerifying(transactionId)
    try {
      const { error } = await supabase
        .from('transactions_raw')
        .update({ verification_status: 'verified' })
        .eq('id', transactionId)
        
      if (error) throw error
      loadQueue()
    } catch (err) {
      console.error('Error verifying transaction:', err)
      alert('حدث خطأ أثناء اعتماد المعاملة')
    } finally {
      setVerifying(null)
    }
  }
  const rejectTransaction = async (transactionId: string) => {
    if (!rejectReason.trim()) {
      alert('يرجى كتابة سبب الرفض')
      return
    }
    setVerifying(transactionId)
    try {
      const { error } = await supabase
        .from('transactions_raw')
        .update({ 
          verification_status: 'rejected',
          rejection_reason: rejectReason.trim()
        })
        .eq('id', transactionId)
        
      if (error) throw error
      setRejectingTx(null)
      setRejectReason('')
      loadQueue()
    } catch (err) {
      console.error('Error rejecting transaction:', err)
      alert('حدث خطأ أثناء رفض المعاملة')
    } finally {
      setVerifying(null)
    }
  }

  const fetchTxDocs = async (txId: string) => {
    setLoadingTxDocs(true)
    try {
      const { data: files, error } = await supabase.storage
        .from('transaction-docs')
        .list(txId)

      if (error) throw error

      if (files && files.length > 0) {
        const docKeys: Record<string, string> = {
          salary_cert: 'شهادة مرتب',
          birth_cert: 'شهادة ميلاد',
          bank_statement: 'كشف حساب بنكي',
          promissory_notes: 'كمبيالات',
          declaration: 'إقرار',
        }

        const formatted = files.map((file) => {
          const { data: { publicUrl } } = supabase.storage
            .from('transaction-docs')
            .getPublicUrl(`${txId}/${file.name}`)

          const prefix = file.name.split('-')[0]
          const label = docKeys[prefix] || 'مستند إضافي'
          const isImage = !file.name.toLowerCase().endsWith('.pdf')

          return {
            label,
            url: publicUrl,
            isImage,
            name: file.name.substring(prefix.length + 1)
          }
        })
        setTxDocs(formatted)
      } else {
        setTxDocs([])
      }
    } catch (err) {
      console.error('Error fetching tx docs:', err)
      setTxDocs([])
    } finally {
      setLoadingTxDocs(false)
    }
  }

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  useEffect(() => {
    if (selectedTxForDocs) {
      fetchTxDocs(selectedTxForDocs.id)
    } else {
      setTxDocs([])
    }
  }, [selectedTxForDocs])

  const attemptMatch = async (transactionId: string) => {
    setSearching(transactionId)
    try {
      const { data, error } = await supabase.rpc('attempt_auto_match', { 
        p_transaction_id: transactionId 
      })

      if (error) throw error

      if (data && data.success && (data.status === 'MATCHED' || data.matched > 0)) {
        // Fetch beneficiary (customer) details
        const { data: txData } = await supabase
          .from('transactions')
          .select('customer_id, customers(name, phone)')
          .eq('id', transactionId)
          .single()

        // Fetch guarantor details
        const { data: guarData } = await supabase
          .from('transaction_guarantors')
          .select('guarantor_name, guarantor_national_id')
          .eq('transaction_id', transactionId)
          .eq('match_status', 'CONFIRMED')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        let guarantorPhone = ''
        let guarantorId = ''
        if (guarData) {
          const { data: phoneData } = await supabase
            .from('customers')
            .select('id, phone')
            .eq('national_id', guarData.guarantor_national_id)
            .maybeSingle()
          
          if (phoneData) {
            guarantorPhone = phoneData.phone || ''
            guarantorId = phoneData.id
          }
        }

        const cust = txData?.customers
        const customerName = (Array.isArray(cust) ? cust[0]?.name : (cust as any)?.name) || ''
        const customerPhone = (Array.isArray(cust) ? cust[0]?.phone : (cust as any)?.phone) || ''
        const guarantorName = guarData?.guarantor_name || 'ضامن مطابق'

        const beneficiaryId = txData?.customer_id || queue.find(q => q.id === transactionId)?.customer_id

        setMatchResults(prev => ({
          ...prev,
          [transactionId]: {
            message: `✅ تم العثور على تطابق تلقائي بنجاح! الضامن: ${guarantorName}`,
            beneficiaryId,
            guarantorId
          }
        }))

        // Call the notification service
        try {
          await notificationService.sendMatchAlert(
            customerName,
            customerPhone,
            guarantorName,
            guarantorPhone || customerPhone
          )
        } catch (notifErr) {
          console.error('Failed to send WhatsApp match alerts:', notifErr)
        }

        loadQueue() // Refresh to reflect change
      } else {
        setMatchResults(prev => ({
          ...prev,
          [transactionId]: {
            message: 'ℹ️ لم يتم العثور على ضامن مطابق تلقائياً. تبقى المعاملة في قائمة الانتظار للمراجعة اليدوية.'
          }
        }))
      }
    } catch (err) {
      console.error('Error attempting auto match:', err)
      setMatchResults(prev => ({
        ...prev,
        [transactionId]: {
          message: '❌ حدث خطأ أثناء البحث عن تطابق. يرجى المحاولة لاحقاً.'
        }
      }))
    }
    setSearching(null)
  }

  const daysSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    return Math.floor(diff / 86400000)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div className="queue-container">
      <div className="form-header">
        <div className="form-icon-wrap" style={{ background: 'linear-gradient(135deg, var(--warning), hsl(28, 80%, 45%))' }}>
          <Clock size={24} />
        </div>
        <div>
          <h3>قائمة الانتظار</h3>
          <p className="calc-subtitle">{queue.length} معاملة في الانتظار</p>
        </div>
      </div>

      <div className="queue-list">
        {queue.map((item) => (
          <div key={item.id} className="queue-card">
            <div className="queue-card-header">
              <div className="queue-customer-info">
                <h4>{item.customer_name}</h4>
                <span className="queue-meta">{item.office_name} • {item.workplace_name}</span>
              </div>
              <div className="queue-badges">
                {item.verification_status === 'rejected' && (
                  <span className="badge badge-danger" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 'bold' }}>
                    مرفوضة
                  </span>
                )}
                <span className="badge badge-warning">
                  {daysSince(item.created_at)} يوم في الانتظار
                </span>
                <span className="badge badge-info">
                  {item.current_guarantors}/{item.guarantors_needed} ضامن
                </span>
              </div>
            </div>

            <div className="queue-card-details">
              <div className="queue-detail">
                <span className="queue-detail-label">صافي المرتب</span>
                <span className="queue-detail-value">{item.salary.toLocaleString('ar-LY')} د.ل</span>
              </div>
              <div className="queue-detail">
                <span className="queue-detail-label">الرقم الوطني</span>
                <span className="queue-detail-value mono">{item.customer_national_id}</span>
              </div>
            </div>

            {item.verification_status === 'rejected' && item.rejection_reason && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px dashed rgba(239, 68, 68, 0.25)',
                borderRadius: '8px',
                padding: '0.6rem 0.8rem',
                marginTop: '0.5rem',
                fontSize: '0.82rem',
                color: '#f87171',
                width: '100%',
                lineHeight: '1.4',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem'
              }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>سبب الرفض:</span>
                <span>{item.rejection_reason}</span>
              </div>
            )}

            <div className="queue-card-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', marginTop: '1rem' }}>
              {/* Document Review Action */}
              <button
                className="btn btn-outline btn-sm w-full"
                onClick={() => setSelectedTxForDocs({ id: item.id, customerName: item.customer_name })}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', border: '1px solid rgba(191, 149, 63, 0.4)', color: 'var(--primary)', padding: '0.5rem' }}
              >
                <FileCheck size={14} />
                <span>عرض المستندات المرفوعة</span>
              </button>

              {item.verification_status === 'rejected' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    color: '#f87171',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    justifyContent: 'center'
                  }}>
                    <AlertCircle size={14} />
                    <span>تم رفض مستندات هذه المعاملة</span>
                  </div>
                  <button
                    className="btn btn-primary btn-sm w-full"
                    disabled={true}
                    style={{ opacity: 0.5 }}
                    title="المستندات مرفوضة ولا يمكن مطابقة المعاملة"
                  >
                    بحث عن ضامن
                  </button>
                </div>
              ) : item.verification_status === 'pending' ? (
                <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => verifyTransaction(item.id)}
                    disabled={verifying === item.id || (!isManager && !isAccountant)}
                    title={(!isManager && !isAccountant) ? "صلاحية اعتماد المستندات محصورة للمدير والمحاسب" : "اعتماد المستندات"}
                    style={{ flex: 1 }}
                  >
                    {verifying === item.id ? 'جاري الاعتماد...' : 'اعتماد المستندات'}
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      setRejectingTx(item.id)
                      setRejectReason('')
                    }}
                    disabled={verifying === item.id || (!isManager && !isAccountant)}
                    title={(!isManager && !isAccountant) ? "صلاحية رفض المستندات محصورة للمدير والمحاسب" : "رفض المستندات"}
                    style={{ flex: 1, background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 'bold' }}
                  >
                    رفض
                  </button>
                </div>
              ) : (
                <button
                  className="btn btn-primary btn-sm w-full"
                  onClick={() => attemptMatch(item.id)}
                  disabled={searching === item.id}
                >
                  {searching === item.id ? (
                    <><RefreshCw size={14} className="spin" /> جاري البحث...</>
                  ) : (
                    <><Search size={14} /> بحث عن ضامن</>
                  )}
                </button>
              )}
            </div>

            {matchResults[item.id] && (
              <div 
                className={`queue-match-result ${matchResults[item.id].message.includes('تم العثور') ? 'success' : 'info'}`}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-start', padding: '1rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {matchResults[item.id].message.includes('تم العثور') ? (
                    <CheckCircle size={16} style={{ flexShrink: 0 }} />
                  ) : (
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  )}
                  <span>{matchResults[item.id].message}</span>
                </div>
                
                {matchResults[item.id].beneficiaryId && matchResults[item.id].guarantorId && onGoToCalculator && (
                  <button
                    type="button"
                    onClick={() => onGoToCalculator!(matchResults[item.id].beneficiaryId!, matchResults[item.id].guarantorId!)}
                    style={{
                      background: 'linear-gradient(135deg, #bf953f 0%, #aa771c 100%)',
                      color: '#0f172a',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.45rem 1rem',
                      fontWeight: 'bold',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      marginTop: '0.25rem',
                      boxShadow: '0 4px 10px rgba(170, 119, 28, 0.25)',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                    className="action-btn-hover"
                  >
                    <span>اعتماد الحساب المالي الجديد 📊</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {queue.length === 0 && (
          <div className="results-empty">
            <Zap size={48} strokeWidth={1} />
            <p>لا توجد معاملات في قائمة الانتظار</p>
          </div>
        )}
      </div>

      {/* Document Viewer Overlay Modal */}
      {selectedTxForDocs && (
        <div className="lightbox-overlay" onClick={() => setSelectedTxForDocs(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--glass-border)', minWidth: '320px', maxWidth: '550px', width: '90%', cursor: 'default' }}>
            <button className="lightbox-close" onClick={() => setSelectedTxForDocs(null)} style={{ top: '15px', right: '15px' }}>
              <X size={20} /> إغلاق
            </button>

            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', width: '100%' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileCheck size={22} style={{ color: 'var(--primary)' }} />
                <span>المستندات المرفوعة للمعاملة</span>
              </h3>
              <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.88rem', color: 'var(--text-tertiary)' }}>
                للزبون: <strong style={{ color: 'var(--text-primary)' }}>{selectedTxForDocs.customerName}</strong>
              </p>
            </div>

            {loadingTxDocs ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem', width: '100%' }}>
                <RefreshCw size={36} className="spin" style={{ color: 'var(--primary)' }} />
                <span style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>جاري جلب المستندات...</span>
              </div>
            ) : txDocs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)', border: '1px dashed var(--glass-border)', borderRadius: '12px', width: '100%' }}>
                لم يتم رفع أي مستندات لهذه المعاملة بعد.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', width: '100%', maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {txDocs.map((doc, index) => (
                  <div 
                    key={index}
                    style={{
                      background: 'var(--surface-hover)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '12px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></div>
                        <span style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{doc.label}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', direction: 'ltr', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{doc.name}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {doc.isImage ? (
                        <div 
                          className="preview-thumbnail-container"
                          onClick={() => setSelectedPreviewImage(doc.url)}
                          style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)', cursor: 'zoom-in', width: '64px', height: '64px' }}
                        >
                          <img 
                            src={doc.url} 
                            alt={doc.label} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div className="preview-thumbnail-hover" style={{ fontSize: '0.7rem' }}>معاينة</div>
                        </div>
                      ) : (
                        <div style={{ width: '64px', height: '64px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                          <FileText size={28} />
                        </div>
                      )}

                      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <a 
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline"
                          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}
                        >
                          تحميل / فتح
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Embedded Lightbox for Image Preview within Modal */}
      {selectedPreviewImage && (
        <div className="lightbox-overlay" onClick={() => setSelectedPreviewImage(null)} style={{ zIndex: 100000 }}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setSelectedPreviewImage(null)}>
              <X size={20} /> إغلاق المعاينة
            </button>
            <img src={selectedPreviewImage} alt="معاينة المستند" className="lightbox-img" />
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectingTx && (
        <div className="lightbox-overlay" onClick={() => setRejectingTx(null)} style={{ zIndex: 100000 }}>
          <div 
            className="lightbox-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              background: 'var(--navy-950)', 
              padding: '2rem', 
              borderRadius: '16px', 
              border: '1px solid rgba(239, 68, 68, 0.25)', 
              minWidth: '320px', 
              maxWidth: '480px', 
              width: '90%', 
              cursor: 'default',
              boxShadow: '0 10px 25px rgba(239, 68, 68, 0.05)'
            }}
          >
            <button className="lightbox-close" onClick={() => setRejectingTx(null)} style={{ top: '15px', right: '15px' }}>
              <X size={20} /> إلغاء
            </button>

            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', width: '100%' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={22} />
                <span>سبب رفض مستندات المعاملة</span>
              </h3>
              <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.88rem', color: 'var(--text-tertiary)' }}>
                يرجى توضيح سبب رفض هذه المستندات ليتمكن موظف الفرع من مراجعتها وتعديلها.
              </p>
            </div>

            <div style={{ width: '100%', marginBottom: '1.5rem' }}>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="اكتب سبب الرفض بالتفصيل هنا..."
                style={{
                  width: '100%',
                  height: '120px',
                  padding: '0.8rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit',
                  textAlign: 'right'
                }}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => rejectTransaction(rejectingTx)}
                disabled={verifying === rejectingTx}
                style={{ flex: 1, padding: '0.65rem 1rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {verifying === rejectingTx ? 'جاري الرفض...' : 'تأكيد الرفض'}
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setRejectingTx(null)}
                style={{ flex: 1, padding: '0.65rem 1rem', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', borderRadius: '8px', background: 'transparent', fontWeight: 'bold', cursor: 'pointer' }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
