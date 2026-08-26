import React from 'react';
import { NavLink, useParams, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Bug,
  Zap,
  Database,
  Bot,
  BarChart3,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export const Sidebar: React.FC = () => {
  const { activeWorkspace, activeProject } = useWorkspace();
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();

  const currentProjId = projectId || activeProject?.id;
  const pathname = location.pathname;

  // Exact matching for Project Cockpit vs Manual Testing child routes
  const isCockpitActive = Boolean(
    currentProjId
      ? pathname === `/projects/${currentProjId}` || pathname === `/projects/${currentProjId}/`
      : pathname === '/projects'
  );

  const isManualActive = Boolean(
    pathname.includes('/manual') ||
    pathname.includes('/test-cases') ||
    pathname.includes('/test-suites') ||
    pathname.includes('/test-runs')
  );

  const navItems = [
    {
      name: 'Project Cockpit',
      path: currentProjId ? `/projects/${currentProjId}` : '/projects',
      icon: LayoutDashboard,
      phase: 'Phase 0',
      active: true,
      isCurrentlyActive: isCockpitActive,
    },
    {
      name: 'Manual Testing',
      path: currentProjId ? `/projects/${currentProjId}/manual/cases` : '#',
      icon: ClipboardList,
      phase: 'Phase 1',
      active: true,
      isCurrentlyActive: isManualActive,
    },
    {
      name: 'Defect Tracker',
      path: currentProjId ? `/projects/${currentProjId}/defects` : '#',
      icon: Bug,
      phase: 'Phase 2',
      active: false,
      isCurrentlyActive: false,
    },
    {
      name: 'API Testing',
      path: currentProjId ? `/projects/${currentProjId}/api-tests` : '#',
      icon: Zap,
      phase: 'Phase 3',
      active: false,
      isCurrentlyActive: false,
    },
    {
      name: 'Database Testing',
      path: currentProjId ? `/projects/${currentProjId}/db-tests` : '#',
      icon: Database,
      phase: 'Phase 4',
      active: false,
      isCurrentlyActive: false,
    },
    {
      name: 'Automation (Selenium)',
      path: currentProjId ? `/projects/${currentProjId}/automation` : '#',
      icon: Bot,
      phase: 'Phase 5',
      active: false,
      isCurrentlyActive: false,
    },
    {
      name: 'Unified Reports',
      path: currentProjId ? `/projects/${currentProjId}/reports` : '#',
      icon: BarChart3,
      phase: 'Phase 7',
      active: false,
      isCurrentlyActive: false,
    },
  ];

  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 60px)',
        position: 'sticky',
        top: '60px',
        userSelect: 'none',
      }}
    >
      {/* Active Project Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(19, 22, 34, 0.4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Active Project
          </span>
          <NavLink
            to="/projects"
            style={{
              fontSize: '0.75rem',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 500,
            }}
          >
            All Projects
          </NavLink>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
            }}
          >
            {activeProject ? activeProject.key.substring(0, 3) : 'QA'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {activeProject ? activeProject.name : 'No Active Project'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {activeProject ? `[${activeProject.key}]` : 'Select or Create'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
        <div style={{ padding: '4px 12px 8px', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          QA Modules
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.isCurrentlyActive;

            return (
              <NavLink
                key={item.name}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#ffffff' : item.active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                  boxShadow: isActive ? '0 0 12px rgba(79, 70, 229, 0.35)' : 'none',
                  opacity: item.active ? 1 : 0.65,
                  transition: 'all var(--transition-fast)',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--bg-subtle)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = item.active ? 'var(--text-primary)' : 'var(--text-secondary)';
                  }
                }}
                onClick={(e) => {
                  if (!item.active) {
                    e.preventDefault();
                    alert(`${item.name} will be unlocked in ${item.phase}!`);
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={18} color={isActive ? '#ffffff' : undefined} />
                  <span>{item.name}</span>
                </div>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'var(--bg-subtle)',
                    color: isActive ? '#ffffff' : 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {item.phase}
                </span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(13, 15, 23, 0.8)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>Workspace: <strong style={{ color: 'var(--text-primary)' }}>{activeWorkspace?.name || 'Default'}</strong></span>
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>v0.1.0</span>
      </div>
    </aside>
  );
};
