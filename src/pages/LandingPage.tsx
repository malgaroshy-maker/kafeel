import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, UserPlus, LogIn, Calendar, FolderLock, Users, TrendingUp, Sparkles, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  // Load and save theme preference in localStorage
  const [isDark, setIsDark] = React.useState(() => {
    const savedTheme = localStorage.getItem('theme') || localStorage.getItem('landing-theme');
    return savedTheme === 'dark';
  });

  const toggleTheme = (dark: boolean) => {
    setIsDark(dark);
    const themeStr = dark ? 'dark' : 'light';
    localStorage.setItem('theme', themeStr);
    localStorage.setItem('landing-theme', themeStr);
    document.documentElement.setAttribute('data-theme', themeStr);
  };

  // Sync theme attribute on mount
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || localStorage.getItem('landing-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Auto-redirect administrative roles if they are already logged in
  React.useEffect(() => {
    if (user && role === 'admin') {
      navigate('/admin', { replace: true });
    } else if (user && role === 'monitor') {
      navigate('/monitor', { replace: true });
    }
  }, [user, role, navigate]);

  return (
    <div className={`landing-page ${isDark ? 'dark-mode' : ''}`} style={{ 
      background: isDark ? '#000000' : '#ffffff', 
      color: isDark ? '#ffffff' : '#0f172a', 
      position: 'relative',
      transition: 'background-color 0.4s ease, color 0.4s ease',
      minHeight: '100vh'
    }}>
      <div className="global-watermark"></div>
      <header className="landing-header" style={{ borderBottom: '1.5px solid #aa771c', background: 'linear-gradient(135deg, #bf953f 0%, #fcf6ba 25%, #b38728 50%, #fbf5b7 75%, #aa771c 100%)', padding: '0.75rem 2rem', boxShadow: '0 4px 15px rgba(170, 119, 28, 0.25)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="header-inner container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          {/* Logo & Theme Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <img src="/logo.png" alt="كفيل" style={{ height: '52px', objectFit: 'contain', filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.12))', borderRadius: '6px' }} />
            
            {/* Theme Toggle - Sun and Crescent */}
            <div style={{ 
              display: 'flex', 
              gap: '0.35rem', 
              background: isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.45)', 
              padding: '3px', 
              borderRadius: '24px', 
              border: '1.5px solid #aa771c', 
              backdropFilter: 'blur(8px)',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
              alignItems: 'center'
            }}>
              <button 
                onClick={() => toggleTheme(false)}
                title="الوضع المضيء (خلفية بيضاء)"
                style={{ 
                  background: !isDark ? '#ffffff' : 'transparent',
                  color: !isDark ? '#aa771c' : 'rgba(0,0,0,0.5)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: !isDark ? '0 2px 6px rgba(170,119,28,0.3)' : 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  padding: 0
                }}
              >
                <Sun size={16} fill={!isDark ? '#aa771c' : 'none'} style={{ transform: !isDark ? 'rotate(12deg)' : 'none', transition: 'transform 0.5s ease' }} />
              </button>
              <button 
                onClick={() => toggleTheme(true)}
                title="الوضع المظلم (خلفية سوداء)"
                style={{ 
                  background: isDark ? '#aa771c' : 'transparent',
                  color: isDark ? '#ffffff' : 'rgba(0,0,0,0.5)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: isDark ? '0 2px 6px rgba(0,0,0,0.4)' : 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  padding: 0
                }}
              >
                <Moon size={16} fill={isDark ? '#ffffff' : 'none'} style={{ transform: isDark ? 'rotate(-12deg)' : 'none', transition: 'transform 0.5s ease' }} />
              </button>
            </div>
          </div>

          <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button onClick={() => navigate('/login')} className="btn btn-ghost" style={{ color: '#0f172a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.85rem', borderRadius: '8px', cursor: 'pointer', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.08)' }}>
              <LogIn size={16} />
              <span>دخول</span>
            </button>
            <button 
              onClick={() => navigate('/join')} 
              className="btn" 
              style={{ 
                background: 'linear-gradient(90deg, #0066ff 0%, #708090 50%, #bf953f 100%)', 
                color: '#ffffff', 
                fontWeight: 'bold', 
                padding: '0.5rem 1.25rem', 
                borderRadius: '8px', 
                border: 'none', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.4rem',
                boxShadow: '0 4px 12px rgba(0, 102, 255, 0.25)',
                transition: 'all 0.3s ease'
              }}
            >
              <UserPlus size={16} />
              <span>انضم الآن</span>
            </button>
          </div>
        </div>
      </header>

      <main className="landing-main container" style={{ padding: '0rem 1.5rem' }}>
        <section className="hero-section" style={{ padding: '0.5rem 0', textAlign: 'center' }}>
          <div className="hero-content" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <img 
              src="/logo.png" 
              alt="كفيل" 
              className="logo-large" 
              style={{ 
                width: '420px', 
                height: 'auto', 
                marginBottom: '1rem', 
                filter: isDark ? 'drop-shadow(0 15px 35px rgba(252, 246, 186, 0.4))' : 'drop-shadow(0 15px 30px rgba(212, 175, 55, 0.3))',
                animation: 'float 5s ease-in-out infinite'
              }} 
            />
            <h1 className="hero-title" style={{ fontSize: 'clamp(2.2rem, 5.5vw, 3.8rem)', fontWeight: 900, lineHeight: 1.2, marginBottom: '1.5rem' }}>
              منظومة المرابحة الاسلامية للسيارات
            </h1>
            <p className="hero-subtitle" style={{ fontSize: '1.35rem', color: isDark ? '#cbd5e1' : '#334155', fontWeight: 500, marginBottom: '2.5rem', lineHeight: 1.6 }}>
              الحل السحابي المتكامل والأكثر أماناً لإدارة مكاتب تقسيط ومرابحة السيارات، مصمم لتبسيط العمل اليومي وتمكين مدراء المكاتب وموظفي إدخال البيانات بأدوات تحكم ذكية وسلسة.
            </p>
            <div className="hero-btns" style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={() => navigate('/join')} 
                className="btn btn-primary btn-lg" 
                style={{ 
                  background: 'linear-gradient(90deg, #0066ff 0%, #708090 50%, #bf953f 100%)', 
                  color: '#ffffff', 
                  border: 'none',
                  padding: '0.9rem 2.25rem', 
                  fontSize: '1.1rem', 
                  fontWeight: 'bold', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem', 
                  borderRadius: '10px', 
                  boxShadow: '0 6px 20px rgba(0, 102, 255, 0.35)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
              >
                <span>ابدأ الآن - انضم بمفتاح تفعيل</span>
                <ArrowRight size={22} />
              </button>
              <button onClick={() => navigate('/login')} className="btn btn-ghost btn-lg" style={{ padding: '0.9rem 2.25rem', fontSize: '1.1rem', fontWeight: 'bold', border: isDark ? '2px solid #fcf6ba' : '2px solid #0f172a', color: isDark ? '#fcf6ba' : '#0f172a', borderRadius: '10px', background: isDark ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                <span>تسجيل الدخول للنظام</span>
              </button>
            </div>
          </div>
        </section>

        {/* Feature Showcase Grid - Reassuring Office-Centric Features */}
        <section className="features-section" style={{ padding: '5rem 0 2rem' }}>
          <div className="section-header" style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '2.35rem', fontWeight: 900, color: isDark ? '#ffffff' : '#0f172a', marginBottom: '0.85rem' }}>لماذا يثق أصحاب مكاتب السيارات في منظومة كفيل؟</h2>
            <p style={{ fontSize: '1.15rem', color: isDark ? '#94a3b8' : '#475569', maxWidth: '700px', margin: '0 auto', lineHeight: 1.6 }}>أقوى الأدوات الإدارية المصممة خصيصاً لمكاتب تقسيط وبيع السيارات بموثوقية مطلقة وسهولة متناهية تضمن السرية التامة والأمان المطلق لبياناتكم وأرباحكم.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem' }}>
            
            {/* Feature 1 */}
            <div className="glass" style={{ padding: '2.25rem 2rem', borderRadius: '20px', border: isDark ? '1.5px solid rgba(252, 246, 186, 0.15)' : '1.5px solid rgba(187,135,40,0.25)', background: isDark ? '#121212' : '#ffffff', boxShadow: isDark ? '0 12px 30px rgba(0,0,0,0.5)' : '0 12px 30px rgba(187,135,40,0.05)', transition: 'all 0.3s ease' }}>
              <div style={{ background: 'linear-gradient(135deg, #bf953f, #aa771c)', width: '65px', height: '65px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', marginBottom: '1.5rem', boxShadow: '0 6px 15px rgba(170,119,28,0.3)' }}>
                <ShieldCheck size={32} />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 'bold', color: isDark ? '#fcf6ba' : '#0f172a', marginBottom: '0.85rem' }}>الالتزام الكامل بالمرابحة الشرعية</h3>
              <p style={{ color: isDark ? '#cbd5e1' : '#334155', fontSize: '0.95rem', lineHeight: 1.7 }}>عقود وتدفقات معاملات متوافقة 100% مع أحكام الشريعة الإسلامية السمحة. صياغة قانونية متينة تمنح مكتبك وعملائك الطمأنينة وراحة البال المطلقة في كل عملية بيع.</p>
            </div>

            {/* Feature 2 */}
            <div className="glass" style={{ padding: '2.25rem 2rem', borderRadius: '20px', border: isDark ? '1.5px solid rgba(252, 246, 186, 0.15)' : '1.5px solid rgba(187,135,40,0.25)', background: isDark ? '#121212' : '#ffffff', boxShadow: isDark ? '0 12px 30px rgba(0,0,0,0.5)' : '0 12px 30px rgba(187,135,40,0.05)', transition: 'all 0.3s ease' }}>
              <div style={{ background: 'linear-gradient(135deg, #bf953f, #aa771c)', width: '65px', height: '65px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', marginBottom: '1.5rem', boxShadow: '0 6px 15px rgba(170,119,28,0.3)' }}>
                <Calendar size={32} />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 'bold', color: isDark ? '#fcf6ba' : '#0f172a', marginBottom: '0.85rem' }}>إدارة الأقساط والكمبيالات الذكية</h3>
              <p style={{ color: isDark ? '#cbd5e1' : '#334155', fontSize: '0.95rem', lineHeight: 1.7 }}>تتبع كامل وتلقائي لجميع الأقساط الشهرية، تواريخ الاستحقاق، الدفعات المستلمة، مع إحصاءات تفصيلية تفصل الديون المتأخرة والنشطة وتوفر عليك الجهد والوقت.</p>
            </div>

            {/* Feature 3 */}
            <div className="glass" style={{ padding: '2.25rem 2rem', borderRadius: '20px', border: isDark ? '1.5px solid rgba(252, 246, 186, 0.15)' : '1.5px solid rgba(187,135,40,0.25)', background: isDark ? '#121212' : '#ffffff', boxShadow: isDark ? '0 12px 30px rgba(0,0,0,0.5)' : '0 12px 30px rgba(187,135,40,0.05)', transition: 'all 0.3s ease' }}>
              <div style={{ background: 'linear-gradient(135deg, #bf953f, #aa771c)', width: '65px', height: '65px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', marginBottom: '1.5rem', boxShadow: '0 6px 15px rgba(170,119,28,0.3)' }}>
                <FolderLock size={32} />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 'bold', color: isDark ? '#fcf6ba' : '#0f172a', marginBottom: '0.85rem' }}>أرشفة إلكترونية سحابية آمنة 100%</h3>
              <p style={{ color: isDark ? '#cbd5e1' : '#334155', fontSize: '0.95rem', lineHeight: 1.7 }}>وداعاً للمستندات والملفات المفقودة. أرشفة رقمية مشفرة لجميع مستندات السيارات، بطاقات العملاء، وتعهدات الدفع، محمية بأقوى معايير الأمان لحفظ الحقوق.</p>
            </div>

            {/* Feature 4 */}
            <div className="glass" style={{ padding: '2.25rem 2rem', borderRadius: '20px', border: isDark ? '1.5px solid rgba(252, 246, 186, 0.15)' : '1.5px solid rgba(187,135,40,0.25)', background: isDark ? '#121212' : '#ffffff', boxShadow: isDark ? '0 12px 30px rgba(0,0,0,0.5)' : '0 12px 30px rgba(187,135,40,0.05)', transition: 'all 0.3s ease' }}>
              <div style={{ background: 'linear-gradient(135deg, #bf953f, #aa771c)', width: '65px', height: '65px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', marginBottom: '1.5rem', boxShadow: '0 6px 15px rgba(170,119,28,0.3)' }}>
                <Users size={32} />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 'bold', color: isDark ? '#fcf6ba' : '#0f172a', marginBottom: '0.85rem' }}>نظام طابور الانتظار ومنع الازدحام</h3>
              <p style={{ color: isDark ? '#cbd5e1' : '#334155', fontSize: '0.95rem', lineHeight: 1.7 }}>نظام مبتكر لتنظيم طوابير المراجعين والعملاء إلكترونياً، مما يمنع تكدس الزبائن في مكتبك ويضمن سلاسة مطلقة وتقديم خدمة سريعة ومنظمة تسعد عملائك.</p>
            </div>

            {/* Feature 5 */}
            <div className="glass" style={{ padding: '2.25rem 2rem', borderRadius: '20px', border: isDark ? '1.5px solid rgba(252, 246, 186, 0.15)' : '1.5px solid rgba(187,135,40,0.25)', background: isDark ? '#121212' : '#ffffff', boxShadow: isDark ? '0 12px 30px rgba(0,0,0,0.5)' : '0 12px 30px rgba(187,135,40,0.05)', transition: 'all 0.3s ease' }}>
              <div style={{ background: 'linear-gradient(135deg, #bf953f, #aa771c)', width: '65px', height: '65px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', marginBottom: '1.5rem', boxShadow: '0 6px 15px rgba(170,119,28,0.3)' }}>
                <TrendingUp size={32} />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 'bold', color: isDark ? '#fcf6ba' : '#0f172a', marginBottom: '0.85rem' }}>تقارير محاسبية ومالية بنقرة واحدة</h3>
              <p style={{ color: isDark ? '#cbd5e1' : '#334155', fontSize: '0.95rem', lineHeight: 1.7 }}>استخراج فوري وشامل لتقارير الأرباح، الإيرادات والمصروفات، دون الحاجة لخبرة محاسبية مسبقة. احصل على رؤية مالية واضحة لمشروعك ومكتبك بكل يسر وسهولة.</p>
            </div>

            {/* Feature 6 */}
            <div className="glass" style={{ padding: '2.25rem 2rem', borderRadius: '20px', border: isDark ? '1.5px solid rgba(252, 246, 186, 0.15)' : '1.5px solid rgba(187,135,40,0.25)', background: isDark ? '#121212' : '#ffffff', boxShadow: isDark ? '0 12px 30px rgba(0,0,0,0.5)' : '0 12px 30px rgba(187,135,40,0.05)', transition: 'all 0.3s ease' }}>
              <div style={{ background: 'linear-gradient(135deg, #bf953f, #aa771c)', width: '65px', height: '65px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', marginBottom: '1.5rem', boxShadow: '0 6px 15px rgba(170,119,28,0.3)' }}>
                <Sparkles size={32} />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 'bold', color: isDark ? '#fcf6ba' : '#0f172a', marginBottom: '0.85rem' }}>سهولة مطلقة للعمل اليومي المريح</h3>
              <p style={{ color: isDark ? '#cbd5e1' : '#334155', fontSize: '0.95rem', lineHeight: 1.7 }}>واجهات عربية سلسلة ومريحة للعين مصممة لتجربة مستخدم مبهجة. يمكن لموظفي مكتبك إنجاز وتسجيل المعاملات في ثوانٍ معدودة مما يجعل العمل متعة حقيقية.</p>
            </div>

          </div>
        </section>
      </main>

      <footer className="landing-footer container" style={{ padding: '2rem 0', borderTop: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)', textAlign: 'center', color: isDark ? '#94a3b8' : '#64748b' }}>
        <p>© {new Date().getFullYear()} كفيل. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
