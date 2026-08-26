import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  Plus,
  Building2,
  FolderDot,
  LogOut,
  Shield,
  SunMedium,
  User as UserIcon,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ProfileModal } from '../common/ProfileModal';

interface TopbarProps {
  onCreateWorkspace: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onCreateWorkspace }) => {
  const { user, logout } = useAuth();
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const wsMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wsMenuRef.current && !wsMenuRef.current.contains(e.target as Node)) {
        setIsWorkspaceMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userRole = activeWorkspace?.current_user_role || (user?.is_superuser ? 'SUPERUSER' : 'MEMBER');

  return (
    <>
      <header
        style={{
          height: '60px',
          backgroundColor: 'var(--bg-app)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        {/* Left: Brand Logo & Workspace Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <NavLink
            to="/projects"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              <SunMedium size={18} color="#ffffff" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  background: 'linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                LUMEN
              </span>
              <span
                style={{
                  fontSize: '0.625rem',
                  color: 'var(--accent-cyan)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  marginTop: '-3px',
                }}
              >
                Quality Engineering
              </span>
            </div>
          </NavLink>

          <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--border-subtle)' }} />

          {/* Workspace Switcher */}
          <div style={{ position: 'relative' }} ref={wsMenuRef}>
            <button
              onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                fontWeight: 500,
                transition: 'all var(--transition-fast)',
                cursor: 'pointer',
              }}
            >
              <Building2 size={16} color="var(--primary)" />
              <span>{activeWorkspace ? activeWorkspace.name : 'Select Workspace'}</span>
              <ChevronDown size={14} color="var(--text-muted)" />
            </button>

            {isWorkspaceMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  width: '240px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '6px',
                  zIndex: 100,
                  animation: 'fadeIn 0.15s ease-out',
                }}
              >
                <div
                  style={{
                    padding: '6px 10px',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Workspaces ({workspaces.length})
                </div>

                <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setActiveWorkspace(ws);
                        setIsWorkspaceMenuOpen(false);
                        navigate('/projects');
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: activeWorkspace?.id === ws.id ? 'var(--bg-subtle)' : 'transparent',
                        color: activeWorkspace?.id === ws.id ? '#ffffff' : 'var(--text-secondary)',
                        fontSize: '0.875rem',
                        fontWeight: activeWorkspace?.id === ws.id ? 600 : 400,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ws.name}
                      </span>
                      {activeWorkspace?.id === ws.id && (
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--primary)',
                          }}
                        />
                      )}
                    </button>
                  ))}
                </div>

                <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '6px 0' }} />

                <button
                  onClick={() => {
                    setIsWorkspaceMenuOpen(false);
                    onCreateWorkspace();
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--primary)',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={15} />
                  <span>Create Workspace</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Links & User Popover */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <NavLink
            to="/projects"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: isActive ? '#ffffff' : 'var(--text-secondary)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: isActive ? 'var(--bg-subtle)' : 'transparent',
              textDecoration: 'none',
            })}
          >
            <FolderDot size={16} />
            <span>Projects</span>
          </NavLink>

          {/* User Profile Popover */}
          <div style={{ position: 'relative' }} ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '4px 10px 4px 4px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-strong)',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                }}
              >
                {user?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                <span
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    maxWidth: '130px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.2,
                  }}
                >
                  {user?.full_name || 'Account'}
                </span>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    color: 'var(--text-muted)',
                    maxWidth: '130px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.2,
                  }}
                >
                  {user?.professional_title || 'QA Professional'}
                </span>
              </div>
              <ChevronDown size={14} color="var(--text-muted)" />
            </button>

            {isUserMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  width: '260px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '8px',
                  zIndex: 100,
                  animation: 'fadeIn 0.15s ease-out',
                }}
              >
                <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {user?.full_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {user?.email}
                  </div>
                </div>

                <div style={{ padding: '6px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {/* Professional Title Display */}
                  <div
                    style={{
                      padding: '6px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.8125rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <Briefcase size={14} color="var(--primary)" />
                    <span>Title: <strong style={{ color: 'var(--text-primary)' }}>{user?.professional_title || 'None'}</strong></span>
                  </div>

                  {/* Workspace Security Role Badge */}
                  <div
                    style={{
                      padding: '6px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.8125rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <Shield size={14} color="var(--accent-cyan)" />
                    <span>Role: <strong style={{ color: 'var(--accent-cyan)' }}>{userRole}</strong></span>
                  </div>
                </div>

                <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />

                {/* Edit Profile Action */}
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsProfileModalOpen(true);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <UserIcon size={14} />
                  <span>Edit Profile & Title</span>
                </button>

                <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />

                <button
                  onClick={logout}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--status-fail)',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <LogOut size={14} />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Profile Edit Modal */}
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </>
  );
};
