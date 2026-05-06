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
  current_guarantors: number
  created_at: string
}

// Demo data for display (since we don't have live auth yet)
const DEMO_QUEUE: WaitingTransaction[] = [
  {
    id: 'demo-1',
    customer_name: 'أحمد محمد علي',
    customer_national_id: '119xxxxxxx01',
    office_name: 'مكتب النجم',
    workplace_name: 'وزارة الداخلية',
    salary: 2800,
    car_price: 95000,
    guarantors_needed: 1,
    current_guarantors: 0,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'demo-2',
    customer_name: 'خالد عبدالله السنوسي',
    customer_national_id: '119xxxxxxx02',
    office_name: 'مكتب الثقة',
    workplace_name: 'وزارة التعليم',
    salary: 3100,
    car_price: 110000,
    guarantors_needed: 2,
    current_guarantors: 1,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'demo-3',
    customer_name: 'محمود صالح بن عيسى',
    customer_national_id: '119xxxxxxx03',
    office_name: 'مكتب النجم',
    workplace_name: 'وزارة الداخلية',
    salary: 2750,
    car_price: 85000,
    guarantors_needed: 1,
    current_guarantors: 0,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
]

export default function WaitingQueue() {
  const [queue, _setQueue] = useState<WaitingTransaction[]>(DEMO_QUEUE)
  const [searching, setSearching] = useState<string | null>(null)
  const [matchResults, setMatchResults] = useState<Record<string, string>>({})

  // Load from Supabase (when auth is wired up)
  const loadQueue = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('transactions')
        .select(`
          id, car_price, guarantors_needed, created_at, status,
          customers!inner(name, national_id, salary, workplaces(name)),
          offices!inner(name)
        `)
        .eq('status', 'WAITING_MATCH')
        .order('created_at', { ascending: true })

      if (data && data.length > 0) {
        // If we have real data, use it; otherwise keep demo
        // This would be mapped properly once auth is live
      }
    } catch {
      // Silently fall back to demo data
    }
  }, [])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  const attemptMatch = async (transactionId: string) => {
    setSearching(transactionId)
    // Simulate matching delay for demo
    await new Promise((r) => setTimeout(r, 1500))

    // In production: const { data } = await supabase.rpc('attempt_auto_match', { p_transaction_id: transactionId })
    const item = queue.find((q) => q.id === transactionId)
    if (item) {
      // Demo: check if there's another customer from same workplace with salary diff <= 50
      const potentialMatch = queue.find(
        (q) =>
          q.id !== transactionId &&
          q.workplace_name === item.workplace_name &&
          Math.abs(q.salary - item.salary) <= 50
      )

      if (potentialMatch) {
        setMatchResults((prev) => ({
          ...prev,
          [transactionId]: `تم العثور على تطابق! الضامن المحتمل: ${potentialMatch.customer_name} (فارق المرتب: ${Math.abs(potentialMatch.salary - item.salary)} د.ل)`,
        }))
      } else {
        setMatchResults((prev) => ({
          ...prev,
          [transactionId]: 'لم يتم العثور على ضامن مطابق. يبقى في قائمة الانتظار.',
        }))
      }
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
                <span className="queue-detail-label">سعر السيارة</span>
                <span className="queue-detail-value">{item.car_price.toLocaleString('ar-LY')} د.ل</span>
              </div>
              <div className="queue-detail">
                <span className="queue-detail-label">الرقم الوطني</span>
                <span className="queue-detail-value mono">{item.customer_national_id}</span>
              </div>
            </div>

            <div className="queue-card-actions">
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
