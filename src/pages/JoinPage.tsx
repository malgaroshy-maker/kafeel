import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { UserPlus, Key, Mail, Lock, User, AlertCircle, CheckCircle2, Home } from 'lucide-react';

export default function JoinPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [role, setRole] = useState('staff');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setShowValidation(true);

    if (!email.trim() || !password || !displayName.trim() || !joinCode.trim() || !phone.trim()) {
      setError('يرجى إكمال جميع الحقول المطلوبة');
      setLoading(false);
      return;
    }

    if (phone.trim().length !== 10) {
      setError('رقم الهاتف يجب أن يتكون من 10 أرقام (الرقم الحالي ناقص)');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/join-with-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
            display_name: displayName.trim(),
            join_code: joinCode.trim().toUpperCase(),
            role: role,
            phone: phone.trim(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'حدث خطأ غير متوقع');
        setLoading(false);
        return;
      }

      setSuccess(data.message);

      // Auto-login after 1.5 seconds
      setTimeout(async () => {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (!signInError) {
          navigate('/office', { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      }, 1500);
    } catch {
      setError('تعذر الاتصال بالخادم. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const getFieldClass = (name: string, value: string) => {
    if (!showValidation) return '';
    if (!value.trim()) return 'input-error';
    if (name === 'phone' && value.trim().length !== 10) return 'input-error';
    return '';
  };

  return (
    <div className="join-page">
      <div className="glass-container">
        <div className="glass login-card">
          <button onClick={() => navigate('/')} className="home-back-btn" title="الرئيسية">
            <Home size={20} />
          </button>
          <div className="login-header">
            <img src="/logo.png" alt="كفيل" className="login-logo" />
            <div className="login-title">
              <UserPlus size={24} className="accent-icon" />
              <h2>انضمام لمكتب</h2>
            </div>
            <p className="login-subtitle">
              أدخل رمز الانضمام الذي حصلت عليه من مدير المكتب
            </p>
          </div>

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <CheckCircle2 size={18} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="login-form">
            <div className="input-group">
              <label>
                <Key size={16} /> رمز الانضمام
              </label>
              <input
                type="text"
                className={`join-code-input ${getFieldClass('joinCode', joinCode)}`}
                required
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="AB3F7K"
                maxLength={6}
                dir="ltr"
              />
            </div>

            <div className="input-group">
              <label>
                <User size={16} /> الاسم الكامل
              </label>
              <input
                type="text"
                className={getFieldClass('displayName', displayName)}
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="أحمد محمد"
              />
            </div>

            <div className="input-group">
              <label>
                <Mail size={16} /> البريد الإلكتروني
              </label>
              <input
                type="email"
                className={getFieldClass('email', email)}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                dir="ltr"
              />
            </div>

            <div className="input-group">
              <label>
                <Lock size={16} /> كلمة المرور
              </label>
              <input
                type="password"
                className={getFieldClass('password', password)}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                dir="ltr"
              />
            </div>

            <div className="input-group">
              <label>
                <User size={16} /> المسمى الوظيفي
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="role-select"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--navy-800)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                <option value="manager">مدير مكتب</option>
                <option value="accountant">محاسب</option>
                <option value="staff">إدخال بيانات</option>
              </select>
            </div>

            <div className="input-group">
              <label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  رقم الهاتف
                </div>
              </label>
              <input
                type="tel"
                className={getFieldClass('phone', phone)}
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="091XXXXXXX"
                maxLength={10}
                dir="ltr"
              />
              <p className="input-hint" style={{ fontSize: '0.75rem', marginTop: '0.4rem', color: 'var(--text-tertiary)' }}>
                رقم الهاتف يتيح لك استعادة حسابك في حال نسيان الرمز
              </p>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
            >
              {loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب والانضمام'}
            </button>
          </form>

          <div className="login-footer">
            <p>
              لديك حساب؟{' '}
              <button onClick={() => navigate('/login')} className="btn-link">
                تسجيل الدخول
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
