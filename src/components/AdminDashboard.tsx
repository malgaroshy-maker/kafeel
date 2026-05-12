import { useState, useEffect, useCallback } from 'react'
import { LayoutDashboard, Building2, Plus, Users, Key, ToggleLeft, ToggleRight, Copy, RefreshCw, ShieldCheck, ShieldOff, Lock, Trash2, ChevronDown, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Office {
  id: string
  name: string
  max_users: number
  join_code: string
  join_code_active: boolean
  is_active: boolean
  user_count?: number
}

interface UserProfile {
  id: string
  display_name: string
  role: string
  is_active: boolean
  office_id: string | null
  created_at: string
  email?: string
  phone?: string
  office_name?: string
}

interface Workplace {
  id: string
  name: string
}

interface Bank {
  id: string
  name: string
}

interface Branch {
  id: string
  name: string
  bank_id: string
  region: string
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: 'مدير عام', color: 'hsl(350, 65%, 50%)' },
  monitor: { label: 'مراقب', color: 'var(--warning)' },
  manager: { label: 'مدير مكتب', color: 'var(--primary)' },
  accountant: { label: 'محاسب', color: 'var(--success)' },
  staff: { label: 'إدخال بيانات', color: 'var(--text-tertiary)' },
}

type Tab = 'offices' | 'users' | 'workplaces' | 'banks' | 'codes'

