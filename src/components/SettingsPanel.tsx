import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Eye, EyeOff, CheckCircle, AlertTriangle, Moon, Sun, Shield, Palette, ArrowLeftRight, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SettingsPanelProps {
  onThemeChange?: (theme: 'light' | 'dark') => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onThemeChange }) => {
  const { isManager, officeId } = useAuth();

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Office settings state
  const [salaryMatchLimit, setSalaryMatchLimit] = useState<number>(50);
  const [loadingOfficeSettings, setLoadingOfficeSettings] = useState(false);
  const [savingOfficeSettings, setSavingOfficeSettings] = useState(false);
  const [officeSettingsError, setOfficeSettingsError] = useState('');
  const [officeSettingsSuccess, setOfficeSettingsSuccess] = useState('');

  // Transfer requests state
  const [incomingTransfers, setIncomingTransfers] = useState<any[]>([]);
  const [outgoingTransfers, setOutgoingTransfers] = useState<any[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);

  useEffect(() => {
    if (isManager && officeId) {
      fetchOfficeSettings();
      fetchTransferRequests();
    }
  }, [isManager, officeId]);

  const fetchTransferRequests = async () => {
    if (!officeId) return;
    setLoadingTransfers(true);
    try {
      // 1. Fetch Incoming (from_office_id = officeId)
      const { data: incoming, error: incError } = await supabase
        .from('customer_transfers')
        .select(`
          id,
          customer_id,
          status,
          created_at,
          customer:customer_id(name, national_id),
          to_office:to_office_id(name)
        `)
        .eq('from_office_id', officeId)
        .order('created_at', { ascending: false });

      if (incError) throw incError;
      setIncomingTransfers(incoming || []);

      // 2. Fetch Outgoing (to_office_id = officeId)
      const { data: outgoing, error: outError } = await supabase
        .from('customer_transfers')
        .select(`
          id,
          customer_id,
          status,
          created_at,
          customer:customer_id(name, national_id),
          from_office:from_office_id(name)
        `)
        .eq('to_office_id', officeId)
        .order('created_at', { ascending: false });

      if (outError) throw outError;
      setOutgoingTransfers(outgoing || []);
    } catch (err) {
      console.error('Error fetching transfers:', err);
    } finally {
      setLoadingTransfers(false);
    }
  };

  const handleApproveTransfer = async (transferId: string, customerId: string, targetOfficeId: string) => {
    if (!window.confirm('هل أنت متأكد من الموافقة على نقل ملف الزبون؟')) return;
    try {
      // 1. Update customer office_id
      const { error: custError } = await supabase
        .from('customers')
        .update({ office_id: targetOfficeId })
        .eq('id', customerId);

      if (custError) throw custError;

      // 2. Update transfer status
      const { error: transferError } = await supabase
        .from('customer_transfers')
        .update({ status: 'APPROVED' })
        .eq('id', transferId);

      if (transferError) throw transferError;

      alert('تمت الموافقة على الطلب ونقل ملف الزبون بنجاح!');
      fetchTransferRequests();
    } catch (err: any) {
      console.error('Error approving transfer:', err);
      alert(`فشل قبول الطلب: ${err.message || 'خطأ غير معروف'}`);
    }
  };

  const handleRejectTransfer = async (transferId: string) => {
    if (!window.confirm('هل أنت متأكد من رفض نقل ملف الزبون؟')) return;
    try {
      const { error } = await supabase
        .from('customer_transfers')
        .update({ status: 'REJECTED' })
        .eq('id', transferId);

      if (error) throw error;

      alert('تم رفض طلب نقل الزبون.');
      fetchTransferRequests();
    } catch (err: any) {
      console.error('Error rejecting transfer:', err);
      alert(`فشل رفض الطلب: ${err.message || 'خطأ غير معروف'}`);
    }
  };


  const fetchOfficeSettings = async () => {
    setLoadingOfficeSettings(true);
    try {
      const { data, error } = await supabase
        .from('offices')
        .select('salary_match_limit')
        .eq('id', officeId)
        .single();
      
      if (error) throw error;
      if (data && data.salary_match_limit !== null) {
        setSalaryMatchLimit(Number(data.salary_match_limit));
      }
    } catch (err: any) {
      console.error('Error fetching office settings:', err);
    } finally {
      setLoadingOfficeSettings(false);
    }
  };

  const handleSaveOfficeSettings = async () => {
    if (!officeId) return;
    setSavingOfficeSettings(true);
    setOfficeSettingsError('');
    setOfficeSettingsSuccess('');
    try {
      const { error } = await supabase
        .from('offices')
        .update({ salary_match_limit: salaryMatchLimit })
        .eq('id', officeId);
      
      if (error) throw error;
      setOfficeSettingsSuccess('تم حفظ إعدادات الربط المالي بنجاح!');
    } catch (err: any) {
      console.error('Error updating office settings:', err);
      setOfficeSettingsError('فشل حفظ إعدادات الربط. يرجى التأكد من تطبيق التحديثات على قاعدة البيانات.');
    } finally {
      setSavingOfficeSettings(false);
    }
  };

  // Handle Theme Toggle
  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    localStorage.setItem('landing-theme', newTheme); // Keep both synchronized
    document.documentElement.setAttribute('data-theme', newTheme);
    if (onThemeChange) {
      onThemeChange(newTheme);
    }
  };

  // Sync theme attribute on component mount
  useEffect(() => {
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, []);

  // Handle Password Update
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword) {
      setError('يرجى إدخال كلمة المرور الحالية أولاً.');
      return;
    }

    if (!password) {
      setError('يرجى إدخال كلمة المرور الجديدة.');
      return;
    }

    if (password.length < 6) {
      setError('يجب أن تتكون كلمة المرور الجديدة من 6 أرقام أو حروف على الأقل.');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمتا المرور الجديدة غير متطابقتين.');
      return;
    }

    setLoading(true);
    try {
      // 1. Get the current user email
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user || !user.email) {
        throw new Error('فشل التحقق من جلسة المستخدم الحالي.');
      }

      // 2. Validate current password by trying a background re-authentication
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (authError) {
        throw new Error('كلمة المرور الحالية غير صحيحة. يرجى المحاولة مرة أخرى.');
      }

      // 3. Password is valid! Proceed with update
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess('تم تحديث كلمة المرور بنجاح!');
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحديث كلمة المرور.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="calc-panel" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }} dir="rtl">
      
      {/* Title */}
      <div className="calc-header" style={{ marginBottom: '2.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
        <div className="calc-icon-wrap" style={{ background: 'linear-gradient(135deg, var(--accent), var(--primary))' }}>
          <Palette size={24} />
        </div>
        <div>
          <h2>إعدادات الحساب والمظهر</h2>
          <div className="calc-subtitle">تخصيص تفضيلاتك وتأمين حسابك الشخصي</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        
        {/* Theme Settings Box */}
        <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--glass-border)', background: 'var(--surface-hover)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sun size={20} className="text-warning" />
            مظهر واجهة المستخدم
          </h3>
          
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            اختر لون خلفية المنظومة المفضل لديك. يمكنك التبديل بين الخلفية البيضاء الكلاسيكية والخلفية السوداء الأنيقة في أي وقت.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Light Mode Selector Card */}
            <div 
              onClick={() => handleThemeChange('light')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                border: theme === 'light' ? '2.5px solid var(--accent)' : '1px solid var(--glass-border)',
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                boxShadow: theme === 'light' ? '0 4px 15px rgba(212, 175, 55, 0.15)' : 'none',
                transform: theme === 'light' ? 'translateY(-2px)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#f8fafc', border: '2px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {theme === 'light' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent)' }} />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>خلفية بيضاء (الوضع المضيء)</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>مظهر مريح للعين في بيئات الإضاءة العالية</span>
                </div>
              </div>
              <Sun size={24} style={{ color: '#b45309' }} />
            </div>

            {/* Dark Mode Selector Card */}
            <div 
              onClick={() => handleThemeChange('dark')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                border: theme === 'dark' ? '2.5px solid var(--accent)' : '1px solid var(--glass-border)',
                background: '#09090b',
                color: '#f4f4f5',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                boxShadow: theme === 'dark' ? '0 4px 20px rgba(0, 0, 0, 0.4)' : 'none',
                transform: theme === 'dark' ? 'translateY(-2px)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#27272a', border: '2px solid #52525b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {theme === 'dark' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent)' }} />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>خلفية سوداء (الوضع المظلم)</span>
                  <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>خلفية سوداء فاخرة، مريحة للعين في الإضاءة الخافتة</span>
                </div>
              </div>
              <Moon size={24} style={{ color: '#fbbf24' }} />
            </div>

          </div>

          {/* Watermark Protection Info */}
          <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', background: 'var(--primary-ghost)', border: '1px solid hsla(var(--primary-h), var(--primary-s), var(--primary-l), 0.15)' }}>
            <Shield size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              <strong>ملاحظة الهوية التجارية:</strong> سيبقى لوغو "كفيل" الشفاف كعلامة مائية أنيقة في الخلفية في كلتا الحالتين للحفاظ على أصالة النظام وحقوق الملكية.
            </span>
          </div>

        </div>

        {/* Password Reset Box */}
        <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--glass-border)', background: 'var(--surface-hover)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={20} style={{ color: 'var(--accent)' }} />
            أمان الحساب وتغيير كلمة المرور
          </h3>
          
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            قم بتحديث كلمة المرور الخاصة بحسابك لضمان أعلى مستويات الحماية والأمان لبياناتك.
          </p>

          <form onSubmit={handlePasswordChange}>
            {/* Input Current Password */}
            <div className="input-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                كلمة المرور الحالية
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showCurrentPassword ? "text" : "password"} 
                  placeholder="أدخل كلمة المرور الحالية..." 
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="workplace-input"
                  style={{ width: '100%', padding: '0.7rem 0.9rem', paddingLeft: '2.5rem', borderRadius: '8px', border: '1.5px solid var(--glass-border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }}
                />
                <button 
                  type="button" 
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Input New Password */}
            <div className="input-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                كلمة المرور الجديدة
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="أدخل 6 أرقام أو حروف على الأقل..." 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="workplace-input"
                  style={{ width: '100%', padding: '0.7rem 0.9rem', paddingLeft: '2.5rem', borderRadius: '8px', border: '1.5px solid var(--glass-border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Input Confirm Password */}
            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                تأكيد كلمة المرور الجديدة
              </label>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="أعد كتابة كلمة المرور..." 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="workplace-input"
                style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '8px', border: '1.5px solid var(--glass-border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
                <CheckCircle size={16} />
                <span>{success}</span>
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading || !currentPassword || !password || !confirmPassword}
              style={{ width: '100%', padding: '0.85rem', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <Lock size={16} />
              {loading ? 'جاري التحديث...' : 'حفظ كلمة المرور الجديدة'}
            </button>
          </form>
        </div>

        {/* Office Guarantor Match settings (Manager only) */}
        {isManager && (
          <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--glass-border)', background: 'var(--surface-hover)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={20} style={{ color: 'var(--accent)' }} />
              إعدادات تطابق الضامن (قيمة الربط)
            </h3>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              تحديد الحد الأقصى المسموح به لفارق المرتب بين الزبون والضامن لضمان عدم تأثر الطرف الأقل في المرتب. (الحد المسموح به: من 0 إلى 50 د.ل).
            </p>

            {loadingOfficeSettings ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <span className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full text-primary"></span>
              </div>
            ) : (
              <div>
                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      فارق المرتب الأقصى المقبول للربط
                    </label>
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                      {salaryMatchLimit} د.ل
                    </span>
                  </div>
                  
                  <input 
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={salaryMatchLimit}
                    onChange={e => setSalaryMatchLimit(Number(e.target.value))}
                    style={{
                      width: '100%',
                      accentColor: 'var(--primary)',
                      cursor: 'pointer',
                      background: 'var(--glass-border)',
                      height: '6px',
                      borderRadius: '3px',
                      outline: 'none'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                    <span>0 د.ل (تطابق تام)</span>
                    <span>50 د.ل (الحد الأقصى)</span>
                  </div>
                </div>

                {officeSettingsError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
                    <AlertTriangle size={16} />
                    <span>{officeSettingsError}</span>
                  </div>
                )}

                {officeSettingsSuccess && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
                    <CheckCircle size={16} />
                    <span>{officeSettingsSuccess}</span>
                  </div>
                )}

                <button 
                  type="button"
                  onClick={handleSaveOfficeSettings}
                  className="btn btn-primary"
                  disabled={savingOfficeSettings}
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  {savingOfficeSettings ? 'جاري الحفظ...' : 'حفظ إعدادات الربط'}
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Transfer Requests Section (Manager only) */}
      {isManager && (
        <div className="glass" style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--glass-border)', background: 'var(--surface-hover)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeftRight size={22} style={{ color: 'var(--accent)' }} />
            طلبات نقل الزبائن المكررة
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
            
            {/* Incoming Requests */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                📥 طلبات نقل واردة (بانتظار موافقتك للإفراج عن الزبون)
              </h4>

              {loadingTransfers ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}>
                  <span className="animate-spin inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full text-primary"></span>
                </div>
              ) : incomingTransfers.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-tertiary)', background: 'var(--surface)', borderRadius: '12px', fontSize: '0.85rem' }}>
                  لا توجد طلبات نقل واردة حالياً.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {incomingTransfers.map((req) => (
                    <div key={req.id} className="glass" style={{ padding: '1rem', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.9rem' }}>{req.customer?.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>الرقم الوطني: {req.customer?.national_id}</div>
                        </div>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px', 
                          fontWeight: 'bold',
                          background: req.status === 'PENDING' ? 'rgba(245, 158, 11, 0.15)' : req.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: req.status === 'PENDING' ? 'var(--warning)' : req.status === 'APPROVED' ? '#10b981' : '#ef4444',
                        }}>
                          {req.status === 'PENDING' ? 'قيد الانتظار' : req.status === 'APPROVED' ? 'تم القبول' : 'مرفوض'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                        المكتب الطالب: <strong style={{ color: 'var(--text-primary)' }}>{req.to_office?.name}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                          تاريخ الطلب: {new Date(req.created_at).toLocaleDateString('ar-LY')}
                        </span>
                        {req.status === 'PENDING' && (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                              onClick={() => handleApproveTransfer(req.id, req.customer_id, req.to_office_id || '')}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.6rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              <Check size={14} /> موافقة
                            </button>
                            <button 
                              onClick={() => handleRejectTransfer(req.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.6rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              <X size={14} /> رفض
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Requests */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                📤 طلبات نقل صادرة (مرسلة للمكاتب الأخرى لاعتمادها)
              </h4>

              {loadingTransfers ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}>
                  <span className="animate-spin inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full text-primary"></span>
                </div>
              ) : outgoingTransfers.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-tertiary)', background: 'var(--surface)', borderRadius: '12px', fontSize: '0.85rem' }}>
                  لا توجد طلبات نقل صادرة حالياً.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {outgoingTransfers.map((req) => (
                    <div key={req.id} className="glass" style={{ padding: '1rem', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.9rem' }}>{req.customer?.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>الرقم الوطني: {req.customer?.national_id}</div>
                        </div>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px', 
                          fontWeight: 'bold',
                          background: req.status === 'PENDING' ? 'rgba(245, 158, 11, 0.15)' : req.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: req.status === 'PENDING' ? 'var(--warning)' : req.status === 'APPROVED' ? '#10b981' : '#ef4444',
                        }}>
                          {req.status === 'PENDING' ? 'قيد الانتظار' : req.status === 'APPROVED' ? 'تم القبول' : 'مرفوض'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                        المكتب الحالي: <strong style={{ color: 'var(--text-primary)' }}>{req.from_office?.name}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                          تاريخ الطلب: {new Date(req.created_at).toLocaleDateString('ar-LY')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default SettingsPanel;
