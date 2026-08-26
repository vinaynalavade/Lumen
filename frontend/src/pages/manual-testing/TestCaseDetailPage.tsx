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
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { manualTestingApi } from '../../services/manualTestingApi';
import type {
  TestCase,
  TestCaseHistoryEntry,
  TestCasePriority,
  TestCaseStatus,
  TestCaseType,
  TestCaseStep,
} from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';

const TEST_TYPES: TestCaseType[] = [
  'FUNCTIONAL',
  'SMOKE',
  'SANITY',
  'REGRESSION',
  'INTEGRATION',
  'UI',
  'API',
  'NEGATIVE',
  'EDGE_CASE',
];

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
  const [editType, setEditType] = useState<TestCaseType>('FUNCTIONAL');
  const [editPriority, setEditPriority] = useState<TestCasePriority>('MEDIUM');
  const [editStatus, setEditStatus] = useState<TestCaseStatus>('ACTIVE');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');
  const [editPreconditions, setEditPreconditions] = useState('');
  const [editTestData, setEditTestData] = useState('');
  const [editDuration, setEditDuration] = useState('5');
  const [editExpectedResult, setEditExpectedResult] = useState('');
  const [editSteps, setEditSteps] = useState<TestCaseStep[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');

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
      setEditType(caseData.test_type || 'FUNCTIONAL');
      setEditPriority(caseData.priority);
      setEditStatus(caseData.status);
      setEditTags(caseData.tags || []);
      setEditPreconditions(caseData.preconditions || '');
      setEditTestData(caseData.test_data || '');
      setEditDuration(caseData.estimated_duration_minutes ? String(caseData.estimated_duration_minutes) : '5');
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

  const handleAddEditTag = () => {
    const trimmed = editTagInput.trim();
    if (trimmed && !editTags.includes(trimmed)) {
      setEditTags([...editTags, trimmed]);
      setEditTagInput('');
    }
  };

  const handleRemoveEditTag = (t: string) => {
    setEditTags(editTags.filter((tag) => tag !== t));
  };

  const handleAddEditStep = () => {
    setEditSteps([
      ...editSteps,
      { step_number: editSteps.length + 1, action: '', expected_result: '', test_data: '' },
    ]);
  };

  const handleRemoveEditStep = (index: number) => {
    const updated = editSteps.filter((_, idx) => idx !== index);
    setEditSteps(updated.map((s, idx) => ({ ...s, step_number: idx + 1 })));
  };

  const handleMoveEditStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === editSteps.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...editSteps];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setEditSteps(updated.map((s, idx) => ({ ...s, step_number: idx + 1 })));
  };

  const handleEditStepChange = (index: number, field: keyof TestCaseStep, val: string) => {
    const updated = [...editSteps];
    updated[index] = { ...updated[index], [field]: val };
    setEditSteps(updated);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId || !editTitle.trim()) {
      setEditError('Title is required.');
      return;
    }
    setIsSaving(true);
    setEditError('');
    try {
      const updated = await manualTestingApi.updateTestCase(caseId, {
        title: editTitle.trim(),
        description: editDesc.trim() || undefined,
        test_type: editType,
        priority: editPriority,
        status: editStatus,
        tags: editTags,
        preconditions: editPreconditions.trim() || undefined,
        test_data: editTestData.trim() || undefined,
        estimated_duration_minutes: editDuration ? parseInt(editDuration, 10) : undefined,
        expected_result: editExpectedResult.trim() || undefined,
        steps: editSteps.map((s, idx) => ({
          step_number: idx + 1,
          action: s.action.trim(),
          expected_result: s.expected_result.trim(),
          test_data: s.test_data?.trim() || undefined,
        })),
      });
      setTestCase(updated);
      setIsEditModalOpen(false);
    } catch (err: any) {
      setEditError(err?.response?.data?.detail || err?.message || 'Failed to update test case.');
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

  const getTypeBadgeColor = (type?: TestCaseType | string) => {
    switch (type) {
      case 'SMOKE':
        return '#ec4899';
      case 'SANITY':
        return '#f59e0b';
      case 'REGRESSION':
        return '#8b5cf6';
      case 'INTEGRATION':
        return '#06b6d4';
      case 'NEGATIVE':
        return '#ef4444';
      case 'EDGE_CASE':
        return '#64748b';
      case 'UI':
        return '#3b82f6';
      case 'API':
        return '#10b981';
      default:
        return 'var(--primary)';
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
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
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '3px 9px',
                  borderRadius: 'var(--radius-sm)',
                  color: getTypeBadgeColor(testCase.test_type),
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${getTypeBadgeColor(testCase.test_type)}50`,
                }}
              >
                {testCase.test_type || 'FUNCTIONAL'}
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

            {testCase.tags && testCase.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                {testCase.tags.map((tg) => (
                  <span
                    key={tg}
                    style={{
                      fontSize: '0.6875rem',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    #{tg}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Metadata Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
              Global Test Data
            </span>
            <div style={{ fontSize: '0.8125rem', color: 'var(--accent-cyan)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
              {testCase.test_data || 'None'}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Est. Duration
            </span>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', marginTop: '4px' }}>
              {testCase.estimated_duration_minutes ? `${testCase.estimated_duration_minutes} min` : '5 min'}
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
                    <th style={{ padding: '10px 14px', width: '40%' }}>Action</th>
                    <th style={{ padding: '10px 14px', width: '25%' }}>Step Test Data</th>
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
                      <td style={{ padding: '12px 14px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                        {step.test_data || '—'}
                      </td>
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
        <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '80vh', overflowY: 'auto', paddingRight: '4px' }}>
          {editError && (
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
              {editError}
            </div>
          )}

          <Input label="Title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required />

          <Input label="Description" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Test Type
              </label>
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value as any)}
                style={{ width: '100%', padding: '10px 12px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.8125rem' }}
              >
                {TEST_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Priority
              </label>
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as any)}
                style={{ width: '100%', padding: '10px 12px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.8125rem' }}
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
                style={{ width: '100%', padding: '10px 12px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.8125rem' }}
              >
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="DEPRECATED">Deprecated</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Tags
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                placeholder="Add tag and press Enter or Add Tag"
                value={editTagInput}
                onChange={(e) => setEditTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddEditTag();
                  }
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                }}
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleAddEditTag}>
                Add
              </Button>
            </div>

            {editTags.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                {editTags.map((tg) => (
                  <span
                    key={tg}
                    style={{
                      fontSize: '0.75rem',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'rgba(79, 70, 229, 0.12)',
                      color: 'var(--primary)',
                      border: '1px solid rgba(79, 70, 229, 0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    #{tg}
                    <button
                      type="button"
                      onClick={() => handleRemoveEditTag(tg)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: '12px' }}>
            <Input label="Preconditions" value={editPreconditions} onChange={(e) => setEditPreconditions(e.target.value)} />
            <Input label="Global Test Data" value={editTestData} onChange={(e) => setEditTestData(e.target.value)} />
            <Input label="Est. Min" type="number" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} min="1" />
          </div>

          {/* Edit Steps */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Steps & Data</label>
              <Button type="button" variant="secondary" size="sm" onClick={handleAddEditStep} leftIcon={<Plus size={13} />}>
                Add Step
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {editSteps.map((step, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '28px 1.2fr 1fr 1.2fr 52px 28px', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--primary)', textAlign: 'center' }}>{idx + 1}</span>
                  <input
                    value={step.action}
                    onChange={(e) => handleEditStepChange(idx, 'action', e.target.value)}
                    placeholder="Action"
                    style={{ padding: '8px 10px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.8125rem' }}
                  />
                  <input
                    value={step.test_data || ''}
                    onChange={(e) => handleEditStepChange(idx, 'test_data', e.target.value)}
                    placeholder="Step Test Data"
                    style={{ padding: '8px 10px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
                  />
                  <input
                    value={step.expected_result}
                    onChange={(e) => handleEditStepChange(idx, 'expected_result', e.target.value)}
                    placeholder="Expected Result"
                    style={{ padding: '8px 10px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.8125rem' }}
                  />

                  {/* Reorder Buttons */}
                  <div style={{ display: 'flex', gap: '2px' }}>
                    <button
                      type="button"
                      onClick={() => handleMoveEditStep(idx, 'up')}
                      disabled={idx === 0}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: idx === 0 ? 'var(--border-subtle)' : 'var(--text-secondary)',
                        cursor: idx === 0 ? 'default' : 'pointer',
                        padding: '2px',
                      }}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveEditStep(idx, 'down')}
                      disabled={idx === editSteps.length - 1}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: idx === editSteps.length - 1 ? 'var(--border-subtle)' : 'var(--text-secondary)',
                        cursor: idx === editSteps.length - 1 ? 'default' : 'pointer',
                        padding: '2px',
                      }}
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>

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
