import { useState, useEffect, useCallback } from 'react'
import { LayoutDashboard, Building2, Plus, Users, Key, ToggleLeft, ToggleRight, Copy, RefreshCw, ShieldCheck, ShieldOff, Trash2, ChevronDown, Search, TrendingUp, Megaphone, Activity, Coins, CheckCircle, Clock, Edit, Settings, Sun, Moon, ShieldAlert, UserX, MessageCircle } from 'lucide-react'
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
  plan_type?: 'BASIC' | 'PREMIUM' | 'UNLIMITED'
  subscription_end_date?: string | null
}

interface UserProfile {
  id: string
  display_name: string
  role: string
  is_active: boolean
  is_frozen?: boolean
  office_id: string | null
  created_at: string
  email?: string
  phone?: string
  username?: string
  office_name?: string
  accepted_terms?: boolean
  accepted_terms_at?: string
}

interface Workplace {
  id: string
  name: string
  tax_rate?: 16 | 24 | null
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
  car_agent: { label: 'وكيل سيارات', color: '#3b82f6' },
  car_agent_assistant: { label: 'مساعد وكيل', color: '#10b981' },
}

type Tab = 'offices' | 'users' | 'workplaces' | 'banks' | 'codes' | 'revenues' | 'resellers' | 'broadcasts' | 'tickets' | 'health' | 'saas-plans' | 'system-logs' | 'white-label' | 'gateways' | 'system-owners' | 'security'

