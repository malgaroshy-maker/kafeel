import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Search, User, Phone, Building2, Calculator as CalcIcon, Pencil, Trash2, FileText, Clock } from 'lucide-react'

interface Customer {
  id: string
  name: string
  national_id: string
  phone: string
  salary: number
  workplace: {
    name: string
  }
  hasActiveTransaction: boolean
  transactionStatus?: string | null
}

interface Props {
  onSelect?: (customerId: string) => void
  onEdit?: (customer: Customer) => void
  onDelete?: (customerId: string) => void
  onDocuments?: (customerId: string) => void
  onSendToQueue?: (customerId: string) => void
}

export default function CustomerList({ onSelect, onEdit, onDocuments, onSendToQueue }: Props) {
  const { officeId, isManager, isAccountant } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendingToQueue, setSendingToQueue] = useState<string | null>(null)

  useEffect(() => {
    fetchCustomers()
  }, [officeId])

  const fetchCustomers = async () => {
    if (!officeId) return
    setLoading(true)
    
    // Fetch customers
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        workplace:workplace_id (name)
      `)
      .eq('office_id', officeId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      // Fetch latest transaction for these customers (all statuses)
      const customerIds = data.map(c => c.id)
      const { data: txData } = await supabase
        .from('transactions')
        .select('customer_id, status, verification_status, created_at')
        .in('customer_id', customerIds)
        .order('created_at', { ascending: false })

      // Build a map of customer_id -> latest transaction details
      const customerTxMap = new Map<string, { status: string; verificationStatus: string | null }>()
      txData?.forEach(t => {
        if (!customerTxMap.has(t.customer_id)) {
          customerTxMap.set(t.customer_id, {
            status: t.status,
            verificationStatus: t.verification_status || null
          })
        }
      })

      setCustomers(data.map(c => {
        const tx = customerTxMap.get(c.id)
        return {
          ...c,
          hasActiveTransaction: tx && ['WAITING_MATCH', 'MATCHED', 'ACTIVE'].includes(tx.status),
          transactionStatus: tx ? (tx.verificationStatus === 'rejected' ? 'REJECTED' : tx.status) : null
        }
      }) as any)
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الزبون؟')) return
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) alert('خطأ في الحذف')
    else fetchCustomers()
  }

  const handleSendToQueue = async (customer: Customer) => {
    setSendingToQueue(customer.id)
    try {
      // Check for existing active transaction
      const { data: existingTx } = await supabase
        .from('transactions')
        .select('id')
        .eq('customer_id', customer.id)
        .in('status', ['WAITING_MATCH', 'MATCHED', 'ACTIVE'])
        .limit(1)

      if (existingTx && existingTx.length > 0) {
        alert('هذا الزبون لديه معاملة قائمة بالفعل')
        return
      }

      // Create WAITING_MATCH transaction
      const { error } = await supabase
        .from('transactions')
        .insert({
          office_id: officeId,
          customer_id: customer.id,
          workplace_id: (customer as any).workplace_id || null,
          guarantors_needed: 1,
          status: 'WAITING_MATCH'
        })

      if (error) throw error

      alert('✅ تم إرسال الزبون لقائمة الانتظار بنجاح')
      fetchCustomers() // Refresh to update button visibility
      
      if (onSendToQueue) onSendToQueue(customer.id)
    } catch (err) {
      console.error(err)
      alert('حدث خطأ أثناء الإرسال لقائمة الانتظار')
    } finally {
      setSendingToQueue(null)
    }
  }

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.national_id.includes(searchTerm) ||
    c.phone?.includes(searchTerm)
  )

  return (
    <div className="customer-list-container glass" style={{ padding: '2rem', borderRadius: '20px', border: '1px solid rgba(191, 149, 63, 0.22)', background: 'var(--surface-card)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)' }}>
      
      {/* Header Block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #bf953f 0%, #aa771c 100%)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(170, 119, 28, 0.25)' }}>
            <User size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              الزبائن الحاليين
              <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(191, 149, 63, 0.3)', color: 'var(--primary)', fontWeight: 'bold', background: 'var(--surface-hover)', marginRight: '0.5rem' }}>
                {filtered.length} زبون
              </span>
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
              إدارة وتصفح ملفات الزبائن الحاليين المسجلين بشكل كامل في المنظومة وإرسالهم للحاسبة أو الانتظار
            </p>
          </div>
        </div>
        
        {/* Search Box */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="ابحث بالاسم، الهوية، أو الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 2.8rem 0.75rem 1rem',
              borderRadius: '10px',
              border: '1px solid rgba(191, 149, 63, 0.3)',
              background: 'var(--surface-hover)',
              color: 'var(--text-primary)',
              fontSize: '0.88rem',
              outline: 'none',
              transition: 'all 0.3s ease',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
            }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
          <div className="spinner" style={{ width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-tertiary)', border: '1px dashed var(--glass-border)', borderRadius: '12px', background: 'var(--surface-hover)' }}>
          لا توجد سجلات زبائن مسجلة تطابق بحثك حالياً.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filtered.map(customer => (
            <div 
              key={customer.id} 
              className="customer-card-premium"
              style={{
                background: 'var(--surface-hover)',
                border: '1px solid var(--glass-border)',
                borderRadius: '14px',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '280px' }}>
                <div style={{ 
                  background: 'linear-gradient(135deg, rgba(191,149,63,0.1) 0%, rgba(170,119,28,0.03) 100%)', 
                  width: '46px', 
                  height: '46px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'var(--primary)',
                  border: '1px solid rgba(191,149,63,0.2)',
                  flexShrink: 0
                }}>
                  <User size={20} />
                </div>
                
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{customer.name}</span>
                    {customer.transactionStatus && (() => {
                      const statusConfig: Record<string, { bg: string; color: string; border: string; label: string; animate?: boolean }> = {
                        'PENDING': { bg: 'rgba(107, 114, 128, 0.12)', color: '#9ca3af', border: '1px solid rgba(107, 114, 128, 0.25)', label: 'مسودة' },
                        'WAITING_MATCH': { bg: 'rgba(217, 119, 6, 0.12)', color: '#fbbf24', border: '1px solid rgba(217, 119, 6, 0.25)', label: 'في الانتظار', animate: true },
                        'REJECTED': { bg: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)', label: 'مستندات مرفوضة' },
                        'MATCHED': { bg: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.25)', label: 'تم التطابق' },
                        'ACTIVE': { bg: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.25)', label: 'نشطة' },
                        'COMPLETED': { bg: 'rgba(191, 149, 63, 0.12)', color: '#d4af37', border: '1px solid rgba(191, 149, 63, 0.25)', label: 'مكتملة' },
                      }
                      const cfg = statusConfig[customer.transactionStatus] || statusConfig['PENDING']
                      return (
                        <span 
                          style={{ 
                            background: cfg.bg, 
                            color: cfg.color, 
                            border: cfg.border, 
                            fontSize: '0.72rem', 
                            fontWeight: 'bold', 
                            padding: '0.2rem 0.6rem', 
                            borderRadius: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            ...(cfg.animate ? { animation: 'pulse 2s infinite' } : {})
                          }}
                        >
                          <Clock size={11} />
                          {cfg.label}
                        </span>
                      )
                    })()}
                  </div>
                  
                  {/* Chips row */}
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--surface-card)', padding: '0.25rem 0.6rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                      <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>الهوية:</span>
                      <span style={{ fontFamily: 'monospace' }}>{customer.national_id}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--surface-card)', padding: '0.25rem 0.6rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                      <Phone size={11} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                      <span>{customer.phone || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--surface-card)', padding: '0.25rem 0.6rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                      <Building2 size={11} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                      <span style={{ fontWeight: '500' }}>{customer.workplace?.name || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {!customer.hasActiveTransaction && (
                  <button 
                    style={{ 
                      background: 'rgba(217, 119, 6, 0.1)', 
                      color: 'var(--warning)', 
                      border: '1px solid rgba(217, 119, 6, 0.25)', 
                      fontSize: '0.78rem',
                      padding: '0.45rem 0.9rem',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => handleSendToQueue(customer)}
                    disabled={sendingToQueue === customer.id}
                    title="إرسال لقائمة الانتظار لبدء المطابقة"
                    className="action-btn-hover"
                  >
                    <Clock size={13} />
                    <span>{sendingToQueue === customer.id ? 'جاري الإرسال...' : 'بدء المعاملة'}</span>
                  </button>
                )}
                
                <button 
                  style={{
                    background: 'var(--surface-card)',
                    color: 'var(--primary)',
                    border: '1px solid rgba(191,149,63,0.25)',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => onDocuments && onDocuments(customer.id)}
                  title="إدارة المستندات المرفوعة"
                  className="action-btn-hover"
                >
                  <FileText size={15} />
                </button>
                
                {!isAccountant && (
                  <button 
                    style={{
                      background: 'rgba(16, 185, 129, 0.08)',
                      color: 'var(--success-color)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      padding: '0.5rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => onEdit && onEdit(customer)}
                    title="تعديل بيانات الزبون"
                    className="action-btn-hover"
                  >
                    <Pencil size={15} />
                  </button>
                )}
                
                {isManager && (
                  <button 
                    style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      color: 'var(--error)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      padding: '0.5rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => handleDelete(customer.id)}
                    title="حذف الزبون نهائياً"
                    className="action-btn-hover"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
                
                <button 
                  style={{
                    background: 'linear-gradient(135deg, #bf953f 0%, #aa771c 100%)',
                    color: '#0f172a',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.78rem',
                    boxShadow: '0 2px 6px rgba(170, 119, 28, 0.15)',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => onSelect && onSelect(customer.id)}
                  className="action-btn-hover"
                >
                  <CalcIcon size={14} style={{ color: '#0f172a' }} />
                  <span>الحاسبة</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Premium Micro-Styles for Interactive Hover States */}
      <style>{`
        .customer-card-premium:hover {
          border-color: #bf953f !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(191, 149, 63, 0.12) !important;
          background: rgba(191, 149, 63, 0.02) !important;
        }
        .action-btn-hover:hover {
          filter: brightness(1.1);
          transform: scale(1.05);
          box-shadow: 0 4px 10px rgba(191, 149, 63, 0.15);
        }
        .customer-list-container input:focus {
          border-color: #bf953f !important;
          box-shadow: 0 0 10px rgba(191, 149, 63, 0.25) !important;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.65; }
        }
      `}</style>

    </div>
  )
}
