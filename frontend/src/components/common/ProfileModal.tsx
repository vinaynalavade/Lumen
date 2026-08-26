import React, { useState, useEffect } from 'react';
import { User as UserIcon, Briefcase, Mail, Shield, Check } from 'lucide-react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/authApi';
import { useWorkspace } from '../../context/WorkspaceContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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
  'Business Analyst',
  'Other',
];

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuth();
  const { activeWorkspace } = useWorkspace();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [selectedTitleOption, setSelectedTitleOption] = useState<string>('Other');
  const [customTitle, setCustomTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      const existingTitle = user.professional_title || '';
      if (PREDEFINED_TITLES.includes(existingTitle) && existingTitle !== 'Other') {
        setSelectedTitleOption(existingTitle);
        setCustomTitle('');
      } else if (existingTitle) {
        setSelectedTitleOption('Other');
        setCustomTitle(existingTitle);
      } else {
        setSelectedTitleOption('');
        setCustomTitle('');
      }
      setError(null);
      setSuccess(false);
    }
  }, [user, isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Full name cannot be empty.');
      return;
    }

    const finalTitle =
      selectedTitleOption === 'Other'
        ? customTitle.trim()
        : selectedTitleOption;

    setIsSaving(true);
    setError(null);
    try {
      const updated = await authApi.updateProfile({
        full_name: fullName.trim(),
        professional_title: finalTitle || undefined,
      });
      updateUser(updated);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const userRole = activeWorkspace?.current_user_role || (user?.is_superuser ? 'SUPERUSER' : 'MEMBER');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="User Profile & Settings" size="md">
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* User Identity Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '16px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'rgba(79, 70, 229, 0.08)',
            border: '1px solid rgba(79, 70, 229, 0.2)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.25rem',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            {user?.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {user?.full_name}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <Mail size={13} />
              <span>{user?.email}</span>
            </div>
          </div>
          {/* Workspace Role Badge */}
          <div
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              color: 'var(--accent-cyan)',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Shield size={13} />
            <span>{userRole}</span>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid var(--status-fail)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--status-fail)',
              fontSize: '0.8125rem',
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid var(--status-pass)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--status-pass)',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Check size={16} />
            <span>Profile updated successfully!</span>
          </div>
        )}

        {/* Full Name */}
        <Input
          label="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Alex Mercer"
          required
          leftIcon={<UserIcon size={16} color="var(--text-muted)" />}
        />

        {/* Professional Title Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
            Professional Title
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedTitleOption}
              onChange={(e) => setSelectedTitleOption(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            >
              <option value="">-- Select Professional Title --</option>
              {PREDEFINED_TITLES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Professional title is your public job title and is separate from your workspace security role.
          </span>
        </div>

        {/* Custom Title input if 'Other' is selected */}
        {selectedTitleOption === 'Other' && (
          <Input
            label="Custom Professional Title"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="e.g. Principal Test Automation Architect"
            leftIcon={<Briefcase size={16} color="var(--text-muted)" />}
          />
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSaving}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
