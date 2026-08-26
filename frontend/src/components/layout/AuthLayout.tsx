import React from 'react';
import { SunMedium, CheckCircle2, ShieldCheck, Cpu, Database } from 'lucide-react';

export const AuthLayout: React.FC<{ children: React.ReactNode; title: string; subtitle: string }> = ({
  children,
  title,
  subtitle,
}) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        backgroundColor: 'var(--bg-app)',
      }}
    >
      {/* Left Marketing / Product Vision Panel */}
      <div
        style={{
          flex: '1.1',
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-subtle)',
          padding: '60px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle glowing ambient mesh */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: '-20%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(79, 70, 229, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div>
          {/* Brand Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              <SunMedium size={22} color="#ffffff" />
            </div>
            <div>
              <span style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#ffffff' }}>
                LUMEN
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: '0.6875rem',
                  color: 'var(--accent-cyan)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  marginTop: '-4px',
                }}
              >
                Unified Quality Workspace
              </span>
            </div>
          </div>

          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              lineHeight: 1.25,
              color: '#ffffff',
              maxWidth: '480px',
              marginBottom: '16px',
            }}
          >
            Illuminate Quality. Bring Software Clarity into View.
          </h1>
          <p
            style={{
              fontSize: '1rem',
              color: 'var(--text-secondary)',
              maxWidth: '460px',
              lineHeight: 1.6,
            }}
          >
            Lumen is a unified software quality workspace that brings testing, execution, defects, evidence, and quality visibility into one connected platform.
          </p>

          {/* Value Pillars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '40px' }}>
            {[
              { icon: CheckCircle2, text: 'Single workspace for manual test runs, test cases & suites' },
              { icon: Cpu, text: 'Selenium + TestNG automation execution & Extent Report sync' },
              { icon: Database, text: 'API-to-Database data verification and integrity pipelines' },
              { icon: ShieldCheck, text: 'End-to-end defect tracking connected directly to test runs' },
            ].map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--bg-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-cyan)',
                    }}
                  >
                    <Icon size={14} />
                  </div>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {pillar.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer quote */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            maxWidth: '460px',
          }}
        >
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            “Testing does not create quality. It reveals it.”
          </p>
          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px', fontWeight: 600 }}>
            — Lumen Philosophy
          </span>
        </div>
      </div>

      {/* Right Form Panel */}
      <div
        style={{
          flex: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
        }}
      >
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {title}
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {subtitle}
            </p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};
