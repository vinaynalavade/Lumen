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
        name: orgName,
        description: orgDesc,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                {currentOrganization.name}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {currentUserOrgRole || 'MEMBER'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Organization Settings & Collaboration Governance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 border-b border-slate-800 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'general'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <Building2 className="w-4 h-4" />
            General
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'members'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            Members ({members.length || currentOrganization.member_count || 1})
          </button>
          {isAdminOrOwner && (
            <>
              <button
                onClick={() => setActiveTab('invites')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'invites'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <Link className="w-4 h-4" />
                Invite Links
              </button>
              <button
                onClick={() => setActiveTab('join-code')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'join-code'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <Key className="w-4 h-4" />
                Join Code
              </button>
            </>
          )}
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <form onSubmit={handleSaveGeneral} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={!isAdminOrOwner}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-60"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  value={orgDesc}
                  onChange={(e) => setOrgDesc(e.target.value)}
                  disabled={!isAdminOrOwner}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-60 resize-none"
                  placeholder="Primary organization description or purpose..."
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Organization Slug</h4>
                  <p className="text-xs text-slate-400">Unique handle: {currentOrganization.slug}</p>
                </div>
                <div className="text-xs text-slate-400">
                  Created {new Date(currentOrganization.created_at).toLocaleDateString()}
                </div>
              </div>

              {isAdminOrOwner && (
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'Saving Changes...' : 'Save Organization'}
                  </button>
                </div>
              )}
            </form>
          )}

          {/* TAB 2: MEMBERS */}
          {activeTab === 'members' && (
            <div className="space-y-6">
              {/* Add member form */}
              {isAdminOrOwner && (
                <form onSubmit={handleAddMember} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-indigo-400" />
                    Direct Add Registered Member
                  </h4>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      placeholder="user@example.com"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      required
                    />
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value as OrganizationRole)}
                      className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                      <option value="MEMBER">Role: MEMBER</option>
                      <option value="ADMIN">Role: ADMIN</option>
                      <option value="VIEWER">Role: VIEWER</option>
                      {isOwner && <option value="OWNER">Role: OWNER</option>}
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
                    >
                      Add Member
                    </button>
                  </div>
                </form>
              )}

              {/* Members list */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Active Members ({members.length})
                </h4>
                {isLoadingMembers ? (
                  <div className="py-8 text-center text-slate-400 text-sm">Loading members...</div>
                ) : (
                  <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
                    {members.map((m) => {
                      const isTargetOwner = m.role === 'OWNER';
                      const isCurrentUser = m.user_id === user?.id;

                      return (
                        <div key={m.id} className="p-3.5 bg-slate-900/50 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white text-xs">
                              {m.user?.full_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                                {m.user?.full_name}
                                {isCurrentUser && <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">You</span>}
                              </div>
                              <div className="text-xs text-slate-400 flex items-center gap-2">
                                <span>{m.user?.email}</span>
                                {m.user?.professional_title && (
                                  <>
                                    <span>•</span>
                                    <span className="text-slate-300 italic">{m.user.professional_title}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isAdminOrOwner && !isTargetOwner ? (
                              <select
                                value={m.role}
                                onChange={(e) => handleUpdateRole(m.user_id, e.target.value as OrganizationRole)}
                                className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value="VIEWER">VIEWER</option>
                                <option value="MEMBER">MEMBER</option>
                                <option value="ADMIN">ADMIN</option>
                                {isOwner && <option value="OWNER">OWNER</option>}
                              </select>
                            ) : (
                              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                                m.role === 'OWNER'
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                  : m.role === 'ADMIN'
                                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                                  : 'bg-slate-800 border-slate-700 text-slate-300'
                              }`}>
                                {m.role}
                              </span>
                            )}

                            {isAdminOrOwner && !isTargetOwner && !isCurrentUser && (
                              <button
                                onClick={() => handleRemoveMember(m.user_id)}
                                title="Remove member"
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
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
            <div className="space-y-6">
              {/* Create invite */}
              <form onSubmit={handleCreateInvite} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Link className="w-4 h-4 text-indigo-400" />
                  Generate Secure Token Invitation
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Target Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as OrganizationRole)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none"
                    >
                      <option value="MEMBER">MEMBER</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="VIEWER">VIEWER</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Expires In (Days)</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={inviteDays}
                      onChange={(e) => setInviteDays(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Max Uses</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={inviteMaxUses}
                      onChange={(e) => setInviteMaxUses(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
                  >
                    Generate Link
                  </button>
                </div>
              </form>

              {/* Active invites */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Links</h4>
                {isLoadingInvites ? (
                  <div className="py-6 text-center text-slate-400 text-sm">Loading invitations...</div>
                ) : invites.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-sm border border-slate-800 rounded-xl">
                    No active invitation links.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {invites.map((inv) => {
                      const inviteUrl = `${window.location.origin}/invite/${inv.token}`;
                      const isCopied = copiedToken === inviteUrl;

                      return (
                        <div key={inv.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-0.5 rounded font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Role: {inv.role}
                              </span>
                              <span className="text-xs text-slate-400">
                                Uses: {inv.uses_count} / {inv.max_uses}
                              </span>
                              {inv.expires_at && (
                                <span className="text-xs text-slate-400">
                                  Expires: {new Date(inv.expires_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-mono text-slate-300 truncate max-w-md">
                              {inviteUrl}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyToClipboard(inviteUrl, 'token')}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              {isCopied ? 'Copied' : 'Copy Link'}
                            </button>
                            <button
                              onClick={() => handleRevokeInvite(inv.id)}
                              title="Revoke link"
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
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
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/20 text-center space-y-4">
                <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Key className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">Organization Join Code</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    Share this code with team members during registration or first-time onboarding to let them join instantly.
                  </p>
                </div>

                {isLoadingJoinCode ? (
                  <div className="py-6 text-center text-slate-400 text-sm">Loading join code...</div>
                ) : joinCode && (
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-slate-950 border-2 border-indigo-500/40 text-xl font-mono font-bold tracking-widest text-indigo-300 shadow-inner">
                      {joinCode.code}
                    </div>

                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => copyToClipboard(joinCode.code, 'code')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
                      >
                        {copiedCode ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                        {copiedCode ? 'Code Copied!' : 'Copy Code'}
                      </button>

                      <button
                        onClick={handleRegenerateJoinCode}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Regenerate Code
                      </button>
                    </div>

                    <div className="pt-2 flex items-center justify-center gap-4 text-xs text-slate-400">
                      <span>Assigned Role: <strong className="text-slate-200">{joinCode.role}</strong></span>
                      <span>Total Uses: <strong className="text-slate-200">{joinCode.uses_count}</strong></span>
                      <button
                        onClick={() => handleToggleJoinCode(!joinCode.is_active)}
                        className={`underline font-semibold ${joinCode.is_active ? 'text-amber-400' : 'text-emerald-400'}`}
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
