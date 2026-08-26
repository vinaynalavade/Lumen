import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Play,
  Plus,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Layers,
  ChevronRight,
  Server,
} from 'lucide-react';
import { manualTestingApi } from '../../services/manualTestingApi';
import type { TestRun, TestSuite } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const TestRunsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [runs, setRuns] = useState<TestRun[]>([]);
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Run Modal
  const [isNewRunModalOpen, setIsNewRunModalOpen] = useState(false);
  const [runName, setRunName] = useState('');
  const [runEnv, setRunEnv] = useState('Staging');
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const [runsList, suitesList] = await Promise.all([
        manualTestingApi.getRuns(projectId),
        manualTestingApi.getSuites(projectId),
      ]);
      setRuns(runsList);
      setSuites(suitesList);
    } catch (err) {
      console.error('Failed to load test runs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !runName.trim() || !selectedSuiteId) return;
    setIsSubmitting(true);
    try {
      const newRun = await manualTestingApi.createRun(projectId, {
        name: runName.trim(),
        environment: runEnv.trim(),
        suite_id: selectedSuiteId,
      });
      setIsNewRunModalOpen(false);
      navigate(`/projects/${projectId}/manual/runs/${newRun.id}/execute`);
    } catch (err) {
      console.error('Failed to launch run:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRunStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="pass">Completed</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="primary">In Progress</Badge>;
      case 'ABORTED':
        return <Badge variant="fail">Aborted</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Execution Test Runs ({runs.length})
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Track active test execution sessions, pass/fail completion metrics, and immutable audit logs.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setRunName(`Test Run - ${new Date().toLocaleDateString()}`);
            if (suites.length > 0) setSelectedSuiteId(suites[0].id);
            setIsNewRunModalOpen(true);
          }}
          leftIcon={<Plus size={16} />}
        >
          Launch New Test Run
        </Button>
      </div>

      {/* Test Runs List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {runs.map((run) => (
          <Card
            key={run.id}
            padding="lg"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              border: run.status === 'IN_PROGRESS' ? '1px solid rgba(79, 70, 229, 0.4)' : '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-card)',
            }}
          >
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {run.name}
                  </h3>
                  {getRunStatusBadge(run.status)}
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--accent-cyan)',
                      fontFamily: 'var(--font-mono)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <Server size={11} /> {run.environment}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {run.suite_name && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Layers size={13} /> {run.suite_name}
                    </span>
                  )}
                  <span>•</span>
                  <span>Started {new Date(run.created_at).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{run.total_items} Test Cases</span>
                </div>
              </div>

              <Link to={`/projects/${projectId}/manual/runs/${run.id}/execute`}>
                <Button variant={run.status === 'IN_PROGRESS' ? 'primary' : 'secondary'} size="sm" rightIcon={<ChevronRight size={15} />}>
                  {run.status === 'IN_PROGRESS' ? 'Resume Execution' : 'View Execution Workstation'}
                </Button>
              </Link>
            </div>

            {/* Progress Bar & Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {run.completion_percentage}% Executed
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--status-pass)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} /> {run.passed_count} Passed
                  </span>
                  <span style={{ color: 'var(--status-fail)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <XCircle size={13} /> {run.failed_count} Failed
                  </span>
                  {run.blocked_count > 0 && (
                    <span style={{ color: 'var(--status-blocked)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <AlertOctagon size={13} /> {run.blocked_count} Blocked
                    </span>
                  )}
                  <span style={{ color: 'var(--text-muted)' }}>{run.untested_count} Untested</span>
                </div>
              </div>

              {/* Progress Multi-Bar */}
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-full)',
                  overflow: 'hidden',
                  display: 'flex',
                }}
              >
                {run.total_items > 0 && (
                  <>
                    <div style={{ width: `${(run.passed_count / run.total_items) * 100}%`, backgroundColor: 'var(--status-pass)' }} />
                    <div style={{ width: `${(run.failed_count / run.total_items) * 100}%`, backgroundColor: 'var(--status-fail)' }} />
                    <div style={{ width: `${(run.blocked_count / run.total_items) * 100}%`, backgroundColor: 'var(--status-blocked)' }} />
                    <div style={{ width: `${(run.skipped_count / run.total_items) * 100}%`, backgroundColor: 'var(--text-muted)' }} />
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}

        {runs.length === 0 && !isLoading && (
          <Card padding="lg" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <Play size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              No Active Test Runs
            </div>
            <p style={{ fontSize: '0.8125rem', marginTop: '4px' }}>
              Launch a new test run to execute your manual test cases and record results.
            </p>
          </Card>
        )}
      </div>

      {/* Modal: Launch Test Run */}
      <Modal isOpen={isNewRunModalOpen} onClose={() => setIsNewRunModalOpen(false)} title="Launch New Test Run" size="md">
        <form onSubmit={handleCreateRun} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Run Name"
            placeholder="e.g. Release 1.0.0 Sanity Validation"
            value={runName}
            onChange={(e) => setRunName(e.target.value)}
            required
            autoFocus
          />

          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Select Test Suite to Execute
            </label>
            <select
              value={selectedSuiteId}
              onChange={(e) => setSelectedSuiteId(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            >
              <option value="" disabled>
                Select a suite...
              </option>
              {suites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.test_case_count} cases)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Target Environment
            </label>
            <select
              value={runEnv}
              onChange={(e) => setRunEnv(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            >
              <option value="Staging">Staging</option>
              <option value="QA">QA</option>
              <option value="Production-Like">Production-Like</option>
              <option value="Development">Development</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsNewRunModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} leftIcon={<Play size={14} />}>
              Launch Execution
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
