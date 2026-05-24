import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Search, User, Phone, Building2, Trash2, Clock, Plus, AlertCircle, RefreshCw, Clipboard, Check, BookOpen } from 'lucide-react'
import { maskPhone } from '../utils/masking'

interface Workplace {
  id: string
  name: string
}

interface PotentialCustomer {
  id: string
  office_id: string
  name: string
  phone: string
  salary: number
  workplace_id: string | null
  workplace?: { name: string } | null
  notes: string
  callback_date?: string | null
  created_at: string
}

interface LogEntry {
  id: string
  customer_name: string
  action_type: 'ADD' | 'DELETE'
  performed_by: string
  created_at: string
}

interface Props {
  onConvert: (customer: any) => void
}

const MIGRATION_SQL = `-- 1. Create Potential Customers Table
CREATE TABLE IF NOT EXISTS public.potential_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    salary NUMERIC,
    workplace_id UUID REFERENCES public.workplaces(id) ON DELETE SET NULL,
    notes TEXT,
    callback_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.potential_customers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can SELECT own office potential customers"
    ON public.potential_customers FOR SELECT
    TO authenticated
    USING (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

CREATE POLICY "Users can INSERT own office potential customers"
    ON public.potential_customers FOR INSERT
    TO authenticated
    WITH CHECK (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

CREATE POLICY "Users can UPDATE own office potential customers"
    ON public.potential_customers FOR UPDATE
    TO authenticated
    USING (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid))
    WITH CHECK (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

CREATE POLICY "Users can DELETE own office potential customers"
    ON public.potential_customers FOR DELETE
    TO authenticated
    USING (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

-- 2. Create Logs Table
CREATE TABLE IF NOT EXISTS public.potential_customer_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('ADD', 'DELETE')),
    performed_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.potential_customer_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can SELECT own office potential logs"
    ON public.potential_customer_logs FOR SELECT
    TO authenticated
    USING (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));

CREATE POLICY "Users can INSERT own office potential logs"
    ON public.potential_customer_logs FOR INSERT
    TO authenticated
    WITH CHECK (office_id = ((auth.jwt() -> 'app_metadata' ->> 'office_id')::uuid));`;

