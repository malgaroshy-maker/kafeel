import { useState } from 'react'
import { Eye, EyeOff, Link, Shield, GripVertical, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useRealtimeMatches } from '../hooks/useRealtimeMatches'

// Operations Monitor sees MASKED data: no salaries, no car prices, no debts
interface MonitorEntry {
  id: string
  customerName: string
  officeName: string
  workplaceName: string
  submittedDate: string
  guarantorsNeeded: number
  currentGuarantors: number
  // Sensitive fields (hidden from monitor)
  _salary?: number
  _carPrice?: number
  _customerPhone?: string
}

// Types stay the same

import { useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { notificationService } from '../utils/notifications'

export default function MonitorDashboard() {
  const [entries, setEntries] = useState<MonitorEntry[]>([])
  const [showSensitive, setShowSensitive] = useState(false)
  const [linkMode, setLinkMode] = useState(false)
  const [selectedForLink, setSelectedForLink] = useState<string[]>([])
  const [linkResult, setLinkResult] = useState<string | null>(null)
  const { events, isConnected } = useRealtimeMatches()

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
          const customer = Array.isArray(item.customers) ? item.customers[0] : item.customers;
          const office = Array.isArray(item.offices) ? item.offices[0] : item.offices;
          const workplace = customer && Array.isArray(customer.workplaces) ? customer.workplaces[0] : (customer?.workplaces);

          return {
            id: item.id,
            customerName: customer?.full_name || 'غير معروف',
            officeName: office?.name || 'غير معروف',
            workplaceName: workplace?.name || 'غير معروف',
            submittedDate: new Date(item.created_at).toLocaleDateString('ar-LY'),
            guarantorsNeeded: workplace?.required_guarantors || 0,
            currentGuarantors: 0,
            _salary: customer?.salary,
            _carPrice: item.car_price,
            _customerPhone: customer?.phone
          };
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

  const handleSelect = (id: string) => {
    if (!linkMode) return
    setSelectedForLink((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
    setLinkResult(null)
  }

  const executeManualLink = async () => {
    if (selectedForLink.length !== 2) return
    const [beneficiaryId, guarantorId] = selectedForLink
    const beneficiary = entries.find((e) => e.id === beneficiaryId)
    const guarantor = entries.find((e) => e.id === guarantorId)

    if (beneficiary && guarantor) {
      try {
        const { error } = await supabase
          .from('transaction_guarantors')
          .insert({
            transaction_id: beneficiaryId,
            guarantor_customer_id: guarantor.id, // Assuming guarantor is another customer
            match_type: 'MANUAL'
          })
        
        if (error) throw error

        // Notify both parties
        await notificationService.sendMatchAlert(
          beneficiary.customerName,
          (beneficiary as any)._customerPhone || '',
          guarantor.customerName,
          (guarantor as any)._customerPhone || ''
        )

        setLinkResult(`✅ تم الربط اليدوي بنجاح وإرسال الإشعارات لـ ${beneficiary.customerName} و ${guarantor.customerName}`)
        loadData() // Refresh
      } catch (err) {
        console.error('Error linking:', err)
        setLinkResult('❌ فشل عملية الربط. يرجى المحاولة لاحقاً.')
      }
    }

    setSelectedForLink([])
    setLinkMode(false)
  }

  return (
    <div className="monitor-container">
      <div className="form-header">
        <div className="form-icon-wrap" style={{ background: 'linear-gradient(135deg, hsl(280, 60%, 50%), hsl(280, 60%, 35%))' }}>
          <Shield size={24} />
        </div>
        <div>
          <h3>لوحة مراقب العمليات</h3>
          <p className="calc-subtitle">
            <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
            {isConnected ? 'متصل مباشر' : 'غير متصل'} • {entries.length} معاملة
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="monitor-toolbar">
        <button
          className={`btn btn-sm ${showSensitive ? 'btn-ghost' : 'btn-outline'}`}
          onClick={() => setShowSensitive(!showSensitive)}
        >
          {showSensitive ? <EyeOff size={14} /> : <Eye size={14} />}
          {showSensitive ? 'إخفاء الأرقام' : 'عرض الأرقام (مدير فقط)'}
        </button>
        <button
          className={`btn btn-sm ${linkMode ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => {
            setLinkMode(!linkMode)
            setSelectedForLink([])
            setLinkResult(null)
          }}
        >
          <Link size={14} />
          {linkMode ? 'إلغاء الربط' : 'ربط يدوي'}
        </button>
      </div>

      {linkMode && (
        <div className="link-instructions">
          <AlertTriangle size={16} />
          <span>اختر زبونين للربط الاستثنائي (المستفيد أولاً، ثم الضامن)</span>
          {selectedForLink.length === 2 && (
            <button className="btn btn-primary btn-sm" onClick={executeManualLink}>
              <CheckCircle2 size={14} /> تأكيد الربط
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

      {/* Realtime Events */}
      {events.length > 0 && (
        <div className="realtime-events">
          <h4 className="panel-title">إشعارات لحظية</h4>
          {events.slice(0, 5).map((evt) => (
            <div key={evt.id} className="realtime-event-item">
              <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
              <span>
                تم ربط <strong>{evt.guarantorName}</strong> كضامن
                ({evt.matchType === 'AUTO' ? 'تلقائي' : 'يدوي'})
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Entries Table */}
      <div className="monitor-table-wrap">
        <table className="monitor-table">
          <thead>
            <tr>
              {linkMode && <th></th>}
              <th>الاسم</th>
              <th>المكتب</th>
              <th>جهة العمل</th>
              <th>تاريخ التقديم</th>
              {showSensitive && <th>المرتب</th>}
              {showSensitive && <th>سعر السيارة</th>}
              <th>الضُمان</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className={`${linkMode ? 'linkable' : ''} ${selectedForLink.includes(entry.id) ? 'selected' : ''}`}
                onClick={() => handleSelect(entry.id)}
              >
                {linkMode && (
                  <td>
                    <GripVertical size={16} style={{ color: 'var(--text-tertiary)' }} />
                  </td>
                )}
                <td className="cell-name">{entry.customerName}</td>
                <td>{entry.officeName}</td>
                <td>{entry.workplaceName}</td>
                <td className="mono">{entry.submittedDate}</td>
                {showSensitive && (
                  <td className="cell-sensitive">{entry._salary?.toLocaleString('ar-LY')} د.ل</td>
                )}
                {showSensitive && (
                  <td className="cell-sensitive">{entry._carPrice?.toLocaleString('ar-LY')} د.ل</td>
                )}
                <td>
                  <span className={`badge ${entry.currentGuarantors >= entry.guarantorsNeeded ? 'badge-success' : 'badge-warning'}`}>
                    {entry.currentGuarantors}/{entry.guarantorsNeeded}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
