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
}

const DEMO_ENTRIES: MonitorEntry[] = [
  {
    id: 'mon-1',
    customerName: 'أحمد محمد علي',
    officeName: 'مكتب النجم',
    workplaceName: 'وزارة الداخلية',
    submittedDate: '2026-05-01',
    guarantorsNeeded: 1,
    currentGuarantors: 0,
    _salary: 2800,
    _carPrice: 95000,
  },
  {
    id: 'mon-2',
    customerName: 'خالد عبدالله السنوسي',
    officeName: 'مكتب الثقة',
    workplaceName: 'وزارة التعليم',
    submittedDate: '2026-04-28',
    guarantorsNeeded: 2,
    currentGuarantors: 1,
    _salary: 3100,
    _carPrice: 110000,
  },
  {
    id: 'mon-3',
    customerName: 'محمود صالح بن عيسى',
    officeName: 'مكتب النجم',
    workplaceName: 'وزارة الداخلية',
    submittedDate: '2026-05-03',
    guarantorsNeeded: 1,
    currentGuarantors: 0,
    _salary: 2750,
    _carPrice: 85000,
  },
  {
    id: 'mon-4',
    customerName: 'عمر فتحي الزوي',
    officeName: 'مكتب الأمان',
    workplaceName: 'وزارة الداخلية',
    submittedDate: '2026-05-04',
    guarantorsNeeded: 1,
    currentGuarantors: 0,
    _salary: 2820,
    _carPrice: 90000,
  },
]

export default function MonitorDashboard() {
  const [entries, setEntries] = useState<MonitorEntry[]>(DEMO_ENTRIES)
  const [showSensitive, setShowSensitive] = useState(false)
  const [linkMode, setLinkMode] = useState(false)
  const [selectedForLink, setSelectedForLink] = useState<string[]>([])
  const [linkResult, setLinkResult] = useState<string | null>(null)
  const { events, isConnected } = useRealtimeMatches()

  const handleSelect = (id: string) => {
    if (!linkMode) return
    setSelectedForLink((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
    setLinkResult(null)
  }

  const executeManualLink = () => {
    if (selectedForLink.length !== 2) return
    const [beneficiaryId, guarantorId] = selectedForLink
    const beneficiary = entries.find((e) => e.id === beneficiaryId)
    const guarantor = entries.find((e) => e.id === guarantorId)

    if (beneficiary && guarantor) {
      // Check if same workplace
      const sameWorkplace = beneficiary.workplaceName === guarantor.workplaceName
      const salaryDiff = Math.abs((beneficiary._salary || 0) - (guarantor._salary || 0))

      let warning = ''
      if (!sameWorkplace) warning += '⚠️ جهات عمل مختلفة. '
      if (salaryDiff > 50) warning += `⚠️ فارق المرتب ${salaryDiff} د.ل (أكثر من 50). `

      setLinkResult(
        `${warning ? warning + '\n' : ''}✅ تم الربط الاستثنائي: ${beneficiary.customerName} ← ${guarantor.customerName}`
      )

      // Update demo state
      setEntries((prev) =>
        prev.map((e) =>
          e.id === beneficiaryId
            ? { ...e, currentGuarantors: e.currentGuarantors + 1 }
            : e
        )
      )
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
