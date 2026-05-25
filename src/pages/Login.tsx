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

  const adminBroadcasts = broadcasts.filter(b => b.created_by_role === 'admin' || (!b.created_by_role && !b.message.startsWith('DEALER_ALERT:')));
  const dealerBroadcasts = broadcasts.filter(b => b.created_by_role === 'monitor' || b.created_by_role === 'car_agent' || b.message.startsWith('DEALER_ALERT:'));

  return (
    <div className="join-page" style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: '2rem', padding: '2rem', flexWrap: 'wrap', overflowY: 'auto' }}>
      <div className="global-watermark"></div>

      {/* Admin Broadcasts Column (Right in RTL) */}
      {broadcasts.length > 0 && (
        <div className="glass" style={{ flex: '1 1 280px', maxWidth: '360px', padding: '1.5rem', borderRight: '4px solid var(--error)', background: 'linear-gradient(to bottom left, rgba(239, 68, 68, 0.05), transparent)', alignSelf: 'stretch' }}>
          <h3 style={{ color: 'var(--error)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
            <ShieldCheck size={20} /> إشعار مصممي النظام
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }} className="custom-scroll">
            {adminBroadcasts.length > 0 ? adminBroadcasts.map(b => (
              <div key={b.id} style={{ padding: '0.85rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--error)', marginBottom: '0.25rem' }}>
                  {new Date(b.created_at).toLocaleDateString('en-GB')}
                </div>
                <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.5, fontSize: '0.9rem' }}>{b.message}</p>
              </div>
            )) : (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>لا توجد إشعارات إدارية حالياً</p>
            )}
          </div>
        </div>
      )}

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

      {/* Dealer Broadcasts Column (Left in RTL) */}
      {broadcasts.length > 0 && (
        <div className="glass" style={{ flex: '1 1 280px', maxWidth: '360px', padding: '1.5rem', borderRight: '4px solid var(--accent)', background: 'linear-gradient(to bottom left, rgba(191, 149, 63, 0.05), transparent)', alignSelf: 'stretch' }}>
          <h3 style={{ color: 'var(--accent)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
            <Store size={20} /> إعلانات وكيل السيارات
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }} className="custom-scroll">
            {dealerBroadcasts.length > 0 ? dealerBroadcasts.map(b => (
              <div key={b.id} style={{ padding: '0.85rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid rgba(191,149,63,0.2)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginBottom: '0.25rem' }}>
                  {new Date(b.created_at).toLocaleDateString('en-GB')}
                </div>
                <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.5, fontSize: '0.9rem' }}>
                  {b.message.startsWith('DEALER_ALERT:') ? b.message.replace(/^DEALER_ALERT:\s*/, '') : b.message}
                </p>
              </div>
            )) : (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>لا توجد إعلانات من الوكيل حالياً</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
