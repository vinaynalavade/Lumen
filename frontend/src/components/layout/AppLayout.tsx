import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useWorkspace } from '../../context/WorkspaceContext';
import { workspaceApi } from '../../services/workspaceApi';

export const AppLayout: React.FC = () => {
  const { refreshWorkspaces, setActiveWorkspace } = useWorkspace();

  // Create Workspace Modal State
  const [isCreateWsOpen, setIsCreateWsOpen] = useState(false);
  const [wsName, setWsName] = useState('');
  const [wsDesc, setWsDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim()) {
      setError('Workspace name is required.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const created = await workspaceApi.createWorkspace({
        name: wsName.trim(),
        description: wsDesc.trim() || undefined,
      });
      await refreshWorkspaces();
      setActiveWorkspace(created);
      setIsCreateWsOpen(false);
      setWsName('');
      setWsDesc('');
    } catch (err: any) {
      setError(err.message || 'Failed to create workspace.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-app)' }}>
      <Topbar onCreateWorkspace={() => setIsCreateWsOpen(true)} />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '24px 32px', maxWidth: '1440px', width: '100%', overflowX: 'hidden' }}>
          <Outlet />
        </main>
      </div>

      {/* Create Workspace Modal */}
      <Modal
        isOpen={isCreateWsOpen}
        onClose={() => {
          setIsCreateWsOpen(false);
          setError('');
        }}
        title="Create New QA Workspace"
        subtitle="Workspaces isolate team testing environments, projects, and execution results."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setIsCreateWsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateWorkspace}
              isLoading={isSubmitting}
            >
              Create Workspace
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateWorkspace} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Workspace Name"
            placeholder="e.g. Core Engineering, Payments QA"
            value={wsName}
            onChange={(e) => setWsName(e.target.value)}
            error={error}
            required
            autoFocus
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Description (Optional)
            </label>
            <textarea
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '9px 12px',
                fontSize: '0.875rem',
                color: 'var(--text-primary)',
                outline: 'none',
                minHeight: '80px',
                resize: 'vertical',
              }}
              placeholder="Describe the scope or team for this workspace..."
              value={wsDesc}
              onChange={(e) => setWsDesc(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
