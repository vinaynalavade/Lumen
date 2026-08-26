import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, SunMedium, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';
import { organizationApi } from '../../services/organizationApi';
import type { OrganizationInvitePublic } from '../../types';
import { Button } from '../../components/common/Button';

export const InviteAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { user, isAuthenticated } = useAuth();
  const { refreshOrganizations, selectOrganization } = useOrganization();
  const navigate = useNavigate();

  const [invitePreview, setInvitePreview] = useState<OrganizationInvitePublic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    organizationApi
      .getPublicInvitePreview(token)
      .then((data) => {
        setInvitePreview(data);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to verify invitation link.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setIsAccepting(true);
    setError(null);
    try {
      const org = await organizationApi.acceptInvite(token);
      await refreshOrganizations();
      selectOrganization(org.id);
      navigate('/projects');
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || 'Failed to accept invitation.');
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--bg-app)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.875rem',
        }}
      >
        Verifying invitation link...
      </div>
    );
  }

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
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '500px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(79, 70, 229, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          padding: '36px',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)',
          }}
        >
          <SunMedium size={26} color="#ffffff" />
        </div>

        {invitePreview?.is_valid ? (
          <>
            <div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--accent-cyan)',
                }}
              >
                You've been invited to join
              </span>
              <h1
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginTop: '4px',
                  letterSpacing: '-0.02em',
                }}
              >
                {invitePreview.organization_name}
              </h1>
              <div
                style={{
                  marginTop: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(79, 70, 229, 0.15)',
                  border: '1px solid rgba(79, 70, 229, 0.3)',
                  color: '#818cf8',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                <ShieldCheck size={14} />
                <span>Assigned Role: {invitePreview.role}</span>
              </div>
            </div>

            {error && (
              <div
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: 'var(--status-fail-bg)',
                  border: '1px solid var(--status-fail)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--status-fail)',
                  fontSize: '0.8125rem',
                  textAlign: 'left',
                }}
              >
                {error}
              </div>
            )}

            {isAuthenticated ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '8px' }}>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Signed in as <strong style={{ color: 'var(--text-primary)' }}>{user?.email}</strong>
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  isLoading={isAccepting}
                  onClick={handleAccept}
                  leftIcon={<CheckCircle2 size={16} />}
                  style={{ width: '100%' }}
                >
                  Accept Invitation & Join
                </Button>
              </div>
            ) : (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '8px' }}>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Please sign in or create an account to accept this invitation.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <Link
                    to={`/login?redirect=/invite/${token}`}
                    style={{
                      padding: '10px 16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-strong)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      textDecoration: 'none',
                    }}
                  >
                    <LogIn size={15} />
                    <span>Sign In</span>
                  </Link>
                  <Link
                    to={`/register?redirect=/invite/${token}`}
                    style={{
                      padding: '10px 16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--primary)',
                      color: '#ffffff',
                      boxShadow: 'var(--shadow-glow)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      textDecoration: 'none',
                    }}
                  >
                    <UserPlus size={15} />
                    <span>Register</span>
                  </Link>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--status-fail)',
              }}
            >
              <AlertTriangle size={22} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Invalid Invitation
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: '300px' }}>
              {invitePreview?.message || 'This invitation link is invalid or has expired.'}
            </p>
            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--primary)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                marginTop: '6px',
              }}
            >
              <span>Go to Sign In</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
