import { useState, useEffect, useCallback } from 'react'
import { LayoutDashboard, Building2, Plus, Users, TrendingUp, Package, ToggleLeft, ToggleRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Office {
  id: string
  name: string
  subscription_plan: 'BASIC' | 'PRO' | 'ENTERPRISE'
  monthly_quota: number
  used_quota: number
  is_active: boolean
  subscription_expires_at: string | null
}

interface Workplace {
  id: string
  name: string
}

// Demo data
const DEMO_OFFICES: Office[] = [
  {
    id: 'office-1',
    name: 'مكتب النجم للسيارات',
    subscription_plan: 'PRO',
    monthly_quota: 25,
    used_quota: 18,
    is_active: true,
    subscription_expires_at: '2026-12-31',
  },
  {
    id: 'office-2',
    name: 'مكتب الثقة',
    subscription_plan: 'BASIC',
    monthly_quota: 10,
    used_quota: 9,
    is_active: true,
    subscription_expires_at: '2026-08-15',
  },
  {
    id: 'office-3',
    name: 'مكتب الأمان',
    subscription_plan: 'ENTERPRISE',
    monthly_quota: 50,
    used_quota: 12,
    is_active: true,
    subscription_expires_at: '2027-03-01',
  },
  {
    id: 'office-4',
    name: 'مكتب البركة',
    subscription_plan: 'BASIC',
    monthly_quota: 10,
    used_quota: 10,
    is_active: false,
    subscription_expires_at: '2026-04-01',
  },
]

const DEMO_WORKPLACES: Workplace[] = [
  { id: 'wp-1', name: 'وزارة الداخلية' },
  { id: 'wp-2', name: 'وزارة التعليم' },
  { id: 'wp-3', name: 'وزارة الصحة' },
  { id: 'wp-4', name: 'الجيش الليبي' },
  { id: 'wp-5', name: 'شركة الكهرباء' },
]

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  BASIC: { label: 'أساسي', color: 'var(--text-tertiary)' },
  PRO: { label: 'احترافي', color: 'var(--primary)' },
  ENTERPRISE: { label: 'مؤسسات', color: 'var(--success)' },
}

