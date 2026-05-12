import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
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
          background: 'var(--bg-primary)',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div className="glass" style={{ padding: '3rem', borderRadius: '24px', maxWidth: '500px' }}>
            <AlertTriangle size={64} style={{ color: 'var(--error)', marginBottom: '1.5rem' }} />
            <h2 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>عذراً، حدث خطأ غير متوقع</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              نواجه مشكلة تقنية حالياً. يرجى محاولة تحديث الصفحة أو العودة للرئيسية.
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => window.location.reload()}
                style={{ gap: '0.5rem' }}
              >
                <RefreshCw size={18} /> تحديث الصفحة
              </button>
              <button 
                className="btn btn-outline" 
                onClick={this.handleReset}
              >
                العودة للرئيسية
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <pre style={{ 
                marginTop: '2rem', 
                padding: '1rem', 
                background: 'rgba(0,0,0,0.2)', 
                borderRadius: '8px', 
                fontSize: '0.8rem', 
                color: 'var(--error)',
                textAlign: 'left',
                overflowX: 'auto'
              }}>
                {this.state.error?.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
