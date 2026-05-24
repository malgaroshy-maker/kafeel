import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Search, User, Phone, Building2, Calculator as CalcIcon, Pencil, Trash2, FileText, Clock, Receipt, Printer, CheckCircle2, X, Car } from 'lucide-react'
import { maskPhone } from '../utils/masking'

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
  const { officeId, isManager, isAccountant, isAdmin, role } = useAuth()
  const showFullPhone = isManager || isAccountant || isAdmin || role === 'admin';
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendingToQueue, setSendingToQueue] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<'current' | 'completed'>('current')
  const [currentFilter, setCurrentFilter] = useState<'ALL' | 'WAITING_MATCH' | 'MATCHED' | 'ACTIVE' | 'REJECTED'>('ALL')
  const [completedFilter, setCompletedFilter] = useState<'ALL' | 'PERSONAL_USE' | 'CASH_OUT' | 'EXTERNAL_SALE'>('ALL')
  const [completedTxs, setCompletedTxs] = useState<any[]>([])
  const [selectedTx, setSelectedTx] = useState<any>(null)
  const [showExitPassModal, setShowExitPassModal] = useState(false)
  const [showClearPassModal, setShowClearPassModal] = useState(false)
  const [showTxDetailsModal, setShowTxDetailsModal] = useState(false)
  const [showStatementModal, setShowStatementModal] = useState(false)

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const highlightText = (text: string | null | undefined, search: string) => {
    if (!text) return <span>—</span>;
    if (!search.trim()) return <span>{text}</span>;
    
    try {
      const escapedSearch = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const regex = new RegExp(`(${escapedSearch})`, 'gi');
      const parts = text.split(regex);
      
      return (
        <>
          {parts.map((part, i) => 
            regex.test(part) ? (
              <mark key={i} style={{ background: 'rgba(191, 149, 63, 0.35)', color: 'var(--primary)', padding: '0 2px', borderRadius: '4px', fontWeight: 'bold' }}>{part}</mark>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </>
      );
    } catch (e) {
      return <span>{text}</span>;
    }
  }

  useEffect(() => {
    fetchCustomers()
    fetchCompletedTxs()
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

  const fetchCompletedTxs = async () => {
    if (!officeId) return
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          customer:customers (
            id,
            name,
            national_id,
            phone,
            salary,
            workplace:workplaces (
              name
            )
          ),
          settlements (
            *
          ),
          transaction_guarantors (
            *
          )
        `)
        .eq('office_id', officeId)
        .eq('status', 'COMPLETED')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setCompletedTxs(data as any[])
      }
    } catch (err) {
      console.error('Error fetching completed transactions:', err)
    }
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

  const filtered = customers.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.national_id.includes(searchTerm) ||
      c.phone?.includes(searchTerm) ||
      c.workplace?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.salary?.toString().includes(searchTerm);
      
    if (!matchesSearch) return false;
    if (currentFilter === 'ALL') return true;
    return c.transactionStatus === currentFilter;
  })

  const filteredCompletedTxs = completedTxs.filter(tx => {
    const matchesSearch = 
      tx.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.customer?.national_id.includes(searchTerm) ||
      tx.customer?.phone?.includes(searchTerm) ||
      tx.car_model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.customer?.workplace?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.settlements?.[0]?.net_cash?.toString().includes(searchTerm);
      
    if (!matchesSearch) return false;
    if (completedFilter === 'ALL') return true;
    return tx.settlements?.[0]?.settlement_type === completedFilter;
  })

  return (
    <div className="customer-list-container glass" style={{ padding: '2rem', borderRadius: '20px', border: '1px solid rgba(191, 149, 63, 0.22)', background: 'var(--surface-card)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)' }}>
      
      {/* Header Block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #bf953f 0%, #aa771c 100%)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(170, 119, 28, 0.25)' }}>
            {activeTab === 'current' ? <User size={22} /> : <Receipt size={22} />}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {activeTab === 'current' ? 'الزبائن الحاليين' : 'المعاملات المكتملة'}
              <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(191, 149, 63, 0.3)', color: 'var(--primary)', fontWeight: 'bold', background: 'var(--surface-hover)', marginRight: '0.5rem' }}>
                {activeTab === 'current' ? `${filtered.length} زبون` : `${filteredCompletedTxs.length} معاملة`}
              </span>
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
              {activeTab === 'current' 
                ? 'إدارة وتصفح ملفات الزبائن الحاليين المسجلين بشكل كامل في المنظومة وإرسالهم للحاسبة أو الانتظار'
                : 'استعراض كافّة المعاملات المالية والتسويات اللوجستية التي تم إغلاقها واكتمالها بنجاح مع إصدار التقارير الرسمية'}
            </p>
          </div>
        </div>
        
        {/* Search Box */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder={activeTab === 'current' ? "ابحث بالاسم، الهوية، أو الهاتف..." : "ابحث بالاسم، الهوية، أو الموديل..."}
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

      {/* Premium Segmented Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid rgba(191, 149, 63, 0.15)', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={() => { setActiveTab('current'); setSearchTerm(''); }}
          style={{
            background: activeTab === 'current' ? 'linear-gradient(135deg, #bf953f 0%, #aa771c 100%)' : 'transparent',
            color: activeTab === 'current' ? '#0f172a' : 'var(--text-secondary)',
            border: activeTab === 'current' ? 'none' : '1px solid var(--glass-border)',
            padding: '0.55rem 1.2rem',
            borderRadius: '10px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: activeTab === 'current' ? '0 4px 12px rgba(170, 119, 28, 0.2)' : 'none'
          }}
        >
          <User size={14} />
          <span>قائمة الزبائن المسجلين</span>
        </button>
        <button
          onClick={() => { setActiveTab('completed'); setSearchTerm(''); fetchCompletedTxs(); }}
          style={{
            background: activeTab === 'completed' ? 'linear-gradient(135deg, #bf953f 0%, #aa771c 100%)' : 'transparent',
            color: activeTab === 'completed' ? '#0f172a' : 'var(--text-secondary)',
            border: activeTab === 'completed' ? 'none' : '1px solid var(--glass-border)',
            padding: '0.55rem 1.2rem',
            borderRadius: '10px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: activeTab === 'completed' ? '0 4px 12px rgba(170, 119, 28, 0.2)' : 'none'
          }}
        >
          <CheckCircle2 size={14} />
          <span>أرشيف المعاملات المكتملة</span>
        </button>
      </div>
      
      {/* Dynamic Sub-Filters for Current Customers */}
      {activeTab === 'current' && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.8rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginLeft: '0.5rem', fontWeight: 'bold' }}>حالة المعاملة:</span>
          {[
            { id: 'ALL', label: 'الكل', count: customers.length },
            { id: 'WAITING_MATCH', label: 'في الانتظار ⏳', count: customers.filter(c => c.transactionStatus === 'WAITING_MATCH').length },
            { id: 'MATCHED', label: 'تم التطابق 🤝', count: customers.filter(c => c.transactionStatus === 'MATCHED').length },
            { id: 'ACTIVE', label: 'نشطة 💸', count: customers.filter(c => c.transactionStatus === 'ACTIVE').length },
            { id: 'REJECTED', label: 'مستندات مرفوضة ❌', count: customers.filter(c => c.transactionStatus === 'REJECTED').length }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setCurrentFilter(opt.id as any)}
              style={{
                background: currentFilter === opt.id ? 'rgba(191, 149, 63, 0.15)' : 'var(--surface-hover)',
                color: currentFilter === opt.id ? 'var(--primary)' : 'var(--text-secondary)',
                border: `1px solid ${currentFilter === opt.id ? 'var(--primary)' : 'var(--glass-border)'}`,
                padding: '0.35rem 0.8rem',
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.2s ease',
                boxShadow: currentFilter === opt.id ? '0 2px 8px rgba(191, 149, 63, 0.08)' : 'none'
              }}
              className="chip-hover-premium"
            >
              <span>{opt.label}</span>
              <span style={{ fontSize: '0.68rem', padding: '0.05rem 0.35rem', borderRadius: '4px', background: currentFilter === opt.id ? 'rgba(191, 149, 63, 0.25)' : 'rgba(255,255,255,0.06)', color: currentFilter === opt.id ? 'var(--primary)' : 'var(--text-tertiary)' }}>{opt.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Dynamic Sub-Filters for Completed Transactions */}
      {activeTab === 'completed' && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.8rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginLeft: '0.5rem', fontWeight: 'bold' }}>نوع التسوية المالية:</span>
          {[
            { id: 'ALL', label: 'الكل', count: completedTxs.length },
            { id: 'PERSONAL_USE', label: 'استعمال شخصي 🚗', count: completedTxs.filter(tx => tx.settlements?.[0]?.settlement_type === 'PERSONAL_USE').length },
            { id: 'CASH_OUT', label: 'تسييل للمكتب 💰', count: completedTxs.filter(tx => tx.settlements?.[0]?.settlement_type === 'CASH_OUT').length },
            { id: 'EXTERNAL_SALE', label: 'بيع خارجي 🛒', count: completedTxs.filter(tx => tx.settlements?.[0]?.settlement_type === 'EXTERNAL_SALE').length }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setCompletedFilter(opt.id as any)}
              style={{
                background: completedFilter === opt.id ? 'rgba(191, 149, 63, 0.15)' : 'var(--surface-hover)',
                color: completedFilter === opt.id ? 'var(--primary)' : 'var(--text-secondary)',
                border: `1px solid ${completedFilter === opt.id ? 'var(--primary)' : 'var(--glass-border)'}`,
                padding: '0.35rem 0.8rem',
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.2s ease',
                boxShadow: completedFilter === opt.id ? '0 2px 8px rgba(191, 149, 63, 0.08)' : 'none'
              }}
              className="chip-hover-premium"
            >
              <span>{opt.label}</span>
              <span style={{ fontSize: '0.68rem', padding: '0.05rem 0.35rem', borderRadius: '4px', background: completedFilter === opt.id ? 'rgba(191, 149, 63, 0.25)' : 'rgba(255,255,255,0.06)', color: completedFilter === opt.id ? 'var(--primary)' : 'var(--text-tertiary)' }}>{opt.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Premium Analytics Strip */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
        gap: '1rem', 
        marginBottom: '2rem' 
      }}>
        <div className="analytics-card-premium" style={{
          background: 'linear-gradient(135deg, rgba(191,149,63,0.08) 0%, rgba(170,119,28,0.02) 100%)',
          border: '1px solid rgba(191,149,63,0.22)',
          padding: '1rem 1.25rem',
          borderRadius: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          transition: 'all 0.3s ease'
        }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>إجمالي الزبائن المسجلين</span>
          <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>{customers.length}</span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>زبائن مسجلين بالمنظومة</span>
        </div>

        <div className="analytics-card-premium" style={{
          background: 'linear-gradient(135deg, rgba(217,119,6,0.08) 0%, rgba(217,119,6,0.02) 100%)',
          border: '1px solid rgba(217,119,6,0.22)',
          padding: '1rem 1.25rem',
          borderRadius: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          transition: 'all 0.3s ease'
        }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--warning)', fontWeight: 'bold' }}>المعاملات النشطة حالياً</span>
          <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--warning)' }}>{customers.filter(c => c.hasActiveTransaction).length}</span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>معاملات نشطة قيد المطابقة والتجهيز</span>
        </div>

        <div className="analytics-card-premium" style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.02) 100%)',
          border: '1px solid rgba(16,185,129,0.22)',
          padding: '1rem 1.25rem',
          borderRadius: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          transition: 'all 0.3s ease'
        }}>
          <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 'bold' }}>المعاملات المكتملة</span>
          <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10b981' }}>{completedTxs.length}</span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>معاملات منتهية ومغلقة بالأرشيف</span>
        </div>

        <div className="analytics-card-premium" style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0.02) 100%)',
          border: '1px solid rgba(59,130,246,0.22)',
          padding: '1rem 1.25rem',
          borderRadius: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          transition: 'all 0.3s ease'
        }}>
          <span style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 'bold' }}>صافي التدفق النقدي للأرباح</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#60a5fa', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {completedTxs.reduce((sum, tx) => sum + (tx.settlements?.[0]?.net_cash || 0), 0).toLocaleString('ar-LY')} <span style={{ fontSize: '0.75rem' }}>د.ل</span>
          </span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>إجمالي العوائد الصافية للفرع</span>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {[1, 2, 3].map(i => (
            <div 
              key={i} 
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
                height: '84px',
                animation: 'skeleton-pulse 1.5s infinite ease-in-out'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'rgba(191,149,63,0.05)', border: '1px solid rgba(191,149,63,0.1)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '200px' }}>
                  <div style={{ height: '16px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', width: '120px' }} />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ height: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', width: '65px' }} />
                    <div style={{ height: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', width: '80px' }} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ width: '80px', height: '32px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }} />
                <div style={{ width: '36px', height: '32px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'current' ? (
        filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)', border: '2px dashed rgba(191, 149, 63, 0.2)', borderRadius: '16px', background: 'rgba(191, 149, 63, 0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '2.5rem' }}>🔍</div>
            <h4 style={{ margin: 0, fontWeight: '800', color: 'var(--text-primary)' }}>لم يتم العثور على زبائن مطابقة</h4>
            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-tertiary)', maxWidth: '400px', lineHeight: '1.6' }}>
              لا توجد سجلات زبائن نشطة مطابقة للبحث أو للتصفيات النشطة حالياً. يرجى تجربة كلمات بحث أخرى أو إعادة تعيين عوامل التصفية.
            </p>
            <button
              onClick={() => { setSearchTerm(''); setCurrentFilter('ALL'); }}
              style={{
                background: 'linear-gradient(135deg, #bf953f 0%, #aa771c 100%)',
                color: '#0f172a',
                border: 'none',
                padding: '0.55rem 1.2rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(170, 119, 28, 0.2)'
              }}
              className="action-btn-hover"
            >
              إعادة تعيين التصفية 🔄
            </button>
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
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{highlightText(customer.name, searchTerm)}</span>
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
                      <div 
                        onClick={() => handleCopy(customer.national_id, `${customer.id}-nid`)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--surface-card)', padding: '0.25rem 0.6rem', borderRadius: '8px', border: '1px solid var(--glass-border)', cursor: 'pointer', transition: 'all 0.2s' }}
                        className="chip-hover-premium"
                        title="انقر لنسخ الرقم الوطني"
                      >
                        <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>الهوية:</span>
                        <span style={{ fontFamily: 'monospace' }}>{highlightText(customer.national_id, searchTerm)}</span>
                        <span style={{ fontSize: '0.65rem', color: copiedId === `${customer.id}-nid` ? '#10b981' : 'var(--text-tertiary)' }}>
                          {copiedId === `${customer.id}-nid` ? '✓ تم النسخ!' : '📋'}
                        </span>
                      </div>
                      <div 
                        onClick={() => handleCopy(customer.phone || '', `${customer.id}-phone`)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--surface-card)', padding: '0.25rem 0.6rem', borderRadius: '8px', border: '1px solid var(--glass-border)', cursor: 'pointer', transition: 'all 0.2s' }}
                        className="chip-hover-premium"
                        title="انقر لنسخ رقم الهاتف"
                      >
                        <Phone size={11} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <span>{highlightText(showFullPhone ? (customer.phone || '—') : maskPhone(customer.phone), searchTerm)}</span>
                        <span style={{ fontSize: '0.65rem', color: copiedId === `${customer.id}-phone` ? '#10b981' : 'var(--text-tertiary)' }}>
                          {copiedId === `${customer.id}-phone` ? '✓ تم النسخ!' : '📋'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--surface-card)', padding: '0.25rem 0.6rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                        <Building2 size={11} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <span style={{ fontWeight: '500' }}>{highlightText(customer.workplace?.name || '—', searchTerm)}</span>
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
        )
      ) : (
        filteredCompletedTxs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)', border: '2px dashed rgba(191, 149, 63, 0.2)', borderRadius: '16px', background: 'rgba(191, 149, 63, 0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '2.5rem' }}>📂</div>
            <h4 style={{ margin: 0, fontWeight: '800', color: 'var(--text-primary)' }}>لم يتم العثور على معاملات مكتملة</h4>
            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-tertiary)', maxWidth: '400px', lineHeight: '1.6' }}>
              لا توجد معاملات منتهية ومغلقة في الأرشيف مطابقة للبحث أو لنوع التسوية المختار حالياً.
            </p>
            <button
              onClick={() => { setSearchTerm(''); setCompletedFilter('ALL'); }}
              style={{
                background: 'linear-gradient(135deg, #bf953f 0%, #aa771c 100%)',
                color: '#0f172a',
                border: 'none',
                padding: '0.55rem 1.2rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(170, 119, 28, 0.2)'
              }}
              className="action-btn-hover"
            >
              إعادة تعيين التصفية 🔄
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {filteredCompletedTxs.map(tx => (
              <div 
                key={tx.id} 
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
                    background: 'linear-gradient(135deg, rgba(191,149,63,0.15) 0%, rgba(170,119,28,0.05) 100%)', 
                    width: '46px', 
                    height: '46px', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: 'var(--primary)',
                    border: '1px solid rgba(191,149,63,0.3)',
                    flexShrink: 0
                  }}>
                    <CheckCircle2 size={20} />
                  </div>
                  
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{highlightText(tx.customer?.name || 'زبون غير معروف', searchTerm)}</span>
                      <span style={{ background: 'rgba(191, 149, 63, 0.12)', color: '#d4af37', border: '1px solid rgba(191, 149, 63, 0.25)', fontSize: '0.72rem', fontWeight: 'bold', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                        مكتملة ومغلقة
                      </span>
                      {tx.settlements?.[0] && (
                        <span style={{ background: 'var(--surface-card)', color: 'var(--primary)', border: '1px solid var(--glass-border)', fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                          {tx.settlements[0].settlement_type === 'PERSONAL_USE' ? 'استعمال شخصي' : tx.settlements[0].settlement_type === 'CASH_OUT' ? 'تسييل (بيع للمكتب)' : 'بيع خارجي'}
                        </span>
                      )}
                    </div>
                    
                    {/* Chips row */}
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                      <div 
                        onClick={() => tx.customer?.national_id && handleCopy(tx.customer.national_id, `${tx.id}-nid`)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--surface-card)', padding: '0.25rem 0.6rem', borderRadius: '8px', border: '1px solid var(--glass-border)', cursor: 'pointer', transition: 'all 0.2s' }}
                        className="chip-hover-premium"
                        title="انقر لنسخ الرقم الوطني"
                      >
                        <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>الهوية:</span>
                        <span style={{ fontFamily: 'monospace' }}>{highlightText(tx.customer?.national_id || '—', searchTerm)}</span>
                        <span style={{ fontSize: '0.65rem', color: copiedId === `${tx.id}-nid` ? '#10b981' : 'var(--text-tertiary)' }}>
                          {copiedId === `${tx.id}-nid` ? '✓ تم النسخ!' : '📋'}
                        </span>
                      </div>
                      <div 
                        onClick={() => tx.customer?.phone && handleCopy(tx.customer.phone, `${tx.id}-phone`)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--surface-card)', padding: '0.25rem 0.6rem', borderRadius: '8px', border: '1px solid var(--glass-border)', cursor: 'pointer', transition: 'all 0.2s' }}
                        className="chip-hover-premium"
                        title="انقر لنسخ رقم الهاتف"
                      >
                        <Phone size={11} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <span>{highlightText(showFullPhone ? (tx.customer?.phone || '—') : maskPhone(tx.customer?.phone), searchTerm)}</span>
                        <span style={{ fontSize: '0.65rem', color: copiedId === `${tx.id}-phone` ? '#10b981' : 'var(--text-tertiary)' }}>
                          {copiedId === `${tx.id}-phone` ? '✓ تم النسخ!' : '📋'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--surface-card)', padding: '0.25rem 0.6rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                        <Building2 size={11} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <span style={{ fontWeight: '500' }}>{highlightText(tx.customer?.workplace?.name || '—', searchTerm)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--surface-card)', padding: '0.25rem 0.6rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                        <Car size={11} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{highlightText(tx.car_model || '—', searchTerm)}</span>
                        <span style={{ color: 'var(--text-tertiary)' }}>({Number(tx.car_price).toLocaleString('ar-LY')} د.ل)</span>
                      </div>
                      <div 
                        onClick={() => handleCopy(tx.id, `${tx.id}-txid`)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--surface-card)', padding: '0.25rem 0.6rem', borderRadius: '8px', border: '1px solid var(--glass-border)', cursor: 'pointer', transition: 'all 0.2s' }}
                        className="chip-hover-premium"
                        title="انقر لنسخ رمز المعاملة الفريد"
                      >
                        <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>المعاملة:</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.74rem' }}>{tx.id.slice(0, 8)}...</span>
                        <span style={{ fontSize: '0.65rem', color: copiedId === `${tx.id}-txid` ? '#10b981' : 'var(--text-tertiary)' }}>
                          {copiedId === `${tx.id}-txid` ? '✓ تم النسخ!' : '📋'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => { setSelectedTx(tx); setShowTxDetailsModal(true); }}
                    style={{
                      background: 'var(--surface-card)',
                      color: 'var(--text-primary)',
                      border: '1px solid rgba(191,149,63,0.25)',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.76rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      transition: 'all 0.2s',
                      fontWeight: 'bold'
                    }}
                    className="action-btn-hover"
                  >
                    <FileText size={13} />
                    <span>التفاصيل</span>
                  </button>
                  
                  <button 
                    onClick={() => { setSelectedTx(tx); setShowExitPassModal(true); }}
                    style={{
                      background: 'rgba(191, 149, 63, 0.1)',
                      color: 'var(--primary)',
                      border: '1px solid rgba(191,149,63,0.3)',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.76rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      transition: 'all 0.2s',
                      fontWeight: 'bold'
                    }}
                    className="action-btn-hover"
                  >
                    <Receipt size={13} />
                    <span>إذن الخروج</span>
                  </button>

                  <button 
                    onClick={() => { setSelectedTx(tx); setShowClearPassModal(true); }}
                    style={{
                      background: 'rgba(16, 185, 129, 0.08)',
                      color: '#10b981',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.76rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      transition: 'all 0.2s',
                      fontWeight: 'bold'
                    }}
                    className="action-btn-hover"
                  >
                    <CheckCircle2 size={13} />
                    <span>براءة ذمة</span>
                  </button>

                  <button 
                    onClick={() => { setSelectedTx(tx); setShowStatementModal(true); }}
                    style={{
                      background: 'rgba(59, 130, 246, 0.08)',
                      color: '#60a5fa',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.76rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      transition: 'all 0.2s',
                      fontWeight: 'bold'
                    }}
                    className="action-btn-hover"
                  >
                    <Printer size={13} />
                    <span>كشف حساب</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* 1. Transaction Details Modal */}
      {showTxDetailsModal && selectedTx && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'var(--surface-card)', borderRadius: '20px', border: '1px solid rgba(191, 149, 63, 0.3)', width: '100%', maxWidth: '600px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', color: 'var(--primary)' }}>تفاصيل المعاملة المكتملة</h3>
              <button onClick={() => setShowTxDetailsModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.88rem' }}>
              <div style={{ background: 'var(--surface-hover)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '0.75rem' }}>المستفيد</span>
                <span style={{ fontWeight: 'bold' }}>{selectedTx.customer?.name}</span>
              </div>
              <div style={{ background: 'var(--surface-hover)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '0.75rem' }}>الرقم الوطني</span>
                <span style={{ fontWeight: 'bold' }}>{selectedTx.customer?.national_id}</span>
              </div>
              <div style={{ background: 'var(--surface-hover)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '0.75rem' }}>السيارة والموديل</span>
                <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{selectedTx.car_model}</span>
              </div>
              <div style={{ background: 'var(--surface-hover)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '0.75rem' }}>سعر السيارة</span>
                <span style={{ fontWeight: 'bold' }}>{Number(selectedTx.car_price).toLocaleString('ar-LY')} د.ل</span>
              </div>
              <div style={{ background: 'var(--surface-hover)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '0.75rem' }}>الأقساط (الأشهر)</span>
                <span style={{ fontWeight: 'bold' }}>{selectedTx.total_installments} شهراً</span>
              </div>
              <div style={{ background: 'var(--surface-hover)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '0.75rem' }}>نسبة المرابحة</span>
                <span style={{ fontWeight: 'bold' }}>{(selectedTx.margin_rate * 100).toFixed(0)}%</span>
              </div>
              <div style={{ background: 'var(--surface-hover)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '0.75rem' }}>الضامن المعتمد</span>
                <span style={{ fontWeight: 'bold' }}>{selectedTx.transaction_guarantors?.[0]?.guarantor_name || 'لا يوجد ضامن'}</span>
              </div>
              <div style={{ background: 'var(--surface-hover)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '0.75rem' }}>الرقم الوطني للضامن</span>
                <span style={{ fontWeight: 'bold' }}>{selectedTx.transaction_guarantors?.[0]?.guarantor_national_id || '—'}</span>
              </div>
            </div>

            {selectedTx.settlements?.[0] && (
              <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(191, 149, 63, 0.2)', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.4rem' }}>تفاصيل حركة التسوية</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <div><strong>نوع التسوية:</strong> {selectedTx.settlements[0].settlement_type === 'PERSONAL_USE' ? 'شخصي' : selectedTx.settlements[0].settlement_type === 'CASH_OUT' ? 'تسييل' : 'بيع خارجي'}</div>
                  <div><strong>إجمالي الدين:</strong> {Number(selectedTx.settlements[0].debt_amount).toLocaleString('ar-LY')} د.ل</div>
                  <div><strong>صافي النقد:</strong> {Number(selectedTx.settlements[0].net_cash).toLocaleString('ar-LY')} د.ل</div>
                  <div><strong>الكمبيالات:</strong> {selectedTx.settlements[0].promissory_notes_count || 0} كمبيالات</div>
                </div>
                {selectedTx.settlements[0].check_image_url && (
                  <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '0.25rem' }}>صورة صك الضمان المعتمد</span>
                    <img src={selectedTx.settlements[0].check_image_url} alt="صك التسوية" style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: '6px', border: '1px solid var(--glass-border)' }} />
                  </div>
                )}
              </div>
            )}

            <button onClick={() => setShowTxDetailsModal(false)} style={{ background: 'var(--surface-hover)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', padding: '0.65rem', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>إغلاق النافذة</button>
          </div>
        </div>
      )}

      {/* 2. Official Printable Exit Pass Modal */}
      {showExitPassModal && selectedTx && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', overflowY: 'auto' }} className="printable-report-actions-overlay">
          <div style={{ background: 'var(--surface-card)', borderRadius: '24px', border: '2px solid #bf953f', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', width: '100%', maxWidth: '800px', padding: '2.5rem', position: 'relative', display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="printable-report-modal-card">
            
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
              <div style={{ position: 'absolute', top: '10px', right: '10px', left: '10px', bottom: '10px', border: '1px solid rgba(170,119,28,0.25)', pointerEvents: 'none' }}></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid #bf953f', paddingBottom: '1rem', flexWrap: 'nowrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <img 
                    src="/logo.png" 
                    alt="Logo" 
                    onError={(e) => { (e.target as any).src = 'https://raw.githubusercontent.com/malgaroshy-maker/kafeel/shams/public/logo.png' }}
                    style={{ height: '55px', width: 'auto', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800', color: '#1e293b' }}>منظومة كفيل السحابية</h3>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>Kafeel Finance Platform</span>
                  </div>
                </div>
                <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ background: '#fef08a', color: '#854d0e', padding: '4px 12px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '800', border: '1px solid #fef08a' }}>إذن خروج مركبة نهائي</span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>رقم الحركة: {selectedTx.id.slice(0, 13).toUpperCase()}</span>
                </div>
              </div>

              <div style={{ margin: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.92rem', lineHeight: '1.8', color: '#334155' }}>
                <p style={{ margin: 0 }}>
                  يرخص بموجب هذا المستند للمركبة المبينة تفاصيلها أدناه بالخروج النهائي من معرض السيارات المعتمد، بعد استيفاء وتصفية كافة الالتزامات المالية والضمانات والكمبيالات المترتبة لصالح المنظومة.
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '0.5rem' }}>
                  <div><strong>اسم الزبون المستفيد:</strong> {selectedTx.customer?.name}</div>
                  <div><strong>نوع التسوية:</strong> {selectedTx.settlements?.[0]?.settlement_type === 'PERSONAL_USE' ? 'استعمال شخصي' : selectedTx.settlements?.[0]?.settlement_type === 'CASH_OUT' ? 'تسييل (بيع للمكتب)' : 'بيع خارجي'}</div>
                  <div><strong>سعر المركبة الأساسي:</strong> {Number(selectedTx.car_price).toLocaleString('ar-LY')} د.ل</div>
                  <div><strong>عدد الكمبيالات المستلمة:</strong> {selectedTx.settlements?.[0]?.promissory_notes_count || 0} كمبيالات</div>
                </div>

                {selectedTx.settlements?.[0]?.promissory_notes_details && (
                  <p style={{ margin: 0, padding: '0.5rem 1rem', background: '#fffbeb', borderRight: '3px solid #d97706', borderRadius: '4px', fontSize: '0.85rem' }}>
                    <strong>بيان الكمبيالات المستلمة:</strong> {selectedTx.settlements[0].promissory_notes_details}
                  </p>
                )}
              </div>

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
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left' }}>{Number(selectedTx.car_price).toLocaleString('ar-LY')} د.ل</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>المقدم المالي المحصّل</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left' }}>{Number(selectedTx.down_payment).toLocaleString('ar-LY')} د.ل</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>الديون والذمم المتبقية المترتبة</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left' }}>{Number((selectedTx.settlements?.[0]?.debt_amount !== undefined) ? selectedTx.settlements[0].debt_amount : selectedTx.car_price - selectedTx.down_payment).toLocaleString('ar-LY')} د.ل</td>
                    </tr>
                    {selectedTx.settlements?.[0]?.settlement_type === 'EXTERNAL_SALE' && (
                      <tr>
                        <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>سعر البيع الخارجي للمشتري</td>
                        <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left' }}>{Number(selectedTx.settlements[0].sale_price || 0).toLocaleString('ar-LY')} د.ل</td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>مصاريف شحن ونقل المركبة من الموانئ / مصراتة</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left' }}>{Number(selectedTx.settlements?.[0]?.shipping_cost || 0).toLocaleString('ar-LY')} د.ل</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>عمولة المبيعات الفردية للموظف</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left' }}>{Number(selectedTx.settlements?.[0]?.staff_commission || 0).toLocaleString('ar-LY')} د.ل</td>
                    </tr>
                    <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>صافي التدفق النقدي للمعاملة (Net Cash)</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left', color: '#10b981' }}>{Number(selectedTx.settlements?.[0]?.net_cash || 0).toLocaleString('ar-LY')} د.ل</td>
                    </tr>
                  </tbody>
                </table>
              </div>

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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }} className="printable-report-actions">
              <button 
                onClick={() => window.print()}
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #bf953f, #d4af37)', color: '#000', fontWeight: 'bold', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer' }}
              >
                طباعة إذن الخروج الورقي 🖨️
              </button>
              <button 
                onClick={() => setShowExitPassModal(false)}
                className="btn btn-secondary"
                style={{ background: 'var(--surface-hover)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer' }}
              >
                إغلاق النافذة
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 3. Certificate of Indebtedness Clear Pass Modal */}
      {showClearPassModal && selectedTx && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', overflowY: 'auto' }} className="printable-report-actions-overlay">
          <div style={{ background: 'var(--surface-card)', borderRadius: '24px', border: '2px solid #bf953f', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', width: '100%', maxWidth: '800px', padding: '2.5rem', position: 'relative', display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="printable-report-modal-card">
            
            <div className="printable-report-area" dir="rtl" style={{
              background: '#fff',
              color: '#1e293b',
              padding: '3rem 2.5rem',
              borderRadius: '16px',
              border: '6px double #bf953f',
              position: 'relative',
              boxShadow: 'inset 0 0 50px rgba(191,149,63,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.8rem',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              <div style={{ position: 'absolute', top: '12px', right: '12px', left: '12px', bottom: '12px', border: '1px solid rgba(191,149,63,0.25)', pointerEvents: 'none' }}></div>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', borderBottom: '2px solid #bf953f', paddingBottom: '1rem' }}>
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  onError={(e) => { (e.target as any).src = 'https://raw.githubusercontent.com/malgaroshy-maker/kafeel/shams/public/logo.png' }}
                  style={{ height: '70px', width: 'auto', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                />
                <h2 style={{ margin: '0.5rem 0 0 0', fontSize: '1.6rem', fontWeight: '900', color: '#aa771c', letterSpacing: '-0.5px' }}>شهادة إبراء ذمة مالية نهائية</h2>
                <span style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '700' }}>Official Financial Clearance Pass</span>
              </div>

              <div style={{ fontSize: '1.05rem', lineHeight: '2.2', color: '#334155', textAlign: 'justify', textIndent: '1.5rem', padding: '1rem 0' }}>
                بموجب هذه الوثيقة المعتمدة الصادرة عن منظومة كفيل السحابية للمعاملات المالية، تشهد إدارة المعرض والمنظومة بأن الزبون السيد(ة): 
                <strong style={{ color: '#0f172a', borderBottom: '1.5px dashed #bf953f', padding: '0 4px', fontSize: '1.15rem' }}> {selectedTx.customer?.name} </strong> 
                حامل الرقم الوطني: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{selectedTx.customer?.national_id}</strong>، 
                والضامن المعتمد له السيد(ة): 
                <strong style={{ color: '#0f172a', borderBottom: '1.5px dashed #bf953f', padding: '0 4px' }}> {selectedTx.transaction_guarantors?.[0]?.guarantor_name || 'لا يوجد ضامن'} </strong> 
                حامل الرقم الوطني للضامن: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{selectedTx.transaction_guarantors?.[0]?.guarantor_national_id || '—'}</strong>، 
                قاما بتسوية وتصفية وسداد كافّة الالتزامات والأقساط والضمانات المالية المترتبة عليهما بالكامل لصالح المعاملة رقم 
                <strong style={{ color: '#0f172a', fontFamily: 'monospace', fontSize: '0.9rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}> {selectedTx.id} </strong> 
                الخاصة بشراء المركبة الآلية من نوع <strong style={{ color: '#aa771c' }}>{selectedTx.car_model}</strong>.
                 وبناءً عليه، تُعلن ذمتهما المالية بريئة براءة تامة ونهائية ولا يحق للمنظومة مطالبتهما بأي مستحقات أو مطالبات مالية مستقبلاً.
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
                <div style={{ border: '2px solid #10b981', color: '#10b981', background: 'rgba(16,185,129,0.05)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '8px 24px', borderRadius: '30px', fontSize: '0.9rem', fontWeight: '800', textTransform: 'uppercase' }}>
                  <CheckCircle2 size={18} />
                  <span>عملية مستوفاة ومبرأة بالكامل</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem', fontSize: '0.9rem' }}>
                <div style={{ textAlign: 'center', width: '220px', display: 'flex', flexDirection: 'column', gap: '35px' }}>
                  <span style={{ color: '#64748b' }}>إدارة الحسابات العامة</span>
                  <span style={{ borderBottom: '1.5px solid #cbd5e1', width: '100%' }}></span>
                </div>
                <div style={{ textAlign: 'center', width: '220px', display: 'flex', flexDirection: 'column', gap: '35px' }}>
                  <span style={{ color: '#64748b' }}>الختم الرسمي للمنظومة</span>
                  <span style={{ borderBottom: '1.5px solid #cbd5e1', width: '100%' }}></span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }} className="printable-report-actions">
              <button 
                onClick={() => window.print()}
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 'bold', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer' }}
              >
                طباعة شهادة البراءة 🖨️
              </button>
              <button 
                onClick={() => setShowClearPassModal(false)}
                className="btn btn-secondary"
                style={{ background: 'var(--surface-hover)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer' }}
              >
                إغلاق النافذة
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 4. Financial Statement Ledger Modal */}
      {showStatementModal && selectedTx && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', overflowY: 'auto' }} className="printable-report-actions-overlay">
          <div style={{ background: 'var(--surface-card)', borderRadius: '24px', border: '2px solid #60a5fa', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', width: '100%', maxWidth: '800px', padding: '2.5rem', position: 'relative', display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="printable-report-modal-card">
            
            <div className="printable-report-area" dir="rtl" style={{
              background: '#fff',
              color: '#1e293b',
              padding: '2.5rem',
              borderRadius: '16px',
              border: '4px double #3b82f6',
              position: 'relative',
              boxShadow: 'inset 0 0 40px rgba(59,130,246,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              <div style={{ position: 'absolute', top: '10px', right: '10px', left: '10px', bottom: '10px', border: '1px solid rgba(59,130,246,0.25)', pointerEvents: 'none' }}></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid #3b82f6', paddingBottom: '1rem', flexWrap: 'nowrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <img 
                    src="/logo.png" 
                    alt="Logo" 
                    onError={(e) => { (e.target as any).src = 'https://raw.githubusercontent.com/malgaroshy-maker/kafeel/shams/public/logo.png' }}
                    style={{ height: '55px', width: 'auto' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800', color: '#1e293b' }}>منظومة كفيل السحابية</h3>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>Kafeel Finance Platform</span>
                  </div>
                </div>
                <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 12px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '800', border: '1px solid #dbeafe' }}>كشف الحساب المالي الموحد</span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>حساب رقم: KFL-{selectedTx.customer?.national_id.slice(0, 6)}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.88rem' }}>
                <div><strong>اسم المستفيد:</strong> {selectedTx.customer?.name}</div>
                <div><strong>الرقم الوطني:</strong> {selectedTx.customer?.national_id}</div>
                <div><strong>السيارة والموديل:</strong> {selectedTx.car_model}</div>
                <div><strong>تاريخ تسوية الحركة:</strong> {new Date(selectedTx.settlements?.[0]?.created_at || selectedTx.created_at).toLocaleDateString('ar-LY')}</div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>تفاصيل حركة المقاصّة والتدفق المالي</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'right' }}>بيان الحركة</th>
                      <th style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left' }}>الوارد (د.ل)</th>
                      <th style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left' }}>المنصرف (د.ل)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>سعر السيارة (سعر تقييم المعرض)</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left' }}>{Number(selectedTx.car_price).toLocaleString('ar-LY')} د.ل</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left' }}>—</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>مقدم مالي مستلم من الزبون</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left' }}>{Number(selectedTx.down_payment).toLocaleString('ar-LY')} د.ل</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left' }}>—</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>تكلفة الشراء الفعلي للسيارة</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left' }}>—</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left' }}>{Number(selectedTx.purchase_cost || selectedTx.car_price * 0.9).toLocaleString('ar-LY')} د.ل</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>مصاريف النقل والشحن البري المترتبة</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left' }}>—</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left' }}>{Number(selectedTx.settlements?.[0]?.shipping_cost || 0).toLocaleString('ar-LY')} د.ل</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>عمولات المبيعات الفردية للموظفين</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left' }}>—</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left' }}>{Number(selectedTx.settlements?.[0]?.staff_commission || 0).toLocaleString('ar-LY')} د.ل</td>
                    </tr>
                    <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>صافي التدفق النقدي والأرباح للفرع</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'left', color: '#10b981' }} colSpan={2}>
                        {Number(selectedTx.settlements?.[0]?.net_cash || 0).toLocaleString('ar-LY')} د.ل
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', fontSize: '0.85rem' }}>
                <div style={{ textAlign: 'center', width: '200px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  <span style={{ color: '#64748b' }}>إعداد المحاسب المالي</span>
                  <span style={{ borderBottom: '1.5px solid #cbd5e1', width: '100%' }}></span>
                </div>
                <div style={{ textAlign: 'center', width: '200px', display: 'flex', flexDirection: 'column', gap: '35px' }}>
                  <span style={{ color: '#64748b' }}>اعتماد مدير المعرض</span>
                  <span style={{ borderBottom: '1.5px solid #cbd5e1', width: '100%' }}></span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }} className="printable-report-actions">
              <button 
                onClick={() => window.print()}
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', fontWeight: 'bold', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer' }}
              >
                طباعة كشف الحساب 🖨️
              </button>
              <button 
                onClick={() => setShowStatementModal(false)}
                className="btn btn-secondary"
                style={{ background: 'var(--surface-hover)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer' }}
              >
                إغلاق النافذة
              </button>
            </div>

          </div>
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
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-report-area, .printable-report-area * {
            visibility: visible;
          }
          .printable-report-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            border: none !important;
            box-shadow: none !important;
          }
          .printable-report-actions-overlay {
            background: transparent !important;
            position: absolute !important;
            inset: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .printable-report-modal-card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            background: transparent !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .printable-report-actions {
            display: none !important;
          }
        }
      `}</style>

    </div>
  )
}
