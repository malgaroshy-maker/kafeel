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
}

interface Props {
  onSelect?: (customerId: string) => void
  onEdit?: (customer: Customer) => void
  onDelete?: (customerId: string) => void
  onDocuments?: (customerId: string) => void
  onSendToQueue?: (customerId: string) => void
}

export default function CustomerList({ onSelect, onEdit, onDelete, onDocuments, onSendToQueue }: Props) {
  const { officeId, isManager } = useAuth()
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
        id,
        name,
        national_id,
        phone,
        salary,
        workplace_id,
        workplace:workplace_id (name)
      `)
      .eq('office_id', officeId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      // Fetch active transactions for these customers
      const customerIds = data.map(c => c.id)
      const { data: txData } = await supabase
        .from('transactions')
        .select('customer_id, status')
        .in('customer_id', customerIds)
        .in('status', ['WAITING_MATCH', 'MATCHED', 'ACTIVE'])

      const activeCustomerIds = new Set(txData?.map(t => t.customer_id) || [])

      setCustomers(data.map(c => ({
        ...c,
        hasActiveTransaction: activeCustomerIds.has(c.id)
      })) as any)
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
    <div className="customer-list-container glass p-6 rounded-xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <User className="text-primary-light" />
          قائمة الزبائن
        </h3>
        <div className="relative w-64">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="بحث بالاسم أو الرقم..."
            className="w-full pr-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-tertiary">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-text-tertiary">لا يوجد زبائن حالياً</div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(customer => (
            <div key={customer.id} className="glass p-4 rounded-lg flex justify-between items-center hover:border-primary-light transition-all">
              <div>
                <div className="font-bold text-lg mb-1 flex items-center gap-2">
                  {customer.name}
                  {customer.hasActiveTransaction && (
                    <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                      في الانتظار
                    </span>
                  )}
                </div>
                <div className="flex gap-4 text-sm text-text-secondary">
                  <span className="flex items-center gap-1"><User size={14} /> {customer.national_id}</span>
                  <span className="flex items-center gap-1"><Phone size={14} /> {customer.phone}</span>
                  <span className="flex items-center gap-1"><Building2 size={14} /> {customer.workplace?.name}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {!customer.hasActiveTransaction && (
                  <button 
                    className="btn btn-sm flex items-center gap-1"
                    style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)', border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: '0.8rem' }}
                    onClick={() => handleSendToQueue(customer)}
                    disabled={sendingToQueue === customer.id}
                    title="إرسال لقائمة الانتظار"
                  >
                    <Clock size={14} />
                    {sendingToQueue === customer.id ? '...' : 'انتظار'}
                  </button>
                )}
                <button 
                  className="btn btn-ghost btn-sm text-primary-light"
                  onClick={() => onDocuments && onDocuments(customer.id)}
                  title="المستندات"
                >
                  <FileText size={16} />
                </button>
                <button 
                  className="btn btn-ghost btn-sm text-success"
                  onClick={() => onEdit && onEdit(customer)}
                  title="تعديل"
                >
                  <Pencil size={16} />
                </button>
                {isManager && (
                  <button 
                    className="btn btn-ghost btn-sm text-error"
                    onClick={() => handleDelete(customer.id)}
                    title="حذف"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button 
                  className="btn btn-primary btn-sm flex items-center gap-2"
                  onClick={() => onSelect && onSelect(customer.id)}
                >
                  <CalcIcon size={16} />
                  الحاسبة
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
