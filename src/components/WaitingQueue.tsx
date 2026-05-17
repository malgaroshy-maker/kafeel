import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Clock, Search, CheckCircle, AlertCircle, RefreshCw, Zap } from 'lucide-react'

interface WaitingTransaction {
  id: string
  customer_name: string
  customer_national_id: string
  office_name: string
  workplace_name: string
  salary: number
  car_price: number
  guarantors_needed: number
  guarantors_needed: number
  current_guarantors: number
  created_at: string
  verification_status?: string
}

// Types stay the same

export default function WaitingQueue() {
  const [queue, setQueue] = useState<WaitingTransaction[]>([])
  const [searching, setSearching] = useState<string | null>(null)
  const [matchResults, setMatchResults] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState<string | null>(null)
  const { isManager, isAccountant } = useAuth()

  // Load from Supabase (when auth is wired up)
  const loadQueue = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id, car_price, created_at, status, verification_status,
          customers!inner(name, national_id, salary, workplaces(name, required_guarantors)),
          offices!inner(name)
        `)
        .eq('status', 'WAITING_MATCH')
        .order('created_at', { ascending: true })

      if (error) throw error
      
      if (data) {
        const formatted: WaitingTransaction[] = data.map((item: any) => ({
          id: item.id,
          customer_name: item.customers.name,
          customer_national_id: item.customers.national_id,
          office_name: item.offices.name,
          workplace_name: item.customers.workplaces?.name || '',
          salary: item.customers.salary,
          car_price: item.car_price,
          guarantors_needed: item.customers.workplaces?.required_guarantors || 1,
          current_guarantors: 0,
          created_at: item.created_at,
          verification_status: item.verification_status || 'verified' // Fallback to verified for old records
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
        .from('transactions')
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

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  const attemptMatch = async (transactionId: string) => {
    setSearching(transactionId)
    try {
      const { data, error } = await supabase.rpc('attempt_auto_match', { 
        p_transaction_id: transactionId 
      })

      if (error) throw error

      if (data && data.match_found) {
        setMatchResults(prev => ({
          ...prev,
          [transactionId]: `✅ تم العثور على تطابق تلقائي بنجاح! الضامن: ${data.guarantor_name}`
        }))
        loadQueue() // Refresh to reflect change
      } else {
        setMatchResults(prev => ({
          ...prev,
          [transactionId]: 'ℹ️ لم يتم العثور على ضامن مطابق تلقائياً. تبقى المعاملة في قائمة الانتظار للمراجعة اليدوية.'
        }))
      }
    } catch (err) {
      console.error('Error attempting auto match:', err)
      setMatchResults(prev => ({
        ...prev,
        [transactionId]: '❌ حدث خطأ أثناء البحث عن تطابق. يرجى المحاولة لاحقاً.'
      }))
    }
    setSearching(null)
  }

  const daysSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    return Math.floor(diff / 86400000)
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
                <span className="queue-detail-label">المرتب</span>
                <span className="queue-detail-value">{item.salary.toLocaleString('ar-LY')} د.ل</span>
              </div>
              <div className="queue-detail">
                <span className="queue-detail-label">الرقم الوطني</span>
                <span className="queue-detail-value mono">{item.customer_national_id}</span>
              </div>
            </div>

            <div className="queue-card-actions">
              {item.verification_status === 'pending' ? (
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
                    className="btn btn-primary btn-sm"
                    disabled={true}
                    style={{ opacity: 0.5, flex: 1 }}
                    title="يجب اعتماد المستندات أولاً"
                  >
                    بحث عن ضامن
                  </button>
                </div>
              ) : (
                <button
                  className="btn btn-primary btn-sm"
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
              <div className={`queue-match-result ${matchResults[item.id].includes('تم العثور') ? 'success' : 'info'}`}>
                {matchResults[item.id].includes('تم العثور') ? (
                  <CheckCircle size={16} />
                ) : (
                  <AlertCircle size={16} />
                )}
                <span>{matchResults[item.id]}</span>
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
    </div>
  )
}