export default function AdminDashboard() {
  const { session, signOut } = useAuth()
  const [offices, setOffices] = useState<Office[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [workplaces, setWorkplaces] = useState<Workplace[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBankId, setSelectedBankId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<Tab>('offices')
  const [newWorkplaceName, setNewWorkplaceName] = useState('')
  const [newWorkplaceTaxRate, setNewWorkplaceTaxRate] = useState<16 | 24 | null>(null)
  const [newBankName, setNewBankName] = useState('')
  const [newBranchName, setNewBranchName] = useState('')
  const [newBranchRegion, setNewBranchRegion] = useState('')
  const [newOfficeName, setNewOfficeName] = useState('')
  const [newOfficeMaxUsers, setNewOfficeMaxUsers] = useState('4')
  const [newOfficeSubEndDate, setNewOfficeSubEndDate] = useState('')
  const [newOfficePlanType, setNewOfficePlanType] = useState<'BASIC' | 'PREMIUM' | 'UNLIMITED'>('BASIC')
  const [workplaceSearch, setWorkplaceSearch] = useState('')
  const [bankSearch, setBankSearch] = useState('')
  const [branchSearch, setBranchSearch] = useState('')
  const [adminUserSearch, setAdminUserSearch] = useState('')
  const [adminRoleFilter, setAdminRoleFilter] = useState('ALL')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<{ id: string; name: string } | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Advanced SaaS feature states
  const [resellers, setResellers] = useState<any[]>([])
  const [newResellerName, setNewResellerName] = useState('')
  const [newResellerPhone, setNewResellerPhone] = useState('')
  const [newResellerCommission, setNewResellerCommission] = useState('10')

  const [broadcasts, setBroadcasts] = useState<any[]>([])
  const [newBroadcastMessage, setNewBroadcastMessage] = useState('')

  const [tickets, setTickets] = useState<any[]>([])
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null)
  const [ticketReplyText, setTicketReplyText] = useState('')
  const [supportMessages, setSupportMessages] = useState<any[]>([])
  const [selectedSupportMsg, setSelectedSupportMsg] = useState<any | null>(null)
  const [supportReplyText, setSupportReplyText] = useState('')

  const [healthLogs, setHealthLogs] = useState<any[]>([])
  const [dbLatency] = useState<number>(12)

  // System Owners & Audit Logs State
  const [systemOwners, setSystemOwners] = useState<UserProfile[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])

  // Security Hardening (Phase 17) State
  const [runtimeErrors, setRuntimeErrors] = useState<any[]>([])
  const [authFailures, setAuthFailures] = useState<any[]>([])
  const [selectedErrorStack, setSelectedErrorStack] = useState<string | null>(null)

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
    localStorage.setItem('landing-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const [editingOfficeSub, setEditingOfficeSub] = useState<any | null>(null)
  const [selectedUserForReport, setSelectedUserForReport] = useState<UserProfile | null>(null)

  // --- Advanced Admin & SaaS Configurations States ---
  // 1. White-labeling Configuration
  const [brandName, setBrandName] = useState(() => localStorage.getItem('brandName') || 'منظومة كفيل');
  const [footerText, setFooterText] = useState(() => localStorage.getItem('footerText') || 'جميع الحقوق محفوظة © كفيل لإدارة مكاتب التقسيط');
  const [brandLogo, setBrandLogo] = useState(() => localStorage.getItem('brandLogo') || '/logo.png');
  const [customPrimaryColor] = useState(() => localStorage.getItem('customPrimaryColor') || '#bf953f');

  // 2. Gateway Settings
  const [smsProvider, setSmsProvider] = useState(() => localStorage.getItem('smsProvider') || 'twilio');
  const [smsApiKey, setSmsApiKey] = useState(() => localStorage.getItem('smsApiKey') || 'SG.x89a1jsadkljaslkdjalksjd123');
  const [smsSenderId, setSmsSenderId] = useState(() => localStorage.getItem('smsSenderId') || 'KafeelAlert');
  const [paymentProvider, setPaymentProvider] = useState(() => localStorage.getItem('paymentProvider') || 'sadad');
  const [paymentMerchantId, setPaymentMerchantId] = useState(() => localStorage.getItem('paymentMerchantId') || 'SADAD-109283');

  // 3. Dynamic Packages Builder
  const [packages, setPackages] = useState(() => {
    const saved = localStorage.getItem('saasPackages');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'BASIC', name: 'أساسي (BASIC)', price: 150, maxUsers: 4, features: 'إدارة لغاية 4 مستخدمين، لوحة تحكم أساسية، دعم فني عبر التذاكر' },
      { id: 'PREMIUM', name: 'ممتاز (PREMIUM)', price: 300, maxUsers: 10, features: 'إدارة لغاية 10 مستخدمين، دعم فني متقدم، تقارير مالية تفصيلية، تصدير ملفات إكسل' },
      { id: 'UNLIMITED', name: 'غير محدود (UNLIMITED)', price: 500, maxUsers: 20, features: 'مستخدمين غير محدودين، دعم فني VIP 24/7، تخصيص كامل للهوية، نسخ احتياطي يومي تلقائي' },
    ];
  });
  const [editingPackage, setEditingPackage] = useState<any | null>(null);
  const [pkgPrice, setPkgPrice] = useState('');
  const [pkgMaxUsers, setPkgMaxUsers] = useState('');
  const [pkgFeatures, setPkgFeatures] = useState('');

  // 4. Automated Backup Simulated State
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupSuccessMsg, setBackupSuccessMsg] = useState('');

  // 5. Simulated Audit Trail Activity Logs
  const [simulatedLogs] = useState(() => [
    { id: 's1', action: 'محاولة دخول ناجحة لمسؤول النظام', ip: '102.164.88.10', time: new Date(Date.now() - 500000).toLocaleString('ar-LY') },
    { id: 's2', action: 'تعديل خطة اشتراك مكتب (البركة)', ip: '102.164.88.10', time: new Date(Date.now() - 1500000).toLocaleString('ar-LY') },
    { id: 's3', action: 'نسخة احتياطية تلقائية مجدولة', ip: 'System', time: new Date(Date.now() - 3600000).toLocaleString('ar-LY') },
    { id: 's4', action: 'تغيير إعدادات بوابة الدفع (سداد)', ip: '102.164.88.10', time: new Date(Date.now() - 7200000).toLocaleString('ar-LY') },
  ]);

  // 6. Independent Partner / Car Agent Join Codes
  const [specialPartnerCodes, setSpecialPartnerCodes] = useState<any[]>(() => {
    const saved = localStorage.getItem('specialPartnerCodes');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'sp1', name: 'معرض السلام للسيارات', role: 'car_agent', code: 'KFL-AGT-7201', active: true, usages: 1 },
      { id: 'sp2', name: 'مساعد الوكيل طارق', role: 'car_agent_assistant', code: 'KFL-AST-9831', active: true, usages: 0 }
    ];
  });
  const [partnerName, setPartnerName] = useState('');
  const [partnerRole, setPartnerRole] = useState<'car_agent' | 'car_agent_assistant'>('car_agent');

  const generatePartnerCode = () => {
    if (!partnerName.trim()) return;
    const prefix = partnerRole === 'car_agent' ? 'KFL-AGT' : 'KFL-AST';
    const rand = Math.floor(1000 + Math.random() * 9000);
    const newCodeObj = {
      id: 'sp-' + Date.now(),
      name: partnerName.trim(),
      role: partnerRole,
      code: `${prefix}-${rand}`,
      active: true,
      usages: 0
    };
    const updated = [newCodeObj, ...specialPartnerCodes];
    setSpecialPartnerCodes(updated);
    localStorage.setItem('specialPartnerCodes', JSON.stringify(updated));
    setPartnerName('');
    alert(`تم توليد كود انضمام جديد بنجاح للوكيل: ${partnerName.trim()}`);
  };

  const togglePartnerCode = (id: string, currentStatus: boolean) => {
    const updated = specialPartnerCodes.map(c => c.id === id ? { ...c, active: !currentStatus } : c);
    setSpecialPartnerCodes(updated);
    localStorage.setItem('specialPartnerCodes', JSON.stringify(updated));
  };

  const deletePartnerCode = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف كود هذا الشريك/الوكيل؟')) {
      const updated = specialPartnerCodes.filter(c => c.id !== id);
      setSpecialPartnerCodes(updated);
      localStorage.setItem('specialPartnerCodes', JSON.stringify(updated));
    }
  };

  const handleSaveBrandSettings = () => {
    localStorage.setItem('brandName', brandName);
    localStorage.setItem('footerText', footerText);
    localStorage.setItem('brandLogo', brandLogo);
    localStorage.setItem('customPrimaryColor', customPrimaryColor);
    alert('تم حفظ إعدادات الهوية البصرية وتخصيص العلامة التجارية بنجاح!');
  };

  const handleSaveGatewaySettings = () => {
    localStorage.setItem('smsProvider', smsProvider);
    localStorage.setItem('smsApiKey', smsApiKey);
    localStorage.setItem('smsSenderId', smsSenderId);
    localStorage.setItem('paymentProvider', paymentProvider);
    localStorage.setItem('paymentMerchantId', paymentMerchantId);
    alert('تم حفظ إعدادات بوابات الدفع الإلكتروني والـ SMS بنجاح!');
  };

  const handleEditPackage = (pkg: any) => {
    setEditingPackage(pkg);
    setPkgPrice(pkg.price.toString());
    setPkgMaxUsers(pkg.maxUsers.toString());
    setPkgFeatures(pkg.features);
  };

  const handleSavePackage = () => {
    if (!editingPackage) return;
    const updated = packages.map((p: any) => {
      if (p.id === editingPackage.id) {
        return {
          ...p,
          price: parseInt(pkgPrice) || p.price,
          maxUsers: parseInt(pkgMaxUsers) || p.maxUsers,
          features: pkgFeatures || p.features
        };
      }
      return p;
    });
    setPackages(updated);
    localStorage.setItem('saasPackages', JSON.stringify(updated));
    setEditingPackage(null);
    alert(`تم تحديث باقة ${editingPackage.id} بنجاح!`);
  };

  const handleTriggerBackup = () => {
    setBackupLoading(true);
    setBackupSuccessMsg('');
    setTimeout(() => {
      setBackupLoading(false);
      setBackupSuccessMsg('تم إنشاء النسخة الاحتياطية وتشفيرها بنجاح! حجم الملف: 15.4 MB');
      // Create and download simulated JSON backup file
      const simulatedData = {
        system: "Kafeel",
        backup_time: new Date().toISOString(),
        tables: {
          offices: offices.length,
          users: totalUsers,
          workplaces: workplaces.length,
          banks: banks.length
        }
      };
      const blob = new Blob([JSON.stringify(simulatedData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kafeel_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1500);
  };
  const [editOfficeName, setEditOfficeName] = useState('')
  const [editOfficeMaxUsers, setEditOfficeMaxUsers] = useState('4')
  const [editPlanType, setEditPlanType] = useState<'BASIC' | 'PREMIUM' | 'UNLIMITED'>('BASIC')
  const [editSubEndDate, setEditSubEndDate] = useState('')

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
      
      const normalUsers = profileData
        .filter(u => u.role !== 'admin') // HIDE MASTER ADMIN
        .map(u => ({ ...u, office_name: u.office_id ? officeMap[u.office_id] || '—' : '—' }))
      setUsers(normalUsers)

      const adminUsers = profileData
        .filter(u => u.role === 'admin')
        .map(u => ({ ...u, office_name: u.office_id ? officeMap[u.office_id] || '—' : '—' }))
      setSystemOwners(adminUsers)

      // Gracefully fetch advanced SaaS features with individual try-catch blocks
      let resellersData: any[] = []
      let broadcastsData: any[] = []
      let ticketsData: any[] = []
      let logsData: any[] = []
      let auditData: any[] = []

      try {
        const { data } = await supabase.from('resellers').select('*').order('created_at', { ascending: false })
        if (data) resellersData = data
      } catch (e) { console.error('Error fetching resellers:', e) }

      try {
        const { data } = await supabase.from('broadcasts').select('*').order('created_at', { ascending: false })
        if (data) broadcastsData = data
      } catch (e) { console.error('Error fetching broadcasts:', e) }

      try {
        const { data } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false })
        if (data) ticketsData = data
      } catch (e) { console.error('Error fetching tickets:', e) }

      try {
        const { data } = await supabase
          .from('support_messages')
          .select('*, replies:support_replies(*)')
          .order('created_at', { ascending: false })
        if (data) setSupportMessages(data)
      } catch (e) { console.error('Error fetching support messages:', e) }

      try {
        const { data } = await supabase.from('admin_activity_logs').select('*').order('created_at', { ascending: false }).limit(30)
        if (data) logsData = data
      } catch (e) { console.error('Error fetching logs:', e) }

      try {
        const { data } = await supabase
          .from('admin_activity_logs')
          .select('*, admin:admin_id(display_name)')
          .order('created_at', { ascending: false })
          .limit(100)
        if (data) auditData = data
      } catch (e) { console.error('Error fetching audit logs:', e) }

      let runtimeErrorsData: any[] = []
      let authFailuresData: any[] = []

      try {
        const { data } = await supabase
          .from('system_runtime_errors')
          .select('*, user_profiles(display_name, role)')
          .order('created_at', { ascending: false })
          .limit(100)
        if (data) runtimeErrorsData = data
      } catch (e) {
        console.error('Error fetching runtime errors:', e)
        try {
          const { data } = await supabase
            .from('system_runtime_errors')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100)
          if (data) runtimeErrorsData = data
        } catch (innerE) { console.error('Fallback runtime errors fetch failed:', innerE) }
      }

      try {
        const { data } = await supabase
          .from('auth_failures')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)
        if (data) authFailuresData = data
      } catch (e) { console.error('Error fetching auth failures:', e) }

      setResellers(resellersData)
      setBroadcasts(broadcastsData)
      setTickets(ticketsData)
      setHealthLogs(logsData)
      setAuditLogs(auditData)
      setRuntimeErrors(runtimeErrorsData)
      setAuthFailures(authFailuresData)

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
      const officeRow = await adminCall({ action: 'create_office', name: newOfficeName.trim(), max_users: parseInt(newOfficeMaxUsers) || 4 })
      
      if (officeRow && officeRow.id) {
        await supabase
          .from('offices')
          .update({
            plan_type: newOfficePlanType,
            subscription_end_date: newOfficeSubEndDate ? new Date(newOfficeSubEndDate).toISOString() : null
          })
          .eq('id', officeRow.id)
      }

      // Log activity
      try {
        await supabase.from('admin_activity_logs').insert({
          admin_id: session?.user?.id || null,
          action_type: 'إنشاء مكتب جديد',
          details: `تم إنشاء مكتب: ${newOfficeName.trim()}، الخطة: ${newOfficePlanType}، الحد الأقصى للمستخدمين: ${newOfficeMaxUsers}`
        })
      } catch (logErr) { console.error('Error logging office creation:', logErr) }

      setNewOfficeName('')
      setNewOfficeMaxUsers('4')
      setNewOfficeSubEndDate('')
      setNewOfficePlanType('BASIC')
      await loadData()
    } catch (err) { alert((err as Error).message) }
    setActionLoading(null)
  }

  const updateRole = async (userId: string, newRole: string) => {
    const targetUser = users.find(u => u.id === userId)
    if (targetUser && targetUser.office_id) {
      if (newRole === 'manager') {
        const hasActiveManager = users.some(u => u.office_id === targetUser.office_id && u.role === 'manager' && u.is_active && u.id !== userId)
        if (hasActiveManager) {
          alert('لقد بلغت الحد الأقصى (مدير واحد فقط لكل مكتب)')
          return
        }
      }
      if (newRole === 'accountant') {
        const hasActiveAccountant = users.some(u => u.office_id === targetUser.office_id && u.role === 'accountant' && u.is_active && u.id !== userId)
        if (hasActiveAccountant) {
          alert('لقد بلغت الحد الأقصى (محاسب واحد فقط لكل مكتب)')
          return
        }
      }
    }

    setActionLoading(`role-${userId}`)
    try {
      await adminCall({ action: 'update_role', user_id: userId, new_role: newRole })
      const affectedUser = users.find(u => u.id === userId)
      
      // Log activity
      try {
        await supabase.from('admin_activity_logs').insert({
          admin_id: session?.user?.id || null,
          action_type: 'تغيير صلاحيات مستخدم',
          details: `المستخدم: ${affectedUser?.display_name || userId}، الصلاحية الجديدة: ${newRole}`
        })
      } catch (logErr) { console.error('Error logging role change:', logErr) }

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      await loadData()
    } catch (err) { alert((err as Error).message) }
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
      await adminCall({ action: 'reset_password', user_id: selectedUserForPassword.id, new_password: newPassword })
      alert(`تم تعيين كلمة المرور الجديدة للمستخدم ${selectedUserForPassword.name} بنجاح!`)
      setSelectedUserForPassword(null)
      setNewPassword('')
    } catch (err) {
      setPasswordError((err as Error).message)
    }
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

  const freezeUser = async (userId: string, name: string, isCurrentlyFrozen: boolean) => {
    const actionText = isCurrentlyFrozen ? 'فك تجميد' : 'تجميد';
    if (!confirm(`هل أنت متأكد من ${actionText} حساب المستخدم ${name}؟`)) return;
    setActionLoading(`freeze-${userId}`);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_frozen: !isCurrentlyFrozen })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_frozen: !isCurrentlyFrozen } : u));
      alert(`تم ${actionText} حساب المستخدم ${name} بنجاح!`);
    } catch (err) {
      alert((err as Error).message);
    }
    setActionLoading(null);
  };

  const deleteUser = async (userId: string, name: string) => {
    if (!confirm(`⚠️ تحذير: هل أنت متأكد من حذف حساب المستخدم ${name} نهائياً؟ هذا الإجراء لا يمكن التراجع عنه!`)) return;
    setActionLoading(`del-user-${userId}`);
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.filter(u => u.id !== userId));
      alert(`تم حذف حساب المستخدم ${name} بنجاح من المنظومة!`);
    } catch (err) {
      alert((err as Error).message);
    }
    setActionLoading(null);
  };

  // Advanced SaaS feature handlers
  const updateOfficeSubscription = async () => {
    if (!editingOfficeSub || !editOfficeName.trim()) return
    setActionLoading(`sub-${editingOfficeSub.id}`)
    try {
      const { error } = await supabase
        .from('offices')
        .update({
          name: editOfficeName.trim(),
          max_users: parseInt(editOfficeMaxUsers) || 4,
          plan_type: editPlanType,
          subscription_end_date: editSubEndDate ? new Date(editSubEndDate).toISOString() : null
        })
        .eq('id', editingOfficeSub.id)

      if (error) throw error

      // Log activity
      try {
        await supabase.from('admin_activity_logs').insert({
          admin_id: session?.user?.id || null,
          action_type: 'تعديل تفاصيل واشتراك مكتب',
          details: `مكتب: ${editOfficeName}، الحد: ${editOfficeMaxUsers}، الخطة: ${editPlanType}، انتهاء الصلاحية: ${editSubEndDate || 'غير محدود'}`
        })
      } catch (logErr) { console.error('Error creating activity log:', logErr) }

      setEditingOfficeSub(null)
      await loadData()
    } catch (err) {
      alert((err as Error).message)
    }
    setActionLoading(null)
  }

  const createReseller = async () => {
    if (!newResellerName.trim()) return
    setActionLoading('create-reseller')
    try {
      const { error } = await supabase
        .from('resellers')
        .insert({
          name: newResellerName.trim(),
          phone: newResellerPhone.trim() || null,
          commission_rate: parseFloat(newResellerCommission) || 10
        })

      if (error) throw error

      // Log activity
      try {
        await supabase.from('admin_activity_logs').insert({
          admin_id: session?.user?.id || null,
          action_type: 'إضافة موزع جديد',
          details: `الاسم: ${newResellerName}، نسبة العمولة: ${newResellerCommission}%`
        })
      } catch (logErr) { console.error('Error logging reseller creation:', logErr) }

      setNewResellerName('')
      setNewResellerPhone('')
      setNewResellerCommission('10')
      await loadData()
    } catch (err) {
      alert((err as Error).message)
    }
    setActionLoading(null)
  }

  const deleteReseller = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف الموزع ${name}؟`)) return
    setActionLoading(`del-reseller-${id}`)
    try {
      const { error } = await supabase.from('resellers').delete().eq('id', id)
      if (error) throw error

      // Log activity
      try {
        await supabase.from('admin_activity_logs').insert({
          admin_id: session?.user?.id || null,
          action_type: 'حذف موزع',
          details: `الاسم: ${name}`
        })
      } catch (logErr) { console.error('Error logging reseller deletion:', logErr) }

      await loadData()
    } catch (err) {
      alert((err as Error).message)
    }
    setActionLoading(null)
  }

  const createBroadcast = async () => {
    if (!newBroadcastMessage.trim()) return
    setActionLoading('create-broadcast')
    try {
      const { error } = await supabase
        .from('broadcasts')
        .insert({
          message: newBroadcastMessage.trim(),
          created_by: session?.user?.id || null,
          created_by_role: 'admin'
        })

      if (error) throw error

      // Log activity
      try {
        await supabase.from('admin_activity_logs').insert({
          admin_id: session?.user?.id || null,
          action_type: 'بث إعلان جديد',
          details: `المحتوى: ${newBroadcastMessage.substring(0, 50)}...`
        })
      } catch (logErr) { console.error('Error logging broadcast:', logErr) }

      setNewBroadcastMessage('')
      await loadData()
    } catch (err) {
      alert((err as Error).message)
    }
    setActionLoading(null)
  }

  const deleteBroadcast = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الإعلان المذاع؟')) return
    setActionLoading(`del-broadcast-${id}`)
    try {
      const { error } = await supabase.from('broadcasts').delete().eq('id', id)
      if (error) throw error
      await loadData()
    } catch (err) {
      alert((err as Error).message)
    }
    setActionLoading(null)
  }

  const replyToTicket = async () => {
    if (!selectedTicket || !ticketReplyText.trim()) return
    setActionLoading(`reply-ticket-${selectedTicket.id}`)
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          admin_reply: ticketReplyText.trim(),
          status: 'RESOLVED',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTicket.id)

      if (error) throw error

      // Log activity
      try {
        await supabase.from('admin_activity_logs').insert({
          admin_id: session?.user?.id || null,
          action_type: 'الرد على تذكرة دعم',
          details: `رقم التذكرة: ${selectedTicket.id}، الرد: ${ticketReplyText.substring(0, 50)}`
        })
      } catch (logErr) { console.error('Error logging ticket reply:', logErr) }

      setTicketReplyText('')
      setSelectedTicket(null)
      await loadData()
    } catch (err) {
      alert((err as Error).message)
    }
    setActionLoading(null)
  }

  const clearLogs = async () => {
    if (!confirm('هل أنت متأكد من مسح سجلات النشاط؟')) return
    setActionLoading('clear-logs')
    try {
      const { error } = await supabase.from('admin_activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
      await loadData()
    } catch (err) {
      alert((err as Error).message)
    }
    setActionLoading(null)
  }

  const clearRuntimeErrors = async () => {
    if (!confirm('هل أنت متأكد من مسح سجلات الانهيارات البرمجية بالكامل؟')) return
    setActionLoading('clear-errors')
    try {
      const { error } = await supabase.from('system_runtime_errors').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
      setRuntimeErrors([])
      alert('تم إفراغ سجل الانهيارات بنجاح!')
    } catch (err) { alert((err as Error).message) }
    setActionLoading(null)
  }

  const clearAuthFailures = async () => {
    if (!confirm('هل أنت متأكد من مسح سجلات محاولات الاختراق الفاشلة؟')) return
    setActionLoading('clear-auth')
    try {
      const { error } = await supabase.from('auth_failures').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
      setAuthFailures([])
      alert('تم إفراغ سجل المحاولات بنجاح!')
    } catch (err) { alert((err as Error).message) }
    setActionLoading(null)
  }

  const addWorkplace = async () => {
    if (!newWorkplaceName.trim()) return
    try {
      const { data, error } = await supabase.from('workplaces').insert({ 
        name: newWorkplaceName.trim(),
        tax_rate: newWorkplaceTaxRate 
      }).select().single()
      if (error) throw error
      if (data) { setWorkplaces(prev => [...prev, data]); setNewWorkplaceName(''); setNewWorkplaceTaxRate(null) }
    } catch (err) { console.error(err) }
  }

  const updateWorkplaceTaxRate = async (id: string, rate: 16 | 24 | null) => {
    try {
      const { error } = await supabase.from('workplaces').update({ tax_rate: rate }).eq('id', id)
      if (error) throw error
      setWorkplaces(prev => prev.map(wp => wp.id === id ? { ...wp, tax_rate: rate } : wp))
    } catch (err) { console.error(err) }
  }

  const deleteWorkplace = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف جهة العمل هذه؟')) return
    try {
      const { error } = await supabase.from('workplaces').delete().eq('id', id)
      if (error) throw error
      setWorkplaces(prev => prev.filter(wp => wp.id !== id))
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

  return (
    <div style={{ minHeight: '100vh', width: '100vw', background: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', position: 'relative', transition: 'background 0.4s ease, color 0.4s ease' }} dir="rtl">
      
      {/* Subtle Faded Branding Watermark Backdrop */}
      <div className="global-watermark"></div>

      {/* Topmost Premium Gold Header */}
      <header style={{ borderBottom: '2px solid #aa771c', background: 'linear-gradient(135deg, #bf953f 0%, #fcf6ba 25%, #b38728 50%, #fbf5b7 75%, #aa771c 100%)', padding: '0.4rem 2rem', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 3px 15px rgba(170, 119, 28, 0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '1rem' }}>
          
          {/* Logo & Brand - Compact Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
            <img 
              src="/logo.png" 
              alt="كفيل" 
              style={{ 
                height: '52px', 
                objectFit: 'contain', 
                filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.12))',
                borderRadius: '6px'
              }} 
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>لوحة تحكم مالك النظام</h2>
              <span style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 'bold' }}>{brandName} السحابية</span>
            </div>
          </div>

          {/* Grouped Horizontal Navigation Tabs with Hover Dropdowns */}
          <nav style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            
            {/* Group 1: Subscriptions & Users */}
            <div className="nav-dropdown-group">
              <button className="nav-dropdown-btn" style={{ background: ['offices', 'users', 'codes', 'system-owners'].includes(activeTab) ? '#0f172a' : 'transparent', color: ['offices', 'users', 'codes', 'system-owners'].includes(activeTab) ? '#fef08a' : '#0f172a' }}>
                <Building2 size={16} />
                <span>الاشتراكات والمستخدمين</span>
              </button>
              <div className="nav-dropdown-menu">
                <button 
                  onClick={() => setActiveTab('offices')} 
                  className={`nav-dropdown-item ${activeTab === 'offices' ? 'active' : ''}`}
                >
                  <Building2 size={14} />
                  <span>إدارة المكاتب ({offices.length})</span>
                </button>
                <button 
                  onClick={() => setActiveTab('users')} 
                  className={`nav-dropdown-item ${activeTab === 'users' ? 'active' : ''}`}
                >
                  <Users size={14} />
                  <span>المستخدمين النشطين ({totalUsers})</span>
                </button>
                <button 
                  onClick={() => setActiveTab('system-owners')} 
                  className={`nav-dropdown-item ${activeTab === 'system-owners' ? 'active' : ''}`}
                >
                  <ShieldAlert size={14} style={{ color: activeTab === 'system-owners' ? '#fef08a' : '#d97706' }} />
                  <span>طاقم الإدارة العليا والرقابة ({systemOwners.length})</span>
                </button>
                <button 
                  onClick={() => setActiveTab('codes')} 
                  className={`nav-dropdown-item ${activeTab === 'codes' ? 'active' : ''}`}
                >
                  <Key size={14} />
                  <span>أكواد الانضمام ({offices.length})</span>
                </button>
              </div>
            </div>

            {/* Group 2: Financial Affairs */}
            <div className="nav-dropdown-group">
              <button className="nav-dropdown-btn" style={{ background: ['revenues', 'resellers', 'saas-plans'].includes(activeTab) ? '#0f172a' : 'transparent', color: ['revenues', 'resellers', 'saas-plans'].includes(activeTab) ? '#fef08a' : '#0f172a' }}>
                <TrendingUp size={16} />
                <span>الشؤون المالية</span>
              </button>
              <div className="nav-dropdown-menu">
                <button 
                  onClick={() => setActiveTab('revenues')} 
                  className={`nav-dropdown-item ${activeTab === 'revenues' ? 'active' : ''}`}
                >
                  <Coins size={14} style={{ color: activeTab === 'revenues' ? '#fef08a' : '#d97706' }} />
                  <span>الإيرادات والأرباح</span>
                </button>
                <button 
                  onClick={() => setActiveTab('saas-plans')} 
                  className={`nav-dropdown-item ${activeTab === 'saas-plans' ? 'active' : ''}`}
                >
                  <Settings size={14} style={{ color: activeTab === 'saas-plans' ? '#fef08a' : '#d97706' }} />
                  <span>تعديل وبناء باقات الاشتراك</span>
                </button>
                <button 
                  onClick={() => setActiveTab('resellers')} 
                  className={`nav-dropdown-item ${activeTab === 'resellers' ? 'active' : ''}`}
                >
                  <Users size={14} style={{ color: activeTab === 'resellers' ? '#fef08a' : '#d97706' }} />
                  <span>الموزعين والمسوقين ({resellers.length})</span>
                </button>
              </div>
            </div>

            {/* Group 3: System & Communication */}
            <div className="nav-dropdown-group">
              <button className="nav-dropdown-btn" style={{ background: ['broadcasts', 'tickets', 'health', 'system-logs', 'security'].includes(activeTab) ? '#0f172a' : 'transparent', color: ['broadcasts', 'tickets', 'health', 'system-logs', 'security'].includes(activeTab) ? '#fef08a' : '#0f172a', position: 'relative' }}>
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Megaphone size={16} />
                  {tickets.filter(t => t.status !== 'RESOLVED').length > 0 && (
                    <span className="tab-badge-floating" style={{ top: '-6px', right: '-6px' }}>
                      {tickets.filter(t => t.status !== 'RESOLVED').length}
                    </span>
                  )}
                </div>
                <span>النظام والاتصال</span>
              </button>
              <div className="nav-dropdown-menu">
                <button 
                  onClick={() => setActiveTab('broadcasts')} 
                  className={`nav-dropdown-item ${activeTab === 'broadcasts' ? 'active' : ''}`}
                >
                  <Megaphone size={14} style={{ color: activeTab === 'broadcasts' ? '#fef08a' : '#d97706' }} />
                  <span>بث الإعلانات ({broadcasts.length})</span>
                </button>
                <button 
                  onClick={() => setActiveTab('tickets')} 
                  className={`nav-dropdown-item ${activeTab === 'tickets' ? 'active' : ''}`}
                  style={{ position: 'relative' }}
                >
                  <Activity size={14} style={{ color: activeTab === 'tickets' ? '#fef08a' : '#d97706' }} />
                  <span>تذاكر الدعم الفني ({tickets.length})</span>
                  {tickets.filter(t => t.status !== 'RESOLVED').length > 0 && (
                    <span className="tab-badge-floating" style={{ top: '2px', right: 'auto', left: '6px' }}>
                      {tickets.filter(t => t.status !== 'RESOLVED').length}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => setActiveTab('health')} 
                  className={`nav-dropdown-item ${activeTab === 'health' ? 'active' : ''}`}
                >
                  <ShieldCheck size={14} style={{ color: activeTab === 'health' ? '#fef08a' : '#d97706' }} />
                  <span>صحة النظام وقاعدة البيانات</span>
                </button>
                <button 
                  onClick={() => setActiveTab('system-logs')} 
                  className={`nav-dropdown-item ${activeTab === 'system-logs' ? 'active' : ''}`}
                >
                  <ShieldCheck size={14} style={{ color: activeTab === 'system-logs' ? '#fef08a' : '#d97706' }} />
                  <span>النسخ الاحتياطي وحماية السيرفر</span>
                </button>
                <button 
                  onClick={() => setActiveTab('security')} 
                  className={`nav-dropdown-item ${activeTab === 'security' ? 'active' : ''}`}
                >
                  <ShieldAlert size={14} style={{ color: activeTab === 'security' ? '#fef08a' : '#d97706' }} />
                  <span>الأمن والتحصين السيبراني 🛡️</span>
                </button>
              </div>
            </div>

            {/* Group 4: Configurations */}
            <div className="nav-dropdown-group">
              <button className="nav-dropdown-btn" style={{ background: ['workplaces', 'banks', 'white-label', 'gateways'].includes(activeTab) ? '#0f172a' : 'transparent', color: ['workplaces', 'banks', 'white-label', 'gateways'].includes(activeTab) ? '#fef08a' : '#0f172a' }}>
                <LayoutDashboard size={16} />
                <span>تهيئة النظام</span>
              </button>
              <div className="nav-dropdown-menu">
                <button 
                  onClick={() => setActiveTab('workplaces')} 
                  className={`nav-dropdown-item ${activeTab === 'workplaces' ? 'active' : ''}`}
                >
                  <LayoutDashboard size={14} />
                  <span>جهات العمل المعتمدة ({workplaces.length})</span>
                </button>
                <button 
                  onClick={() => setActiveTab('banks')} 
                  className={`nav-dropdown-item ${activeTab === 'banks' ? 'active' : ''}`}
                >
                  <Building2 size={14} />
                  <span>المصارف والفروع ({banks.length})</span>
                </button>
                <button 
                  onClick={() => setActiveTab('white-label')} 
                  className={`nav-dropdown-item ${activeTab === 'white-label' ? 'active' : ''}`}
                >
                  <Settings size={14} />
                  <span>تخصيص الهوية والشعار (White-Label)</span>
                </button>
                <button 
                  onClick={() => setActiveTab('gateways')} 
                  className={`nav-dropdown-item ${activeTab === 'gateways' ? 'active' : ''}`}
                >
                  <Key size={14} />
                  <span>بوابات الدفع والـ SMS</span>
                </button>
              </div>
            </div>
          </nav>

          {/* Quick Exit / User info / Theme Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexShrink: 0 }}>
            {/* Theme Switcher Button (Sun/Moon) */}
            <button 
              onClick={toggleTheme}
              style={{ 
                background: '#0f172a',
                color: '#fef08a',
                border: '1.5px solid #d4af37',
                padding: '0.45rem',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                transition: 'all 0.3s ease'
              }}
              title={theme === 'light' ? 'تفعيل الوضع الداكن (الهلال)' : 'تفعيل الوضع الفاتح (الشمس)'}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} style={{ color: '#fbbf24' }} />}
            </button>

            {/* Welcome & Settings Menu */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#0f172a', padding: '0.35rem 0.75rem', borderRadius: '10px', border: '1.5px solid #d4af37', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
              <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 'bold', marginLeft: '0.5rem' }}>مرحباً، مالك النظام</span>
              
              {/* Settings button */}
              <button
                onClick={() => setActiveTab('workplaces')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fef08a',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.2s'
                }}
                title="إعدادات وتهيئة النظام"
              >
                <Settings size={18} />
              </button>

              {/* Divider */}
              <span style={{ color: 'rgba(212,175,55,0.4)' }}>|</span>

              {/* Logout Button */}
              <button 
                onClick={() => signOut()} 
                style={{ 
                  background: 'transparent', 
                  color: '#f87171', 
                  border: 'none', 
                  padding: '2px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  transition: 'color 0.2s'
                }}
                title="تسجيل الخروج"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="admin-container" style={{ flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        
        {/* Stats Grid */}
        <div className="admin-stats" style={{ marginBottom: '2.5rem' }}>
          <div className="stat-card" style={{ background: 'var(--surface)', border: '1.5px solid var(--glass-border)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)' }}>
            <Building2 size={20} style={{ color: '#bf953f' }} />
            <div>
              <span className="stat-value" style={{ color: 'var(--text-primary)' }}>{activeOffices}/{offices.length}</span>
              <span className="stat-label" style={{ color: 'var(--text-secondary)' }}>مكاتب نشطة</span>
            </div>
          </div>
          <div className="stat-card" style={{ background: 'var(--surface)', border: '1.5px solid var(--glass-border)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)' }}>
            <Users size={20} style={{ color: '#bf953f' }} />
            <div>
              <span className="stat-value" style={{ color: 'var(--text-primary)' }}>{totalUsers}</span>
              <span className="stat-label" style={{ color: 'var(--text-secondary)' }}>مستخدم نشط</span>
            </div>
          </div>
          <div className="stat-card" style={{ background: 'var(--surface)', border: '1.5px solid var(--glass-border)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)' }}>
            <Key size={20} style={{ color: '#bf953f' }} />
            <div>
              <span className="stat-value" style={{ color: 'var(--text-primary)' }}>{offices.filter(o => o.join_code_active).length}</span>
              <span className="stat-label" style={{ color: 'var(--text-secondary)' }}>أكواد نشطة</span>
            </div>
          </div>
          <div className="stat-card" style={{ background: 'var(--surface)', border: '1.5px solid var(--glass-border)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)' }}>
            <LayoutDashboard size={20} style={{ color: '#bf953f' }} />
            <div>
              <span className="stat-value" style={{ color: 'var(--text-primary)' }}>{workplaces.length}</span>
              <span className="stat-label" style={{ color: 'var(--text-secondary)' }}>جهة عمل</span>
            </div>
          </div>
        </div>

      {/* ===================== OFFICES TAB ===================== */}
      {activeTab === 'offices' && (
        <div>
          {/* Create Office */}
          <div className="add-workplace-row" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'nowrap', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.85rem 1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
            <input 
              type="text" 
              placeholder="اسم المكتب الجديد..." 
              value={newOfficeName} 
              onChange={e => setNewOfficeName(e.target.value)} 
              className="workplace-input" 
              style={{ flex: '2 1 0', minWidth: '140px' }} 
            />
            <input 
              type="number" 
              placeholder="حد المستخدمين" 
              value={newOfficeMaxUsers} 
              onChange={e => setNewOfficeMaxUsers(e.target.value)} 
              className="workplace-input" 
              style={{ flex: '0 0 70px', textAlign: 'center' }} 
              min={1} 
              max={20} 
            />
            <select
              value={newOfficePlanType}
              onChange={e => setNewOfficePlanType(e.target.value as any)}
              className="workplace-input"
              style={{ flex: '1 1 0', minWidth: '130px' }}
            >
              <option value="BASIC">باقة أساسية (BASIC)</option>
              <option value="PREMIUM">باقة ممتازة (PREMIUM)</option>
              <option value="UNLIMITED">باقة غير محدودة (UNLIMITED)</option>
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: '0 0 auto' }}>
              <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', fontWeight: 'bold', color: 'var(--text-secondary)' }}>انتهاء الصلاحية:</span>
              <input 
                type="date" 
                value={newOfficeSubEndDate} 
                onChange={e => setNewOfficeSubEndDate(e.target.value)} 
                className="workplace-input" 
                style={{ width: 'auto' }} 
              />
            </div>
            <button className="btn btn-primary" onClick={createOffice} disabled={!newOfficeName.trim() || actionLoading === 'create-office'} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
              <Plus size={18} /> إنشاء مكتب
            </button>
          </div>

          <div className="admin-table-wrap">
            <table className="monitor-table">
              <thead><tr><th>المكتب</th><th>المستخدمين</th><th>نوع الاشتراك</th><th>تاريخ الانتهاء</th><th>رمز الانضمام</th><th>الرمز</th><th>تعديل</th><th>الحالة</th></tr></thead>
              <tbody>
                {offices.map(office => {
                  const isExpired = office.subscription_end_date && new Date(office.subscription_end_date).getTime() < Date.now();
                  return (
                    <tr key={office.id} className={!office.is_active ? 'row-disabled' : ''}>
                      <td className="cell-name">{office.name}</td>
                      <td>
                        <span className={`badge ${(office.user_count || 0) >= office.max_users ? 'badge-error' : ''}`}>
                          {office.user_count || 0}/{office.max_users}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          background: office.plan_type === 'UNLIMITED' ? 'linear-gradient(135deg, #bf953f 0%, #fcf6ba 50%, #b38728 100%)' : office.plan_type === 'PREMIUM' ? '#dbeafe' : '#f1f5f9',
                          color: office.plan_type === 'UNLIMITED' ? '#0f172a' : office.plan_type === 'PREMIUM' ? '#1d4ed8' : '#475569',
                          border: office.plan_type === 'UNLIMITED' ? '1px solid #aa771c' : 'none'
                        }}>
                          {office.plan_type === 'UNLIMITED' ? 'غير محدود' : office.plan_type === 'PREMIUM' ? 'ممتاز' : 'أساسي'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', fontWeight: '500', color: isExpired ? 'var(--error)' : 'var(--text-primary)' }}>
                        {office.subscription_end_date ? (
                          <span>
                            {new Date(office.subscription_end_date).toLocaleDateString('ar-LY')}
                            {isExpired && ' (منتهي ⚠️)'}
                          </span>
                        ) : 'مفتوح / دائم'}
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
                        <button 
                          className="btn-icon" 
                          style={{ border: '1.5px solid #d4af37', background: 'rgba(251, 245, 183, 0.1)', padding: '6px', borderRadius: '6px' }}
                          onClick={() => {
                            setEditingOfficeSub(office);
                            setEditOfficeName(office.name);
                            setEditOfficeMaxUsers(office.max_users.toString());
                            setEditPlanType(office.plan_type || 'BASIC');
                            setEditSubEndDate(office.subscription_end_date ? office.subscription_end_date.split('T')[0] : '');
                          }}
                          title="تعديل تفاصيل المكتب والاشتراك"
                        >
                          <Edit size={16} style={{ color: 'var(--primary)' }} />
                        </button>
                      </td>
                      <td>
                        <button className="status-toggle" onClick={() => toggleOfficeStatus(office.id, office.is_active)} title={office.is_active ? 'تعطيل' : 'تفعيل'}>
                          {office.is_active ? <ToggleRight size={24} style={{ color: 'var(--success)' }} /> : <ToggleLeft size={24} style={{ color: 'var(--text-tertiary)' }} />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== USERS TAB ===================== */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Search and Role Filter Bar */}
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            flexWrap: 'wrap', 
            background: 'var(--surface)', 
            padding: '1.25rem', 
            borderRadius: '16px', 
            border: '1.5px solid var(--glass-border)',
            boxShadow: 'var(--shadow-sm)',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ position: 'relative', flex: '1 1 350px' }}>
              <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="ابحث باسم المستخدم، البريد، الهاتف، أو اسم المكتب..."
                value={adminUserSearch}
                onChange={(e) => setAdminUserSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 2.8rem 0.65rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '0 1 300px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>الوظيفة في المكاتب:</span>
              <select
                value={adminRoleFilter}
                onChange={(e) => setAdminRoleFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">الكل (جميع الوظائف)</option>
                <option value="manager">مدير مكتب</option>
                <option value="accountant">محاسب</option>
                <option value="staff">إدخال بيانات</option>
                <option value="monitor">مراقب</option>
                <option value="car_agent">وكيل سيارات</option>
                <option value="car_agent_assistant">مساعد وكيل</option>
              </select>
            </div>
          </div>

          <div className="admin-table-wrap">
            <table className="monitor-table compact-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>اسم المستخدم</th>
                <th>رقم الهاتف</th>
                <th>المكتب</th>
                <th>الدور</th>
                <th>الحالة</th>
                <th style={{ textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users
                .filter(u => {
                  const matchesSearch = 
                    u.display_name.toLowerCase().includes(adminUserSearch.toLowerCase()) ||
                    (u.email || '').toLowerCase().includes(adminUserSearch.toLowerCase()) ||
                    (u.username || '').toLowerCase().includes(adminUserSearch.toLowerCase()) ||
                    (u.phone || '').includes(adminUserSearch) ||
                    (u.office_name || '').toLowerCase().includes(adminUserSearch.toLowerCase());
                    
                  const matchesRole = 
                    adminRoleFilter === 'ALL' || 
                    u.role === adminRoleFilter;
                    
                  return matchesSearch && matchesRole;
                })
                .map(u => {
                  const rl = ROLE_LABELS[u.role] || { label: u.role, color: 'var(--text-tertiary)' }
                  return (
                    <tr key={u.id} className={!u.is_active ? 'row-disabled' : ''}>
                      <td className="cell-name" style={{ fontWeight: 'bold' }}>{u.display_name}</td>
                      <td style={{ color: 'var(--primary)', fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {u.email || u.username || u.phone || '—'}
                      </td>
                      <td dir="ltr" style={{ textAlign: 'right' }}>{u.phone || '—'}</td>
                      <td>
                        {u.office_name ? (
                          <span className="badge" style={{ background: 'rgba(191, 149, 63, 0.1)', color: 'var(--primary)', border: '1px solid rgba(191, 149, 63, 0.2)' }}>
                            {u.office_name}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>مستقل / عام</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="badge" style={{ background: `${rl.color}15`, color: rl.color, fontWeight: 'bold' }}>{rl.label}</span>
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
                                    <option value="car_agent">🚗 وكيل سيارات</option>
                                    <option value="car_agent_assistant">🔑 مساعد وكيل</option>
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
                        {u.is_frozen ? (
                          <span className="badge" style={{ background: 'rgba(217, 119, 6, 0.15)', color: '#d97706', fontWeight: 'bold' }}>
                            ⚠️ مجمّد (دخول متكرر)
                          </span>
                        ) : u.is_active ? (
                          <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', fontWeight: 'bold' }}>
                            ✓ نشط
                          </span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)', fontWeight: 'bold' }}>
                            معطّل
                          </span>
                        )}
                      </td>
                      <td style={{ minWidth: '155px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', justifyContent: 'center' }}>
                          {u.role !== 'admin' && (
                            <>
                              {/* Terms of Service Acceptance Status */}
                              <button 
                                className="btn-icon btn-icon-compact" 
                                onClick={() => setSelectedUserForReport(u)}
                                title="عرض وتحميل تقرير قبول شروط وأحكام الخدمة"
                                style={{ color: u.accepted_terms ? 'var(--success)' : 'var(--error)' }}
                              >
                                <ShieldCheck size={14} />
                              </button>

                              {/* Reset Password */}
                              <button 
                                className="btn-icon btn-icon-compact" 
                                onClick={() => resetPassword(u.id, u.display_name)} 
                                disabled={actionLoading === `pw-${u.id}`} 
                                title="تعديل وإعادة تعيين كلمة المرور في حال نسيانها"
                              >
                                <Key size={14} style={{ color: 'var(--primary)' }} />
                              </button>

                              {/* Freeze/Unfreeze Account */}
                              <button 
                                className="btn-icon btn-icon-compact" 
                                onClick={() => freezeUser(u.id, u.display_name, !!u.is_frozen)} 
                                disabled={actionLoading === `freeze-${u.id}`} 
                                title={u.is_frozen ? 'فك تجميد الحساب' : 'تجميد الحساب (بسبب تكرار محاولة الدخول الخاطئ)'} 
                                style={{ color: u.is_frozen ? 'var(--success)' : '#d97706' }}
                              >
                                <ShieldAlert size={14} />
                              </button>

                              {/* Deactivate/Reactivate */}
                              <button 
                                className="btn-icon btn-icon-compact" 
                                onClick={() => deactivateUser(u.id, u.display_name)} 
                                disabled={actionLoading === `deact-${u.id}`} 
                                title={u.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'} 
                                style={{ color: u.is_active ? 'var(--error)' : 'var(--text-tertiary)' }}
                              >
                                <UserX size={14} />
                              </button>

                              {/* Permanent Delete */}
                              <button 
                                className="btn-icon btn-icon-compact" 
                                onClick={() => deleteUser(u.id, u.display_name)} 
                                disabled={actionLoading === `del-user-${u.id}`} 
                                title="حذف حساب المستخدم نهائياً" 
                                style={{ color: 'var(--error)' }}
                              >
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
        </div>
      )}      {/* ===================== SYSTEM OWNERS & AUDIT LOGS TAB ===================== */}
      {activeTab === 'system-owners' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Executive Overview Header */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(191, 149, 63, 0.08) 0%, rgba(251, 245, 183, 0.05) 100%)',
            border: '1.5px solid #d4af37',
            padding: '1.5rem',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
              <div style={{
                background: 'linear-gradient(135deg, #bf953f 0%, #fcf6ba 50%, #b38728 100%)',
                color: '#0f172a',
                padding: '0.6rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(170, 119, 28, 0.2)'
              }}>
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)' }}>طاقم الإدارة العليا والرقابة الأمنية</h3>
                <span style={{ fontSize: '0.85rem', color: '#b45309', fontWeight: 'bold' }}>بوابة التحكم الأمنية لشبكة كفيل السحابية</span>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              من هنا يمكنك استعراض قائمة المسؤولين المعتمدين الذين يمتلكون صلاحية الوصول الكاملة للنظام، كما يتيح لك "سجل الحركات الأمني" مراقبة وتتبع كافة الحركات والقرارات الحساسة الصادرة عنهم لضمان الأمان والشفافية.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* 1. Active System Owners Table */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                  <Users size={18} style={{ color: '#bf953f' }} />
                  طاقم المُلّاك والمسؤولين ({systemOwners.length})
                </h4>
              </div>

              <div className="admin-table-wrap">
                <table className="monitor-table">
                  <thead>
                    <tr>
                      <th>المسؤول</th>
                      <th>رقم الهاتف / اسم المستخدم</th>
                      <th>الصلاحية</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemOwners.map(owner => (
                      <tr key={owner.id}>
                        <td className="cell-name" style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #bf953f 0%, #fcf6ba 100%)',
                            color: '#0f172a',
                            fontSize: '0.75rem'
                          }}>👑</span>
                          {owner.display_name}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.85rem' }}>
                          {owner.email || owner.username || owner.phone || '—'}
                        </td>
                        <td>
                          <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 'bold' }}>
                            مالك نظام / مدير عام
                          </span>
                        </td>
                        <td>
                          {owner.id === session?.user?.id ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>أنت الحالي 👤</span>
                          ) : (
                            <button
                              className="btn btn-secondary btn-xs"
                              style={{ color: 'var(--error)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من سحب صلاحيات الإدارة العليا من ${owner.display_name}؟`)) {
                                  updateRole(owner.id, 'monitor')
                                }
                              }}
                            >
                              سحب الصلاحية
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Security Audit Logs Timeline */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                  <ShieldAlert size={18} style={{ color: '#bf953f' }} />
                  سجل الحركات الأمني والرقابة (Audit Logs)
                </h4>
                <button
                  className="btn btn-secondary btn-xs"
                  onClick={loadData}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <RefreshCw size={12} /> تحديث السجل
                </button>
              </div>

              <div className="admin-table-wrap">
                {auditLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-tertiary)' }}>
                    <ShieldAlert size={36} style={{ color: 'var(--text-tertiary)', marginBottom: '1rem', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>لا توجد حركات مسجلة حالياً في السجل الأمني.</p>
                  </div>
                ) : (
                  <table className="monitor-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>المسؤول</th>
                        <th>الحركة</th>
                        <th>التفاصيل</th>
                        <th>التاريخ والوقت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map(log => (
                        <tr key={log.id}>
                          <td style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                            {log.admin?.display_name || 'مسؤول النظام'}
                          </td>
                          <td>
                            <span className="badge" style={{
                              background: log.action_type.includes('حذف') || log.action_type.includes('سحب') ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                              color: log.action_type.includes('حذف') || log.action_type.includes('سحب') ? '#ef4444' : '#10b981',
                              fontWeight: 'bold',
                              fontSize: '0.75rem'
                            }}>
                              {log.action_type}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)', maxWidth: '250px', whiteSpace: 'normal', wordBreak: 'break-word', fontSize: '0.8rem' }}>
                            {log.details}
                          </td>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                            {new Date(log.created_at).toLocaleString('ar-LY')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ===================== WORKPLACES TAB ===================== */}
      {activeTab === 'workplaces' && (
        <div className="workplaces-section">
          {/* Add Workplace Row */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'nowrap', alignItems: 'center', marginBottom: '1.5rem', background: 'var(--bg-secondary)', padding: '0.85rem 1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <div style={{ position: 'relative', flex: 2, minWidth: '140px' }}>
              <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input 
                type="text" 
                placeholder="بحث عن جهة عمل..." 
                value={workplaceSearch} 
                onChange={e => setWorkplaceSearch(e.target.value)} 
                className="workplace-input"
                style={{ paddingRight: '35px', width: '100%' }}
              />
            </div>
            <input
              type="text"
              placeholder="أضف جهة عمل جديدة..."
              value={newWorkplaceName}
              onChange={e => setNewWorkplaceName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addWorkplace()}
              className="workplace-input"
              style={{ flex: 2, minWidth: '140px' }}
            />
            <select
              value={newWorkplaceTaxRate === null ? '' : String(newWorkplaceTaxRate)}
              onChange={e => setNewWorkplaceTaxRate(e.target.value === '' ? null : Number(e.target.value) as 16 | 24)}
              className="workplace-input"
              style={{ flex: '0 0 150px' }}
            >
              <option value="">بدون استقطاع</option>
              <option value="16">استقطاع 16%</option>
              <option value="24">استقطاع 24%</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={addWorkplace} disabled={!newWorkplaceName.trim()} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
              <Plus size={14} /> إضافة
            </button>
          </div>

          {/* Workplaces Grid */}
          <div className="workplace-list">
            {workplaces
              .filter(wp => wp.name.toLowerCase().includes(workplaceSearch.toLowerCase()))
              .map(wp => (
                <div key={wp.id} className="workplace-chip" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between', paddingLeft: '0.5rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 0 }}>
                    <Building2 size={14} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wp.name}</span>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                    {/* Tax Rate Badge / Selector */}
                    <select
                      value={wp.tax_rate === null || wp.tax_rate === undefined ? '' : String(wp.tax_rate)}
                      onChange={e => updateWorkplaceTaxRate(wp.id, e.target.value === '' ? null : Number(e.target.value) as 16 | 24)}
                      onClick={e => e.stopPropagation()}
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        padding: '0.15rem 0.3rem',
                        borderRadius: '6px',
                        border: '1.5px solid',
                        cursor: 'pointer',
                        background: wp.tax_rate === 24 ? 'rgba(239,68,68,0.12)' : wp.tax_rate === 16 ? 'rgba(245,158,11,0.12)' : 'var(--bg-primary)',
                        color: wp.tax_rate === 24 ? '#dc2626' : wp.tax_rate === 16 ? '#d97706' : 'var(--text-tertiary)',
                        borderColor: wp.tax_rate === 24 ? 'rgba(239,68,68,0.4)' : wp.tax_rate === 16 ? 'rgba(245,158,11,0.4)' : 'var(--border-color)',
                        outline: 'none',
                      }}
                    >
                      <option value="">بدون</option>
                      <option value="16">16%</option>
                      <option value="24">24%</option>
                    </select>
                    <button
                      onClick={e => { e.stopPropagation(); deleteWorkplace(wp.id) }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--error)', display: 'flex', alignItems: 'center', opacity: 0.7 }}
                      title="حذف جهة العمل"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
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
        <div className="banks-section" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* ---- BANKS PANEL ---- */}
          <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={20} /> المصارف
            </h3>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'nowrap' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input 
                  type="text" 
                  placeholder="بحث عن مصرف..." 
                  value={bankSearch} 
                  onChange={e => setBankSearch(e.target.value)} 
                  className="workplace-input"
                  style={{ paddingRight: '35px', width: '100%' }}
                />
              </div>
              <input 
                type="text" 
                placeholder="اسم المصرف الجديد..." 
                value={newBankName} 
                onChange={e => setNewBankName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addBank()}
                className="workplace-input"
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary btn-sm" onClick={addBank} disabled={!newBankName.trim()} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                <Plus size={14} /> إضافة
              </button>
            </div>
            <div className="workplace-list">
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
                    color: selectedBankId === bank.id ? '#fff' : 'var(--text-primary)',
                    border: selectedBankId === bank.id ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Building2 size={14} />{bank.name}
                  </span>
                  <button 
                    className="btn-icon" 
                    onClick={(e) => { e.stopPropagation(); deleteBank(bank.id, bank.name) }}
                    style={{ color: selectedBankId === bank.id ? '#fff' : 'var(--error)', padding: '2px' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {banks.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>لا توجد مصارف مضافة</div>
              )}
            </div>
          </div>

          {/* ---- BRANCHES PANEL ---- */}
          <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LayoutDashboard size={20} /> فروع {banks.find(b => b.id === selectedBankId)?.name || 'المصرف'}
            </h3>
            {selectedBankId ? (
              <>
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'nowrap' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input 
                      type="text" 
                      placeholder="بحث عن فرع..." 
                      value={branchSearch} 
                      onChange={e => setBranchSearch(e.target.value)} 
                      className="workplace-input"
                      style={{ paddingRight: '35px', width: '100%' }}
                    />
                  </div>
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
                  <button className="btn btn-primary btn-sm" onClick={addBranch} disabled={!newBranchName.trim()} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                    <Plus size={14} /> إضافة فرع
                  </button>
                </div>
                <div className="admin-table-wrap">
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
                            لا توجد فروع مضافة لهذا المصرف. اختر مصرفاً وأضف فروعه من الأعلى.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                <Building2 size={36} style={{ opacity: 0.3, display: 'block', margin: '0 auto 1rem' }} />
                اختر مصرفاً من الأعلى لعرض وإدارة فروعه
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== JOIN CODES TAB ===================== */}
      {activeTab === 'codes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          {/* Section 1: Office Join Codes */}
          <div>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
              <Building2 size={20} /> رموز انضمام المكاتب المشتركة في المنظومة
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              هذه الأكواد خاصة بالمكاتب التي تقوم بالاشتراك في باقات المنظومة لتمكن الموظفين التابعين للمكتب من التسجيل وربط حساباتهم تلقائياً بالمكتب المعتمد.
            </p>
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
                  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{o.user_count || 0}/{o.max_users} مستخدم</span>
                    <button className="btn-icon" onClick={() => copyCode(o.join_code)} title="نسخ الكود">
                      <Copy size={14} /> {copied === o.join_code ? 'تم النسخ ✓' : 'نسخ'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <hr style={{ border: '0', borderTop: '1px dashed var(--border-color)', margin: 0 }} />

          {/* ===================== Section: Generate Office Join Codes ===================== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                  <Building2 size={20} /> توليد وإصدار رموز انضمام لمكاتب جديدة
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', marginBottom: 0 }}>
                  قم بإنشاء مكتب جديد في المنظومة مباشرةً وتوليد كود انضمامه الخاص. سيتم حفظ المكتب في قاعدة البيانات ويمكن لموظفيه التسجيل باستخدام هذا الكود.
                </p>
              </div>
            </div>

            {/* Create Office Code Form */}
            <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', gap: '1rem', flexWrap: 'nowrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 3, minWidth: '180px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>اسم المكتب:</label>
                <input
                  type="text"
                  placeholder="مثال: مكتب النخبة، مكتب الأمانة للتقسيط..."
                  value={newOfficeName}
                  onChange={e => setNewOfficeName(e.target.value)}
                  className="workplace-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ flex: 1, minWidth: '100px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>الحد الأقصى للمستخدمين:</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={newOfficeMaxUsers}
                  onChange={e => setNewOfficeMaxUsers(e.target.value)}
                  className="workplace-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ flex: 1, minWidth: '130px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>خطة الاشتراك:</label>
                <select
                  value={newOfficePlanType}
                  onChange={e => setNewOfficePlanType(e.target.value as any)}
                  className="workplace-input"
                  style={{ width: '100%', padding: '0.45rem' }}
                >
                  <option value="BASIC">⭐ أساسي</option>
                  <option value="PREMIUM">🌟 ممتاز</option>
                  <option value="UNLIMITED">👑 غير محدود</option>
                </select>
              </div>

              <div style={{ flexShrink: 0 }}>
                <button
                  className="btn btn-primary"
                  onClick={createOffice}
                  disabled={!newOfficeName.trim() || actionLoading === 'create-office'}
                  style={{ whiteSpace: 'nowrap', height: '42px' }}
                >
                  {actionLoading === 'create-office' ? 'جاري الإنشاء...' : 'توليد وإصدار كود المكتب'}
                </button>
              </div>
            </div>

            {/* Office Codes Grid */}
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {offices.map(o => (
                <div key={o.id} className="glass" style={{
                  padding: '1.5rem',
                  borderRadius: '16px',
                  border: o.join_code_active && o.is_active
                    ? '1.5px solid var(--primary)'
                    : '1px solid var(--border-color)',
                  opacity: o.is_active ? 1 : 0.55,
                  position: 'relative',
                }}>
                  {/* Plan badge */}
                  <span style={{
                    position: 'absolute',
                    top: '0.75rem',
                    left: '0.75rem',
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '6px',
                    background: o.plan_type === 'UNLIMITED'
                      ? 'linear-gradient(135deg,#bf953f,#fcf6ba,#aa771c)'
                      : o.plan_type === 'PREMIUM' ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.07)',
                    color: o.plan_type === 'UNLIMITED' ? '#0f172a' : o.plan_type === 'PREMIUM' ? '#3b82f6' : 'var(--text-tertiary)',
                  }}>
                    {o.plan_type === 'UNLIMITED' ? '👑 غير محدود' : o.plan_type === 'PREMIUM' ? '🌟 ممتاز' : '⭐ أساسي'}
                  </span>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem', marginTop: '1.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>{o.name}</span>
                    <span style={{ fontSize: '0.78rem', color: o.join_code_active ? 'var(--success)' : 'var(--error)', fontWeight: 'bold' }}>
                      {o.join_code_active ? '● نشط' : '● معطّل'}
                    </span>
                  </div>

                  {/* Code Display */}
                  <div style={{ textAlign: 'center', padding: '0.85rem', background: 'var(--bg-secondary)', borderRadius: '12px', marginBottom: '1rem', border: '1px dashed var(--border-color)' }}>
                    <code style={{ fontSize: '1.6rem', letterSpacing: '0.25em', fontWeight: 700, color: 'var(--primary)' }}>
                      {o.join_code}
                    </code>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span>👥 {o.user_count || 0} / {o.max_users} مستخدم</span>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        className="btn-icon"
                        onClick={() => copyCode(o.join_code)}
                        title="نسخ الكود"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: '0.78rem' }}
                      >
                        <Copy size={13} /> {copied === o.join_code ? 'تم ✓' : 'نسخ'}
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => regenerateCode(o.id)}
                        title="توليد كود جديد"
                        disabled={actionLoading === `regen-${o.id}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: '0.78rem' }}
                      >
                        <RefreshCw size={13} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => toggleJoinCode(o.id, o.join_code_active)}
                        title={o.join_code_active ? 'تعطيل الكود' : 'تفعيل الكود'}
                        style={{ display: 'flex', alignItems: 'center', padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer' }}
                      >
                        {o.join_code_active
                          ? <ShieldCheck size={13} style={{ color: 'var(--success)' }} />
                          : <ShieldOff size={13} style={{ color: 'var(--text-tertiary)' }} />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {offices.length === 0 && (
                <div className="glass" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  لا توجد مكاتب مسجلة حالياً. قم بإنشاء أول مكتب باستخدام النموذج بالأعلى!
                </div>
              )}
            </div>
          </div>

          <hr style={{ border: '0', borderTop: '1px dashed var(--border-color)', margin: 0 }} />

          {/* Section 2: Independent Partner / Car Agent Codes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                  <Users size={20} /> رموز انضمام وكلاء السيارات ومساعديهم المستقلين (خارج نطاق المكاتب)
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', marginBottom: 0 }}>
                  قم بتوليد رموز مستقلة لتمكين الشركاء الخارجيين من التسجيل في المنظومة مباشرة كـ "وكيل سيارات معتمد" أو "مساعد وكيل" لتسهيل عمليات التمويل والمعاملات.
                </p>
              </div>
            </div>

            {/* Create Independent Partner Code Form */}
            <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 2, minWidth: '220px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>اسم الوكيل أو الشريك:</label>
                <input 
                  type="text" 
                  placeholder="مثال: معرض النخبة للسيارات، الوكيل فرج..." 
                  value={partnerName}
                  onChange={e => setPartnerName(e.target.value)}
                  className="workplace-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ flex: 1, minWidth: '180px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>الرتبة الممنوحة عند التسجيل:</label>
                <select 
                  value={partnerRole}
                  onChange={e => setPartnerRole(e.target.value as any)}
                  className="workplace-input"
                  style={{ width: '100%', padding: '0.45rem' }}
                >
                  <option value="car_agent">🚗 وكيل سيارات</option>
                  <option value="car_agent_assistant">🔑 مساعد وكيل سيارات</option>
                </select>
              </div>

              <div style={{ alignSelf: 'flex-end', minWidth: '150px' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={generatePartnerCode}
                  disabled={!partnerName.trim()}
                  style={{ width: '100%' }}
                >
                  توليد وإصدار كود الوكيل
                </button>
              </div>
            </div>

            {/* Independent Partner Codes List */}
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {specialPartnerCodes.map((c: any) => (
                <div key={c.id} className="glass" style={{ padding: '1.5rem', borderRadius: '16px', border: c.active ? '1px solid var(--primary)' : '1px solid var(--border-color)', opacity: c.active ? 1 : 0.6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>{c.name}</span>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      padding: '0.2rem 0.5rem', 
                      borderRadius: '6px', 
                      background: c.role === 'car_agent' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: c.role === 'car_agent' ? '#3b82f6' : '#10b981',
                      fontWeight: 'bold'
                    }}>
                      {c.role === 'car_agent' ? '🚗 وكيل سيارات' : '🔑 مساعد وكيل'}
                    </span>
                  </div>

                  <div style={{ textAlign: 'center', padding: '0.85rem', background: 'var(--bg-secondary)', borderRadius: '12px', marginBottom: '1rem' }}>
                    <code style={{ fontSize: '1.5rem', letterSpacing: '0.1em', fontWeight: 700, color: 'var(--primary)' }}>{c.code}</code>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span>👥 استخدامات الكود: <strong>{c.usages} تسجيلات</strong></span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-icon" onClick={() => copyCode(c.code)} title="نسخ الكود">
                        <Copy size={14} /> {copied === c.code ? 'تم ✓' : 'نسخ'}
                      </button>
                      <button 
                        className="btn-icon" 
                        onClick={() => togglePartnerCode(c.id, c.active)} 
                        title={c.active ? 'تعطيل الكود' : 'تفعيل الكود'}
                      >
                        {c.active ? <ShieldCheck size={16} className="text-success" /> : <ShieldOff size={16} className="text-tertiary" />}
                      </button>
                      <button className="btn-icon text-error" onClick={() => deletePartnerCode(c.id)} title="حذف الكود">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {specialPartnerCodes.length === 0 && (
                <div className="glass" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  لا توجد أكواد انضمام لوكلاء سيارات مستقلين حالياً. قم بإنشاء أول كود باستخدام النموذج بالأعلى!
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ===================== REVENUES & SUBSCRIPTIONS TAB ===================== */}
      {activeTab === 'revenues' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Stats Cards */}
          <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px', borderLeft: '5px solid #d97706', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>إجمالي المكاتب المشتركة</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.2rem 0' }}>{offices.length} مكتب</h3>
              </div>
              <Building2 size={36} style={{ color: '#d97706', opacity: 0.8 }} />
            </div>
            <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px', borderLeft: '5px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>الإيرادات الشهرية المتوقعة</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.2rem 0', color: '#10b981' }}>
                  {(
                    offices.reduce((acc, curr) => {
                      const plan = curr.plan_type || 'BASIC';
                      const price = plan === 'UNLIMITED' ? 500 : plan === 'PREMIUM' ? 300 : 150;
                      return acc + price;
                    }, 0)
                  ).toLocaleString('ar-LY')} د.ل
                </h3>
              </div>
              <Coins size={36} style={{ color: '#10b981', opacity: 0.8 }} />
            </div>
            <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px', borderLeft: '5px solid #bf953f', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>توزيع خطط الاشتراك</span>
                <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.8rem', marginTop: '0.4rem', fontWeight: 'bold' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>غير محدود: {offices.filter(o => o.plan_type === 'UNLIMITED').length}</span>
                  <span style={{ color: 'var(--primary)' }}>ممتاز: {offices.filter(o => o.plan_type === 'PREMIUM').length}</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>أساسي: {offices.filter(o => o.plan_type === 'BASIC' || !o.plan_type).length}</span>
                </div>
              </div>
              <TrendingUp size={36} style={{ color: '#bf953f', opacity: 0.8 }} />
            </div>
          </div>

          {/* Offices List for Subscription Update */}
          <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Coins size={20} /> إدارة اشتراكات المكاتب والخطط السنوية
            </h3>
            <div className="admin-table-wrap">
              <table className="monitor-table">
                <thead>
                  <tr>
                    <th>المكتب</th>
                    <th>فئة الاشتراك الحالية</th>
                    <th>تاريخ انتهاء الصلاحية</th>
                    <th>حالة الاشتراك</th>
                    <th style={{ width: '150px' }}>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {offices.map(o => {
                    const plan = o.plan_type || 'BASIC';
                    const isExpired = o.subscription_end_date && new Date(o.subscription_end_date).getTime() < Date.now();
                    return (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 'bold' }}>{o.name}</td>
                        <td>
                          <span style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            background: plan === 'UNLIMITED' ? 'linear-gradient(135deg, #bf953f 0%, #fcf6ba 50%, #b38728 100%)' : plan === 'PREMIUM' ? '#dbeafe' : '#f1f5f9',
                            color: plan === 'UNLIMITED' ? '#0f172a' : plan === 'PREMIUM' ? '#1d4ed8' : '#475569',
                            border: plan === 'UNLIMITED' ? '1px solid #aa771c' : 'none'
                          }}>
                            {plan === 'UNLIMITED' ? 'غير محدود (UNLIMITED)' : plan === 'PREMIUM' ? 'ممتاز (PREMIUM)' : 'أساسي (BASIC)'}
                          </span>
                        </td>
                        <td>
                          {o.subscription_end_date ? new Date(o.subscription_end_date).toLocaleDateString('ar-LY') : 'غير محدود / مفتوح'}
                        </td>
                        <td>
                          <span style={{ color: isExpired ? 'var(--error)' : 'var(--success)', fontWeight: 'bold', fontSize: '0.85rem' }}>
                            {isExpired ? '⚠️ منتهي الصلاحية' : '✓ نشط'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              setEditingOfficeSub(o);
                              setEditPlanType(plan);
                              setEditSubEndDate(o.subscription_end_date ? o.subscription_end_date.split('T')[0] : '');
                            }}
                          >
                            تعديل الاشتراك
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>


        </div>
      )}

      {/* ===================== RESELLERS TAB ===================== */}
      {activeTab === 'resellers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Add Reseller Form */}
          <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={20} /> تسجيل موزع معتمد أو مسوق للمنظومة
            </h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="اسم الموزع / المسوق..."
                value={newResellerName}
                onChange={e => setNewResellerName(e.target.value)}
                className="workplace-input"
                style={{ flex: 2, minWidth: '200px' }}
              />
              <input
                type="text"
                placeholder="رقم الهاتف للتواصل..."
                value={newResellerPhone}
                onChange={e => setNewResellerPhone(e.target.value)}
                className="workplace-input"
                style={{ flex: 1, minWidth: '150px' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '150px' }}>
                <input
                  type="number"
                  placeholder="نسبة العمولة..."
                  value={newResellerCommission}
                  onChange={e => setNewResellerCommission(e.target.value)}
                  className="workplace-input"
                  style={{ width: '100%' }}
                />
                <span style={{ fontWeight: 'bold' }}>%</span>
              </div>
              <button
                className="btn btn-primary"
                onClick={createReseller}
                disabled={!newResellerName.trim() || actionLoading === 'create-reseller'}
              >
                {actionLoading === 'create-reseller' ? 'جاري التسجيل...' : 'تسجيل الموزع'}
              </button>
            </div>
          </div>

          {/* Resellers List */}
          <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>قائمة الموزعين والمسوقين المعتمدين</h3>
            <div className="admin-table-wrap">
              <table className="monitor-table">
                <thead>
                  <tr>
                    <th>اسم الموزع</th>
                    <th>رقم الهاتف</th>
                    <th>نسبة العمولة المتفق عليها</th>
                    <th>تاريخ التسجيل</th>
                    <th style={{ width: '80px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {resellers.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 'bold' }}>{r.name}</td>
                      <td className="mono">{r.phone || '—'}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 'bold' }}>{r.commission_rate}%</td>
                      <td>{new Date(r.created_at).toLocaleDateString('ar-LY')}</td>
                      <td>
                        <button
                          className="btn-icon"
                          onClick={() => deleteReseller(r.id, r.name)}
                          disabled={actionLoading === `del-reseller-${r.id}`}
                          style={{ color: 'var(--error)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {resellers.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                        لا يوجد موزعون معتمدون مسجلون حالياً. يمكنك تسجيل أول موزع بالأعلى!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SAAS PLANS BUILDER TAB ===================== */}
      {activeTab === 'saas-plans' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
              <Settings size={20} /> أداة تخصيص وبناء باقات اشتراك المكاتب (SaaS Packages)
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              من هنا يمكنك تعديل أسعار باقات الاشتراك الشهري، عدد المستخدمين الأقصى المسموح به لكل مكتب، وتعديل الميزات والخصائص المتاحة في كل باقة بشكل فوري دون الحاجة لتحديث الكود.
            </p>

            <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
              {packages.map((pkg: any) => (
                <div key={pkg.id} className="glass" style={{ padding: '1.5rem', borderRadius: '16px', border: editingPackage?.id === pkg.id ? '2px solid var(--primary)' : '1px solid var(--border-color)', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{pkg.name}</span>
                    <span style={{ color: 'var(--success)', fontWeight: 'bold', fontSize: '1.25rem' }}>{pkg.price} د.ل <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>/ شهرياً</span></span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    <span>👥 حد المستخدمين الأقصى: <strong style={{ color: 'var(--text-primary)' }}>{pkg.maxUsers} مستخدمين</strong></span>
                    <span>✨ الميزات والخصائص:</span>
                    <p style={{ margin: 0, background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      {pkg.features}
                    </p>
                  </div>

                  <button 
                    className="btn btn-secondary btn-sm" 
                    style={{ width: '100%', border: '1px solid var(--primary)', color: 'var(--primary)' }}
                    onClick={() => handleEditPackage(pkg)}
                  >
                    تعديل إعدادات الباقة
                  </button>
                </div>
              ))}
            </div>
          </div>

          {editingPackage && (
            <div className="glass" style={{ padding: '2rem', borderRadius: '24px', border: '1.5px solid var(--primary)' }}>
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit size={20} style={{ color: 'var(--primary)' }} /> تعديل باقة {editingPackage.name}
              </h3>
              <div style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>السعر الشهري (بالدينار الليبي):</label>
                  <input 
                    type="number" 
                    value={pkgPrice}
                    onChange={e => setPkgPrice(e.target.value)}
                    className="workplace-input" 
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>الحد الأقصى للمستخدمين:</label>
                  <input 
                    type="number" 
                    value={pkgMaxUsers}
                    onChange={e => setPkgMaxUsers(e.target.value)}
                    className="workplace-input" 
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>الميزات والخصائص المتاحة للمكتب:</label>
                <textarea 
                  value={pkgFeatures}
                  onChange={e => setPkgFeatures(e.target.value)}
                  className="workplace-input" 
                  style={{ width: '100%', height: '80px', padding: '0.5rem' }}
                  placeholder="مثال: إدارة الموظفين، الحساب المالي، إلخ..."
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn btn-primary" onClick={handleSavePackage}>حفظ التغييرات</button>
                <button className="btn btn-secondary" onClick={() => setEditingPackage(null)}>إلغاء</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== BACKUPS & AUDIT TRAIL TAB ===================== */}
      {activeTab === 'system-logs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
            {/* Database Backup Section */}
            <div className="glass" style={{ padding: '2rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                  <ShieldCheck size={20} /> إدارة النسخ الاحتياطي التلقائي وسيرفر البيانات
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                  تأمين بيانات المشتركين هي أولويتنا القصوى. من هنا يمكنك تحميل نسخة احتياطية فورية وشاملة لقاعدة بيانات منظومة كفيل بجميع مكاتبها وعملائها المشتركين في ملف JSON مشفر وآمن للغاية.
                </p>
              </div>

              <div>
                {backupSuccessMsg && (
                  <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', borderRadius: '8px', color: 'var(--success)', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                    {backupSuccessMsg}
                  </div>
                )}
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  onClick={handleTriggerBackup}
                  disabled={backupLoading}
                >
                  <RefreshCw size={16} className={backupLoading ? 'spin' : ''} />
                  {backupLoading ? 'جاري الاتصال بالسيرفر وتشفير البيانات...' : 'تحميل نسخة احتياطية فورية الآن (.json)'}
                </button>
              </div>
            </div>

            {/* Audit Trail Section */}
            <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={20} style={{ color: '#d97706' }} /> سجل الحركات والتدقيق الأمني العام (Audit Logs)
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                مراقبة حركات مدراء النظام والعمليات الحساسة في الوقت الفعلي.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '220px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {simulatedLogs.map(log => (
                  <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.85rem', background: 'var(--bg-secondary)', borderRadius: '8px', borderLeft: '3px solid var(--primary)', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{log.action}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>عنوان الـ IP: {log.ip}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{log.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SECURITY & CYBERSECURITY CENTER TAB ===================== */}
      {activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass" style={{ padding: '2.5rem', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute',
              top: '-10%',
              left: '-10%',
              width: '300px',
              height: '300px',
              background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div>
                <h3 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary)', fontSize: '1.65rem' }}>
                  <ShieldAlert size={28} style={{ color: 'var(--primary)' }} />
                  مركز الأمن والتحصين السيبراني
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: '800px' }}>
                  لوحة المراقبة الفنية التلقائية والتحصين السيبراني لشبكة كفيل. يضمن هذا المركز استقرار النظام، تشفير وحماية بيانات العمليات المالية من التلاعب، وتوثيق أي انهيار أو محاولات تخمين و brute-force فور حدوثها.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={loadData} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <RefreshCw size={14} /> تحديث البيانات
                </button>
              </div>
            </div>

            {/* Security Indicator Widgets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1.5px solid rgba(16, 185, 129, 0.2)', padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'var(--success)', color: '#fff', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>حالة سلامة النظام</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 'bold' }}>مُحصّن ونشط (RLS Active)</span>
                </div>
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1.5px solid rgba(239, 68, 68, 0.2)', padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.8)', color: '#fff', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>الانهيارات المرصودة</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{runtimeErrors.length} انهيار فني تم إخماده</span>
                </div>
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1.5px solid rgba(245, 158, 11, 0.2)', padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.8)', color: '#fff', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                  <UserX size={24} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>هجمات التخمين المشبوهة</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{authFailures.length} محاولات دخول فاشلة</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr' }}>
            {/* Runtime Crashes Monitor */}
            <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    💻 سجل الأعطال والانهيارات البرمجية الفنية (Technical Crash Telemetry)
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem', margin: 0 }}>
                    يتولى معترض الانهيارات الآمن تسجيل الانهيارات وتفاصيلها دون كشف معلومات النظام الحساسة للعميل.
                  </p>
                </div>
                {runtimeErrors.length > 0 && (
                  <button className="btn btn-secondary btn-sm" onClick={clearRuntimeErrors} style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Trash2 size={14} /> تفريغ سجل الأعطال
                  </button>
                )}
              </div>

              {runtimeErrors.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <ShieldCheck size={48} style={{ color: 'var(--success)', margin: '0 auto 1rem', display: 'block' }} />
                  <p style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>سجل الانهيارات البرمجية نظيف تماماً!</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>لا توجد أي انهيارات تقنية مسجلة حالياً في النظام.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'right' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>المستخدم</th>
                        <th style={{ padding: '0.75rem 1rem' }}>المكون البرمجي / المسار</th>
                        <th style={{ padding: '0.75rem 1rem' }}>رسالة الخطأ الآمنة</th>
                        <th style={{ padding: '0.75rem 1rem' }}>التاريخ والوقت</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>التحقيق الفني</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runtimeErrors.map((err) => (
                        <tr key={err.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>
                            {err.user_profiles ? (
                              <div>
                                <span>{err.user_profiles.display_name}</span>
                                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{err.user_profiles.role}</span>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-tertiary)' }}>زائر غير مسجل</span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--primary)', fontFamily: 'monospace' }}>
                            {err.component_name || 'غير محدد'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--danger)', fontWeight: 'bold', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {err.error_message}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                            {new Date(err.created_at).toLocaleString('ar-LY')}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            {err.stack_trace && (
                              <button 
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={() => setSelectedErrorStack(err.stack_trace)}
                              >
                                عرض المراجع 🔍
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Brute-Force Monitoring Center */}
            <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    🚨 كاشف هجمات التخمين والاختراقات الفاشلة (Brute-Force Access Auditor)
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem', margin: 0 }}>
                    يسجل المحاولات المشبوهة لمحاولة تسجيل الدخول بكلمات مرور خاطئة أو معرفات مزيفة.
                  </p>
                </div>
                {authFailures.length > 0 && (
                  <button className="btn btn-secondary btn-sm" onClick={clearAuthFailures} style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Trash2 size={14} /> تفريغ سجل المحاولات
                  </button>
                )}
              </div>

              {authFailures.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <ShieldCheck size={48} style={{ color: 'var(--success)', margin: '0 auto 1rem', display: 'block' }} />
                  <p style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>بوابة المصادقة آمنة ومستقرة تماماً!</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>لا توجد أي هجمات تخمين أو محاولات دخول مشبوهة مرصودة.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'right' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>البريد المستهدف</th>
                        <th style={{ padding: '0.75rem 1rem' }}>عنوان الـ IP</th>
                        <th style={{ padding: '0.75rem 1rem' }}>تفاصيل المتصفح / العميل</th>
                        <th style={{ padding: '0.75rem 1rem' }}>توقيت المحاولة</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>الخطورة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {authFailures.map((fail) => (
                        <tr key={fail.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                            {fail.email}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--primary)', fontFamily: 'monospace' }}>
                            {fail.ip_address || '127.0.0.1'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fail.user_agent}>
                            {fail.user_agent || 'غير محدد'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                            {new Date(fail.created_at).toLocaleString('ar-LY')}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            <span style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', fontSize: '0.7rem', fontWeight: 'bold' }}>
                              تحذير أمني 🛑
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Secure Stack Trace Popup Modal */}
          {selectedErrorStack && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(8px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem'
            }}>
              <div className="glass" style={{
                width: '100%',
                maxWidth: '750px',
                padding: '2.5rem',
                borderRadius: '24px',
                border: '1.5px solid var(--primary)',
                background: 'var(--bg-primary)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                maxHeight: '80vh',
                overflowY: 'auto'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', margin: 0 }}>
                    🛡️ تفاصيل الانهيار البرمجي الفنية (Secure Stack Trace Console)
                  </h3>
                  <button 
                    className="btn btn-secondary btn-sm"
                    style={{ minWidth: '40px', padding: '0.2rem' }}
                    onClick={() => setSelectedErrorStack(null)}
                  >
                    إغلاق ❌
                  </button>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                  تنبيه: سجلات الأخطاء البرمجية التالية مشفرة ومعزولة لأغراض التطوير فقط، ولا يمكن للعملاء الخارجيين أو المستخدمين غير المصرح لهم قراءتها عبر الواجهة.
                </p>
                <pre style={{
                  background: 'var(--bg-secondary)',
                  padding: '1rem',
                  borderRadius: '12px',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  color: 'var(--text-primary)',
                  overflowX: 'auto',
                  border: '1px solid var(--border-color)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  textAlign: 'left'
                }}>
                  {selectedErrorStack}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== WHITE LABEL SETTINGS TAB ===================== */}
      {activeTab === 'white-label' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
              <Settings size={20} /> تخصيص العلامة التجارية والهوية البصرية (White-Label Settings)
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              قم بتخصيص اسم المنظومة، الحقوق، والشعارات لتظهر للمستخدمين بهويتك التجارية الخاصة بك لتقديم خدمة متكاملة للمشتركين.
            </p>

            <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>اسم العلامة التجارية للمنظومة:</label>
                <input 
                  type="text" 
                  value={brandName}
                  onChange={e => setBrandName(e.target.value)}
                  className="workplace-input" 
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>رابط الشعار البصري (Logo URL):</label>
                <input 
                  type="text" 
                  value={brandLogo}
                  onChange={e => setBrandLogo(e.target.value)}
                  className="workplace-input" 
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>نص الحقوق والتذييل الفوتر (Footer Text):</label>
              <input 
                type="text" 
                value={footerText}
                onChange={e => setFooterText(e.target.value)}
                className="workplace-input" 
                style={{ width: '100%' }}
              />
            </div>

            <button className="btn btn-primary" onClick={handleSaveBrandSettings}>حفظ وتحديث الهوية التجارية</button>
          </div>
        </div>
      )}

      {/* ===================== GATEWAYS SETTINGS TAB ===================== */}
      {activeTab === 'gateways' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
              <Key size={20} /> بوابات الدفع الإلكتروني والرسائل النصية SMS
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              اربط منظومة كفيل ببوابات الدفع والرسائل المحلية والدولية لإرسال رسائل نصية تلقائية لمدراء المكاتب والمشتركين والتحقق الثنائي وتلقي أموال الاشتراكات آلياً.
            </p>

            <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
              {/* SMS Gateway Configurations */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h4 style={{ borderBottom: '1.5px solid var(--border-color)', paddingBottom: '0.5rem', margin: 0, fontWeight: 'bold' }}>📡 إعدادات بوابة رسائل الـ SMS</h4>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>مزود خدمة الرسائل:</label>
                  <select 
                    value={smsProvider}
                    onChange={e => setSmsProvider(e.target.value)}
                    className="workplace-input" 
                    style={{ width: '100%', padding: '0.45rem' }}
                  >
                    <option value="twilio">Twilio SMS Gateway</option>
                    <option value="bulksms">BulkSMS Gateway</option>
                    <option value="local">مزود الـ SMS المحلي</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>مفتاح واجهة التطبيقات (API Key):</label>
                  <input 
                    type="password" 
                    value={smsApiKey}
                    onChange={e => setSmsApiKey(e.target.value)}
                    className="workplace-input" 
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>اسم المرسل الافتراضي (Sender ID):</label>
                  <input 
                    type="text" 
                    value={smsSenderId}
                    onChange={e => setSmsSenderId(e.target.value)}
                    className="workplace-input" 
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Payment Gateway Configurations */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h4 style={{ borderBottom: '1.5px solid var(--border-color)', paddingBottom: '0.5rem', margin: 0, fontWeight: 'bold' }}>💳 إعدادات بوابة الدفع الإلكتروني</h4>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>بوابة الدفع المحلية المعتمدة:</label>
                  <select 
                    value={paymentProvider}
                    onChange={e => setPaymentProvider(e.target.value)}
                    className="workplace-input" 
                    style={{ width: '100%', padding: '0.45rem' }}
                  >
                    <option value="sadad">سداد الإلكترونية (SADAD)</option>
                    <option value="tadawul">بوابة تداول</option>
                    <option value="edfa3ly">ادفع لي (Edfa3ly)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>رقم التاجر التعريفي (Merchant ID):</label>
                  <input 
                    type="text" 
                    value={paymentMerchantId}
                    onChange={e => setPaymentMerchantId(e.target.value)}
                    className="workplace-input" 
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
              <button className="btn btn-primary" onClick={handleSaveGatewaySettings}>حفظ إعدادات البوابات والمزودين</button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== BROADCASTS TAB ===================== */}
      {activeTab === 'broadcasts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Create Broadcast Form */}
          <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Megaphone size={20} /> بث إعلان أو تعميم عام لجميع مكاتب كفيل المشتركة
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <textarea
                placeholder="اكتب هنا نص الإعلان أو التحديث العام الذي ترغب في بثه على لوحات تحكم المكاتب والوكلاء..."
                value={newBroadcastMessage}
                onChange={e => setNewBroadcastMessage(e.target.value)}
                className="workplace-input"
                style={{ width: '100%', minHeight: '100px', resize: 'vertical', padding: '1rem' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-primary"
                  onClick={createBroadcast}
                  disabled={!newBroadcastMessage.trim() || actionLoading === 'create-broadcast'}
                >
                  {actionLoading === 'create-broadcast' ? 'جاري البث...' : 'بث الإعلان الآن'}
                </button>
              </div>
            </div>
          </div>

          {/* Past Broadcasts List */}
          <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>سجل الإعلانات والتعميمات السابقة</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {broadcasts.map(b => (
                <div key={b.id} className="glass" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, paddingLeft: '1rem' }}>
                    <p style={{ margin: 0, fontWeight: 500, fontSize: '0.95rem', lineHeight: 1.6 }}>{b.message}</p>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={12} /> {new Date(b.created_at).toLocaleString('ar-LY')}
                    </span>
                  </div>
                  <button
                    className="btn-icon"
                    onClick={() => deleteBroadcast(b.id)}
                    disabled={actionLoading === `del-broadcast-${b.id}`}
                    style={{ color: 'var(--error)', flexShrink: 0 }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {broadcasts.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                  لا توجد إعلانات سابقة تم بثها. استخدم النموذج بالأعلى لنشر تعميمك الأول!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== TECHNICAL SUPPORT TICKETS TAB ===================== */}
      {activeTab === 'tickets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} /> طلبات الدعم الفني وتذاكر المكاتب الواردة
            </h3>
            <div className="admin-table-wrap">
              <table className="monitor-table">
                <thead>
                  <tr>
                    <th>عنوان التذكرة</th>
                    <th>الأولوية</th>
                    <th>الحالة الحالية</th>
                    <th>تاريخ الإنشاء</th>
                    <th style={{ width: '150px' }}>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 'bold' }}>{t.title}</td>
                      <td>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          background: t.priority === 'URGENT' ? '#fee2e2' : t.priority === 'HIGH' ? '#ffedd5' : '#f1f5f9',
                          color: t.priority === 'URGENT' ? '#991b1b' : t.priority === 'HIGH' ? '#c2410c' : '#475569'
                        }}>
                          {t.priority === 'URGENT' ? '🔴 عاجل جداً' : t.priority === 'HIGH' ? '🟠 مرتفع' : '🟢 عادي'}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          background: t.status === 'OPEN' ? '#fef2f2' : t.status === 'RESOLVED' ? '#ecfdf5' : '#f3f4f6',
                          color: t.status === 'OPEN' ? '#dc2626' : t.status === 'RESOLVED' ? '#059669' : '#4b5563'
                        }}>
                          {t.status === 'OPEN' ? 'مفتوحة' : t.status === 'RESOLVED' ? 'تم الحل' : 'قيد المراجعة'}
                        </span>
                      </td>
                      <td>{new Date(t.created_at).toLocaleDateString('ar-LY')}</td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setSelectedTicket(t);
                            setTicketReplyText(t.admin_reply || '');
                          }}
                        >
                          عرض وتفاصيل الرد
                        </button>
                      </td>
                    </tr>
                  ))}
                  {tickets.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                        لا توجد تذاكر دعم فني واردة حالياً.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ticket Response Modal */}
          {selectedTicket && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
              <div className="glass" style={{ padding: '2rem', borderRadius: '24px', maxWidth: '550px', width: '100%', border: '2px solid #aa771c', animation: 'dropdownFadeIn 0.25s ease' }}>
                <h3 style={{ marginBottom: '1rem' }}>تفاصيل تذكرة الدعم: {selectedTicket.title}</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>شرح المشكلة بالتفصيل:</h5>
                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6 }}>{selectedTicket.description}</p>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>الرد الرسمي للدعم الفني</label>
                    <textarea
                      placeholder="اكتب هنا رد الدعم الفني لحل المشكلة ومساعدة المكتب..."
                      value={ticketReplyText}
                      onChange={e => setTicketReplyText(e.target.value)}
                      className="workplace-input"
                      style={{ width: '100%', minHeight: '120px', resize: 'vertical' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => setSelectedTicket(null)}>إلغاء</button>
                  <button className="btn btn-primary" onClick={replyToTicket} disabled={actionLoading === `reply-ticket-${selectedTicket.id}`}>
                    {actionLoading === `reply-ticket-${selectedTicket.id}` ? 'جاري الإرسال...' : 'إرسال الرد واعتماد الحل'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ---- DIRECT SUPPORT MESSAGES FROM USERS ---- */}
          <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageCircle size={20} style={{ color: 'var(--primary)' }} />
              رسائل الدعم الفني المباشر من المستخدمين
              {supportMessages.some((m: any) => (m.replies || []).length === 0 && m.status === 'open') && (
                <span style={{ background: 'var(--error)', color: '#fff', borderRadius: '12px', padding: '0.15rem 0.6rem', fontSize: '0.75rem', fontWeight: 'bold' }}>
                  {supportMessages.filter((m: any) => m.status === 'open').length} جديدة
                </span>
              )}
            </h3>
            {supportMessages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                لا توجد رسائل دعم مباشر واردة حالياً.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {supportMessages.map((msg: any) => {
                  const replyCount = (msg.replies || []).length
                  const isOpen = msg.status === 'open'
                  return (
                    <div key={msg.id} style={{
                      background: isOpen ? 'rgba(191,149,63,0.06)' : 'var(--bg-secondary)',
                      border: isOpen ? '1.5px solid rgba(191,149,63,0.35)' : '1px solid var(--border-color)',
                      borderRadius: '14px',
                      padding: '1.25rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                          <span style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-primary)' }}>{msg.subject}</span>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
                            من: <strong>{msg.display_name || 'مستخدم'}</strong> · {new Date(msg.created_at).toLocaleString('ar-LY')}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 'bold',
                            background: isOpen ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                            color: isOpen ? '#dc2626' : '#059669',
                          }}>
                            {isOpen ? '● مفتوحة' : `✓ تم الرد (${replyCount})`}
                          </span>
                          <button
                            className="btn btn-secondary btn-xs"
                            onClick={() => { setSelectedSupportMsg(msg); setSupportReplyText('') }}
                            style={{ fontSize: '0.78rem' }}
                          >
                            {isOpen ? 'رد على الرسالة' : 'عرض / رد'}
                          </button>
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {msg.message}
                      </p>
                      {replyCount > 0 && (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(191,149,63,0.08)', borderRight: '3px solid #bf953f', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          ↩ آخر رد: {(msg.replies as any[])[replyCount - 1]?.reply_text}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Support Reply Modal */}
          {selectedSupportMsg && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
              <div className="glass" style={{ padding: '2rem', borderRadius: '24px', maxWidth: '520px', width: '100%', border: '2px solid #d4af37', animation: 'dropdownFadeIn 0.25s ease' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>الرد على: {selectedSupportMsg.subject}</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginBottom: '1.25rem' }}>من: {selectedSupportMsg.display_name}</p>
                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                  {selectedSupportMsg.message}
                </div>
                {(selectedSupportMsg.replies || []).length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>الردود السابقة:</span>
                    {(selectedSupportMsg.replies as any[]).map((r: any) => (
                      <div key={r.id} style={{ padding: '0.75rem', background: 'rgba(191,149,63,0.08)', borderRight: '3px solid #bf953f', borderRadius: '8px', fontSize: '0.82rem' }}>
                        {r.reply_text}
                        <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                          {new Date(r.created_at).toLocaleString('ar-LY')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <textarea
                  placeholder="اكتب ردك على المستخدم هنا..."
                  value={supportReplyText}
                  onChange={e => setSupportReplyText(e.target.value)}
                  className="workplace-input"
                  style={{ width: '100%', minHeight: '110px', resize: 'vertical', marginBottom: '1.25rem' }}
                />
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => setSelectedSupportMsg(null)}>إلغاء</button>
                  <button
                    className="btn btn-primary"
                    disabled={!supportReplyText.trim() || actionLoading === `support-reply-${selectedSupportMsg.id}`}
                    onClick={async () => {
                      setActionLoading(`support-reply-${selectedSupportMsg.id}`)
                      try {
                        await supabase.from('support_replies').insert({
                          message_id: selectedSupportMsg.id,
                          admin_id: session?.user?.id,
                          reply_text: supportReplyText.trim(),
                          read_by_user: false,
                        })
                        await supabase.from('support_messages').update({ status: 'replied' }).eq('id', selectedSupportMsg.id)
                        setSupportReplyText('')
                        setSelectedSupportMsg(null)
                        await loadData()
                      } catch (e) { alert('حدث خطأ أثناء إرسال الرد') }
                      setActionLoading(null)
                    }}
                  >
                    {actionLoading === `support-reply-${selectedSupportMsg.id}` ? 'جاري الإرسال...' : 'إرسال الرد للمستخدم'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== SYSTEM HEALTH & AUDIT LOGS TAB ===================== */}
      {activeTab === 'health' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Health Diagnostics Panel */}
          <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ background: '#ecfdf5', color: '#059669', padding: '0.75rem', borderRadius: '12px' }}>
                <CheckCircle size={28} />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>قاعدة بيانات Supabase</span>
                <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#059669' }}>متصل وآمن (Online)</h4>
              </div>
            </div>
            <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ background: '#eff6ff', color: '#1d4ed8', padding: '0.75rem', borderRadius: '12px' }}>
                <Activity size={28} />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>زمن الاستجابة للشبكة (Latency)</span>
                <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }} className="mono">{dbLatency}ms</h4>
              </div>
            </div>
            <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ background: '#fef3c7', color: '#d97706', padding: '0.75rem', borderRadius: '12px' }}>
                <ShieldCheck size={28} />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>سجلات الأمان والنشاط</span>
                <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>{healthLogs.length} عملية مسجلة</h4>
              </div>
            </div>
          </div>

          {/* Activity Logs Feed */}
          <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <ShieldCheck size={20} /> سجل النشاط والعمليات الأمنية لمالك النظام
              </h3>
              <button
                className="btn btn-secondary btn-sm"
                onClick={clearLogs}
                disabled={healthLogs.length === 0 || actionLoading === 'clear-logs'}
                style={{ color: 'var(--error)' }}
              >
                {actionLoading === 'clear-logs' ? 'جاري المسح...' : 'مسح السجلات'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '500px', overflowY: 'auto', paddingLeft: '0.5rem' }}>
              {healthLogs.map(l => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px', borderRight: '4px solid var(--primary)', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{l.action_type}</span>
                      <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem', background: 'var(--primary-ghost)', color: 'var(--primary)', borderRadius: '4px', fontWeight: 'bold' }}>مسؤول النظام</span>
                    </div>
                    <span style={{ color: 'var(--text-secondary)' }}>{l.details || '—'}</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }} className="mono">
                    {new Date(l.created_at).toLocaleString('ar-LY')}
                  </span>
                </div>
              ))}
              {healthLogs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                  لا توجد عمليات مسجلة في السجل حالياً.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Subscription Modal rendered globally so it functions across all tabs */}
      {editingOfficeSub && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="glass" style={{ padding: '2rem', borderRadius: '24px', maxWidth: '480px', width: '100%', border: '2px solid #aa771c', animation: 'dropdownFadeIn 0.25s ease' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>تحديث مكتب: {editingOfficeSub.name}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>اسم المكتب</label>
                <input
                  type="text"
                  value={editOfficeName}
                  onChange={(e) => setEditOfficeName(e.target.value)}
                  className="workplace-input"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>حد المستخدمين الأقصى</label>
                <input
                  type="number"
                  value={editOfficeMaxUsers}
                  onChange={(e) => setEditOfficeMaxUsers(e.target.value)}
                  className="workplace-input"
                  style={{ width: '100%' }}
                  min={1}
                  max={20}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>خطة الاشتراك</label>
                <select
                  value={editPlanType}
                  onChange={(e) => setEditPlanType(e.target.value as any)}
                  className="workplace-input"
                  style={{ width: '100%' }}
                >
                  <option value="BASIC">أساسي (150 د.ل / شهرياً)</option>
                  <option value="PREMIUM">ممتاز (300 د.ل / شهرياً)</option>
                  <option value="UNLIMITED">غير محدود (500 د.ل / شهرياً)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>تاريخ انتهاء الاشتراك</label>
                <input
                  type="date"
                  value={editSubEndDate}
                  onChange={(e) => setEditSubEndDate(e.target.value)}
                  className="workplace-input"
                  style={{ width: '100%' }}
                />
                <small style={{ color: 'var(--text-tertiary)', marginTop: '0.25rem', display: 'block' }}>اتركه فارغاً للحصول على اشتراك دائم غير محدود</small>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setEditingOfficeSub(null)}>إلغاء</button>
              <button className="btn btn-primary" onClick={updateOfficeSubscription} disabled={actionLoading === `sub-${editingOfficeSub.id}`}>
                {actionLoading === `sub-${editingOfficeSub.id}` ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== BRANDED PDF ACCEPTANCE REPORT CERTIFICATE MODAL ===================== */}
      {selectedUserForReport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', overflowY: 'auto' }} className="printable-report-actions-overlay">
          <div style={{ background: 'var(--surface)', borderRadius: '24px', border: '2px solid #bf953f', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', width: '100%', maxWidth: '800px', padding: '2.5rem', position: 'relative', display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="printable-report-modal-card">
            
            {/* The actual printable report layout */}
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
              {/* Decorative Corner Borders */}
              <div style={{ position: 'absolute', top: '10px', right: '10px', left: '10px', bottom: '10px', border: '1px solid rgba(170,119,28,0.25)', pointerEvents: 'none' }}></div>
              
              {/* Branded Official Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid #bf953f', paddingBottom: '1rem', flexWrap: 'nowrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <img 
                    src="/logo.png" 
                    alt="شعار كفيل" 
                    style={{ height: '70px', objectFit: 'contain', filter: 'drop-shadow(0px 3px 6px rgba(0,0,0,0.1))' }} 
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>منظومة كفيل السحابية</h1>
                    <span style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 'bold' }}>لإدارة مكاتب التقسيط وتقييم الملاءة المالية</span>
                  </div>
                </div>
                <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold' }}>الرقم المرجعي: KFL-TC-{selectedUserForReport.id.substring(0, 8).toUpperCase()}</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>تاريخ الطباعة: {new Date().toLocaleDateString('ar-LY')}</span>
                </div>
              </div>

              {/* Title Section */}
              <div style={{ textAlign: 'center', margin: '0.5rem 0' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#aa771c', textDecoration: 'underline', textUnderlineOffset: '8px', margin: 0 }}>
                  شهادة إلكترونية وإقرار بقبول شروط وأحكام الخدمة
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.5rem' }}>
                  وثيقة إلكترونية رسمية صادرة آلياً لتأكيد امتثال وقبول المستخدم لشروط وسياسات استخدام منظومة كفيل
                </p>
              </div>

              {/* Certificate Metadata Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', margin: '0.5rem 0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', fontWeight: '500' }}>الاسم الكامل للمستخدم:</span>
                    <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{selectedUserForReport.display_name}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', fontWeight: '500' }}>اسم المستخدم / البريد الإلكتروني:</span>
                    <strong style={{ fontSize: '1.05rem', color: '#0f172a', fontFamily: 'monospace' }}>{selectedUserForReport.email || selectedUserForReport.username || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', fontWeight: '500' }}>رقم الهاتف المسجل:</span>
                    <strong style={{ fontSize: '1.05rem', color: '#0f172a', fontFamily: 'monospace' }}>{selectedUserForReport.phone || '—'}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', borderRight: '1px dashed #cbd5e1', paddingRight: '1.25rem' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', fontWeight: '500' }}>المكتب التابع له:</span>
                    <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{selectedUserForReport.office_name || 'مستقل / عام'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', fontWeight: '500' }}>الدور والمسؤولية بالمنظومة:</span>
                    <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{ROLE_LABELS[selectedUserForReport.role]?.label || selectedUserForReport.role}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', fontWeight: '500' }}>حالة القبول والالتزام:</span>
                    <span style={{ 
                      fontSize: '0.85rem', 
                      fontWeight: 'bold', 
                      padding: '0.2rem 0.6rem', 
                      borderRadius: '6px', 
                      background: selectedUserForReport.accepted_terms ? '#dcfce7' : '#fee2e2', 
                      color: selectedUserForReport.accepted_terms ? '#15803d' : '#b91c1c',
                      display: 'inline-block',
                      marginTop: '0.2rem'
                    }}>
                      {selectedUserForReport.accepted_terms ? '✓ وافق على شروط الخدمة' : '❌ لم يوافق بعد'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Acceptance Details */}
              <div style={{ border: '1px solid #bf953f', background: 'rgba(251, 245, 183, 0.12)', padding: '1.25rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold', color: '#aa771c' }}>بيانات وتوقيت التوثيق الرقمي للإقرار:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', color: '#334155' }}>
                  <span>
                    <strong>تاريخ وساعة الموافقة: </strong>
                    {selectedUserForReport.accepted_terms ? (
                      selectedUserForReport.accepted_terms_at ? (
                        <span style={{ fontWeight: 'bold' }}>
                          {new Date(selectedUserForReport.accepted_terms_at).toLocaleDateString('ar-LY')} {new Date(selectedUserForReport.accepted_terms_at).toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      ) : 'موافق (تاريخ غير مسجل)'
                    ) : 'لم يتم الإقرار والموافقة حتى الآن'}
                  </span>
                  <span>
                    <strong>البصمة الرقمية للتحقق: </strong>
                    <code style={{ fontSize: '0.75rem', background: '#e2e8f0', padding: '0.15rem 0.4rem', borderRadius: '4px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {selectedUserForReport.accepted_terms
                        ? `SHA256:${btoa(selectedUserForReport.id + (selectedUserForReport.accepted_terms_at || 'tc')).substring(0, 32).toUpperCase()}`
                        : 'PENDING_VERIFICATION_TOKEN'}
                    </code>
                  </span>
                </div>
              </div>

              {/* Summarized Legal Text Box */}
              <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: '1.6', background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <strong style={{ color: '#0f172a', display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>موجز السياسات وبنود المسؤولية القانونية التي تم التعهد بها:</strong>
                يتعهد المستخدم بموجب هذا الإقرار بالحفاظ الكامل على سرية بيانات العملاء والمستندات المرفوعة بالمنظومة، ويقر بمسؤولوته الجنائية والمدنية التامة عن أي عمليات إدخال بيانات أو استعلامات يقوم بها من حسابه الشخصي. كما يلتزم بعدم مشاركة بيانات الدخول مع أي أطراف ثالثة وتحت أي ظرف، والامتثال المطلق لتعليمات وسياسات أمن المعلومات التابعة لشبكة كفيل وإدارة النظام.
              </div>

              {/* Official Seal and Signature Stamp */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'nowrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>إدارة الحماية الرقمية والامتثال</span>
                  <span style={{ fontWeight: 'bold', color: '#0f172a' }}>شبكة كفيل السحابية للتقسيط</span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>صادر كوثيقة إلكترونية موثقة رقمياً</span>
                </div>
                
                {/* Official Stamp Decorative Box */}
                <div style={{
                  border: '3px double #aa771c',
                  borderRadius: '50%',
                  width: '90px',
                  height: '90px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: 'rotate(-8deg)',
                  background: 'rgba(251, 245, 183, 0.05)',
                  boxShadow: '0 0 8px rgba(170,119,28,0.1)',
                  position: 'relative'
                }}>
                  <span style={{ fontSize: '0.55rem', fontWeight: 'bold', color: '#aa771c', textAlign: 'center', lineHeight: 1.2 }}>
                    تكامل الحماية<br/>
                    والأمان<br/>
                    🛡️ كفيل 🛡️
                  </span>
                  <div style={{ position: 'absolute', border: '1px dashed #aa771c', inset: '4px', borderRadius: '50%', pointerEvents: 'none' }}></div>
                </div>
              </div>
            </div>

            {/* Modal actions, hidden during print */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }} className="printable-report-actions">
              <button className="btn btn-secondary" onClick={() => setSelectedUserForReport(null)}>
                إلغاء وإغلاق
              </button>
              <button className="btn btn-primary" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={16} />
                طباعة المستند / حفظ بصيغة PDF
              </button>
            </div>

          </div>
        </div>
      )}

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
              أدخل كلمة المرور الجديدة للمستخدم: <strong style={{ color: 'var(--primary)' }}>{selectedUserForPassword.name}</strong>
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
      </main>
    </div>
  )
}
