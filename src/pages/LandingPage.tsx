import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Building2, Shield, LayoutDashboard } from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '2rem' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '4rem', animation: 'fadeInUp 0.6s ease-out' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-color), var(--accent-glow))', color: 'white', marginBottom: '1rem', boxShadow: '0 8px 32px var(--accent-glow)' }}>
          <Car size={40} />
        </div>
        <h1 style={{ fontSize: '3rem', margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>كفيل</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', margin: 0 }}>منصة المرابحة الذكية لقطاع السيارات</p>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '1000px', width: '100%' }}>
        
        {/* Office Portal */}
        <div 
          onClick={() => navigate('/office')}
          className="glass hover-lift"
          style={{ flex: '1 1 300px', padding: '3rem 2rem', borderRadius: '24px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', border: '1px solid var(--glass-border)' }}
        >
          <div style={{ color: 'var(--accent-color)', marginBottom: '1.5rem' }}>
            <Building2 size={48} style={{ margin: '0 auto' }} />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>بوابة المكاتب</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            إدارة الزبائن، المعاملات، الحسابات المالية، وتسويات مبيعات السيارات.
          </p>
        </div>

        {/* Monitor Portal */}
        <div 
          onClick={() => navigate('/monitor')}
          className="glass hover-lift"
          style={{ flex: '1 1 300px', padding: '3rem 2rem', borderRadius: '24px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', border: '1px solid var(--glass-border)' }}
        >
          <div style={{ color: 'var(--warning-color)', marginBottom: '1.5rem' }}>
            <Shield size={48} style={{ margin: '0 auto' }} />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>بوابة المراقب</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            مراقبة طابور الانتظار، فك الاختناقات، وإجراء عمليات الربط الاستثنائية للضمان.
          </p>
        </div>

        {/* Admin Portal */}
        <div 
          onClick={() => navigate('/admin')}
          className="glass hover-lift"
          style={{ flex: '1 1 300px', padding: '3rem 2rem', borderRadius: '24px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', border: '1px solid var(--glass-border)' }}
        >
          <div style={{ color: 'var(--success-color)', marginBottom: '1.5rem' }}>
            <LayoutDashboard size={48} style={{ margin: '0 auto' }} />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>بوابة الإدارة</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            إدارة اشتراكات المكاتب، إضافة جهات العمل، والإشراف العام على المنظومة.
          </p>
        </div>

      </div>
      
      <div style={{ marginTop: '4rem', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
        ملاحظة: هذه الصفحة مؤقتة لاختيار المسار أثناء مرحلة التطوير.
      </div>
    </div>
  );
};

export default LandingPage;
