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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { authApi } from '../../services/authApi';
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
  const { refreshWorkspaces, setActiveWorkspace, setActiveProject } = useWorkspace();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);

  // Profile data
  const [selectedTitle, setSelectedTitle] = useState<string>(user?.professional_title || 'QA Lead');
  const [customTitle, setCustomTitle] = useState<string>('');

  // Workspace & Project data
  const [workspaceName, setWorkspaceName] = useState<string>('Engineering Quality Lab');
  const [workspaceDesc, setWorkspaceDesc] = useState<string>('Main testing workspace for core applications and microservices');
  const [projectName, setProjectName] = useState<string>('Core Web Platform');
  const [projectKey, setProjectKey] = useState<string>('CORE');

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

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalTitle = selectedTitle === 'Other' ? customTitle.trim() : selectedTitle;
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

      // 2. Create Workspace (user automatically becomes OWNER)
      const newWorkspace = await workspaceApi.createWorkspace({
        name: workspaceName.trim(),
        description: workspaceDesc.trim() || undefined,
      });

      // 3. Create First Project in Workspace
      const newProject = await projectApi.createProject(newWorkspace.id, {
        name: projectName.trim(),
        key: projectKey.trim().toUpperCase(),
        description: 'First quality project created during onboarding',
      });

      // 4. Refresh workspace context & set active
      await refreshWorkspaces();
      setActiveWorkspace(newWorkspace);
      setActiveProject(newProject);

      // 5. Navigate to project dashboard
      navigate(`/projects/${newProject.id}`);
    } catch (err: any) {
      console.error('Onboarding failed:', err);
      setError(err?.response?.data?.detail || err?.message || 'Failed to complete setup. Please try again.');
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
          maxWidth: '560px',
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
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
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
              marginBottom: '16px',
            }}
          >
            <SunMedium size={26} color="#ffffff" />
          </div>
          <h1
            style={{
              fontSize: '1.625rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: '6px',
            }}
          >
            Welcome to LUMEN, {user?.full_name?.split(' ')[0] || 'Engineer'}!
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Let's configure your workspace and first project to start testing.
          </p>
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

        <form onSubmit={handleCompleteOnboarding}>
          {step === 1 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                  You will automatically receive the <strong>OWNER</strong> role with full administration rights.
                </div>
              </div>

              {/* Professional Title Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Briefcase size={16} color="var(--primary)" />
                  What is your professional title?
                </label>
                <select
                  value={selectedTitle}
                  onChange={(e) => setSelectedTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
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
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Professional title is for team collaboration and distinct from security permissions.
                </span>
              </div>

              {selectedTitle === 'Other' && (
                <Input
                  label="Enter your custom title"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Lead Quality Architect"
                  required
                />
              )}

              {/* Workspace Setup */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={16} color="var(--primary)" />
                  Workspace Name
                </label>
                <Input
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="e.g. Core Engineering QA"
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Workspace Description (Optional)
                </label>
                <Input
                  value={workspaceDesc}
                  onChange={(e) => setWorkspaceDesc(e.target.value)}
                  placeholder="e.g. Main testing workspace for core platform"
                />
              </div>

              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  if (!workspaceName.trim()) {
                    setError('Please provide a workspace name.');
                    return;
                  }
                  setError(null);
                  setStep(2);
                }}
                style={{ width: '100%', marginTop: '10px' }}
              >
                <span>Continue to Project Setup</span>
                <ArrowRight size={16} />
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                  Setting up initial project for <strong>{workspaceName}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FolderDot size={16} color="var(--primary)" />
                  First Project Name
                </label>
                <Input
                  value={projectName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. E-Commerce Storefront"
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Project Key (Prefix for Test Cases, e.g. CORE-TC-1)
                </label>
                <Input
                  value={projectKey}
                  onChange={(e) => setProjectKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                  placeholder="e.g. ECOMM"
                  maxLength={10}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
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
                  <span>Launch Testing Workspace</span>
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
