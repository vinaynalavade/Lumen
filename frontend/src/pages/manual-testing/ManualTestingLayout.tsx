import React from 'react';
import { NavLink, Outlet, useParams } from 'react-router-dom';
import { ClipboardList, Layers, Play, CheckCircle2 } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export const ManualTestingLayout: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeProject } = useWorkspace();

  const tabs = [
    {
      to: `/projects/${projectId}/manual/cases`,
      label: 'Test Cases',
      icon: ClipboardList,
    },
    {
      to: `/projects/${projectId}/manual/suites`,
      label: 'Test Suites',
      icon: Layers,
    },
    {
      to: `/projects/${projectId}/manual/runs`,
      label: 'Test Runs',
      icon: Play,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header bar with tabs */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              [{activeProject?.key || 'PROJ'}]
            </span>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Manual Testing Studio
            </h1>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--status-pass)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <CheckCircle2 size={11} /> Phase 1 Active
            </span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Design reusable test cases, organize in suites, execute test runs, and preserve immutable audit history.
          </p>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '4px',
            gap: '4px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
                  boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                  textDecoration: 'none',
                  transition: 'var(--transition-fast)',
                })}
              >
                <Icon size={15} />
                {tab.label}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Main Outlet */}
      <Outlet />
    </div>
  );
};
