import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, Mail, AlertCircle, Home, Sun, Moon, ShieldCheck, Store } from 'lucide-react';
import { UserRole } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const portalType = searchParams.get('type');
  const hideJoin = portalType === 'admin' || portalType === 'monitor';

  const from = location.state?.from?.pathname;

  useEffect(() => {
    supabase
      .from('broadcasts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        const now = new Date().toISOString();
        const active = (data || []).filter(b => !b.expires_at || b.expires_at > now);
        setBroadcasts(active.slice(0, 10));
      });
  }, []);

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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', position: 'relative', overflowY: 'auto' }}>
      {/* Broadcasts Marquee Banner (Top of page, above login box) */}
      {broadcasts.length > 0 && (() => {
        const isArabicBroadcast = /[\u0600-\u06FF]/.test(broadcasts.map(b => b.message).join(' '));
        return (
          <div style={{ borderBottom: '1px solid var(--glass-border)', padding: '0.65rem 1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--surface)', position: 'relative', overflow: 'hidden', zIndex: 90 }}>
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', flex: 1 }}>
              <div style={{ display: 'inline-flex', gap: '15rem', animation: `${isArabicBroadcast ? 'marqueeLTR' : 'marqueeRTL'} 35s linear infinite` }}>
                {broadcasts.map(b => {
                  const isDealer = b.created_by_role === 'monitor' || b.created_by_role === 'car_agent' || b.message.startsWith('DEALER_ALERT:');
                  const Icon = isDealer ? Store : ShieldCheck;
                  const label = isDealer ? 'إعلان الوكيل' : 'إشعار الإدارة';
                  const badgeColor = isDealer ? 'var(--accent)' : 'var(--error)';
                  const cleanMessage = isDealer ? b.message.replace(/^DEALER_ALERT:\s*/, '') : b.message;
                  const dateStr = new Date(b.created_at).toLocaleDateString('en-GB');

                  return (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem', color: badgeColor, fontWeight: 700 }}>
                      <Icon size={18} />
                      <span>[{label} - {dateStr}]: {cleanMessage}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Main Login content wrapper */}
      <div className="join-page" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at center, var(--bg-secondary), var(--bg-primary))', padding: '0.75rem 2rem' }}>
        <div className="global-watermark"></div>

        {/* Login Card (Center) */}
        <div style={{ flex: '0 1 480px', width: '100%' }}>
          <div className="glass-container" style={{ width: '100%' }}>
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
      </div>
    </div>
  );
}
