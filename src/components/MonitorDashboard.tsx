import { useState, useEffect, useCallback } from 'react'
import { 
  Eye, EyeOff, Link, Shield, GripVertical, CheckCircle2, 
  AlertTriangle, Megaphone, Send, Car, Plus, Trash2, 
  Clock, Users, BarChart3, TrendingUp, Info, Wrench, Check, MapPin, Truck
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRealtimeMatches } from '../hooks/useRealtimeMatches'

// Operations Monitor sees masked/relevant logistics data
interface MonitorEntry {
  id: string
  customerName: string
  officeName: string
  workplaceName: string
  submittedDate: string
  created_at: string
  carModel: string
  guarantorsNeeded: number
  currentGuarantors: number
  // Sensitive fields (hidden by default)
  _salary?: number
  _carPrice?: number
  _customerPhone?: string
}

interface BroadcastItem {
  id: string
  message: string
  created_at: string
  expires_at?: string
}

interface IncomingShipment {
  id: string
  model: string
  color: string
  quantity: number
  expectedDate: string
  notes?: string
}

interface CarInventoryItem {
  id: string
  model: string
  color: string
  year: string
  status: string
  inspectionNotes?: string
  mileage?: string
  engineHealth?: string
}

interface MonitorDashboardProps {
  activeSubTab: 'queue' | 'pipeline' | 'broadcast' | 'analytics' | 'inventory';
}

