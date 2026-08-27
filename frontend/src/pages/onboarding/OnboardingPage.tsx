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
  ArrowLeft,
  AlertCircle,
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
    let targetWs: any = null;

    try {
      // 1. Update user profile with professional title (non-blocking)
      if (finalTitle) {
        try {
          const updatedUser = await authApi.updateProfile({
            professional_title: finalTitle,
          });
          updateUser(updatedUser);
        } catch (profileErr: any) {
          console.warn('Professional title update warning:', profileErr);
        }
      }

      // 2. Create Organization with default workspace
      let newOrg;
      try {
        newOrg = await organizationApi.createOrganization({
          name: orgName.trim(),
          create_default_workspace: true,
          default_workspace_name: workspaceName.trim(),
        });
      } catch (orgErr: any) {
        throw new Error(`Organization Creation Failed: ${orgErr?.message || 'Unable to create organization'}`);
      }

      // 3. Refresh org context
      try {
        await refreshOrganizations();
        selectOrganization(newOrg.id);
      } catch (ctxErr) {
        console.warn('Context refresh warning:', ctxErr);
      }

      // 4. Fetch workspaces to find the created one
      try {
        await refreshWorkspaces();
        const userWorkspaces = await workspaceApi.getWorkspaces(newOrg.id);
        targetWs = userWorkspaces[0];
      } catch (wsErr: any) {
        console.warn('Workspace fetch warning:', wsErr);
      }

      // 5. Create initial project inside the workspace
      if (targetWs) {
        try {
          const newProject = await projectApi.createProject(targetWs.id, {
            name: projectName.trim(),
            key: projectKey.trim().toUpperCase(),
            description: 'First quality project created during onboarding',
          });
          setActiveWorkspace(targetWs);
          setActiveProject(newProject);
          navigate(`/projects/${newProject.id}`);
          return;
        } catch (projErr: any) {
          console.error('Project creation failed after organization was created:', projErr);
          setActiveWorkspace(targetWs);
          navigate('/projects');
          return;
        }
      } else {
        navigate('/projects');
        return;
      }
    } catch (err: any) {
      console.error('Onboarding failed:', err);
      setError(err?.message || 'Failed to complete setup. Please try again.');
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
      // 1. Update user title (non-blocking)
      if (finalTitle) {
        try {
          const updatedUser = await authApi.updateProfile({
            professional_title: finalTitle,
          });
          updateUser(updatedUser);
        } catch (profileErr) {
          console.warn('Profile title update warning:', profileErr);
        }
      }

      // 2. Join Organization by code
      const joinedOrg = await organizationApi.joinByCode(joinCodeInput.trim().toUpperCase());
      await refreshOrganizations();
      selectOrganization(joinedOrg.id);
      await refreshWorkspaces();

      navigate('/projects');
    } catch (err: any) {
      console.error('Join failed:', err);
      setError(err?.message || 'Failed to join organization with that code. Please check the code and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'border-color var(--transition-fast)',
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
        padding: '24px 16px',
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
          maxWidth: '560px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          padding: '36px',
          boxShadow: 'var(--shadow-lg)',
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
              borderRadius: 'var(--radius-md)',
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
            Choose how you'd like to initialize your software quality workspace.
          </p>
        </div>

        {/* Mode Toggle: Create Org vs Join with Code */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            padding: '4px',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '24px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('create');
              setError(null);
            }}
            style={{
              padding: '10px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all var(--transition-fast)',
              backgroundColor: mode === 'create' ? 'var(--primary)' : 'transparent',
              color: mode === 'create' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: mode === 'create' ? 'var(--shadow-glow)' : 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Building2 size={16} />
            <span>Create Organization</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('join');
              setError(null);
            }}
            style={{
              padding: '10px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all var(--transition-fast)',
              backgroundColor: mode === 'join' ? 'var(--primary)' : 'transparent',
              color: mode === 'join' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: mode === 'join' ? 'var(--shadow-glow)' : 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Key size={16} />
            <span>Join with Code</span>
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--status-fail-bg)',
              border: '1px solid var(--status-fail)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--status-fail)',
              fontSize: '0.875rem',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
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
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <ShieldCheck size={20} color="var(--accent-cyan)" />
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    Creating an organization automatically grants you <strong>OWNER</strong> governance rights.
                  </div>
                </div>

                {/* Professional Title Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Briefcase size={15} color="var(--primary)" />
                    Professional Title (Role)
                  </label>
                  <select
                    value={selectedTitle}
                    onChange={(e) => setSelectedTitle(e.target.value)}
                    style={selectStyle}
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
                    label="Custom Title"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. Lead Quality Architect"
                    required
                  />
                )}

                {/* Organization Setup */}
                <Input
                  label="Organization Name"
                  leftIcon={<Globe size={15} color="var(--accent-cyan)" />}
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Acme Global Quality"
                  required
                />

                {/* Initial Workspace Setup */}
                <Input
                  label="First Workspace Name"
                  leftIcon={<Building2 size={15} color="var(--primary)" />}
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="e.g. Core Engineering"
                  required
                />

                <Button
                  type="button"
                  variant="primary"
                  size="lg"
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
                  rightIcon={<ArrowRight size={16} />}
                  style={{ width: '100%', marginTop: '6px' }}
                >
                  Continue to Project Setup
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div
                  style={{
                    padding: '12px 16px',
                    backgroundColor: 'rgba(79, 70, 229, 0.08)',
                    border: '1px solid rgba(79, 70, 229, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <Sparkles size={20} color="var(--primary)" />
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    Configuring initial QA project for <strong>{workspaceName}</strong> under <strong>{orgName}</strong>
                  </div>
                </div>

                <Input
                  label="First Project Name"
                  leftIcon={<FolderDot size={15} color="var(--primary)" />}
                  value={projectName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Core Web Platform"
                  required
                />

                <Input
                  label="Project Key Prefix (e.g. CORE -> CORE-TC-1)"
                  value={projectKey}
                  onChange={(e) => setProjectKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                  placeholder="e.g. CORE"
                  maxLength={10}
                  required
                />

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() => setStep(1)}
                    disabled={isLoading}
                    leftIcon={<ArrowLeft size={16} />}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isLoading}
                    leftIcon={<CheckCircle2 size={16} />}
                    style={{ flex: 1 }}
                  >
                    Launch Organization & Workspace
                  </Button>
                </div>
              </div>
            )}
          </form>
        )}

        {/* 2. JOIN ORGANIZATION FLOW */}
        {mode === 'join' && (
          <form onSubmit={handleCompleteJoin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(79, 70, 229, 0.08)',
                border: '1px solid rgba(79, 70, 229, 0.25)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <Key size={20} color="var(--accent-cyan)" />
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                Enter the join code shared by your organization administrator (e.g. <strong>LUMEN-XXXX-YYYY</strong>).
              </div>
            </div>

            <Input
              label="Organization Join Code"
              placeholder="LUMEN-XXXX-YYYY"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              leftIcon={<Key size={16} color="var(--accent-cyan)" />}
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                letterSpacing: '0.06em',
                fontSize: '0.9375rem',
              }}
              required
              autoFocus
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Briefcase size={15} color="var(--primary)" />
                Professional Title (Role)
              </label>
              <select
                value={selectedTitle}
                onChange={(e) => setSelectedTitle(e.target.value)}
                style={selectStyle}
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
                label="Custom Title"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g. Lead Quality Architect"
                required
              />
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              leftIcon={<CheckCircle2 size={16} />}
              style={{ width: '100%', marginTop: '6px' }}
            >
              Join Organization
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