export default function AdminDashboard() {
  const { session } = useAuth()
  const [offices, setOffices] = useState<Office[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [workplaces, setWorkplaces] = useState<Workplace[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBankId, setSelectedBankId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<Tab>('offices')
  const [newWorkplaceName, setNewWorkplaceName] = useState('')
  const [newBankName, setNewBankName] = useState('')
  const [newBranchName, setNewBranchName] = useState('')
  const [newBranchRegion, setNewBranchRegion] = useState('')
  const [newOfficeName, setNewOfficeName] = useState('')
  const [newOfficeMaxUsers, setNewOfficeMaxUsers] = useState('4')
  const [workplaceSearch, setWorkplaceSearch] = useState('')
  const [bankSearch, setBankSearch] = useState('')
  const [branchSearch, setBranchSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // === Admin API helper ===
  const adminCall = useCallback(async (body: Record<string, unknown>) => {
    const token = session?.access_token
    if (!token) throw new Error('No session')
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-manage-users`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
      }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'خطأ')
    return data
  }, [session])

  // === Load data ===
  const loadData = useCallback(async () => {
    try {
      const [officeRes, wpRes, profileRes, bankRes, branchRes] = await Promise.all([
        supabase.from('offices').select('*').order('name'),
        supabase.from('workplaces').select('*').order('name'),
        supabase.from('user_profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('banks').select('*').order('name'),
        supabase.from('branches').select('*').order('name'),
      ])

      const officeData = officeRes.data || []
      const profileData = profileRes.data || []

      // Count users per office
      const countMap: Record<string, number> = {}
      profileData.forEach(p => {
        if (p.office_id && p.is_active) {
          countMap[p.office_id] = (countMap[p.office_id] || 0) + 1
        }
      })
      const enrichedOffices = officeData.map(o => ({ ...o, user_count: countMap[o.id] || 0 }))

      setOffices(enrichedOffices)
      setWorkplaces(wpRes.data || [])
      setBanks(bankRes.data || [])
      setBranches(branchRes.data || [])
      if (bankRes.data?.length && !selectedBankId) setSelectedBankId(bankRes.data[0].id)

      // Enrich users with office name, excluding the Master Admin
      const officeMap = Object.fromEntries(officeData.map(o => [o.id, o.name]))
      setUsers(
        profileData
          .filter(u => u.role !== 'admin') // HIDE MASTER ADMIN
          .map(u => ({ ...u, office_name: u.office_id ? officeMap[u.office_id] || '—' : '—' }))
      )
    } catch (err) {
      console.error('Error loading admin data:', err)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // === Actions ===
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const toggleOfficeStatus = async (id: string, current: boolean) => {
    setActionLoading(id)
    try {
      await supabase.from('offices').update({ is_active: !current }).eq('id', id)
      setOffices(prev => prev.map(o => o.id === id ? { ...o, is_active: !current } : o))
    } catch (err) { console.error(err) }
    setActionLoading(null)
  }

  const toggleJoinCode = async (id: string, current: boolean) => {
    setActionLoading(`code-${id}`)
    try {
      await supabase.from('offices').update({ join_code_active: !current }).eq('id', id)
      setOffices(prev => prev.map(o => o.id === id ? { ...o, join_code_active: !current } : o))
    } catch (err) { console.error(err) }
    setActionLoading(null)
  }

  const regenerateCode = async (officeId: string) => {
    setActionLoading(`regen-${officeId}`)
    try {
      const data = await adminCall({ action: 'regenerate_join_code', office_id: officeId })
      setOffices(prev => prev.map(o => o.id === officeId ? { ...o, join_code: data.join_code } : o))
    } catch (err) { alert((err as Error).message) }
    setActionLoading(null)
  }

  const createOffice = async () => {
    if (!newOfficeName.trim()) return
    setActionLoading('create-office')
    try {
      await adminCall({ action: 'create_office', name: newOfficeName.trim(), max_users: parseInt(newOfficeMaxUsers) || 4 })
      setNewOfficeName('')
      setNewOfficeMaxUsers('4')
      await loadData()
    } catch (err) { alert((err as Error).message) }
    setActionLoading(null)
  }

  const updateRole = async (userId: string, newRole: string) => {
    setActionLoading(`role-${userId}`)
    try {
      await adminCall({ action: 'update_role', user_id: userId, new_role: newRole })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } catch (err) { alert((err as Error).message) }
    setActionLoading(null)
  }

  const resetPassword = async (userId: string, displayName: string) => {
    const newPass = prompt(`كلمة مرور جديدة لـ ${displayName}:`)
    if (!newPass || newPass.length < 6) { alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return }
    setActionLoading(`pw-${userId}`)
    try {
      await adminCall({ action: 'reset_password', user_id: userId, new_password: newPass })
      alert('تم تغيير كلمة المرور بنجاح')
    } catch (err) { alert((err as Error).message) }
    setActionLoading(null)
  }

  const deactivateUser = async (userId: string, name: string) => {
    if (!confirm(`هل أنت متأكد من تعطيل حساب ${name}؟`)) return
    setActionLoading(`deact-${userId}`)
    try {
      await adminCall({ action: 'deactivate_user', user_id: userId })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: false } : u))
    } catch (err) { alert((err as Error).message) }
    setActionLoading(null)
  }

  const addWorkplace = async () => {
    if (!newWorkplaceName.trim()) return
    try {
      const { data, error } = await supabase.from('workplaces').insert({ name: newWorkplaceName.trim() }).select().single()
      if (error) throw error
      if (data) { setWorkplaces(prev => [...prev, data]); setNewWorkplaceName('') }
    } catch (err) { console.error(err) }
  }

  const addBank = async () => {
    if (!newBankName.trim()) return
    try {
      const { data, error } = await supabase.from('banks').insert({ name: newBankName.trim() }).select().single()
      if (error) throw error
      if (data) { 
        setBanks(prev => [...prev, data])
        setNewBankName('')
        if (!selectedBankId) setSelectedBankId(data.id)
      }
    } catch (err) { console.error(err) }
  }

  const deleteBank = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف مصرف ${name}؟ سيتم حذف جميع الفروع المرتبطة به.`)) return
    try {
      const { error } = await supabase.from('banks').delete().eq('id', id)
      if (error) throw error
      setBanks(prev => prev.filter(b => b.id !== id))
      setBranches(prev => prev.filter(br => br.bank_id !== id))
      if (selectedBankId === id) setSelectedBankId(banks.find(b => b.id !== id)?.id || '')
    } catch (err) { console.error(err) }
  }

  const addBranch = async () => {
    if (!newBranchName.trim() || !selectedBankId) return
    try {
      const { data, error } = await supabase.from('branches').insert({ 
        name: newBranchName.trim(), 
        bank_id: selectedBankId,
        region: newBranchRegion.trim()
      }).select().single()
      if (error) throw error
      if (data) { 
        setBranches(prev => [...prev, data])
        setNewBranchName('')
        setNewBranchRegion('')
      }
    } catch (err) { console.error(err) }
  }

  const deleteBranch = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الفرع؟')) return
    try {
      const { error } = await supabase.from('branches').delete().eq('id', id)
      if (error) throw error
      setBranches(prev => prev.filter(br => br.id !== id))
    } catch (err) { console.error(err) }
  }

  // Stats
  const activeOffices = offices.filter(o => o.is_active).length
  const totalUsers = users.filter(u => u.is_active).length

  const tabs: { id: Tab; label: string; icon: typeof Building2; count?: number }[] = [
    { id: 'offices', label: 'المكاتب', icon: Building2, count: offices.length },
    { id: 'users', label: 'المستخدمين', icon: Users, count: totalUsers },
    { id: 'workplaces', label: 'جهات العمل', icon: LayoutDashboard, count: workplaces.length },
    { id: 'banks', label: 'المصارف والفروع', icon: Building2, count: banks.length },
    { id: 'codes', label: 'أكواد الانضمام', icon: Key, count: offices.length },
  ]

  return (
    <div className="admin-container">
      <div className="calc-header">
        <div className="calc-icon-wrap" style={{ background: 'linear-gradient(135deg, hsl(350, 65%, 50%), hsl(350, 65%, 35%))', color: '#fff' }}>
          <LayoutDashboard size={28} />
        </div>
        <div>
          <h2>لوحة تحكم المدير العام</h2>
          <p className="calc-subtitle">إدارة المكاتب، المستخدمين، وأكواد الانضمام</p>
        </div>
      </div>

      {/* Stats */}
      <div className="admin-stats">
        <div className="stat-card"><Building2 size={20} /><div><span className="stat-value">{activeOffices}/{offices.length}</span><span className="stat-label">مكاتب نشطة</span></div></div>
        <div className="stat-card"><Users size={20} /><div><span className="stat-value">{totalUsers}</span><span className="stat-label">مستخدم نشط</span></div></div>
        <div className="stat-card"><Key size={20} /><div><span className="stat-value">{offices.filter(o => o.join_code_active).length}</span><span className="stat-label">أكواد نشطة</span></div></div>
        <div className="stat-card"><LayoutDashboard size={20} /><div><span className="stat-value">{workplaces.length}</span><span className="stat-label">جهة عمل</span></div></div>
      </div>

      {/* Tab Nav */}
      <div className="admin-section-toggle">
        {tabs.map(t => (
          <button key={t.id} className={`toggle-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            <t.icon size={16} />
            {t.label} {t.count !== undefined && `(${t.count})`}
          </button>
        ))}
      </div>

      {/* ===================== OFFICES TAB ===================== */}
      {activeTab === 'offices' && (
        <div>
          {/* Create Office */}
          <div className="add-workplace-row">
            <input 
              type="text" 
              placeholder="اسم المكتب الجديد..." 
              value={newOfficeName} 
              onChange={e => setNewOfficeName(e.target.value)} 
              className="workplace-input" 
              style={{ flex: 2 }} 
            />
            <input 
              type="number" 
              placeholder="الحد" 
              value={newOfficeMaxUsers} 
              onChange={e => setNewOfficeMaxUsers(e.target.value)} 
              className="workplace-input" 
              style={{ width: '100px', textAlign: 'center' }} 
              min={1} 
              max={20} 
            />
            <button className="btn btn-primary" onClick={createOffice} disabled={!newOfficeName.trim() || actionLoading === 'create-office'}>
              <Plus size={18} /> إنشاء مكتب
            </button>
          </div>

          <div className="admin-table-wrap">
            <table className="monitor-table">
              <thead><tr><th>المكتب</th><th>المستخدمين</th><th>رمز الانضمام</th><th>الرمز</th><th>الحالة</th></tr></thead>
              <tbody>
                {offices.map(office => (
                  <tr key={office.id} className={!office.is_active ? 'row-disabled' : ''}>
                    <td className="cell-name">{office.name}</td>
                    <td>
                      <span className={`badge ${(office.user_count || 0) >= office.max_users ? 'badge-error' : ''}`}>
                        {office.user_count || 0}/{office.max_users}
                      </span>
                    </td>
                    <td>
                      <div className="flex-center gap-2">
                        <code className={`join-code-display ${office.join_code_active ? 'active' : 'inactive'}`}>
                          {office.join_code}
                        </code>
                        <button className="btn-icon" onClick={() => copyCode(office.join_code)} title="نسخ">
                          <Copy size={16} />
                        </button>
                        {copied === office.join_code && <span className="text-success text-xs">✓</span>}
                      </div>
                    </td>
                    <td>
                      <div className="flex-center gap-2">
                        <button className="btn-icon" onClick={() => toggleJoinCode(office.id, office.join_code_active)} disabled={actionLoading === `code-${office.id}`} title={office.join_code_active ? 'تعطيل الرمز' : 'تفعيل الرمز'}>
                          {office.join_code_active ? <ShieldCheck size={20} className="text-success" /> : <ShieldOff size={20} className="text-tertiary" />}
                        </button>
                        <button className="btn-icon" onClick={() => regenerateCode(office.id)} disabled={actionLoading === `regen-${office.id}`} title="تجديد الرمز">
                          <RefreshCw size={16} />
                        </button>
                      </div>
                    </td>
                    <td>
                      <button className="status-toggle" onClick={() => toggleOfficeStatus(office.id, office.is_active)} title={office.is_active ? 'تعطيل' : 'تفعيل'}>
                        {office.is_active ? <ToggleRight size={24} style={{ color: 'var(--success)' }} /> : <ToggleLeft size={24} style={{ color: 'var(--text-tertiary)' }} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== USERS TAB ===================== */}
      {activeTab === 'users' && (
        <div className="admin-table-wrap">
          <table className="monitor-table">
            <thead><tr><th>الاسم</th><th>رقم الهاتف</th><th>المكتب</th><th>الدور</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {users.map(u => {
                const rl = ROLE_LABELS[u.role] || { label: u.role, color: 'var(--text-tertiary)' }
                return (
                  <tr key={u.id} className={!u.is_active ? 'row-disabled' : ''}>
                    <td className="cell-name">{u.display_name}</td>
                    <td dir="ltr" style={{ textAlign: 'right' }}>{u.phone || '—'}</td>
                    <td>{u.office_name}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="badge" style={{ background: `${rl.color}15`, color: rl.color }}>{rl.label}</span>
                        {u.is_active && u.role !== 'admin' && (
                          <div style={{ position: 'relative' }}>
                            <select
                              value={u.role}
                              onChange={e => updateRole(u.id, e.target.value)}
                              disabled={actionLoading === `role-${u.id}`}
                              style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer', width: '100%' }}
                            >
                              {u.office_id ? (
                                <>
                                  <option value="manager">مدير مكتب</option>
                                  <option value="accountant">محاسب</option>
                                  <option value="staff">إدخال بيانات</option>
                                </>
                              ) : (
                                <>
                                  <option value="monitor">مراقب</option>
                                  <option value="admin">مدير عام</option>
                                </>
                              )}
                            </select>
                            <ChevronDown size={14} style={{ color: 'var(--text-tertiary)', cursor: 'pointer' }} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ color: u.is_active ? 'var(--success)' : 'var(--error)', fontSize: '0.85rem' }}>
                        {u.is_active ? 'نشط' : 'معطّل'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {u.is_active && u.role !== 'admin' && (
                          <>
                            <button className="btn-icon" onClick={() => resetPassword(u.id, u.display_name)} disabled={actionLoading === `pw-${u.id}`} title="إعادة تعيين كلمة المرور">
                              <Lock size={14} />
                            </button>
                            <button className="btn-icon" onClick={() => deactivateUser(u.id, u.display_name)} disabled={actionLoading === `deact-${u.id}`} title="تعطيل الحساب" style={{ color: 'var(--error)' }}>
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ===================== WORKPLACES TAB ===================== */}
      {activeTab === 'workplaces' && (
        <div className="workplaces-section">
          <div className="add-workplace-row" style={{ marginBottom: '1.5rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input 
                type="text" 
                placeholder="بحث عن جهة عمل..." 
                value={workplaceSearch} 
                onChange={e => setWorkplaceSearch(e.target.value)} 
                className="workplace-input"
                style={{ paddingRight: '35px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
              <input type="text" placeholder="أضف جهة عمل جديدة..." value={newWorkplaceName} onChange={e => setNewWorkplaceName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addWorkplace()} className="workplace-input" />
              <button className="btn btn-primary btn-sm" onClick={addWorkplace} disabled={!newWorkplaceName.trim()}>
                <Plus size={14} /> إضافة
              </button>
            </div>
          </div>
          <div className="workplace-list">
            {workplaces
              .filter(wp => wp.name.toLowerCase().includes(workplaceSearch.toLowerCase()))
              .map(wp => (
                <div key={wp.id} className="workplace-chip"><Building2 size={14} />{wp.name}</div>
              ))}
            {workplaces.filter(wp => wp.name.toLowerCase().includes(workplaceSearch.toLowerCase())).length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                لا توجد نتائج بحث
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== BANKS TAB ===================== */}
      {activeTab === 'banks' && (
        <div className="banks-section">
          <div className="bank-management-grid">
            {/* Banks List */}
            <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px' }}>
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={20} /> المصارف
              </h3>
              
              <div className="search-bar" style={{ marginBottom: '1rem', position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input 
                  type="text" 
                  placeholder="بحث عن مصرف..." 
                  value={bankSearch} 
                  onChange={e => setBankSearch(e.target.value)} 
                  className="workplace-input"
                  style={{ paddingRight: '35px', fontSize: '0.85rem' }}
                />
              </div>

              <div className="add-workplace-row" style={{ marginBottom: '1rem' }}>
                <input 
                  type="text" 
                  placeholder="اسم المصرف..." 
                  value={newBankName} 
                  onChange={e => setNewBankName(e.target.value)} 
                  className="workplace-input" 
                />
                <button className="btn btn-primary btn-sm" onClick={addBank} disabled={!newBankName.trim()}>
                  <Plus size={14} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {banks
                  .filter(b => b.name.toLowerCase().includes(bankSearch.toLowerCase()))
                  .map(bank => (
                  <div 
                    key={bank.id} 
                    className={`workplace-chip ${selectedBankId === bank.id ? 'active' : ''}`}
                    onClick={() => setSelectedBankId(bank.id)}
                    style={{ 
                      justifyContent: 'space-between', 
                      cursor: 'pointer',
                      background: selectedBankId === bank.id ? 'var(--primary)' : 'var(--bg-secondary)',
                      color: selectedBankId === bank.id ? '#fff' : 'var(--text-primary)'
                    }}
                  >
                    <span>{bank.name}</span>
                    <button 
                      className="btn-icon" 
                      onClick={(e) => { e.stopPropagation(); deleteBank(bank.id, bank.name) }}
                      style={{ color: selectedBankId === bank.id ? '#fff' : 'var(--error)', padding: '2px' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Branches List */}
            <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px' }}>
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LayoutDashboard size={20} /> فروع {banks.find(b => b.id === selectedBankId)?.name || 'المصرف'}
              </h3>
              {selectedBankId ? (
                <>
                  <div className="branch-controls" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                    {/* Search Branch */}
                    <div className="search-bar" style={{ position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                      <input 
                        type="text" 
                        placeholder="بحث عن فرع..." 
                        value={branchSearch} 
                        onChange={e => setBranchSearch(e.target.value)} 
                        className="workplace-input"
                        style={{ paddingRight: '35px', fontSize: '0.85rem' }}
                      />
                    </div>

                    {/* Add Branch */}
                    <div className="add-workplace-row">
                    <input 
                      type="text" 
                      placeholder="اسم الفرع..." 
                      value={newBranchName} 
                      onChange={e => setNewBranchName(e.target.value)} 
                      className="workplace-input" 
                      style={{ flex: 2 }}
                    />
                    <input 
                      type="text" 
                      placeholder="المنطقة (اختياري)" 
                      value={newBranchRegion} 
                      onChange={e => setNewBranchRegion(e.target.value)} 
                      className="workplace-input" 
                      style={{ flex: 1 }}
                    />
                    <button className="btn btn-primary btn-sm" onClick={addBranch} disabled={!newBranchName.trim()}>
                      <Plus size={14} /> إضافة فرع
                    </button>
                  </div>
                </div>
                <div className="admin-table-wrap" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table className="monitor-table">
                      <thead>
                        <tr>
                          <th>الفرع</th>
                          <th>المنطقة</th>
                          <th style={{ width: '50px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {branches
                          .filter(br => br.bank_id === selectedBankId && br.name.toLowerCase().includes(branchSearch.toLowerCase()))
                          .map(branch => (
                            <tr key={branch.id}>
                              <td>{branch.name}</td>
                              <td>{branch.region || '—'}</td>
                              <td>
                                <button className="btn-icon" onClick={() => deleteBranch(branch.id)} style={{ color: 'var(--error)' }}>
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        {branches.filter(br => br.bank_id === selectedBankId).length === 0 && (
                          <tr>
                            <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                              لا توجد فروع مضافة لهذا المصرف
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                  اختر مصرفاً لعرض وإدارة فروعه
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== JOIN CODES TAB ===================== */}
      {activeTab === 'codes' && (
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {offices.map(o => (
            <div key={o.id} className="glass" style={{ padding: '1.5rem', borderRadius: '16px', border: `1px solid ${o.join_code_active && o.is_active ? 'var(--primary)' : 'var(--border-color)'}`, opacity: o.is_active ? 1 : 0.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 600 }}>{o.name}</span>
                <span style={{ fontSize: '0.8rem', color: o.join_code_active ? 'var(--success)' : 'var(--error)' }}>
                  {o.join_code_active ? '● نشط' : '● معطّل'}
                </span>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px', marginBottom: '1rem' }}>
                <code style={{ fontSize: '2rem', letterSpacing: '0.3em', fontWeight: 700, color: 'var(--primary)' }}>{o.join_code}</code>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', justifyContent: 'space-between' }}>
                <span>{o.user_count || 0}/{o.max_users} مستخدم</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-icon" onClick={() => copyCode(o.join_code)} title="نسخ">
                    <Copy size={14} /> {copied === o.join_code ? '✓' : 'نسخ'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
