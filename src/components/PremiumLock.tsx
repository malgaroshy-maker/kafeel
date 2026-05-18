import React from 'react';
import { Award, Lock } from 'lucide-react';

interface PremiumLockOverlayProps {
  children: React.ReactNode;
  isLocked: boolean;
  message?: string;
  blurAmount?: string;
  style?: React.CSSProperties;
}

/**
 * PremiumLockOverlay - A wrapper that blurs its contents and places a beautiful,
 * golden glowing glass padlock in the center to signify a locked premium SaaS feature.
 */
export const PremiumLockOverlay: React.FC<PremiumLockOverlayProps> = ({
  children,
  isLocked,
  message = 'ترقية الاشتراك 🔐',
  blurAmount = '4px',
  style,
}) => {
  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 'inherit', ...style }}>
      {/* Blurred Content */}
      <div style={{ filter: `blur(${blurAmount})`, pointerEvents: 'none', userSelect: 'none', width: '100%', height: '100%' }}>
        {children}
      </div>

      {/* Golden Glass Lock Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.15)',
          backdropFilter: 'blur(2px)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          zIndex: 10,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
        }}
        className="premium-lock-hover"
      >
        <div
          style={{
            background: 'rgba(191, 149, 63, 0.15)',
            border: '1px solid rgba(191, 149, 63, 0.3)',
            borderRadius: '50%',
            padding: '0.6rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(191, 149, 63, 0.25)',
          }}
        >
          <Lock size={18} style={{ color: 'var(--primary)', filter: 'drop-shadow(0 0 4px rgba(191, 149, 63, 0.5))' }} />
        </div>
        <span
          style={{
            color: 'var(--primary)',
            fontWeight: 800,
            fontSize: '0.85rem',
            letterSpacing: '0.5px',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            textAlign: 'center',
            padding: '0 0.5rem',
          }}
        >
          {message}
        </span>
      </div>
    </div>
  );
};

interface PremiumLockBannerProps {
  title?: string;
  description?: string;
  plans?: string[];
  style?: React.CSSProperties;
}

/**
 * PremiumLockBanner - A wide, stunning gold-bordered glass container
 * with premium micro-glowes, a golden badge, and detailed SaaS tier labels.
 */
export const PremiumLockBanner: React.FC<PremiumLockBannerProps> = ({
  title = 'قسم إدارة المكونات والخصائص المتقدم (خاص بالباقات الأعلى)',
  description = 'هذه الميزة غير متوفرة في باقتك الحالية. يرجى الترقية للاستفادة الكاملة من إمكانيات وصلاحيات المنظومة.',
  plans = ['الخطة المتوسطة (PREMIUM)', 'الخطة غير المحدودة (UNLIMITED)'],
  style,
}) => {
  return (
    <div
      className="glass"
      style={{
        padding: '2.5rem 1.5rem',
        borderRadius: '20px',
        marginBottom: '2.5rem',
        border: '2px dashed #aa771c',
        textAlign: 'center',
        background: 'rgba(170, 119, 28, 0.04)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
        ...style,
      }}
    >
      {/* Top right decorative radial glow */}
      <div
        style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '100px',
          height: '100px',
          background: 'radial-gradient(circle, rgba(191,149,63,0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      ></div>

      {/* Center Golden Badge */}
      <div
        style={{
          display: 'inline-flex',
          background: 'rgba(191, 149, 63, 0.12)',
          border: '1px solid rgba(191, 149, 63, 0.25)',
          borderRadius: '50%',
          padding: '1rem',
          marginBottom: '1rem',
          boxShadow: '0 4px 20px rgba(191, 149, 63, 0.15)',
        }}
      >
        <Award size={36} style={{ color: 'var(--primary)', filter: 'drop-shadow(0 2px 8px rgba(191,149,63,0.4))' }} />
      </div>

      {/* Title */}
      <h3
        style={{
          margin: '0 0 0.75rem 0',
          color: 'var(--primary)',
          fontWeight: 800,
          fontSize: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
        }}
      >
        <span>🔐</span> {title}
      </h3>

      {/* Description */}
      <p
        style={{
          color: 'var(--text-secondary)',
          maxWidth: '650px',
          margin: '0 auto 1.5rem auto',
          fontSize: '0.85rem',
          lineHeight: '1.7',
        }}
      >
        {description}
      </p>

      {/* Allowed Plans Badges */}
      <div style={{ display: 'inline-flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {plans.map((plan, idx) => (
          <span
            key={idx}
            className="badge"
            style={{
              background: idx === 0 ? 'rgba(191,149,63,0.15)' : 'rgba(16,185,129,0.15)',
              color: idx === 0 ? 'var(--primary)' : 'var(--success)',
              fontWeight: 'bold',
              padding: '0.4rem 1.2rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              border: `1px solid ${idx === 0 ? 'rgba(191,149,63,0.25)' : 'rgba(16,185,129,0.25)'}`,
            }}
          >
            {plan}
          </span>
        ))}
      </div>
    </div>
  );
};
