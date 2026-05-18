import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, Mail, AlertCircle, Home, Sun, Moon } from 'lucide-react';
import { UserRole } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const portalType = searchParams.get('type');
  const hideJoin = portalType === 'admin' || portalType === 'monitor';

  const from = location.state?.from?.pathname;

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    localStorage.setItem('landing-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    const currentTheme = localStorage.getItem('theme') || 'light';
    setTheme(currentTheme as 'light' | 'dark');
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      setLoading(false);
      return;
    }

    const role = (data.user?.app_metadata?.role as UserRole) || 'none';

    // If there is a specific URL they tried to visit, and we assume it's valid for their role, go there.
    // Otherwise, direct them to their default portal.
    if (from && from !== '/') {
      navigate(from, { replace: true });
    } else {
      switch (role) {
        case 'admin':
          navigate('/admin', { replace: true });
          break;
        case 'monitor':
          navigate('/monitor', { replace: true });
          break;
        case 'manager':
        case 'staff':
        case 'accountant':
          navigate('/office', { replace: true });
          break;
        default:
          setError('حسابك لا يملك أي صلاحيات نشطة للوصول إلى النظام.');
          await supabase.auth.signOut();
      }
    }
    setLoading(false);
  };

  return (
    <div className="join-page">
      <div className="global-watermark"></div>
      <div className="glass-container">
        <div className="glass login-card">
          <button onClick={() => navigate('/')} className="home-back-btn" title="الرئيسية">
            <Home size={20} />
          </button>

          <button onClick={toggleTheme} className="home-theme-toggle-btn" title={theme === 'light' ? 'الوضع الداكن' : 'الوضع المضيء'}>
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} style={{ color: '#fbbf24' }} />}
          </button>
          <div className="login-header">
            <img src="/logo.png" alt="كفيل" className="login-logo" />
            <div className="login-title">
              <Lock size={24} className="accent-icon" />
              <h2>تسجيل الدخول</h2>
            </div>
            <p className="login-subtitle">أدخل بياناتك للوصول إلى لوحة التحكم</p>
          </div>

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <label>
                <Mail size={16} /> البريد الإلكتروني
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@kafeel.ly"
                dir="ltr"
              />
            </div>

            <div className="input-group">
              <label>
                <Lock size={16} /> كلمة المرور
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
            >
              {loading ? 'جاري تسجيل الدخول...' : 'دخول'}
            </button>
          </form>

          {!hideJoin && (
            <div className="login-footer">
              <p>
                ليس لديك حساب؟{' '}
                <button onClick={() => navigate('/join')} className="btn-link">
                  انضم الآن
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
