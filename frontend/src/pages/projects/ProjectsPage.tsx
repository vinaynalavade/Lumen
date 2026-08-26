import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderPlus,
  Search,
  Folder,
  ArrowUpRight,
  Calendar,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { projectApi } from '../../services/projectApi';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeWorkspace, projects, setActiveProject, refreshProjects } = useWorkspace();

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNameChange = (val: string) => {
    setName(val);
    if (!key || key.length <= 4) {
      const generated = val
        .replace(/[^a-zA-Z]/g, '')
        .substring(0, 5)
        .toUpperCase();
      setKey(generated);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) {
      setError('Please select or create a workspace first.');
      return;
    }
    if (!name.trim() || !key.trim()) {
      setError('Project name and key are required.');
      return;
    }
    setError('');
    setIsSubmitting(true);

    try {
      const created = await projectApi.createProject(activeWorkspace.id, {
        name: name.trim(),
        key: key.trim().toUpperCase(),
        description: description.trim() || undefined,
      });

      await refreshProjects();
      setActiveProject(created);
      setIsCreateOpen(false);
      setName('');
      setKey('');
      setDescription('');
      navigate(`/projects/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectProject = (project: any) => {
    setActiveProject(project);
    navigate(`/projects/${project.id}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Projects
            </h1>
            <Badge variant="primary">{activeWorkspace?.name || 'Workspace'}</Badge>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Manage software systems, test repositories, execution pipelines, and quality suites.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<FolderPlus size={16} />}
          onClick={() => setIsCreateOpen(true)}
        >
          Create Project
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          backgroundColor: 'var(--bg-card)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ flex: 1, maxWidth: '400px' }}>
          <Input
            placeholder="Search projects by name or key (e.g. ECOMM)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search size={16} />}
          />
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Showing <strong>{filteredProjects.length}</strong> of {projects.length} project(s)
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '20px',
          }}
        >
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              hoverable
              onClick={() => handleSelectProject(project)}
              style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--primary-glow)',
                      border: '1px solid rgba(79, 70, 229, 0.3)',
                      color: '#818cf8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.875rem',
                    }}
                  >
                    {project.key}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {project.name}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Key: [{project.key}]
                    </span>
                  </div>
                </div>

                <Badge variant={project.status === 'ACTIVE' ? 'pass' : 'neutral'}>
                  {project.status}
                </Badge>
              </div>

              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  flex: 1,
                  marginBottom: '16px',
                }}
              >
                {project.description || 'No description provided for this project.'}
              </p>

              <div
                style={{
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} />
                  {new Date(project.created_at).toLocaleDateString()}
                </span>
                <span
                  style={{
                    color: 'var(--primary)',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  Open Cockpit <ArrowUpRight size={14} />
                </span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card
          style={{
            padding: '60px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}
          >
            <Folder size={28} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              No Projects Found
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '400px', marginTop: '4px' }}>
              Create your first testing project to start managing test cases, running automation, and reporting quality metrics.
            </p>
          </div>
          <Button
            variant="primary"
            leftIcon={<FolderPlus size={16} />}
            onClick={() => setIsCreateOpen(true)}
          >
            Create Project Now
          </Button>
        </Card>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setError('');
        }}
        title="Create New Project"
        subtitle={`This project will be added to workspace "${activeWorkspace?.name}".`}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateProject}
              isLoading={isSubmitting}
            >
              Create Project
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'var(--status-fail-bg)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--status-fail)',
                fontSize: '0.8125rem',
              }}
            >
              {error}
            </div>
          )}

          <Input
            label="Project Name"
            placeholder="e.g. E-Commerce Storefront, Payments Service"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Project Key (Prefix)"
            placeholder="e.g. ECOMM"
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            maxLength={10}
            helperText="Short 2-10 uppercase identifier used to prefix test cases (e.g. ECOMM-TC-01)."
            required
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Description
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
              placeholder="Describe the application scope, architecture or testing goals..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
