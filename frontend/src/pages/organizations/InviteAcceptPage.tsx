import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, SunMedium, LogIn } from 'lucide-react';
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Verifying invitation link...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 text-center space-y-6">
        {/* Logo */}
        <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-600/30">
          <SunMedium className="w-8 h-8" />
        </div>

        {invitePreview?.is_valid ? (
          <>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                You've been invited to join
              </span>
              <h1 className="text-2xl font-bold text-slate-100 mt-1">
                {invitePreview.organization_name}
              </h1>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Assigned Role: {invitePreview.role}
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
                {error}
              </div>
            )}

            {isAuthenticated ? (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-slate-400">
                  Signed in as <strong className="text-slate-200">{user?.email}</strong>
                </p>
                <Button
                  variant="primary"
                  isLoading={isAccepting}
                  onClick={handleAccept}
                  style={{ width: '100%' }}
                >
                  <CheckCircle2 size={16} />
                  <span>Accept Invitation & Join</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <p className="text-xs text-slate-400">
                  Please log in or register an account to accept this organization invitation.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to={`/login?redirect=/invite/${token}`}
                    className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Sign In
                  </Link>
                  <Link
                    to={`/register?redirect=/invite/${token}`}
                    className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition-colors"
                  >
                    Create Account
                  </Link>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="inline-flex p-3 rounded-full bg-rose-500/10 text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">Invalid Invitation</h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {invitePreview?.message || 'This invitation link is invalid or has expired.'}
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-xs font-semibold"
              >
                Go to Sign In <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
