import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'pass' | 'fail' | 'blocked' | 'untested' | 'primary' | 'neutral';
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  style,
}) => {
  const getBadgeStyle = (): React.CSSProperties => {
    switch (variant) {
      case 'pass':
        return {
          backgroundColor: 'var(--status-pass-bg)',
          color: 'var(--status-pass)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
        };
      case 'fail':
        return {
          backgroundColor: 'var(--status-fail-bg)',
          color: 'var(--status-fail)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
        };
      case 'blocked':
        return {
          backgroundColor: 'var(--status-blocked-bg)',
          color: 'var(--status-blocked)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
        };
      case 'primary':
        return {
          backgroundColor: 'var(--primary-glow)',
          color: '#818cf8',
          border: '1px solid rgba(79, 70, 229, 0.3)',
        };
      case 'untested':
      case 'neutral':
      default:
        return {
          backgroundColor: 'var(--bg-subtle)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-subtle)',
        };
    }
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontWeight: 600,
        borderRadius: 'var(--radius-sm)',
        padding: size === 'sm' ? '2px 6px' : '3px 8px',
        fontSize: size === 'sm' ? '0.6875rem' : '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        fontFamily: 'var(--font-mono)',
        ...getBadgeStyle(),
        ...style,
      }}
    >
      {children}
    </span>
  );
};