export default function PotentialCustomers({ onConvert }: Props) {
  const { officeId, isManager, user, isAccountant, isAdmin, role } = useAuth()
  const showFullPhone = isManager || isAccountant || isAdmin || role === 'admin';
  const [customers, setCustomers] = useState<PotentialCustomer[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [rejectedTransactions, setRejectedTransactions] = useState<any[]>([])
  const [workplaces, setWorkplaces] = useState<Workplace[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [viewLogs, setViewLogs] = useState(false)
  const [copied, setCopied] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [salary, setSalary] = useState('')
  const [workplaceId, setWorkplaceId] = useState('')
  const [notes, setNotes] = useState('')
  const [callbackDate, setCallbackDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [filterTab, setFilterTab] = useState<'all' | 'overdue' | 'today' | 'scheduled'>('all')

  // Use localStorage fallback if tables do not exist in database yet
  const [useFallback, setUseFallback] = useState(false)

  // Get current user display name
  const [displayName, setDisplayName] = useState('موظف المكتب')

  useEffect(() => {
    if (officeId) {
      fetchWorkplaces()
      fetchPotentialCustomers()
      fetchLogs()
      fetchUserProfile()
      fetchRejectedTransactions()
    }
  }, [officeId])

  const fetchRejectedTransactions = async () => {
    if (!officeId) return
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          rejection_reason,
          created_at,
          customers (
            name
          )
        `)
        .eq('office_id', officeId)
        .eq('verification_status', 'rejected')
        .order('created_at', { ascending: false })
      
      if (!error && data) {
        setRejectedTransactions(data)
      }
    } catch (err) {
      console.error('Error fetching rejected transactions:', err)
    }
  }

  const fetchUserProfile = async () => {
    if (!user?.id) return
    const { data } = await supabase.from('user_profiles').select('display_name').eq('id', user.id).single()
    if (data?.display_name) {
      setDisplayName(data.display_name)
    }
  }

  const fetchWorkplaces = async () => {
    const { data } = await supabase.from('workplaces').select('id, name').order('name')
    if (data) setWorkplaces(data)
  }

  const fetchPotentialCustomers = async () => {
    if (!officeId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('potential_customers')
        .select('*, workplace:workplace_id(name)')
        .eq('office_id', officeId)
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist, activate local storage fallback
          setUseFallback(true)
          loadLocalFallbackCustomers()
        } else {
          console.error('Error fetching potential customers:', error)
        }
      } else if (data) {
        setCustomers(data as any)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async () => {
    if (!officeId) return
    try {
      const { data, error } = await supabase
        .from('potential_customer_logs')
        .select('*')
        .eq('office_id', officeId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setLogs(data as any)
      } else if (error && error.code === '42P01') {
        loadLocalFallbackLogs()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Local fallbacks
  const loadLocalFallbackCustomers = () => {
    const key = `kafeel_potential_customers_${officeId}`
    const saved = localStorage.getItem(key)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setCustomers(parsed)
      } catch (e) {
        console.error(e)
      }
    } else {
      setCustomers([])
    }
  }

  const loadLocalFallbackLogs = () => {
    const key = `kafeel_potential_logs_${officeId}`
    const saved = localStorage.getItem(key)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setLogs(parsed)
      } catch (e) {
        console.error(e)
      }
    } else {
      setLogs([])
    }
  }

  const saveLocalFallbackCustomers = (newCustomers: PotentialCustomer[]) => {
    const key = `kafeel_potential_customers_${officeId}`
    localStorage.setItem(key, JSON.stringify(newCustomers))
    setCustomers(newCustomers)
  }

  const saveLocalFallbackLog = (action: 'ADD' | 'DELETE', customerName: string) => {
    const key = `kafeel_potential_logs_${officeId}`
    const newLog: LogEntry = {
      id: crypto.randomUUID(),
      customer_name: customerName,
      action_type: action,
      performed_by: displayName,
      created_at: new Date().toISOString()
    }
    const currentLogs = [newLog, ...logs]
    localStorage.setItem(key, JSON.stringify(currentLogs))
    setLogs(currentLogs)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return alert('الرجاء إدخال اسم الزبون')
    setSubmitting(true)

    const wp = workplaces.find(w => w.id === workplaceId)
    const workplaceInfo = wp ? { name: wp.name } : null

    const customerPayload = {
      name: name.trim(),
      phone: phone.trim() || '',
      salary: parseFloat(salary) || null,
      workplace_id: workplaceId || null,
      notes: notes.trim() || '',
      callback_date: callbackDate || null,
    }

    if (useFallback) {
      const newCustomer: PotentialCustomer = {
        id: crypto.randomUUID(),
        office_id: officeId!,
        ...customerPayload,
        salary: customerPayload.salary || 0,
        workplace: workplaceInfo,
        created_at: new Date().toISOString()
      }
      const updated = [newCustomer, ...customers]
      saveLocalFallbackCustomers(updated)
      saveLocalFallbackLog('ADD', name.trim())
      alert('✅ تم حفظ الزبون المحتمل بنجاح (محلياً)')
      resetForm()
      setShowAddForm(false)
      setSubmitting(false)
    } else {
      try {
        const { error } = await supabase
          .from('potential_customers')
          .insert({
            office_id: officeId,
            ...customerPayload,
            created_by: user?.id
          })

        if (error) throw error

        // Insert log
        await supabase.from('potential_customer_logs').insert({
          office_id: officeId,
          customer_name: name.trim(),
          action_type: 'ADD',
          performed_by: displayName
        })

        alert('✅ تم تسجيل الزبون المحتمل بنجاح')
        resetForm()
        setShowAddForm(false)
        fetchPotentialCustomers()
        fetchLogs()
      } catch (err: any) {
        alert('حدث خطأ أثناء الحفظ: ' + err.message)
      } finally {
        setSubmitting(false)
      }
    }
  }

  const handleDelete = async (customer: PotentialCustomer) => {
    if (!confirm(`هل أنت متأكد من حذف الزبون المحتمل "${customer.name}"؟`)) return

    if (useFallback) {
      const updated = customers.filter(c => c.id !== customer.id)
      saveLocalFallbackCustomers(updated)
      saveLocalFallbackLog('DELETE', customer.name)
      alert('🗑️ تم حذف الزبون المحتمل (محلياً)')
    } else {
      try {
        const { error } = await supabase.from('potential_customers').delete().eq('id', customer.id)
        if (error) throw error

        // Log deletion
        await supabase.from('potential_customer_logs').insert({
          office_id: officeId,
          customer_name: customer.name,
          action_type: 'DELETE',
          performed_by: displayName
        })

        alert('🗑️ تم حذف الزبون المحتمل بنجاح')
        fetchPotentialCustomers()
        fetchLogs()
      } catch (err: any) {
        alert('حدث خطأ أثناء الحذف: ' + err.message)
      }
    }
  }

  const resetForm = () => {
    setName('')
    setPhone('')
    setSalary('')
    setWorkplaceId('')
    setNotes('')
    setCallbackDate('')
  }

  const getLocalDateString = () => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getNormalizedDate = (dateStr?: string | null) => {
    if (!dateStr) return ''
    return dateStr.substring(0, 10)
  }

  const isToday = (dateStr?: string | null) => {
    if (!dateStr) return false
    const normalized = getNormalizedDate(dateStr)
    const localToday = getLocalDateString()
    return normalized === localToday
  }

  const isOverdue = (dateStr?: string | null) => {
    if (!dateStr) return false
    const normalized = getNormalizedDate(dateStr)
    const localToday = getLocalDateString()
    return normalized < localToday
  }

  const isScheduled = (dateStr?: string | null) => {
    if (!dateStr) return false
    const normalized = getNormalizedDate(dateStr)
    const localToday = getLocalDateString()
    return normalized > localToday
  }

  const copyMigrationSQL = () => {
    navigator.clipboard.writeText(MIGRATION_SQL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filtered = customers
    .filter(c => {
      if (filterTab === 'overdue') return isOverdue(c.callback_date)
      if (filterTab === 'today') return isToday(c.callback_date)
      if (filterTab === 'scheduled') return isScheduled(c.callback_date)
      return true
    })
    .filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm) ||
      c.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    )

  return (
    <div className="potential-customers-container glass" style={{ padding: '2rem', borderRadius: '20px', border: '1px solid rgba(191, 149, 63, 0.22)', background: 'var(--surface-card)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)' }}>
      
      {/* Notice about database setup fallback */}
      {useFallback && (
        <div style={{ background: 'rgba(217, 119, 6, 0.12)', border: '1px solid rgba(217, 119, 6, 0.25)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#fbbf24' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
            <AlertCircle size={18} />
            <span>تنبيه: ميزة قواعد البيانات بحاجة لتفعيل</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            تم استخدام التخزين المؤقت المحلي لعدم العثور على الجداول المطلوبة بقاعدة البيانات. لتفعيل الحفظ المركزي المشترك مع باقي الموظفين والمدير بشكل كامل، يرجى نسخ كود الترقية (SQL Migration) وتشغيله في محرر SQL بـ Supabase.
          </p>
          <button 
            onClick={copyMigrationSQL}
            style={{ 
              alignSelf: 'flex-start', 
              padding: '0.35rem 0.75rem', 
              borderRadius: '6px', 
              background: '#aa771c', 
              color: '#fff', 
              border: 'none', 
              fontSize: '0.78rem', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              marginTop: '0.25rem'
            }}
          >
            {copied ? <Check size={14} /> : <Clipboard size={14} />}
            {copied ? 'تم النسخ!' : 'نسخ كود SQL لتجهيز الجداول'}
          </button>
        </div>
      )}

      {/* Header Block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #bf953f 0%, #aa771c 100%)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(170, 119, 28, 0.25)' }}>
            <User size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              الزبائن المحتملين
              <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(191, 149, 63, 0.3)', color: 'var(--primary)', fontWeight: 'bold', background: 'var(--surface-hover)', marginRight: '0.5rem' }}>
                {filtered.length} زبون محتمل
              </span>
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
              تسجيل ومتابعة المراجعين الذين لم يكملوا ملفاتهم، والذين يتوقع عودتهم للمكتب لاحقاً
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {isManager && (
            <button
              onClick={() => setViewLogs(!viewLogs)}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(191, 149, 63, 0.3)',
                background: viewLogs ? 'linear-gradient(135deg, #bf953f 0%, #aa771c 100%)' : 'var(--surface-hover)',
                color: viewLogs ? '#fff' : 'var(--text-primary)',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <BookOpen size={16} />
              <span>سجل حركة التغييرات</span>
            </button>
          )}

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #bf953f 0%, #aa771c 100%)',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: '0 4px 12px rgba(170, 119, 28, 0.2)'
            }}
          >
            <Plus size={16} />
            <span>تسجيل زبون محتمل جديد</span>
          </button>
        </div>
      </div>

      {/* Add Potential Customer Form */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="glass" style={{ padding: '1.5rem', borderRadius: '14px', border: '1px solid var(--glass-border)', background: 'var(--surface-hover)', marginBottom: '1.5rem' }}>
          <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', fontWeight: 'bold' }}>بيانات الزبون المحتمل</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>اسم الزبون الكامل *</label>
              <input
                type="text"
                placeholder="أدخل الاسم رباعياً"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(191,149,63,0.3)', background: 'var(--surface-card)', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>رقم الهاتف (اختياري)</label>
              <input
                type="tel"
                placeholder="09XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(191,149,63,0.3)', background: 'var(--surface-card)', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>صافي المرتب د.ل (تقريبي)</label>
              <input
                type="number"
                placeholder="صافي المرتب"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(191,149,63,0.3)', background: 'var(--surface-card)', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>جهة العمل</label>
              <select
                value={workplaceId}
                onChange={(e) => setWorkplaceId(e.target.value)}
                style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(191,149,63,0.3)', background: 'var(--surface-card)', color: 'var(--text-primary)', outline: 'none', height: '40px' }}
              >
                <option value="">اختر جهة العمل...</option>
                {workplaces.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>تاريخ المراجعة / الاتصال القادم</label>
              <input
                type="date"
                value={callbackDate}
                onChange={(e) => setCallbackDate(e.target.value)}
                style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(191,149,63,0.3)', background: 'var(--surface-card)', color: 'var(--text-primary)', outline: 'none', height: '40px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>ملاحظات حول احتمالية العودة وتفاصيل أخرى</label>
            <textarea
              placeholder="مثال: الزبون يدرس العرض المالي، يحتاج للتحدث مع الضامن، يرجى الاتصال به الأسبوع القادم..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(191,149,63,0.3)', background: 'var(--surface-card)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); resetForm(); }}
              style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer' }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #bf953f 0%, #aa771c 100%)', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {submitting ? 'جاري الحفظ...' : 'حفظ البيانات'}
            </button>
          </div>
        </form>
      )}

      {/* View Activity Logs & Rejected Audits */}
      {viewLogs && isManager && (
        <div className="glass" style={{ padding: '1.5rem', borderRadius: '14px', border: '1.5px solid var(--glass-border)', background: 'var(--surface-hover)', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
            <h4 style={{ margin: 0, color: 'var(--primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
              <Clock size={18} />
              لوحة رقابة المحذوفات والمرفوضات للإدارة (Deleted & Rejected Audits)
            </h4>
            <button
              onClick={() => { setViewLogs(false); }}
              style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              إغلاق لوحة الرقابة
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            
            {/* Column A: CRM Activity Logs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h5 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '0.88rem', borderRight: '3px solid var(--primary)', paddingRight: '0.5rem' }}>
                حركات الزبائن المحتملين (إضافة / حذف)
              </h5>
              
              {logs.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>لا توجد حركات مسجلة.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto', paddingLeft: '0.25rem' }}>
                  {logs.map((log) => (
                    <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--surface-card)', border: '1px solid var(--glass-border)', borderRadius: '8px', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ 
                          padding: '0.15rem 0.4rem', 
                          borderRadius: '4px', 
                          fontSize: '0.68rem', 
                          fontWeight: 'bold',
                          background: log.action_type === 'ADD' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: log.action_type === 'ADD' ? '#10b981' : '#ef4444'
                        }}>
                          {log.action_type === 'ADD' ? 'إضافة' : 'حذف'}
                        </span>
                        <strong style={{ color: 'var(--text-primary)' }}>{log.customer_name}</strong>
                      </div>
                      <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', textAlign: 'left' }}>
                        بواسطة: <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{log.performed_by}</span>
                        <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '2px' }}>{new Date(log.created_at).toLocaleString('ar-LY')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Column B: Rejected Applications Audits */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h5 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '0.88rem', borderRight: '3px solid #ef4444', paddingRight: '0.5rem' }}>
                سجل طلبات التمويل المرفوضة من الإدارة
              </h5>

              {rejectedTransactions.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>لا توجد طلبات تمويل مرفوضة حالياً.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto', paddingLeft: '0.25rem' }}>
                  {rejectedTransactions.map((tx) => (
                    <div key={tx.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.75rem', background: 'var(--surface-card)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 'bold', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>مرفوض</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{tx.customers?.name || 'زبون غير معروف'}</strong>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <strong>سبب الرفض:</strong> {tx.rejection_reason || 'لم يتم تسجيل سبب للرفض'}
                      </p>
                      <div style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                        <span>تاريخ المعاملة: {new Date(tx.created_at).toLocaleDateString('ar-LY')}</span>
                        <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>رقابة فنية</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Smart Calendar Filters Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(191, 149, 63, 0.1)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'الكل', count: customers.length, color: 'var(--text-primary)' },
          { id: 'overdue', label: 'مراجعة متأخرة ⚠️', count: customers.filter(c => isOverdue(c.callback_date)).length, color: '#f87171' },
          { id: 'today', label: 'مراجعة اليوم 📅', count: customers.filter(c => isToday(c.callback_date)).length, color: '#34d399' },
          { id: 'scheduled', label: 'مراجعة مجدولة ⏳', count: customers.filter(c => isScheduled(c.callback_date)).length, color: '#60a5fa' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterTab(tab.id as any)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: filterTab === tab.id ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.05)',
              background: filterTab === tab.id ? 'linear-gradient(135deg, rgba(191, 149, 63, 0.15) 0%, rgba(170, 119, 28, 0.05) 100%)' : 'var(--surface-hover)',
              color: filterTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: filterTab === tab.id ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <span style={{ color: filterTab === tab.id ? 'var(--primary)' : tab.color }}>{tab.label}</span>
            <span style={{ 
              background: filterTab === tab.id ? 'rgba(191, 149, 63, 0.2)' : 'rgba(255, 255, 255, 0.05)', 
              padding: '0.1rem 0.4rem', 
              borderRadius: '6px', 
              fontSize: '0.72rem',
              color: filterTab === tab.id ? 'var(--primary)' : 'var(--text-tertiary)',
              fontWeight: 'bold'
            }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Main List */}
      <div style={{ marginBottom: '1rem', position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder="بحث بالاسم، الهاتف، أو الملاحظات..."
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
            transition: 'all 0.3s ease'
          }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
          <div className="spinner" style={{ width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-tertiary)', border: '1px dashed var(--glass-border)', borderRadius: '12px', background: 'var(--surface-hover)' }}>
          لا توجد سجلات لزبائن محتملين مطابقة للبحث حالياً.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filtered.map(customer => {
            const overdue = isOverdue(customer.callback_date)
            const today = isToday(customer.callback_date)
            const scheduled = isScheduled(customer.callback_date)

            let cardStyle: React.CSSProperties = {
              background: 'var(--surface-hover)',
              border: '1px solid var(--glass-border)',
              borderRadius: '14px',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }

            if (overdue) {
              cardStyle = {
                ...cardStyle,
                border: '1px solid rgba(239, 68, 68, 0.35)',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.07) 0%, var(--surface-hover) 100%)',
                boxShadow: '0 8px 24px rgba(239, 68, 68, 0.05)'
              }
            } else if (today) {
              cardStyle = {
                ...cardStyle,
                border: '1px solid rgba(16, 185, 129, 0.35)',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.07) 0%, var(--surface-hover) 100%)',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.05)'
              }
            } else if (scheduled) {
              cardStyle = {
                ...cardStyle,
                border: '1px solid rgba(96, 165, 250, 0.25)',
                background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.04) 0%, var(--surface-hover) 100%)'
              }
            }

            return (
              <div 
                key={customer.id} 
                className="customer-card-premium"
                style={cardStyle}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '280px' }}>
                  <div style={{ 
                    background: overdue
                      ? 'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.03) 100%)'
                      : today
                      ? 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.03) 100%)'
                      : 'linear-gradient(135deg, rgba(191,149,63,0.1) 0%, rgba(170,119,28,0.03) 100%)', 
                    width: '46px', 
                    height: '46px', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: overdue ? '#f87171' : today ? '#34d399' : 'var(--primary)',
                    border: overdue 
                      ? '1px solid rgba(239,68,68,0.2)' 
                      : today 
                      ? '1px solid rgba(16,185,129,0.2)' 
                      : '1px solid rgba(191,149,63,0.2)',
                    flexShrink: 0
                  }}>
                    <User size={20} />
                  </div>
                  
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{customer.name}</span>
                      <span style={{ background: 'rgba(191, 149, 63, 0.08)', color: 'var(--primary)', border: '1px solid rgba(191, 149, 63, 0.2)', fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '8px', fontWeight: 'bold' }}>زبون محتمل</span>
                      
                      {overdue && (
                        <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)', fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <span>⚠️ مراجعة متأخرة</span>
                        </span>
                      )}
                      {today && (
                        <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <span>📅 مراجعة اليوم</span>
                        </span>
                      )}
                      {scheduled && (
                        <span style={{ background: 'rgba(96, 165, 250, 0.1)', color: '#60a5fa', border: '1px solid rgba(96, 165, 250, 0.2)', fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <span>⏳ مراجعة مجدولة</span>
                        </span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--surface-card)', padding: '0.25rem 0.6rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                        <Phone size={11} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <span>{showFullPhone ? (customer.phone || '—') : maskPhone(customer.phone)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--surface-card)', padding: '0.25rem 0.6rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                        <Building2 size={11} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <span style={{ fontWeight: '500' }}>{customer.workplace?.name || '—'}</span>
                      </div>
                      {customer.salary && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--surface-card)', padding: '0.25rem 0.6rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                          <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>المرتب:</span>
                          <span>{customer.salary} د.ل</span>
                        </div>
                      )}
                      {customer.callback_date && (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.35rem', 
                          fontSize: '0.78rem', 
                          color: overdue ? '#f87171' : today ? '#34d399' : '#60a5fa', 
                          background: overdue ? 'rgba(239, 68, 68, 0.05)' : today ? 'rgba(16, 185, 129, 0.05)' : 'rgba(96, 165, 250, 0.05)', 
                          padding: '0.25rem 0.6rem', 
                          borderRadius: '8px', 
                          border: overdue ? '1px solid rgba(239, 68, 68, 0.2)' : today ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(96, 165, 250, 0.2)' 
                        }}>
                          <Clock size={11} style={{ color: overdue ? '#f87171' : today ? '#34d399' : '#60a5fa', flexShrink: 0 }} />
                          <span style={{ fontWeight: 'bold' }}>المراجعة:</span>
                          <span>{getNormalizedDate(customer.callback_date)}</span>
                        </div>
                      )}
                    </div>

                  {customer.notes && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-tertiary)', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '8px', borderLeft: '3px solid var(--primary)', display: 'inline-block' }}>
                      <strong style={{ color: 'var(--primary)' }}>ملاحظات: </strong>
                      {customer.notes}
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button 
                  onClick={() => onConvert(customer)}
                  style={{ 
                    background: 'rgba(16, 185, 129, 0.1)', 
                    color: '#34d399', 
                    border: '1px solid rgba(16, 185, 129, 0.25)', 
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
                  title="تحويل إلى تسجيل زبون نشط بالكامل"
                >
                  <RefreshCw size={14} />
                  <span>تسجيل كزبون نشط</span>
                </button>

                <button 
                  onClick={() => handleDelete(customer)}
                  style={{ 
                    background: 'rgba(239, 68, 68, 0.1)', 
                    color: '#f87171', 
                    border: '1px solid rgba(239, 68, 68, 0.25)', 
                    padding: '0.45rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  title="حذف الزبون المحتمل"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
        </div>
      )}
    </div>
  )
}
