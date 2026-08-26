import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Users,
  Link,
  Key,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  UserPlus,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useOrganization } from '../../context/OrganizationContext';
import { useAuth } from '../../context/AuthContext';
import { organizationApi } from '../../services/organizationApi';
import type {
  OrganizationMember,
  OrganizationInvite,
  OrganizationJoinCode,
  OrganizationRole,
} from '../../types';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';

interface OrganizationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrganizationSettingsModal: React.FC<OrganizationSettingsModalProps> = ({ isOpen, onClose }) => {
  const { currentOrganization, currentUserOrgRole, refreshOrganizations } = useOrganization();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'invites' | 'join-code'>('general');
  const [orgName, setOrgName] = useState(currentOrganization?.name || '');
  const [orgDesc, setOrgDesc] = useState(currentOrganization?.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Members state
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<OrganizationRole>('MEMBER');

  // Invites state
  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);
  const [inviteRole, setInviteRole] = useState<OrganizationRole>('MEMBER');
  const [inviteDays, setInviteDays] = useState(7);
  const [inviteMaxUses, setInviteMaxUses] = useState(5);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Join Code state
  const [joinCode, setJoinCode] = useState<OrganizationJoinCode | null>(null);
  const [isLoadingJoinCode, setIsLoadingJoinCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const isAdminOrOwner = currentUserOrgRole === 'OWNER' || currentUserOrgRole === 'ADMIN' || user?.is_superuser;
  const isOwner = currentUserOrgRole === 'OWNER' || user?.is_superuser;

  useEffect(() => {
    if (currentOrganization) {
      setOrgName(currentOrganization.name);
      setOrgDesc(currentOrganization.description || '');
    }
  }, [currentOrganization]);

  useEffect(() => {
    if (isOpen && currentOrganization) {
      if (activeTab === 'members') loadMembers();
      if (activeTab === 'invites' && isAdminOrOwner) loadInvites();
      if (activeTab === 'join-code' && isAdminOrOwner) loadJoinCode();
    }
  }, [isOpen, activeTab, currentOrganization?.id]);

  const loadMembers = async () => {
    if (!currentOrganization) return;
    setIsLoadingMembers(true);
    try {
      const data = await organizationApi.getMembers(currentOrganization.id);
      setMembers(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const loadInvites = async () => {
    if (!currentOrganization) return;
    setIsLoadingInvites(true);
    try {
      const data = await organizationApi.getInvites(currentOrganization.id);
      setInvites(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingInvites(false);
    }
  };

  const loadJoinCode = async () => {
    if (!currentOrganization) return;
    setIsLoadingJoinCode(true);
    try {
      const data = await organizationApi.getJoinCode(currentOrganization.id);
      setJoinCode(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingJoinCode(false);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await organizationApi.updateOrganization(currentOrganization.id, {
        name: orgName.trim(),
        description: orgDesc.trim() || undefined,
      });
      await refreshOrganizations();
      setSuccessMsg('Organization settings updated successfully.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update organization.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization || !newMemberEmail.trim()) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await organizationApi.addMember(currentOrganization.id, {
        email: newMemberEmail.trim(),
        role: newMemberRole,
      });
      setNewMemberEmail('');
      setSuccessMsg(`User added with ${newMemberRole} role.`);
      await loadMembers();
      await refreshOrganizations();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to add member.');
    }
  };

  const handleUpdateRole = async (userId: string, role: OrganizationRole) => {
    if (!currentOrganization) return;
    setErrorMsg(null);
    try {
      await organizationApi.updateMemberRole(currentOrganization.id, userId, role);
      await loadMembers();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update role.');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentOrganization || !confirm('Are you sure you want to remove this member?')) return;
    try {
      await organizationApi.removeMember(currentOrganization.id, userId);
      await loadMembers();
      await refreshOrganizations();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to remove member.');
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;
    setErrorMsg(null);
    try {
      await organizationApi.createInvite(currentOrganization.id, {
        role: inviteRole,
        expires_in_days: inviteDays,
        max_uses: inviteMaxUses,
      });
      await loadInvites();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to create invite.');
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!currentOrganization) return;
    try {
      await organizationApi.revokeInvite(currentOrganization.id, inviteId);
      await loadInvites();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to revoke invite.');
    }
  };

  const handleRegenerateJoinCode = async () => {
    if (!currentOrganization || !confirm('Regenerating will invalidate the previous code. Continue?')) return;
    try {
      const code = await organizationApi.regenerateJoinCode(currentOrganization.id);
      setJoinCode(code);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to regenerate code.');
    }
  };

  const handleToggleJoinCode = async (isActive: boolean) => {
    if (!currentOrganization) return;
    try {
      const code = await organizationApi.toggleJoinCode(currentOrganization.id, isActive);
      setJoinCode(code);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update join code.');
    }
  };

  const copyToClipboard = (text: string, type: 'token' | 'code') => {
    navigator.clipboard.writeText(text);
    if (type === 'token') {
      setCopiedToken(text);
      setTimeout(() => setCopiedToken(null), 2500);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  if (!isOpen || !currentOrganization) return null;

  const selectStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
    fontSize: '0.8125rem',
    outline: 'none',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 7, 12, 0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '780px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '88vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(79, 70, 229, 0.15)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building2 size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {currentOrganization.name}
                </h2>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(79, 70, 229, 0.15)',
                    color: '#818cf8',
                    border: '1px solid rgba(79, 70, 229, 0.3)',
                  }}
                >
                  {currentUserOrgRole || 'MEMBER'}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Organization Settings, Collaboration & Tenant Management
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            padding: '0 24px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-subtle)',
          }}
        >
          <button
            onClick={() => setActiveTab('general')}
            style={{
              padding: '12px 16px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderBottom: activeTab === 'general' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'general' ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <Building2 size={14} />
            <span>General</span>
          </button>

          <button
            onClick={() => setActiveTab('members')}
            style={{
              padding: '12px 16px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderBottom: activeTab === 'members' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'members' ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <Users size={14} />
            <span>Members ({members.length || currentOrganization.member_count || 1})</span>
          </button>

          {isAdminOrOwner && (
            <>
              <button
                onClick={() => setActiveTab('invites')}
                style={{
                  padding: '12px 16px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderBottom: activeTab === 'invites' ? '2px solid var(--primary)' : '2px solid transparent',
                  color: activeTab === 'invites' ? 'var(--primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <Link size={14} />
                <span>Invite Links</span>
              </button>

              <button
                onClick={() => setActiveTab('join-code')}
                style={{
                  padding: '12px 16px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderBottom: activeTab === 'join-code' ? '2px solid var(--primary)' : '2px solid transparent',
                  color: activeTab === 'join-code' ? 'var(--primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <Key size={14} />
                <span>Join Code</span>
              </button>
            </>
          )}
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div
            style={{
              margin: '16px 24px 0',
              padding: '10px 14px',
              backgroundColor: 'var(--status-fail-bg)',
              border: '1px solid var(--status-fail)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--status-fail)',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} style={{ color: 'var(--status-fail)', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              margin: '16px 24px 0',
              padding: '10px 14px',
              backgroundColor: 'var(--status-pass-bg)',
              border: '1px solid var(--status-pass)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--status-pass)',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} style={{ color: 'var(--status-pass)', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Body Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <form onSubmit={handleSaveGeneral} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Input
                label="Organization Name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={!isAdminOrOwner}
                required
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Description
                </label>
                <textarea
                  value={orgDesc}
                  onChange={(e) => setOrgDesc(e.target.value)}
                  disabled={!isAdminOrOwner}
                  rows={3}
                  placeholder="Primary organization description or quality purpose..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div
                style={{
                  padding: '14px 16px',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Organization Slug
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Unique identifier: <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{currentOrganization.slug}</code>
                  </p>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Created {new Date(currentOrganization.created_at).toLocaleDateString()}
                </div>
              </div>

              {isAdminOrOwner && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
                  <Button type="submit" variant="primary" isLoading={isSaving}>
                    Save Changes
                  </Button>
                </div>
              )}
            </form>
          )}

          {/* TAB 2: MEMBERS */}
          {activeTab === 'members' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Add member form */}
              {isAdminOrOwner && (
                <form
                  onSubmit={handleAddMember}
                  style={{
                    padding: '16px',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UserPlus size={14} color="var(--primary)" />
                    Direct Add Registered Member
                  </h4>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input
                      type="email"
                      placeholder="user@company.io"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      style={{
                        flex: '1 1 240px',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8125rem',
                        outline: 'none',
                      }}
                      required
                    />
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value as OrganizationRole)}
                      style={selectStyle}
                    >
                      <option value="MEMBER">Role: MEMBER</option>
                      <option value="ADMIN">Role: ADMIN</option>
                      <option value="VIEWER">Role: VIEWER</option>
                      {isOwner && <option value="OWNER">Role: OWNER</option>}
                    </select>
                    <Button type="submit" variant="primary" size="sm">
                      Add Member
                    </Button>
                  </div>
                </form>
              )}

              {/* Members list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Organization Members ({members.length})
                </h4>
                {isLoadingMembers ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    Loading members...
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {members.map((m) => {
                      const isTargetOwner = m.role === 'OWNER';
                      const isCurrentUser = m.user_id === user?.id;

                      return (
                        <div
                          key={m.id}
                          style={{
                            padding: '12px 16px',
                            backgroundColor: 'var(--bg-subtle)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                color: '#ffffff',
                                fontSize: '0.75rem',
                              }}
                            >
                              {m.user?.full_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {m.user?.full_name}
                                {isCurrentUser && (
                                  <span style={{ fontSize: '0.6875rem', backgroundColor: 'var(--bg-card)', padding: '1px 6px', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}>
                                    You
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{m.user?.email}</span>
                                {m.user?.professional_title && (
                                  <>
                                    <span>•</span>
                                    <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                      {m.user.professional_title}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isAdminOrOwner && !isTargetOwner ? (
                              <select
                                value={m.role}
                                onChange={(e) => handleUpdateRole(m.user_id, e.target.value as OrganizationRole)}
                                style={{ ...selectStyle, padding: '4px 8px', fontSize: '0.75rem' }}
                              >
                                <option value="VIEWER">VIEWER</option>
                                <option value="MEMBER">MEMBER</option>
                                <option value="ADMIN">ADMIN</option>
                                {isOwner && <option value="OWNER">OWNER</option>}
                              </select>
                            ) : (
                              <Badge variant={m.role === 'OWNER' ? 'pass' : m.role === 'ADMIN' ? 'primary' : 'neutral'}>
                                {m.role}
                              </Badge>
                            )}

                            {isAdminOrOwner && !isTargetOwner && !isCurrentUser && (
                              <button
                                onClick={() => handleRemoveMember(m.user_id)}
                                title="Remove member"
                                style={{
                                  padding: '6px',
                                  color: 'var(--text-muted)',
                                  borderRadius: 'var(--radius-sm)',
                                  cursor: 'pointer',
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: INVITE LINKS */}
          {activeTab === 'invites' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Create invite */}
              <form
                onSubmit={handleCreateInvite}
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Link size={14} color="var(--primary)" />
                  Generate Secure Token Invitation
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Target Role
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as OrganizationRole)}
                      style={{ ...selectStyle, width: '100%' }}
                    >
                      <option value="MEMBER">MEMBER</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="VIEWER">VIEWER</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Expires In (Days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={inviteDays}
                      onChange={(e) => setInviteDays(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8125rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Max Uses
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={inviteMaxUses}
                      onChange={(e) => setInviteMaxUses(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8125rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                  <Button type="submit" variant="primary" size="sm">
                    Generate Link
                  </Button>
                </div>
              </form>

              {/* Active invites */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Active Invitation Links
                </h4>
                {isLoadingInvites ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    Loading invitations...
                  </div>
                ) : invites.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                    No active invitation links generated.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {invites.map((inv) => {
                      const inviteUrl = `${window.location.origin}/invite/${inv.token}`;
                      const isCopied = copiedToken === inviteUrl;

                      return (
                        <div
                          key={inv.id}
                          style={{
                            padding: '12px 16px',
                            backgroundColor: 'var(--bg-subtle)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Badge variant="primary">Role: {inv.role}</Badge>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Uses: {inv.uses_count} / {inv.max_uses}
                              </span>
                              {inv.expires_at && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  Expires: {new Date(inv.expires_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                              {inviteUrl}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => copyToClipboard(inviteUrl, 'token')}
                              leftIcon={isCopied ? <Check size={13} color="var(--status-pass)" /> : <Copy size={13} />}
                            >
                              {isCopied ? 'Copied' : 'Copy Link'}
                            </Button>
                            <button
                              onClick={() => handleRevokeInvite(inv.id)}
                              title="Revoke link"
                              style={{
                                padding: '6px',
                                color: 'var(--text-muted)',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: JOIN CODE */}
          {activeTab === 'join-code' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  padding: '24px',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(79, 70, 229, 0.15)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Key size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Organization Join Code
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: '440px', margin: '4px auto 0' }}>
                    Share this code with teammates during registration or onboarding to let them join this organization.
                  </p>
                </div>

                {isLoadingJoinCode ? (
                  <div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    Loading join code...
                  </div>
                ) : joinCode && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', width: '100%' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 24px',
                        backgroundColor: 'var(--bg-card)',
                        border: '2px solid rgba(79, 70, 229, 0.4)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '1.25rem',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        color: 'var(--accent-cyan)',
                      }}
                    >
                      {joinCode.code}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => copyToClipboard(joinCode.code, 'code')}
                        leftIcon={copiedCode ? <Check size={14} /> : <Copy size={14} />}
                      >
                        {copiedCode ? 'Code Copied!' : 'Copy Code'}
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleRegenerateJoinCode}
                        leftIcon={<RefreshCw size={13} />}
                      >
                        Regenerate Code
                      </Button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      <span>Assigned Role: <strong style={{ color: 'var(--text-primary)' }}>{joinCode.role}</strong></span>
                      <span>Total Uses: <strong style={{ color: 'var(--text-primary)' }}>{joinCode.uses_count}</strong></span>
                      <button
                        type="button"
                        onClick={() => handleToggleJoinCode(!joinCode.is_active)}
                        style={{
                          textDecoration: 'underline',
                          fontWeight: 600,
                          color: joinCode.is_active ? 'var(--status-blocked)' : 'var(--status-pass)',
                          cursor: 'pointer',
                        }}
                      >
                        {joinCode.is_active ? 'Disable Code' : 'Enable Code'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
