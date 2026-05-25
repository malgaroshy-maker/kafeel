import { useState, useEffect, useCallback } from 'react'
import { Users, Shield, ToggleLeft, ToggleRight, Search, ChevronDown, Key } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface UserProfile {
  id: string
  display_name: string
  role: string
  is_active: boolean
  created_at: string
  phone?: string
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  manager: { label: 'مدير مكتب', color: 'var(--primary)' },
  accountant: { label: 'محاسب', color: 'var(--success)' },
  staff: { label: 'إدخال بيانات', color: 'var(--text-tertiary)' },
}

export default function OfficeTeamManagement() {
  const { session, officeId } = useAuth()
  const [team, setTeam] = useState<UserProfile[]>([])
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<{ id: string; name: string } | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const loadTeam = useCallback(async () => {
    if (!officeId) return
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('office_id', officeId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setTeam(data || [])
    } catch (err) {
      console.error('Error loading team:', err)
    }
  }, [officeId])

  useEffect(() => { loadTeam() }, [loadTeam])

  // Helper to call Edge Function
  const manageUserCall = async (body: Record<string, unknown>) => {
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
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean, name: string) => {
    if (currentStatus && !confirm(`هل أنت متأكد من تعطيل حساب ${name}؟ لن يتمكن من الدخول للمنظومة.`)) return
    
    // Limit checks during activation (switching from deactivated to active)
    if (!currentStatus) {
      const targetUser = team.find(u => u.id === userId)
      if (targetUser) {
        if (targetUser.role === 'manager') {
          const hasActiveManager = team.some(u => u.role === 'manager' && u.is_active && u.id !== userId)
          if (hasActiveManager) {
            alert('لقد بلغت الحد الأقصى (مدير نشط واحد فقط للمكتب حالياً)')
            return
          }
        }
        if (targetUser.role === 'accountant') {
          const hasActiveAccountant = team.some(u => u.role === 'accountant' && u.is_active && u.id !== userId)
          if (hasActiveAccountant) {
            alert('لقد بلغت الحد الأقصى (محاسب نشط واحد فقط للمكتب حالياً)')
            return
          }
        }
      }
    }

    setActionLoading(`status-${userId}`)
    try {
      if (currentStatus) {
        // Deactivate via Edge Function
        await manageUserCall({ action: 'deactivate_user', user_id: userId })
      } else {
        // Activate
        const { error } = await supabase.from('user_profiles').update({ is_active: true }).eq('id', userId)
        if (error) {
           await manageUserCall({ action: 'update_role', user_id: userId, new_role: team.find(t=>t.id===userId)?.role })
           alert('تفعيل الحسابات المعطلة يحتاج صلاحية المالك حالياً.')
           throw error;
        }
      }
      setTeam(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u))
    } catch (err) { 
      console.error(err) 
    }
    setActionLoading(null)
  }

  const updateRole = async (userId: string, newRole: string) => {
    // Role changes limits verification
    if (newRole === 'manager') {
      const hasActiveManager = team.some(u => u.role === 'manager' && u.is_active && u.id !== userId)
      if (hasActiveManager) {
        alert('لقد بلغت الحد الأقصى (مدير واحد فقط للمكتب)')
        return
      }
    }
    if (newRole === 'accountant') {
      const hasActiveAccountant = team.some(u => u.role === 'accountant' && u.is_active && u.id !== userId)
      if (hasActiveAccountant) {
        alert('لقد بلغت الحد الأقصى (محاسب واحد فقط للمكتب)')
        return
      }
    }

    setActionLoading(`role-${userId}`)
    try {
      await manageUserCall({ action: 'update_role', user_id: userId, new_role: newRole })
      setTeam(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } catch (err) { 
      alert((err as Error).message) 
    }
    setActionLoading(null)
  }

  const resetPassword = (userId: string, displayName: string) => {
    setSelectedUserForPassword({ id: userId, name: displayName })
    setNewPassword('')
    setPasswordError('')
  }

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    if (!selectedUserForPassword) return
    
    if (newPassword.length < 6) {
      setPasswordError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }

    setActionLoading(`pw-${selectedUserForPassword.id}`)
    try {
      await manageUserCall({ action: 'reset_password', user_id: selectedUserForPassword.id, new_password: newPassword })
      alert(`تم تعيين كلمة المرور الجديدة للموظف ${selectedUserForPassword.name} بنجاح!`)
      setSelectedUserForPassword(null)
      setNewPassword('')
    } catch (err) {
      setPasswordError((err as Error).message)
    }
    setActionLoading(null)
  }

  const activeCount = team.filter(t => t.is_active).length

  return (
    <div className="fade-in" style={{ padding: '1rem' }}>
      <div className="section-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Users size={24} style={{ color: 'var(--primary)' }} />
            إدارة فريق العمل
          </h2>
          <p className="text-tertiary" style={{ margin: '0.5rem 0 0 0' }}>
            إدارة صلاحيات الموظفين، تفعيل الحسابات الجديدة، وإيقاف الموظفين.
          </p>
        </div>
        <div className="glass" style={{ padding: '0.5rem 1rem', borderRadius: '12px', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>إجمالي الفريق:</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{team.length}</span>
          <span style={{ borderLeft: '1px solid var(--border-color)', height: '20px' }}></span>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>النشطين:</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--success)' }}>{activeCount}</span>
        </div>
      </div>

      <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px' }}>
        <div style={{ position: 'relative', marginBottom: '1.5rem', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input 
            type="text" 
            placeholder="بحث باسم الموظف أو رقم الهاتف..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field"
            style={{ paddingRight: '40px', background: 'var(--bg-primary)' }}
          />
        </div>

        <div className="admin-table-wrap">
          <table className="monitor-table">
            <thead>
              <tr>
                <th>اسم الموظف</th>
                <th>رقم الهاتف</th>
                <th>تاريخ الانضمام</th>
                <th>الصلاحية (الدور)</th>
                <th>حالة الحساب</th>
                <th style={{ textAlign: 'center' }}>كلمة المرور</th>
              </tr>
            </thead>
            <tbody>
              {team
                .filter(u => u.display_name.includes(search) || (u.phone && u.phone.includes(search)))
                .map(user => {
                const rl = ROLE_LABELS[user.role] || { label: 'غير معروف', color: 'var(--text-tertiary)' }
                return (
                  <tr key={user.id} className={!user.is_active ? 'row-disabled' : ''}>
                    <td style={{ fontWeight: 'bold' }}>{user.display_name}</td>
                    <td dir="ltr" style={{ textAlign: 'right' }}>{user.phone || '—'}</td>
                    <td>{new Date(user.created_at).toLocaleDateString('ar-LY')}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="badge" style={{ background: `${rl.color}15`, color: rl.color }}>
                          <Shield size={12} style={{ marginRight: '4px' }} />
                          {rl.label}
                        </span>
                        {user.is_active && (
                          <div style={{ position: 'relative' }}>
                            <select
                              value={user.role}
                              onChange={e => updateRole(user.id, e.target.value)}
                              disabled={actionLoading === `role-${user.id}`}
                              style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer', width: '100%' }}
                            >
                              <option value="manager">مدير مكتب</option>
                              <option value="accountant">محاسب</option>
                              <option value="staff">إدخال بيانات</option>
                            </select>
                            <ChevronDown size={14} style={{ color: 'var(--text-tertiary)', cursor: 'pointer' }} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ color: user.is_active ? 'var(--success)' : 'var(--error)', fontSize: '0.9rem', fontWeight: 500 }}>
                          {user.is_active ? 'نشط' : 'معطّل (أو بانتظار التفعيل)'}
                        </span>
                        <button 
                          className="btn-icon" 
                          onClick={() => toggleUserStatus(user.id, user.is_active, user.display_name)} 
                          disabled={actionLoading === `status-${user.id}`}
                          title={user.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                        >
                          {user.is_active ? <ToggleRight size={28} style={{ color: 'var(--success)' }} /> : <ToggleLeft size={28} style={{ color: 'var(--text-tertiary)' }} />}
                        </button>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {user.is_active && (
                        <button 
                          className="btn btn-ghost btn-sm"
                          onClick={() => resetPassword(user.id, user.display_name)}
                          disabled={actionLoading === `pw-${user.id}`}
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '0.35rem', 
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.8rem',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--primary)'
                          }}
                        >
                          <Key size={14} />
                          <span>تعيين كلمة المرور</span>
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {team.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                    لا يوجد موظفين مسجلين حالياً
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Reset Password Modal */}
      {selectedUserForPassword && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--surface)',
            border: '2px solid var(--glass-border)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '450px',
            padding: '2rem',
            boxShadow: 'var(--shadow-lg)',
            position: 'relative',
            direction: 'rtl'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '1.5rem', borderBottom: '2px solid var(--glass-border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Key size={20} style={{ color: 'var(--primary)' }} />
              <span>تعيين كلمة مرور جديدة</span>
            </h3>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              أدخل كلمة المرور الجديدة للموظف: <strong style={{ color: 'var(--primary)' }}>{selectedUserForPassword.name}</strong>
            </p>

            <form onSubmit={handleResetPasswordSubmit}>
              <div className="input-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  placeholder="أدخل 6 أرقام أو حروف على الأقل..."
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '8px', border: '1.5px solid var(--glass-border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', textAlign: 'right' }}
                  autoFocus
                  required
                />
              </div>

              {passwordError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
                  <span>{passwordError}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '1.5rem' }}>
                <button
                  type="submit"
                  disabled={actionLoading === `pw-${selectedUserForPassword.id}`}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.65rem 1rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {actionLoading === `pw-${selectedUserForPassword.id}` ? 'جاري الحفظ...' : 'تأكيد الحفظ'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUserForPassword(null)}
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '0.65rem 1rem', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', borderRadius: '8px', background: 'transparent', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