export default function AdminDashboard() {
  const [offices, setOffices] = useState<Office[]>(DEMO_OFFICES)
  const [workplaces, setWorkplaces] = useState<Workplace[]>(DEMO_WORKPLACES)
  const [activeSection, setActiveSection] = useState<'offices' | 'workplaces'>('offices')
  const [newWorkplaceName, setNewWorkplaceName] = useState('')

  // Load from Supabase
  const loadData = useCallback(async () => {
    try {
      const { data: officeData } = await supabase.from('offices').select('*')
      if (officeData && officeData.length > 0) {
        // Map real data when available
      }
      const { data: wpData } = await supabase.from('workplaces').select('*')
      if (wpData && wpData.length > 0) {
        setWorkplaces(wpData)
      }
    } catch {
      // Fall back to demo data
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const toggleOfficeStatus = (id: string) => {
    setOffices((prev) =>
      prev.map((o) => (o.id === id ? { ...o, is_active: !o.is_active } : o))
    )
  }

  const addWorkplace = () => {
    if (!newWorkplaceName.trim()) return
    const newWp: Workplace = {
      id: `wp-${Date.now()}`,
      name: newWorkplaceName.trim(),
    }
    setWorkplaces((prev) => [...prev, newWp])
    setNewWorkplaceName('')
    // In production: await supabase.from('workplaces').insert({ name: newWorkplaceName })
  }

  // Stats
  const totalOffices = offices.length
  const activeOffices = offices.filter((o) => o.is_active).length
  const totalQuotaUsed = offices.reduce((sum, o) => sum + o.used_quota, 0)
  const totalQuota = offices.reduce((sum, o) => sum + o.monthly_quota, 0)

  return (
    <div className="admin-container">
      <div className="form-header">
        <div className="form-icon-wrap" style={{ background: 'linear-gradient(135deg, hsl(350, 65%, 50%), hsl(350, 65%, 35%))' }}>
          <LayoutDashboard size={24} />
        </div>
        <div>
          <h3>لوحة تحكم المدير العام</h3>
          <p className="calc-subtitle">إدارة المكاتب والاشتراكات وجهات العمل</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="admin-stats">
        <div className="stat-card">
          <Building2 size={20} />
          <div>
            <span className="stat-value">{activeOffices}/{totalOffices}</span>
            <span className="stat-label">مكاتب نشطة</span>
          </div>
        </div>
        <div className="stat-card">
          <Users size={20} />
          <div>
            <span className="stat-value">{workplaces.length}</span>
            <span className="stat-label">جهة عمل</span>
          </div>
        </div>
        <div className="stat-card">
          <TrendingUp size={20} />
          <div>
            <span className="stat-value">{totalQuotaUsed}/{totalQuota}</span>
            <span className="stat-label">الحصص المستخدمة</span>
          </div>
        </div>
        <div className="stat-card">
          <Package size={20} />
          <div>
            <span className="stat-value">{Math.round((totalQuotaUsed / totalQuota) * 100)}%</span>
            <span className="stat-label">نسبة الاستخدام</span>
          </div>
        </div>
      </div>

      {/* Section Toggle */}
      <div className="admin-section-toggle">
        <button
          className={`toggle-btn ${activeSection === 'offices' ? 'active' : ''}`}
          onClick={() => setActiveSection('offices')}
        >
          <Building2 size={16} />
          المكاتب ({offices.length})
        </button>
        <button
          className={`toggle-btn ${activeSection === 'workplaces' ? 'active' : ''}`}
          onClick={() => setActiveSection('workplaces')}
        >
          <Users size={16} />
          جهات العمل ({workplaces.length})
        </button>
      </div>

      {/* Offices Section */}
      {activeSection === 'offices' && (
        <div className="admin-table-wrap">
          <table className="monitor-table">
            <thead>
              <tr>
                <th>المكتب</th>
                <th>الخطة</th>
                <th>الحصة</th>
                <th>انتهاء الاشتراك</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {offices.map((office) => {
                const plan = PLAN_LABELS[office.subscription_plan]
                const quotaPercent = (office.used_quota / office.monthly_quota) * 100
                const isQuotaFull = quotaPercent >= 90
                return (
                  <tr key={office.id} className={!office.is_active ? 'row-disabled' : ''}>
                    <td className="cell-name">{office.name}</td>
                    <td>
                      <span className="badge" style={{ background: `${plan.color}15`, color: plan.color }}>
                        {plan.label}
                      </span>
                    </td>
                    <td>
                      <div className="quota-cell">
                        <span className={isQuotaFull ? 'quota-full' : ''}>
                          {office.used_quota}/{office.monthly_quota}
                        </span>
                        <div className="quota-bar">
                          <div
                            className="quota-bar-fill"
                            style={{
                              width: `${Math.min(100, quotaPercent)}%`,
                              background: isQuotaFull ? 'var(--error)' : 'var(--primary)',
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="mono">
                      {office.subscription_expires_at || '—'}
                    </td>
                    <td>
                      <button
                        className="status-toggle"
                        onClick={() => toggleOfficeStatus(office.id)}
                        title={office.is_active ? 'تعطيل' : 'تفعيل'}
                      >
                        {office.is_active ? (
                          <ToggleRight size={24} style={{ color: 'var(--success)' }} />
                        ) : (
                          <ToggleLeft size={24} style={{ color: 'var(--text-tertiary)' }} />
                        )}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Workplaces Section */}
      {activeSection === 'workplaces' && (
        <div className="workplaces-section">
          <div className="add-workplace-row">
            <input
              type="text"
              placeholder="أضف جهة عمل جديدة..."
              value={newWorkplaceName}
              onChange={(e) => setNewWorkplaceName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addWorkplace()}
              className="workplace-input"
            />
            <button className="btn btn-primary btn-sm" onClick={addWorkplace} disabled={!newWorkplaceName.trim()}>
              <Plus size={14} />
              إضافة
            </button>
          </div>
          <div className="workplace-list">
            {workplaces.map((wp) => (
              <div key={wp.id} className="workplace-chip">
                <Building2 size={14} />
                {wp.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
