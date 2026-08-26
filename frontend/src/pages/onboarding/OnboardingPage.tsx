import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SunMedium,
  Building2,
  FolderDot,
  Briefcase,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Key,
  Globe,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { authApi } from '../../services/authApi';
import { organizationApi } from '../../services/organizationApi';
import { workspaceApi } from '../../services/workspaceApi';
import { projectApi } from '../../services/projectApi';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

const PREDEFINED_TITLES = [
  'QA Lead',
  'Senior QA Engineer',
  'QA Engineer',
  'QA Automation Engineer',
  'SDET',
  'QA Architect',
  'Engineering Manager',
  'Software Engineer',
  'Product Manager',
  'Other',
];

export const OnboardingPage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { refreshOrganizations, selectOrganization } = useOrganization();
  const { refreshWorkspaces, setActiveWorkspace, setActiveProject } = useWorkspace();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [step, setStep] = useState<1 | 2>(1);

  // Profile data
  const [selectedTitle, setSelectedTitle] = useState<string>(user?.professional_title || 'QA Lead');
  const [customTitle, setCustomTitle] = useState<string>('');

  // Organization & Workspace & Project data
  const [orgName, setOrgName] = useState<string>('Acme Quality Global');
  const [workspaceName, setWorkspaceName] = useState<string>('Core Engineering');
  const [projectName, setProjectName] = useState<string>('Core Web Platform');
  const [projectKey, setProjectKey] = useState<string>('CORE');

  // Join Code data
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setProjectName(val);
    if (!projectKey || projectKey === 'CORE') {
      const generated = val
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 5);
      if (generated) setProjectKey(generated);
    }
  };

  const handleCompleteCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalTitle = selectedTitle === 'Other' ? customTitle.trim() : selectedTitle;
    if (!orgName.trim()) {
      setError('Organization name is required.');
      return;
    }
    if (!workspaceName.trim()) {
      setError('Workspace name is required.');
      return;
    }
    if (!projectName.trim() || !projectKey.trim()) {
      setError('Project name and key are required.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Update user profile with professional title
      if (finalTitle) {
        const updatedUser = await authApi.updateProfile({
          professional_title: finalTitle,
        });
        updateUser(updatedUser);
      }

      // 2. Create Organization with default workspace
      const newOrg = await organizationApi.createOrganization({
        name: orgName.trim(),
        create_default_workspace: true,
        default_workspace_name: workspaceName.trim(),
      });

      // 3. Refresh org context
      await refreshOrganizations();
      selectOrganization(newOrg.id);

      // 4. Fetch workspaces to find the created one
      await refreshWorkspaces();
      const userWorkspaces = await workspaceApi.getWorkspaces(newOrg.id);
      const targetWs = userWorkspaces[0];

      if (targetWs) {
        const newProject = await projectApi.createProject(targetWs.id, {
          name: projectName.trim(),
          key: projectKey.trim().toUpperCase(),
          description: 'First quality project created during onboarding',
        });
        setActiveWorkspace(targetWs);
        setActiveProject(newProject);
        navigate(`/projects/${newProject.id}`);
      } else {
        navigate('/projects');
      }
    } catch (err: any) {
      console.error('Onboarding failed:', err);
      setError(err?.response?.data?.detail || err?.message || 'Failed to complete setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!joinCodeInput.trim()) {
      setError('Please enter a valid join code.');
      return;
    }

    const finalTitle = selectedTitle === 'Other' ? customTitle.trim() : selectedTitle;
    setIsLoading(true);
    try {
      // 1. Update user title
      if (finalTitle) {
        const updatedUser = await authApi.updateProfile({
          professional_title: finalTitle,
        });
        updateUser(updatedUser);
      }

      // 2. Join Organization by code
      const joinedOrg = await organizationApi.joinByCode(joinCodeInput.trim().toUpperCase());
      await refreshOrganizations();
      selectOrganization(joinedOrg.id);
      await refreshWorkspaces();

      navigate('/projects');
    } catch (err: any) {
      console.error('Join failed:', err);
      setError(err?.response?.data?.detail || err?.message || 'Failed to join organization with that code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-app)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(79, 70, 229, 0.15) 0%, rgba(6, 182, 212, 0.05) 50%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '580px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-xl)',
          padding: '36px',
          boxShadow: 'var(--shadow-xl)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow)',
              marginBottom: '14px',
            }}
          >
            <SunMedium size={26} color="#ffffff" />
          </div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: '6px',
            }}
          >
            Welcome to LUMEN, {user?.full_name?.split(' ')[0] || 'Engineer'}!
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Choose how you'd like to begin your quality testing workspace.
          </p>
        </div>

        {/* Mode Toggle: Create Org vs Join with Code */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('create');
              setError(null);
            }}
            className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              mode === 'create'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Create Organization
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('join');
              setError(null);
            }}
            className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              mode === 'join'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-4 h-4" />
            Join with Code
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid var(--status-fail)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--status-fail)',
              fontSize: '0.875rem',
              marginBottom: '20px',
            }}
          >
            {error}
          </div>
        )}

        {/* 1. CREATE ORGANIZATION FLOW */}
        {mode === 'create' && (
          <form onSubmit={handleCompleteCreate}>
            {step === 1 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div
                  style={{
                    padding: '12px 16px',
                    backgroundColor: 'rgba(6, 182, 212, 0.08)',
                    border: '1px solid rgba(6, 182, 212, 0.25)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <ShieldCheck size={20} color="var(--accent-cyan)" />
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                    Creating an organization automatically grants you <strong>OWNER</strong> governance rights.
                  </div>
                </div>

                {/* Professional Title Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Briefcase size={15} color="var(--primary)" />
                    Professional Title (e.g. QA Lead)
                  </label>
                  <select
                    value={selectedTitle}
                    onChange={(e) => setSelectedTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-strong)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  >
                    {PREDEFINED_TITLES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTitle === 'Other' && (
                  <Input
                    label="Enter custom title"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. Lead Quality Architect"
                    required
                  />
                )}

                {/* Organization Setup */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Globe size={15} color="var(--accent-cyan)" />
                    Organization Name
                  </label>
                  <Input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Acme Global Quality"
                    required
                  />
                </div>

                {/* Initial Workspace Setup */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={15} color="var(--primary)" />
                    First Workspace Name
                  </label>
                  <Input
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="e.g. Core Engineering"
                    required
                  />
                </div>

                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    if (!orgName.trim()) {
                      setError('Please provide an organization name.');
                      return;
                    }
                    if (!workspaceName.trim()) {
                      setError('Please provide a workspace name.');
                      return;
                    }
                    setError(null);
                    setStep(2);
                  }}
                  style={{ width: '100%', marginTop: '6px' }}
                >
                  <span>Continue to Project Setup</span>
                  <ArrowRight size={16} />
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div
                  style={{
                    padding: '12px 16px',
                    backgroundColor: 'rgba(79, 70, 229, 0.08)',
                    border: '1px solid rgba(79, 70, 229, 0.25)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <Sparkles size={20} color="var(--primary)" />
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                    Setting up initial project for <strong>{workspaceName}</strong> under <strong>{orgName}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FolderDot size={15} color="var(--primary)" />
                    First Project Name
                  </label>
                  <Input
                    value={projectName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Core Web Platform"
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Project Key Prefix (for Test Cases, e.g. CORE-TC-1)
                  </label>
                  <Input
                    value={projectKey}
                    onChange={(e) => setProjectKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                    placeholder="e.g. CORE"
                    maxLength={10}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setStep(1)}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isLoading}
                    style={{ flex: 1 }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Launch Organization & Workspace</span>
                  </Button>
                </div>
              </div>
            )}
          </form>
        )}

        {/* 2. JOIN ORGANIZATION FLOW */}
        {mode === 'join' && (
          <form onSubmit={handleCompleteJoin} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center gap-3">
              <Key className="w-5 h-5 text-indigo-400 shrink-0" />
              <div className="text-xs text-slate-200">
                Enter the join code shared by your organization administrator (e.g. <strong>LUMEN-XXXX-YYYY</strong>).
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Join Code
              </label>
              <input
                type="text"
                placeholder="LUMEN-XXXX-YYYY"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-indigo-300 font-mono font-bold tracking-wider text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Your Professional Title
              </label>
              <select
                value={selectedTitle}
                onChange={(e) => setSelectedTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-sm focus:outline-none"
              >
                {PREDEFINED_TITLES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              style={{ width: '100%', marginTop: '12px' }}
            >
              <CheckCircle2 size={16} />
              <span>Join Organization</span>
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
