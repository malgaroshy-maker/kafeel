import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Search, User, Phone, Building2, Calculator as CalcIcon, Pencil, Trash2, FileText } from 'lucide-react'

interface Customer {
  id: string
  name: string
  national_id: string
  phone: string
  salary: number
  workplace: {
    name: string
  }
}

interface Props {
  onSelect?: (customerId: string) => void
  onEdit?: (customer: Customer) => void
  onDelete?: (customerId: string) => void
  onDocuments?: (customerId: string) => void
}

export default function CustomerList({ onSelect, onEdit, onDelete, onDocuments }: Props) {
  const { officeId } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCustomers()
  }, [officeId])

  const fetchCustomers = async () => {
    if (!officeId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('customers')
      .select(`
        id,
        name,
        national_id,
        phone,
        salary,
        workplace:workplace_id (name)
      `)
      .eq('office_id', officeId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setCustomers(data as any)
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الزبون؟')) return
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) alert('خطأ في الحذف')
    else fetchCustomers()
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
                <div className="font-bold text-lg mb-1">{customer.name}</div>
                <div className="flex gap-4 text-sm text-text-secondary">
                  <span className="flex items-center gap-1"><User size={14} /> {customer.national_id}</span>
                  <span className="flex items-center gap-1"><Phone size={14} /> {customer.phone}</span>
                  <span className="flex items-center gap-1"><Building2 size={14} /> {customer.workplace?.name}</span>
                </div>
              </div>
              <div className="flex gap-2">
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
                <button 
                  className="btn btn-ghost btn-sm text-error"
                  onClick={() => handleDelete(customer.id)}
                  title="حذف"
                >
                  <Trash2 size={16} />
                </button>
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
