import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Archive,
  Trash2,
  History,
  ListOrdered,
  Folder,
  Plus,
} from 'lucide-react';
import { manualTestingApi } from '../../services/manualTestingApi';
import type {
  TestCase,
  TestCaseHistoryEntry,
  TestCasePriority,
  TestCaseStatus,
  TestCaseStep,
} from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';

export const TestCaseDetailPage: React.FC = () => {
  const { projectId, caseId } = useParams<{ projectId: string; caseId: string }>();
  const navigate = useNavigate();

  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [history, setHistory] = useState<TestCaseHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState<TestCasePriority>('MEDIUM');
  const [editStatus, setEditStatus] = useState<TestCaseStatus>('ACTIVE');
  const [editPreconditions, setEditPreconditions] = useState('');
  const [editTestData, setEditTestData] = useState('');
  const [editExpectedResult, setEditExpectedResult] = useState('');
  const [editSteps, setEditSteps] = useState<TestCaseStep[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    if (!caseId) return;
    setIsLoading(true);
    try {
      const [caseData, histData] = await Promise.all([
        manualTestingApi.getTestCaseDetail(caseId),
        manualTestingApi.getTestCaseHistory(caseId),
      ]);
      setTestCase(caseData);
      setHistory(histData);

      // Populate edit fields
      setEditTitle(caseData.title);
      setEditDesc(caseData.description || '');
      setEditPriority(caseData.priority);
      setEditStatus(caseData.status);
      setEditPreconditions(caseData.preconditions || '');
      setEditTestData(caseData.test_data || '');
      setEditExpectedResult(caseData.expected_result || '');
      setEditSteps(caseData.steps || []);
    } catch (err) {
      console.error('Failed to load test case details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [caseId]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId || !editTitle.trim()) return;
    setIsSaving(true);
    try {
      const updated = await manualTestingApi.updateTestCase(caseId, {
        title: editTitle.trim(),
        description: editDesc.trim() || undefined,
        priority: editPriority,
        status: editStatus,
        preconditions: editPreconditions.trim() || undefined,
        test_data: editTestData.trim() || undefined,
        expected_result: editExpectedResult.trim() || undefined,
        steps: editSteps.map((s, idx) => ({
          step_number: idx + 1,
          action: s.action.trim(),
          expected_result: s.expected_result.trim(),
          test_data: s.test_data || undefined,
        })),
      });
      setTestCase(updated);
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Failed to update test case:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!caseId || !confirm('Archive this test case?')) return;
    try {
      await manualTestingApi.archiveTestCase(caseId);
      navigate(`/projects/${projectId}/manual/cases`);
    } catch (err) {
      console.error('Failed to archive test case:', err);
    }
  };

  const handleDelete = async () => {
    if (!caseId || !confirm('Permanently delete this test case definition?')) return;
    try {
      await manualTestingApi.deleteTestCase(caseId);
      navigate(`/projects/${projectId}/manual/cases`);
    } catch (err) {
      console.error('Failed to delete test case:', err);
    }
  };

  const handleAddEditStep = () => {
    setEditSteps([
      ...editSteps,
      { step_number: editSteps.length + 1, action: '', expected_result: '' },
    ]);
  };

  const handleRemoveEditStep = (index: number) => {
    const updated = editSteps.filter((_, idx) => idx !== index);
    setEditSteps(updated.map((s, idx) => ({ ...s, step_number: idx + 1 })));
  };

  const handleEditStepChange = (index: number, field: 'action' | 'expected_result', val: string) => {
    const updated = [...editSteps];
    updated[index][field] = val;
    setEditSteps(updated);
  };

  if (isLoading || !testCase) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading test case details...
      </div>
    );
  }

  const getPriorityBadgeVariant = (priority: TestCasePriority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'fail';
      case 'HIGH':
        return 'blocked';
      case 'MEDIUM':
        return 'primary';
      case 'LOW':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  const getExecutionBadge = (status: string) => {
    switch (status) {
      case 'PASSED':
        return <Badge variant="pass">Passed</Badge>;
      case 'FAILED':
        return <Badge variant="fail">Failed</Badge>;
      case 'BLOCKED':
        return <Badge variant="blocked">Blocked</Badge>;
      case 'SKIPPED':
        return <Badge variant="neutral">Skipped</Badge>;
      default:
        return <Badge variant="neutral">Untested</Badge>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Breadcrumb & Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <Link
          to={`/projects/${projectId}/manual/cases`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} /> Back to Test Cases
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button variant="secondary" size="sm" onClick={() => setIsEditModalOpen(true)} leftIcon={<Edit2 size={14} />}>
            Edit
          </Button>
          <Button variant="secondary" size="sm" onClick={handleArchive} leftIcon={<Archive size={14} />}>
            Archive
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete} leftIcon={<Trash2 size={14} />}>
            Delete
          </Button>
        </div>
      </div>

      {/* Main Details Card */}
      <Card padding="lg" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  backgroundColor: 'rgba(79, 70, 229, 0.12)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(79, 70, 229, 0.3)',
                }}
              >
                {testCase.key}
              </span>
              <Badge variant={getPriorityBadgeVariant(testCase.priority)}>{testCase.priority}</Badge>
              <Badge variant="neutral">{testCase.status}</Badge>
              <Badge variant="primary">{testCase.template_type}</Badge>
              {testCase.module_name && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <Folder size={12} /> {testCase.module_name}
                </span>
              )}
            </div>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {testCase.title}
            </h1>
            {testCase.description && (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
                {testCase.description}
              </p>
            )}
          </div>
        </div>

        {/* Metadata Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            padding: '16px',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Preconditions
            </span>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', marginTop: '4px' }}>
              {testCase.preconditions || 'None specified'}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Test Data
            </span>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
              {testCase.test_data || 'None'}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Created By / At
            </span>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', marginTop: '4px' }}>
              {testCase.creator?.full_name || 'Engineering'} • {new Date(testCase.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Steps Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <ListOrdered size={18} color="var(--primary)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Test Steps ({testCase.steps?.length || 0})
            </h2>
          </div>

          {testCase.steps && testCase.steps.length > 0 ? (
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 14px', width: '50px', textAlign: 'center' }}>#</th>
                    <th style={{ padding: '10px 14px' }}>Action</th>
                    <th style={{ padding: '10px 14px' }}>Expected Result</th>
                  </tr>
                </thead>
                <tbody>
                  {testCase.steps.map((step, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--primary)' }}>
                        {step.step_number}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-primary)' }}>{step.action}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{step.expected_result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '20px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              {testCase.expected_result ? (
                <div>
                  <strong>Overall Expected Result:</strong> {testCase.expected_result}
                </div>
              ) : (
                'No discrete steps recorded for this test case.'
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Execution History Timeline */}
      <Card padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <History size={18} color="var(--accent-cyan)" />
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Execution Run History ({history.length})
          </h2>
        </div>

        {history.length > 0 ? (
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 14px' }}>Test Run</th>
                  <th style={{ padding: '10px 14px', width: '120px' }}>Environment</th>
                  <th style={{ padding: '10px 14px', width: '100px' }}>Result</th>
                  <th style={{ padding: '10px 14px' }}>Actual Result / Notes</th>
                  <th style={{ padding: '10px 14px', width: '140px' }}>Executed At</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <Link to={`/projects/${projectId}/manual/runs/${entry.test_run_id}/execute`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                        {entry.test_run_name}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                      <Badge variant="neutral">{entry.environment}</Badge>
                    </td>
                    <td style={{ padding: '12px 14px' }}>{getExecutionBadge(entry.status)}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                      {entry.actual_result || '—'}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {entry.executed_at ? new Date(entry.executed_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            This test case has not been executed in any test runs yet.
          </div>
        )}
      </Card>

      {/* Edit Test Case Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Edit Test Case [${testCase.key}]`} size="lg">
        <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input label="Title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Priority
              </label>
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as any)}
                style={{ width: '100%', padding: '10px 12px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}
              >
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Status
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                style={{ width: '100%', padding: '10px 12px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}
              >
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="DEPRECATED">Deprecated</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input label="Preconditions" value={editPreconditions} onChange={(e) => setEditPreconditions(e.target.value)} />
            <Input label="Test Data" value={editTestData} onChange={(e) => setEditTestData(e.target.value)} />
          </div>

          {/* Edit Steps */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Steps</label>
              <Button type="button" variant="secondary" size="sm" onClick={handleAddEditStep} leftIcon={<Plus size={13} />}>
                Add Step
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {editSteps.map((step, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr 30px', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--primary)', textAlign: 'center' }}>{idx + 1}</span>
                  <input
                    value={step.action}
                    onChange={(e) => handleEditStepChange(idx, 'action', e.target.value)}
                    placeholder="Action"
                    style={{ padding: '8px 10px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
                  />
                  <input
                    value={step.expected_result}
                    onChange={(e) => handleEditStepChange(idx, 'expected_result', e.target.value)}
                    placeholder="Expected Result"
                    style={{ padding: '8px 10px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
                  />
                  <button type="button" onClick={() => handleRemoveEditStep(idx)} style={{ background: 'none', border: 'none', color: 'var(--status-fail)', cursor: 'pointer' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
