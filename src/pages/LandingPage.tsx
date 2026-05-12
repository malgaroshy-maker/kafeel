import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Shield, LayoutDashboard, ArrowRight, UserPlus, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  // Auto-redirect administrative roles if they are already logged in
  React.useEffect(() => {
    if (user && role === 'admin') {
      navigate('/admin', { replace: true });
    } else if (user && role === 'monitor') {
      navigate('/monitor', { replace: true });
    }
  }, [user, role, navigate]);

  return (
    <div className="landing-page">
      <div className="hero-bg">
        <img src="/hero-bg.png" alt="" className="hero-img" />
        <div className="hero-overlay"></div>
      </div>

      <header className="landing-header">
        <div className="header-inner container">
          <img src="/logo.png" alt="كفيل" className="logo-small" />
          <div className="header-actions">
            <button onClick={() => navigate('/login')} className="btn-link">
              <LogIn size={18} />
              <span>دخول</span>
            </button>
            <button onClick={() => navigate('/join')} className="btn btn-primary btn-sm">
              <UserPlus size={18} />
              <span>انضم الآن</span>
            </button>
          </div>
        </div>
      </header>

      <main className="landing-main container">
        <section className="hero-section">
          <div className="hero-content">
            <img src="/logo.png" alt="كفيل" className="logo-large" />
            <h1 className="hero-title">منصة المرابحة الذكية لقطاع السيارات</h1>
            <p className="hero-subtitle">
              الحل التقني المتكامل لإدارة عمليات التمويل، مراقبة الطوابير، وتنظيم مكاتب البيع في مكان واحد.
            </p>
            <div className="hero-btns">
              <button onClick={() => navigate('/join')} className="btn btn-primary btn-lg">
                <span>ابدأ الآن - انضم بمفتاح</span>
                <ArrowRight size={20} />
              </button>
              <button onClick={() => navigate('/login')} className="btn btn-ghost btn-lg">
                <span>تسجيل الدخول</span>
              </button>
            </div>
          </div>
        </section>

        <section className="portals-section">
          <div className="section-header">
            <h2>استكشف البوابات</h2>
            <p>حلول مخصصة لكل دور في المنظومة</p>
          </div>

          <div className="portals-grid">
            {/* Office Portal */}
            <div className="portal-card glass" onClick={() => navigate('/office')}>
              <div className="portal-icon office-icon">
                <Building2 size={32} />
              </div>
              <h3>بوابة المكاتب</h3>
              <p>إدارة الزبائن، المعاملات، الحسابات المالية، وتسويات مبيعات السيارات.</p>
              <span className="portal-link">دخول <ArrowRight size={16} /></span>
            </div>

            {/* Monitor Portal */}
            <div className="portal-card glass" onClick={() => navigate('/monitor')}>
              <div className="portal-icon monitor-icon">
                <Shield size={32} />
              </div>
              <h3>بوابة المراقب</h3>
              <p>مراقبة طابور الانتظار، فك الاختناقات، وإجراء عمليات الربط الاستثنائية.</p>
              <span className="portal-link">دخول <ArrowRight size={16} /></span>
            </div>

          </div>
        </section>
      </main>

      <footer className="landing-footer container">
        <p>© {new Date().getFullYear()} كفيل. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
