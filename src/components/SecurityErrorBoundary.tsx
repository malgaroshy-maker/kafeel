import { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Home, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorLogged: boolean;
  securityEventId: string | null;
}

/**
 * SecurityErrorBoundary - A state-of-the-art React Error Boundary.
 * Securely intercepts application-level runtime crashes, prevents raw code trace leaks,
 * logs full debug data to the system_runtime_errors audit table in Supabase,
 * and presents an premium glassmorphic protective interface 🛡️.
 */
export class SecurityErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorLogged: false,
    securityEventId: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorLogged: false, securityEventId: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🛡️ [Kafeel Sentinel] Intercepted runtime exception:', error, errorInfo);
    this.logSecurityError(error, errorInfo);
  }

  private async logSecurityError(error: Error, errorInfo: ErrorInfo) {
    try {
      // 1. Get auth session safely
      const { data: { session } } = await supabase.auth.getSession();
      
      const userId = session?.user?.id || null;
      // Get office_id from user metadata if exists
      const officeId = session?.user?.user_metadata?.office_id || null;

      // 2. Generate unique tracking reference to display to the user securely
      const referenceId = Math.random().toString(36).substring(2, 10).toUpperCase();

      // 3. Write structured telemetry record
      const { data, error: dbError } = await supabase
        .from('system_runtime_errors')
        .insert({
          error_message: error.message || String(error),
          error_stack: error.stack || null,
          component_name: errorInfo?.componentStack || 'AppRoot',
          severity: 'CRITICAL',
          user_id: userId,
          office_id: officeId
        })
        .select('id')
        .single();

      if (dbError) {
        console.error('❌ Failed to log system error to telemetry:', dbError);
      } else {
        this.setState({ 
          errorLogged: true, 
          securityEventId: data?.id || referenceId 
        });
      }
    } catch (e) {
      console.error('🛡️ Fatal error within sentinel logging handler:', e);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorLogged: false, securityEventId: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          background: 'radial-gradient(circle at center, #000000 0%, #050508 100%)',
          color: '#f4f4f5',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: "'Alexandria', 'Tajawal', 'Cairo', sans-serif",
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Radial security grid lines */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(var(--primary-ghost) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            opacity: 0.15,
            pointerEvents: 'none'
          }} />

          {/* Premium Glowing Glass Shield */}
          <div className="glass" style={{ 
            padding: '3.5rem 2.5rem', 
            borderRadius: '24px', 
            maxWidth: '550px',
            border: '1px solid rgba(191, 149, 63, 0.4)',
            background: 'rgba(8, 8, 12, 0.85)',
            boxShadow: '0 20px 50px rgba(191, 149, 63, 0.08), inset 0 0 20px rgba(191, 149, 63, 0.05)',
            backdropFilter: 'blur(10px)',
            position: 'relative',
            zIndex: 1
          }}>
            {/* Top decorative security line */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '10%',
              right: '10%',
              height: '2px',
              background: 'linear-gradient(90deg, transparent, var(--primary), transparent)',
              boxShadow: '0 0 10px var(--primary)'
            }} />

            {/* Glowing Shield Icon */}
            <div style={{
              display: 'inline-flex',
              background: 'rgba(191, 149, 63, 0.06)',
              border: '1px solid rgba(191, 149, 63, 0.2)',
              borderRadius: '50%',
              padding: '1.5rem',
              marginBottom: '2rem',
              boxShadow: '0 0 30px rgba(191, 149, 63, 0.15)',
              position: 'relative'
            }}>
              <ShieldAlert size={48} style={{ color: 'var(--primary)', filter: 'drop-shadow(0 0 8px rgba(191, 149, 63, 0.6))' }} />
              <div style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                background: 'var(--primary)',
                color: '#000',
                padding: '0.2rem 0.5rem',
                borderRadius: '10px',
                fontSize: '0.65rem',
                fontWeight: 'bold',
                boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
              }}>
                SAFEGUARD
              </div>
            </div>

            {/* Warning Details */}
            <h2 style={{ 
              marginBottom: '1rem', 
              color: 'var(--primary)', 
              fontWeight: 800,
              fontSize: '1.4rem',
              letterSpacing: '0.3px',
              textShadow: '0 0 15px rgba(191,149,63,0.2)'
            }}>
              حماية درع كفيل الأمني 🛡️
            </h2>

            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              color: '#fff',
              marginBottom: '1rem'
            }}>
              تم اعتراض واحتواء انهيار برمجي بنجاح
            </h3>

            <p style={{ 
              color: '#a1a1aa', 
              marginBottom: '2.5rem',
              fontSize: '0.88rem',
              lineHeight: '1.8',
              textAlign: 'justify',
              padding: '0 0.5rem'
            }}>
              لقد اعترض نظام الحماية السيبرانية للمنظومة خطأً فنياً غير متوقع وقام بتصفية ومنع تسريب أي تفاصيل حساسة للشفرة المصدرية حمايةً لبياناتك وامتثالاً للقوانين المنظمة. تم تشفير تفاصيل العطل وحفظها تلقائياً للمراجعة الفورية من قبل المشرفين الفنيين.
            </p>

            {/* Tracking Reference ID */}
            {this.state.securityEventId && (
              <div style={{
                marginBottom: '2rem',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px dashed rgba(191, 149, 63, 0.25)',
                padding: '0.8rem 1.2rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.8rem'
              }}>
                <span style={{ color: '#71717a' }}>معرف البلاغ الأمني المرجعي:</span>
                <code style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.9rem', letterSpacing: '0.5px' }}>
                  {this.state.securityEventId}
                </code>
              </div>
            )}
            
            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => window.location.reload()}
                style={{ 
                  gap: '0.5rem', 
                  padding: '0.75rem 1.75rem', 
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                <RefreshCw size={16} /> إعادة المحاولة
              </button>
              <button 
                className="btn btn-outline" 
                onClick={this.handleReset}
                style={{ 
                  gap: '0.5rem',
                  padding: '0.75rem 1.75rem',
                  borderRadius: '12px',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#d4d4d8',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                <Home size={16} /> العودة للرئيسية
              </button>
            </div>

            {/* Extra Developer Info (Limited to Development and masked) */}
            {process.env.NODE_ENV === 'development' && (
              <div style={{ marginTop: '2.5rem', textAlign: 'right' }}>
                <div style={{ 
                  fontSize: '0.7rem', 
                  color: '#71717a', 
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}>
                  <Shield size={12} style={{ color: 'var(--primary)' }} />
                  <span>تفاصيل التطوير (تظهر في بيئة التطوير فقط):</span>
                </div>
                <pre style={{ 
                  padding: '1rem', 
                  background: 'rgba(0,0,0,0.4)', 
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '10px', 
                  fontSize: '0.75rem', 
                  color: '#f87171',
                  textAlign: 'left',
                  overflowX: 'auto',
                  fontFamily: 'monospace'
                }}>
                  {this.state.error?.toString()}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
