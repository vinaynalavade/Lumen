import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { authApi } from '../../services/authApi';
import { useAuth } from '../../context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const searchParams = new URLSearchParams(location.search);
  const redirectPath = searchParams.get('redirect') || '/projects';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      const response = await authApi.login({ email, password });
      login(response.access_token, response.user);
      navigate(redirectPath);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoFill = () => {
    setEmail('demo@lumen.qa');
    setPassword('password123');
    setError('');
  };

  return (
    <AuthLayout
      title="Welcome back to Lumen"
      subtitle="Sign in with your engineering credentials to access your QA workspaces."
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--status-fail-bg)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--status-fail)',
              fontSize: '0.875rem',
            }}
          >
            {error}
          </div>
        )}

        <Input
          label="Email Address"
          type="email"
          placeholder="engineer@lumen.qa"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail size={16} />}
          required
          autoFocus
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock size={16} />}
          required
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          rightIcon={<ArrowRight size={18} />}
          style={{ width: '100%', marginTop: '8px' }}
        >
          Sign In to Workspace
        </Button>

        {/* Quick 1-Click Demo Login */}
        <div
          style={{
            padding: '14px',
            backgroundColor: 'var(--bg-card)',
            border: '1px dashed var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Demo QA Lead Account
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              demo@lumen.qa / password123
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleDemoFill}
            leftIcon={<Sparkles size={13} color="var(--accent-cyan)" />}
          >
            Auto Fill
          </Button>
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Don't have an account yet?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Create one here
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