export default function MonitorDashboard({ activeSubTab }: MonitorDashboardProps) {
  const [entries, setEntries] = useState<MonitorEntry[]>([])
  const [showSensitive, setShowSensitive] = useState(false)
  const [linkMode, setLinkMode] = useState(false)
  const [selectedForLink, setSelectedForLink] = useState<string[]>([])
  const [linkResult, setLinkResult] = useState<string | null>(null)
  const { isConnected } = useRealtimeMatches()

  // 1. Delivery & Logistics Pipeline States (Can be modified by user and persisted in LocalStorage for demo/future table mapping)
  const [deliveryStatuses, setDeliveryStatuses] = useState<Record<string, 'processing' | 'ready' | 'shipping' | 'delivered'>>(() => {
    const saved = localStorage.getItem('kafeel_delivery_statuses')
    return saved ? JSON.parse(saved) : {}
  })

  // 2. Incoming Fleet Pre-booking States
  const [incomingShipments, setIncomingShipments] = useState<IncomingShipment[]>(() => {
    const saved = localStorage.getItem('kafeel_incoming_shipments')
    return saved ? JSON.parse(saved) : [
      { id: '1', model: 'هيونداي توسان 2026', color: 'فضي معدني', quantity: 12, expectedDate: '2026-06-01', notes: 'شحنة قادمة عبر ميناء طرابلس' },
      { id: '2', model: 'تويوتا راف 4 2025', color: 'أبيض لؤلؤي', quantity: 8, expectedDate: '2026-05-28', notes: 'شحنة قادمة عبر ميناء الخمس' }
    ]
  })
  const [newIncomingModel, setNewIncomingModel] = useState('')
  const [newIncomingColor, setNewIncomingColor] = useState('')
  const [newIncomingQty, setNewIncomingQty] = useState(5)
  const [newIncomingDate, setNewIncomingDate] = useState('')
  const [newIncomingNotes, setNewIncomingNotes] = useState('')

  // 3. Inventory Technical Inspection States
  const [inventoryItems, setInventoryItems] = useState<CarInventoryItem[]>(() => {
    const saved = localStorage.getItem('kafeel_inventory_items')
    return saved ? JSON.parse(saved) : [
      { id: 'inv-1', model: 'كيا سبورتج 2025', color: 'رمادي غامق', year: '2025', status: 'متوفرة', inspectionNotes: 'ممتازة - فحص كمبيوتر كامل 100%', mileage: '0 كم (جديدة)', engineHealth: '100%' },
      { id: 'inv-2', model: 'هيونداي أزيرا 2024', color: 'أسود ملكي', year: '2024', status: 'متوفرة', inspectionNotes: 'إطار احتياطي أصلي متوفر - فحص سليم', mileage: '12,500 كم', engineHealth: '98%' }
    ]
  })
  const [newCarModel, setNewCarModel] = useState('')
  const [newCarColor, setNewCarColor] = useState('')
  const [newCarYear, setNewCarYear] = useState('')
  const [newCarMileage, setNewCarMileage] = useState('')
  const [newCarEngine, setNewCarEngine] = useState('')
  const [newCarInspection, setNewCarInspection] = useState('')

  // Broadcast States
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null)
  const [broadcastsList, setBroadcastsList] = useState<BroadcastItem[]>([])
  const [broadcastLoading, setBroadcastLoading] = useState(false)
  const [broadcastDuration, setBroadcastDuration] = useState<number>(24)

  // Pipeline filter state
  const [pipelineFilter, setPipelineFilter] = useState<'docs' | 'waiting' | 'matched' | 'delivered' | null>(null)

  // Save states to localStorage to persist user edits locally (with future Supabase mapping potential)
  useEffect(() => {
    localStorage.setItem('kafeel_delivery_statuses', JSON.stringify(deliveryStatuses))
  }, [deliveryStatuses])

  useEffect(() => {
    localStorage.setItem('kafeel_incoming_shipments', JSON.stringify(incomingShipments))
  }, [incomingShipments])

  useEffect(() => {
    localStorage.setItem('kafeel_inventory_items', JSON.stringify(inventoryItems))
  }, [inventoryItems])

  const loadData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          car_model,
          car_price,
          created_at,
          offices (name),
          customers (
            id,
            full_name,
            salary,
            phone,
            workplaces (name, required_guarantors)
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      if (data) {
        const formatted: MonitorEntry[] = (data as any[]).map(item => {
          const customer = Array.isArray(item.customers) ? item.customers[0] : item.customers
          const office = Array.isArray(item.offices) ? item.offices[0] : item.offices
          const workplace = customer && Array.isArray(customer.workplaces) ? customer.workplaces[0] : (customer?.workplaces)

          return {
            id: item.id,
            customerName: customer?.full_name || 'غير معروف',
            officeName: office?.name || 'غير معروف',
            workplaceName: workplace?.name || 'غير معروف',
            submittedDate: new Date(item.created_at).toLocaleDateString('ar-LY'),
            created_at: item.created_at,
            carModel: item.car_model || 'سيارة غير محددة',
            guarantorsNeeded: workplace?.required_guarantors || 0,
            currentGuarantors: 0,
            _salary: customer?.salary,
            _carPrice: item.car_price,
            _customerPhone: customer?.phone
          }
        })
        setEntries(formatted)
      }
    } catch (err) {
      console.error('Error loading monitor data:', err)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Load broadcasts
  const loadBroadcasts = useCallback(async () => {
    const { data } = await supabase.from('broadcasts').select('*').order('created_at', { ascending: false }).limit(20)
    if (data) setBroadcastsList(data.filter((b: any) => !b.expires_at || new Date(b.expires_at) > new Date()) as BroadcastItem[])
  }, [])

  useEffect(() => { loadBroadcasts() }, [loadBroadcasts])

  // Send broadcast
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!broadcastMessage.trim()) return
    setBroadcastLoading(true)
    setBroadcastSuccess(null)
    try {
      const prefix = companyName.trim() ? `[${companyName.trim()}] ` : ''
      const formattedMessage = `DEALER_ALERT: ${prefix}${broadcastMessage.trim()}`
      const expiresAt = new Date(Date.now() + broadcastDuration * 3600000).toISOString()
      const { error } = await supabase.from('broadcasts').insert({ message: formattedMessage, expires_at: expiresAt })
      if (error) throw error
      setBroadcastSuccess('✅ تم بث الإعلان بنجاح!')
      setBroadcastMessage('')
      setCompanyName('')
      loadBroadcasts()
    } catch { setBroadcastSuccess('❌ فشل البث. يرجى مراجعة إعدادات الاتصال.') }
    setBroadcastLoading(false)
  }

  // Delete broadcast
  const handleDeleteBroadcast = async (id: string) => {
    await supabase.from('broadcasts').delete().eq('id', id)
    loadBroadcasts()
  }

  // Manual linking - supports 2 or 3 people circular
  const handleSelect = (id: string) => {
    if (!linkMode) return
    setSelectedForLink((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 3) return [...prev.slice(1), id]
      return [...prev, id]
    })
    setLinkResult(null)
  }

  const executeManualLink = async () => {
    if (selectedForLink.length < 2) return
    try {
      // Circular matching: each person guarantees the next, last guarantees first
      for (let i = 0; i < selectedForLink.length; i++) {
        const beneficiaryId = selectedForLink[i]
        const guarantorIdx = (i + 1) % selectedForLink.length
        const guarantorEntry = entries.find(e => e.id === selectedForLink[guarantorIdx])
        if (!guarantorEntry) continue
        await supabase.from('transaction_guarantors').insert({
          transaction_id: beneficiaryId,
          guarantor_customer_id: guarantorEntry.id,
          match_type: 'MANUAL'
        })
      }
      // Notify offices
      for (const id of selectedForLink) {
        const entry = entries.find(e => e.id === id)
        if (entry) {
          await supabase.from('broadcasts').insert({
            message: `🔗 تم ربط الزبون ${entry.customerName} من مكتب ${entry.officeName} يدوياً بواسطة وكيل السيارات`
          })
        }
      }
      const names = selectedForLink.map(id => entries.find(e => e.id === id)?.customerName).filter(Boolean).join(' و ')
      setLinkResult(`✅ تم الربط الدائري بنجاح لـ ${names}`)
      loadData()
    } catch (err) {
      console.error('Error linking:', err)
      setLinkResult('❌ فشل عملية الربط. يرجى المحاولة لاحقاً.')
    }
    setSelectedForLink([])
    setLinkMode(false)
  }

  // Check if a transaction is waiting for more than 48 hours (Urgent Matching Alerts)
  const isWaitingTooLong = (createdAtStr: string) => {
    const hours = (Date.now() - new Date(createdAtStr).getTime()) / 3600000
    return hours > 48
  }

  // Pipeline stage counts
  const stageCounts = {
    docs: entries.filter(e => e.currentGuarantors === 0).length,
    waiting: entries.filter(e => e.currentGuarantors > 0 && e.currentGuarantors < e.guarantorsNeeded).length,
    matched: entries.filter(e => e.currentGuarantors >= e.guarantorsNeeded && deliveryStatuses[e.id] !== 'delivered').length,
    delivered: entries.filter(e => deliveryStatuses[e.id] === 'delivered').length
  }

  const pipelineStages = [
    { key: 'docs', label: 'تجميع المستندات', icon: <Users size={20} />, count: stageCounts.docs, color: '#ef4444' },
    { key: 'waiting', label: 'انتظار الربط', icon: <Clock size={20} />, count: stageCounts.waiting, color: '#f59e0b' },
    { key: 'matched', label: 'قيد التسليم', icon: <Wrench size={20} />, count: stageCounts.matched, color: '#a855f7' },
    { key: 'delivered', label: 'تم التسليم الفعلي', icon: <Car size={20} />, count: stageCounts.delivered, color: '#22c55e' },
  ] as const

  const getFilteredEntries = () => {
    if (!pipelineFilter) return entries
    if (pipelineFilter === 'docs') return entries.filter(e => e.currentGuarantors === 0)
    if (pipelineFilter === 'waiting') return entries.filter(e => e.currentGuarantors > 0 && e.currentGuarantors < e.guarantorsNeeded)
    if (pipelineFilter === 'matched') return entries.filter(e => e.currentGuarantors >= e.guarantorsNeeded && deliveryStatuses[e.id] !== 'delivered')
    if (pipelineFilter === 'delivered') return entries.filter(e => deliveryStatuses[e.id] === 'delivered')
    return entries
  }

  return (
    <div className="monitor-container" style={{ direction: 'rtl', padding: '1rem 0' }}>

      {/* ===== SUB-TAB 1: QUEUE & MANUAL LINKING ===== */}
      {activeSubTab === 'queue' && (
        <div>
          <div className="form-header">
            <div className="form-icon-wrap" style={{ background: 'linear-gradient(135deg, hsl(280, 60%, 50%), hsl(280, 60%, 35%))' }}>
              <Shield size={24} />
            </div>
            <div>
              <h3>طابور الانتظار والربط اليدوي</h3>
              <p className="calc-subtitle">
                <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
                {isConnected ? 'متصل مباشر' : 'غير متصل'} • {entries.length} معاملة في النظام
              </p>
            </div>
          </div>

          {/* Urgent / Aging Matches Alert Panel */}
          {entries.some(e => isWaitingTooLong(e.created_at)) && (
            <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.08)', border: '1.5px dashed #ef4444', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 'bold' }}>
                <AlertTriangle size={18} />
                <span>تنبيه معاملات متأخرة بالانتظار ({entries.filter(e => isWaitingTooLong(e.created_at)).length} زبائن)</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                توجد طلبات مستوفية ومرفوعة من المكاتب لأكثر من 48 ساعة دون إيجاد تطابق تلقائي. يمكنك استخدام الربط اليدوي لمساعدة المكاتب وتسريع المعاملات.
              </p>
            </div>
          )}

          <div className="monitor-toolbar">
            <button className={`btn btn-sm ${showSensitive ? 'btn-ghost' : 'btn-outline'}`} onClick={() => setShowSensitive(!showSensitive)}>
              {showSensitive ? <EyeOff size={14} /> : <Eye size={14} />}
              {showSensitive ? 'إخفاء البيانات' : 'عرض البيانات الفرعية'}
            </button>
            <button className={`btn btn-sm ${linkMode ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setLinkMode(!linkMode); setSelectedForLink([]); setLinkResult(null) }}>
              <Link size={14} />
              {linkMode ? 'إلغاء الربط' : 'ربط يدوي تبادلي'}
            </button>
          </div>

          {linkMode && (
            <div className="link-instructions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--warning)', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} />
                <span>اختر 2 أو 3 أشخاص للربط التبادلي الدائري ({selectedForLink.length} محدد)</span>
              </div>
              {selectedForLink.length >= 2 && (
                <button className="btn btn-primary btn-sm" onClick={executeManualLink}>
                  <CheckCircle2 size={14} /> تأكيد الربط الدائري ({selectedForLink.length} أشخاص)
                </button>
              )}
            </div>
          )}

          {linkResult && (
            <div className="queue-match-result success" style={{ marginBottom: '1rem' }}>
              <CheckCircle2 size={16} />
              <span style={{ whiteSpace: 'pre-line' }}>{linkResult}</span>
            </div>
          )}

          <div className="monitor-table-wrap">
            <table className="monitor-table">
              <thead>
                <tr>
                  {linkMode && <th></th>}
                  <th>الاسم والطلب</th><th>المكتب</th><th>جهة العمل</th><th>تاريخ التقديم</th>
                  {showSensitive && <th>المرتب المقدر</th>}
                  {showSensitive && <th>تلفون الزبون</th>}
                  <th>حالة الطلب</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const urgent = isWaitingTooLong(entry.created_at)
                  return (
                    <tr 
                      key={entry.id} 
                      className={`${linkMode ? 'linkable' : ''} ${selectedForLink.includes(entry.id) ? 'selected' : ''}`} 
                      onClick={() => handleSelect(entry.id)}
                      style={urgent ? { background: 'rgba(239, 68, 68, 0.03)', borderRight: '4px solid #ef4444' } : {}}
                    >
                      {linkMode && <td><GripVertical size={16} style={{ color: 'var(--text-tertiary)' }} /></td>}
                      <td className="cell-name">
                        <div style={{ fontWeight: 800 }}>{entry.customerName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                          <Car size={12} /> {entry.carModel}
                        </div>
                      </td>
                      <td>{entry.officeName}</td>
                      <td>{entry.workplaceName}</td>
                      <td className="mono">
                        {entry.submittedDate}
                        {urgent && <span style={{ marginRight: '0.5rem', background: '#ef4444', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 'bold' }}>متأخر ⚠️</span>}
                      </td>
                      {showSensitive && <td className="cell-sensitive">{entry._salary ? `${entry._salary.toLocaleString('ar-LY')} د.ل` : 'غير متوفر'}</td>}
                      {showSensitive && <td className="cell-sensitive mono">{entry._customerPhone || 'لا يوجد'}</td>}
                      <td>
                        <span className={`badge ${entry.currentGuarantors >= entry.guarantorsNeeded ? 'badge-success' : 'badge-warning'}`}>
                          {entry.currentGuarantors}/{entry.guarantorsNeeded} ضامن
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== SUB-TAB 2: LOGISTICS PIPELINE TRACKER ===== */}
      {activeSubTab === 'pipeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="form-header">
            <div className="form-icon-wrap" style={{ background: 'linear-gradient(135deg, #a855f7, #7e22ce)' }}><Clock size={24} /></div>
            <div>
              <h3>متتبع مراحل تسليم المركبات</h3>
              <p className="calc-subtitle">تحديث ومراقبة مراحل تجهيز وشحن وتوصيل السيارات للزبائن المطابقين</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {pipelineStages.map(stage => (
              <div 
                key={stage.key} 
                onClick={() => setPipelineFilter(pipelineFilter === stage.key ? null : stage.key)} 
                style={{ 
                  padding: '1.25rem', 
                  borderRadius: '12px', 
                  background: pipelineFilter === stage.key ? `${stage.color}15` : 'var(--surface)', 
                  border: `2px solid ${pipelineFilter === stage.key ? stage.color : 'var(--glass-border)'}`, 
                  cursor: 'pointer', 
                  textAlign: 'center', 
                  transition: 'all 0.3s ease', 
                  boxShadow: pipelineFilter === stage.key ? `0 4px 15px ${stage.color}25` : 'var(--shadow-sm)' 
                }}
              >
                <div style={{ color: stage.color, marginBottom: '0.4rem' }}>{stage.icon}</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: stage.color }}>{stage.count}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}>{stage.label}</div>
              </div>
            ))}
          </div>

          <div className="monitor-table-wrap">
            <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={16} /> 
              <span>قائمة تسليم المركبات {pipelineFilter && `(مرحلة: ${pipelineStages.find(s => s.key === pipelineFilter)?.label})`}</span>
            </h4>
            <table className="monitor-table">
              <thead>
                <tr>
                  <th>الزبون والطلب</th>
                  <th>المكتب</th>
                  <th>السيارة المطلوبة</th>
                  <th>مرحلة التسليم الحالية</th>
                  <th style={{ width: '220px' }}>تحديث الحالة اللوجستية</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredEntries().map(entry => {
                  const currentStatus = deliveryStatuses[entry.id] || 'processing'
                  return (
                    <tr key={entry.id}>
                      <td className="cell-name" style={{ fontWeight: 'bold' }}>{entry.customerName}</td>
                      <td>{entry.officeName}</td>
                      <td style={{ color: '#b45309', fontWeight: 700 }}>{entry.carModel}</td>
                      <td>
                        {currentStatus === 'processing' && <span style={{ color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Wrench size={14} /> قيد التجهيز الفني</span>}
                        {currentStatus === 'ready' && <span style={{ color: '#f59e0b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={14} /> جاهزة بالمعرض للزبون</span>}
                        {currentStatus === 'shipping' && <span style={{ color: '#3b82f6', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Truck size={14} /> جاري النقل والتوصيل</span>}
                        {currentStatus === 'delivered' && <span style={{ color: '#22c55e', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Check size={14} /> تم التسليم والحمد لله</span>}
                      </td>
                      <td>
                        <select 
                          value={currentStatus}
                          onChange={(e) => {
                            const newStatus = e.target.value as any
                            setDeliveryStatuses(prev => ({ ...prev, [entry.id]: newStatus }))
                          }}
                          style={{
                            padding: '0.35rem 0.5rem',
                            borderRadius: '6px',
                            border: '1px solid var(--glass-border)',
                            background: 'var(--surface)',
                            color: 'var(--text-primary)',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            width: '100%'
                          }}
                        >
                          <option value="processing">🔧 قيد التجهيز الفني</option>
                          <option value="ready">📍 جاهزة بالمعرض</option>
                          <option value="shipping">🚛 جاري الشحن والتسليم</option>
                          <option value="delivered">🔑 تم التسليم النهائي للزبون</option>
                        </select>
                      </td>
                    </tr>
                  )
                })}
                {getFilteredEntries().length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      لا توجد معاملات في هذه المرحلة اللوجستية حالياً.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== SUB-TAB 3: BROADCAST & ADVISORIES ===== */}
      {activeSubTab === 'broadcast' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="form-header">
            <div className="form-icon-wrap" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}><Megaphone size={24} /></div>
            <div>
              <h3>لوحة النصائح والإعلانات للمكاتب</h3>
              <p className="calc-subtitle">بث إعلانات السيارات والضوابط التمويلية لكافة الفروع المشتركة بالمنظومة</p>
            </div>
          </div>

          <div style={{ padding: '2rem', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
            <form onSubmit={handleSendBroadcast}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>اسم الشركة/المعرض صاحب الإعلان</label>
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="مثال: معرض الوفاق لتوريد السيارات..." className="workplace-input" style={{ width: '100%', padding: '0.6rem' }} />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>نص الإعلان أو النصيحة</label>
                <textarea value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="اكتب نص الإعلان لتقديمه للمكاتب (مثال: وصول شحنة سيارات موديل كذا...)" rows={3} className="workplace-input" style={{ width: '100%', resize: 'vertical', padding: '0.6rem' }} />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>مدة عرض الإعلان للمستخدمين</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {[12, 24, 48].map(h => (
                    <label key={h} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '8px', border: broadcastDuration === h ? '2px solid #b38728' : '1px solid var(--glass-border)', background: broadcastDuration === h ? 'rgba(179, 135, 40, 0.1)' : 'transparent', cursor: 'pointer', fontWeight: broadcastDuration === h ? 700 : 400, fontSize: '0.85rem' }}>
                      <input type="radio" name="duration" checked={broadcastDuration === h} onChange={() => setBroadcastDuration(h)} style={{ display: 'none' }} />
                      {h} ساعة
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={broadcastLoading || !broadcastMessage.trim()} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#bf953f', color: '#0f172a', border: 'none', fontWeight: 'bold' }}>
                <Send size={16} />{broadcastLoading ? 'جاري البث...' : 'بث الإعلان الآن للمنظومة'}
              </button>
            </form>
            {broadcastSuccess && <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '8px', background: broadcastSuccess.includes('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${broadcastSuccess.includes('✅') ? '#22c55e' : '#ef4444'}`, fontSize: '0.85rem' }}>{broadcastSuccess}</div>}
          </div>

          {broadcastsList.length > 0 && (
            <div>
              <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>الإعلانات النشطة بالمكاتب ({broadcastsList.length})</h4>
              {broadcastsList.map(b => (
                <div key={b.id} style={{ padding: '1rem', marginBottom: '0.75rem', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{b.message.replace('DEALER_ALERT: ', '').replace('ADMIN_ALERT: ', '')}</span>
                  <button className="btn btn-sm btn-ghost" onClick={() => handleDeleteBroadcast(b.id)} style={{ color: '#ef4444' }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== SUB-TAB 4: DEMAND ANALYTICS & HEATMAP ===== */}
      {activeSubTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="form-header">
            <div className="form-icon-wrap" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}><BarChart3 size={24} /></div>
            <div>
              <h3>مؤشر الطلب الذكي والتحليلات</h3>
              <p className="calc-subtitle">تحليل نوعية الموديلات الأكثر طلباً من قبل الزبائن في قائمة الانتظار لتنظيم المشتريات</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <div style={{ color: '#3b82f6' }}><Users size={28} /></div>
              <div>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, display: 'block' }}>{entries.length}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>إجمالي الزبائن بالمنظومة</span>
              </div>
            </div>
            <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <div style={{ color: '#22c55e' }}><CheckCircle2 size={28} /></div>
              <div>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, display: 'block' }}>{entries.filter(e => e.currentGuarantors >= e.guarantorsNeeded).length}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>تطابقات مكتملة الضُمان</span>
              </div>
            </div>
            <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <div style={{ color: '#f59e0b' }}><Clock size={28} /></div>
              <div>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, display: 'block' }}>{entries.filter(e => e.currentGuarantors < e.guarantorsNeeded).length}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>زبائن في انتظار الربط</span>
              </div>
            </div>
          </div>

          {/* Real-time demand heatmap calculated directly from active transactions */}
          <div style={{ padding: '2rem', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
            <h4 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} style={{ color: '#3b82f6' }} />
              <span>مؤشر الموديلات الأكثر طلباً بالمكاتب (Heatmap)</span>
            </h4>
            {(() => {
              const carCounts: Record<string, number> = {}
              entries.forEach(e => {
                if (e.carModel) {
                  carCounts[e.carModel] = (carCounts[e.carModel] || 0) + 1
                }
              })
              const sorted = Object.entries(carCounts).sort((a, b) => b[1] - a[1])
              const maxCount = sorted.length > 0 ? sorted[0][1] : 1

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {sorted.map(([model, count]) => {
                    const percentage = Math.max(10, (count / maxCount) * 100)
                    return (
                      <div key={model} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 'bold' }}>
                          <span>{model}</span>
                          <span style={{ color: '#3b82f6' }}>{count} زبون مهتم</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'var(--glass-border)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${percentage}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)', borderRadius: '4px', transition: 'width 0.5s ease' }}></div>
                        </div>
                      </div>
                    )
                  })}
                  {sorted.length === 0 && (
                    <p style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>لا توجد بيانات كافية لحساب مؤشرات الطلب حالياً.</p>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* ===== SUB-TAB 5: INVENTORY & SHIPPED FLEET ===== */}
      {activeSubTab === 'inventory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Section A: Live Available Inventory with Technical Appraisal */}
          <div>
            <div className="form-header">
              <div className="form-icon-wrap" style={{ background: 'linear-gradient(135deg, #10b981, #047857)' }}><Car size={24} /></div>
              <div>
                <h3>المخزون المتوفر وبطاقات الفحص الفني</h3>
                <p className="calc-subtitle">إضافة وتعديل بيانات السيارات المتاحة بالمعرض للمطابقة الفورية مع الفحص المعتمد</p>
              </div>
            </div>

            <div style={{ padding: '1.5rem', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--glass-border)', marginTop: '1rem', marginBottom: '1.5rem' }}>
              <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>🚗 تسجيل سيارة جديدة مع بطاقة الفحص المعتمد</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <input type="text" value={newCarModel} onChange={e => setNewCarModel(e.target.value)} placeholder="طراز وموديل السيارة..." className="workplace-input" />
                <input type="text" value={newCarColor} onChange={e => setNewCarColor(e.target.value)} placeholder="اللون الخارجي..." className="workplace-input" />
                <input type="text" value={newCarYear} onChange={e => setNewCarYear(e.target.value)} placeholder="سنة الصنع..." className="workplace-input" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <input type="text" value={newCarMileage} onChange={e => setNewCarMileage(e.target.value)} placeholder="المسافة المقطوعة (مثال: 0 كم جديدة)..." className="workplace-input" />
                <input type="text" value={newCarEngine} onChange={e => setNewCarEngine(e.target.value)} placeholder="سلامة المحرك وصحة البطارية (مثال: 100%)..." className="workplace-input" />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <textarea value={newCarInspection} onChange={e => setNewCarInspection(e.target.value)} placeholder="ملاحظات الفحص والتقرير الفني المعتمد للمركبة..." rows={2} className="workplace-input" style={{ width: '100%', resize: 'none' }} />
              </div>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  if (!newCarModel.trim()) return
                  setInventoryItems(prev => [...prev, { 
                    id: crypto.randomUUID(), 
                    model: newCarModel, 
                    color: newCarColor, 
                    year: newCarYear, 
                    status: 'متوفرة',
                    mileage: newCarMileage || '0 كم (جديدة)',
                    engineHealth: newCarEngine || '100%',
                    inspectionNotes: newCarInspection || 'خالية من العيوب والخدوش'
                  }])
                  setNewCarModel(''); setNewCarColor(''); setNewCarYear(''); setNewCarMileage(''); setNewCarEngine(''); setNewCarInspection('')
                }}
                style={{ width: '100%', background: '#10b981', color: '#fff', border: 'none', fontWeight: 'bold' }}
              >
                <Plus size={14} /> إضافة للمخزون
              </button>
            </div>

            {inventoryItems.length > 0 && (
              <div className="admin-table-wrap">
                <table className="monitor-table">
                  <thead>
                    <tr>
                      <th>الطراز والمواصفات</th>
                      <th>المسافة المقطوعة</th>
                      <th>نسبة صحة المحرك</th>
                      <th>تقرير الفحص الفني المعتمد</th>
                      <th>الخيارات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryItems.map(car => (
                      <tr key={car.id}>
                        <td className="cell-name">
                          <div style={{ fontWeight: 'bold' }}>{car.model}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>اللون: {car.color} • موديل: {car.year}</div>
                        </td>
                        <td className="mono">{car.mileage}</td>
                        <td className="mono" style={{ color: '#10b981', fontWeight: 'bold' }}>{car.engineHealth}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{car.inspectionNotes}</td>
                        <td>
                          <button className="btn btn-sm btn-ghost" onClick={() => setInventoryItems(prev => prev.filter(c => c.id !== car.id))} style={{ color: '#ef4444' }}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderBottom: '1px solid var(--glass-border)' }} />

          {/* Section B: Shipped/Incoming Fleet Pre-booking Reservation Pipeline */}
          <div>
            <div className="form-header">
              <div className="form-icon-wrap" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}><Truck size={24} /></div>
              <div>
                <h3>الشحنات والسيارات القادمة في الطريق</h3>
                <p className="calc-subtitle">استعراض وحجز حصص الحجز المسبق للشحنات القادمة قبل وصولها للموانئ</p>
              </div>
            </div>

            <div style={{ padding: '1.5rem', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--glass-border)', marginTop: '1rem', marginBottom: '1.5rem' }}>
              <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>🚢 تسجيل شحنة استيراد جديدة (قيد الشحن)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <input type="text" value={newIncomingModel} onChange={e => setNewIncomingModel(e.target.value)} placeholder="طراز السيارات القادمة..." className="workplace-input" />
                <input type="text" value={newIncomingColor} onChange={e => setNewIncomingColor(e.target.value)} placeholder="الألوان المتاحة..." className="workplace-input" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <input type="number" value={newIncomingQty} onChange={e => setNewIncomingQty(Number(e.target.value))} placeholder="الكمية الإجمالية..." className="workplace-input" />
                <input type="date" value={newIncomingDate} onChange={e => setNewIncomingDate(e.target.value)} placeholder="تاريخ الوصول التقريبي..." className="workplace-input" />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <input type="text" value={newIncomingNotes} onChange={e => setNewIncomingNotes(e.target.value)} placeholder="ملاحظات أو تفاصيل الميناء والشحنة..." className="workplace-input" style={{ width: '100%' }} />
              </div>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  if (!newIncomingModel.trim()) return
                  setIncomingShipments(prev => [...prev, { 
                    id: crypto.randomUUID(), 
                    model: newIncomingModel, 
                    color: newIncomingColor, 
                    quantity: newIncomingQty,
                    expectedDate: newIncomingDate || new Date().toISOString().split('T')[0],
                    notes: newIncomingNotes || 'قادمة قريباً'
                  }])
                  setNewIncomingModel(''); setNewIncomingColor(''); setNewIncomingQty(5); setNewIncomingDate(''); setNewIncomingNotes('')
                }}
                style={{ width: '100%', background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 'bold' }}
              >
                <Plus size={14} /> إضافة كشحنة قادمة
              </button>
            </div>

            {incomingShipments.length > 0 && (
              <div className="admin-table-wrap">
                <table className="monitor-table">
                  <thead>
                    <tr>
                      <th>المركبة المستوردة</th>
                      <th>الكمية</th>
                      <th>تاريخ الوصول المتوقع</th>
                      <th>تفاصيل الشحنة والميناء</th>
                      <th>الخيارات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomingShipments.map(ship => (
                      <tr key={ship.id}>
                        <td className="cell-name">
                          <div style={{ fontWeight: 'bold' }}>{ship.model}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>اللون: {ship.color}</div>
                        </td>
                        <td className="mono" style={{ fontWeight: 'bold' }}>{ship.quantity} سيارات</td>
                        <td className="mono" style={{ color: '#eab308', fontWeight: 'bold' }}>{ship.expectedDate}</td>
                        <td>{ship.notes}</td>
                        <td>
                          <button className="btn btn-sm btn-ghost" onClick={() => setIncomingShipments(prev => prev.filter(s => s.id !== ship.id))} style={{ color: '#ef4444' }}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
