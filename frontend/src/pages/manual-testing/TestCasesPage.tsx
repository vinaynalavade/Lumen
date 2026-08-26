import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Folder,
  Trash2,
  Archive,
  Layers,
  ListOrdered,
  FileText,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { manualTestingApi } from '../../services/manualTestingApi';
import type {
  TestModule,
  TestCase,
  TestCasePriority,
  TestCaseStatus,
  TestCaseTemplate,
  TestCaseType,
  TestCaseStep,
} from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

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

export const TestCasesPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [modules, setModules] = useState<TestModule[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<TestCasePriority | ''>('');
  const [statusFilter, setStatusFilter] = useState<TestCaseStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Create Module Modal
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [moduleName, setModuleName] = useState('');
  const [moduleDesc, setModuleDesc] = useState('');
  const [isCreatingModule, setIsCreatingModule] = useState(false);

  // Create Test Case Modal
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [caseTemplate, setCaseTemplate] = useState<TestCaseTemplate>('STANDARD');
  const [caseType, setCaseType] = useState<TestCaseType>('FUNCTIONAL');
  const [caseTitle, setCaseTitle] = useState('');
  const [caseDesc, setCaseDesc] = useState('');
  const [caseModuleId, setCaseModuleId] = useState<string>('');
  const [casePriority, setCasePriority] = useState<TestCasePriority>('MEDIUM');
  const [caseStatus, setCaseStatus] = useState<TestCaseStatus>('ACTIVE');
  const [caseTags, setCaseTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [casePreconditions, setCasePreconditions] = useState('');
  const [caseTestData, setCaseTestData] = useState('');
  const [caseDuration, setCaseDuration] = useState<string>('5');
  const [caseExpectedResult, setCaseExpectedResult] = useState('');
  const [caseSteps, setCaseSteps] = useState<TestCaseStep[]>([
    { step_number: 1, action: '', expected_result: '', test_data: '' },
  ]);
  const [isSubmittingCase, setIsSubmittingCase] = useState(false);
  const [caseFormError, setCaseFormError] = useState('');

  const loadData = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const [modList, caseList] = await Promise.all([
        manualTestingApi.getModules(projectId),
        manualTestingApi.getTestCases(projectId, {
          module_id: selectedModuleId || undefined,
          priority: priorityFilter || undefined,
          status: statusFilter || undefined,
          test_type: typeFilter || undefined,
          search: search || undefined,
        }),
      ]);
      setModules(modList);
      setTestCases(caseList);
    } catch (err) {
      console.error('Failed to load manual test data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId, selectedModuleId, priorityFilter, statusFilter, typeFilter, search]);

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !moduleName.trim()) return;
    setIsCreatingModule(true);
    try {
      await manualTestingApi.createModule(projectId, {
        name: moduleName.trim(),
        description: moduleDesc.trim() || undefined,
      });
      setModuleName('');
      setModuleDesc('');
      setIsModuleModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Failed to create module:', err);
    } finally {
      setIsCreatingModule(false);
    }
  };

  const handleAddStep = () => {
    setCaseSteps([
      ...caseSteps,
      { step_number: caseSteps.length + 1, action: '', expected_result: '', test_data: '' },
    ]);
  };

  const handleRemoveStep = (index: number) => {
    const updated = caseSteps.filter((_, idx) => idx !== index);
    setCaseSteps(updated.map((s, idx) => ({ ...s, step_number: idx + 1 })));
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === caseSteps.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...caseSteps];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setCaseSteps(updated.map((s, idx) => ({ ...s, step_number: idx + 1 })));
  };

  const handleStepChange = (index: number, field: keyof TestCaseStep, value: string) => {
    const updated = [...caseSteps];
    updated[index] = { ...updated[index], [field]: value };
    setCaseSteps(updated);
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !caseTags.includes(trimmed)) {
      setCaseTags([...caseTags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setCaseTags(caseTags.filter((t) => t !== tagToRemove));
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    if (!caseTitle.trim()) {
      setCaseFormError('Title is required.');
      return;
    }
    setCaseFormError('');
    setIsSubmittingCase(true);

    try {
      const validSteps =
        caseTemplate === 'STANDARD'
          ? caseSteps
              .filter((s) => s.action.trim() || s.expected_result.trim())
              .map((s, idx) => ({
                step_number: idx + 1,
                action: s.action.trim(),
                expected_result: s.expected_result.trim(),
                test_data: s.test_data?.trim() || undefined,
              }))
          : [];

      await manualTestingApi.createTestCase(projectId, {
        title: caseTitle.trim(),
        description: caseDesc.trim() || undefined,
        module_id: caseModuleId || undefined,
        template_type: caseTemplate,
        test_type: caseType,
        priority: casePriority,
        status: caseStatus,
        tags: caseTags.length > 0 ? caseTags : undefined,
        preconditions: casePreconditions.trim() || undefined,
        test_data: caseTestData.trim() || undefined,
        estimated_duration_minutes: caseDuration ? parseInt(caseDuration, 10) : undefined,
        expected_result: caseExpectedResult.trim() || undefined,
        steps: validSteps,
      });

      setIsCaseModalOpen(false);
      // Reset form
      setCaseTitle('');
      setCaseDesc('');
      setCaseType('FUNCTIONAL');
      setCaseTags([]);
      setTagInput('');
      setCasePreconditions('');
      setCaseTestData('');
      setCaseExpectedResult('');
      setCaseSteps([{ step_number: 1, action: '', expected_result: '', test_data: '' }]);
      loadData();
    } catch (err: any) {
      setCaseFormError(err?.response?.data?.detail || err?.message || 'Failed to create test case.');
    } finally {
      setIsSubmittingCase(false);
    }
  };

  const handleArchiveCase = async (e: React.MouseEvent, caseId: string) => {
    e.stopPropagation();
    if (confirm('Archive this test case?')) {
      try {
        await manualTestingApi.archiveTestCase(caseId);
        loadData();
      } catch (err) {
        console.error('Failed to archive case:', err);
      }
    }
  };

  const totalCases = modules.reduce((acc, m) => acc + m.test_case_count, 0);

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

  const getExecutionBadge = (status?: string | null) => {
    if (!status || status === 'UNTESTED') {
      return <Badge variant="neutral">Untested</Badge>;
    }
    if (status === 'PASSED') {
      return <Badge variant="pass">Passed</Badge>;
    }
    if (status === 'FAILED') {
      return <Badge variant="fail">Failed</Badge>;
    }
    if (status === 'BLOCKED') {
      return <Badge variant="blocked">Blocked</Badge>;
    }
    return <Badge variant="neutral">{status}</Badge>;
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', alignItems: 'start' }}>
      {/* 1. Left Sidebar: Folder / Module Hierarchy */}
      <Card padding="md" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Folder size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Modules
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsModuleModalOpen(true)}
            leftIcon={<Plus size={13} />}
            title="Create Module"
          >
            Folder
          </Button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* All Test Cases Option */}
          <button
            type="button"
            onClick={() => setSelectedModuleId(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: selectedModuleId === null ? 'rgba(79, 70, 229, 0.15)' : 'transparent',
              color: selectedModuleId === null ? 'var(--primary)' : 'var(--text-secondary)',
              border: selectedModuleId === null ? '1px solid rgba(79, 70, 229, 0.3)' : '1px solid transparent',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: selectedModuleId === null ? 600 : 400,
              textAlign: 'left',
              width: '100%',
              transition: 'var(--transition-fast)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={14} />
              <span>All Test Cases</span>
            </div>
            <span
              style={{
                fontSize: '0.6875rem',
                fontFamily: 'var(--font-mono)',
                backgroundColor: 'var(--bg-subtle)',
                padding: '1px 6px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              {totalCases || testCases.length}
            </span>
          </button>

          {/* Module list */}
          {modules.map((mod) => {
            const isSelected = selectedModuleId === mod.id;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => setSelectedModuleId(mod.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isSelected ? 'rgba(79, 70, 229, 0.15)' : 'transparent',
                  color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                  border: isSelected ? '1px solid rgba(79, 70, 229, 0.3)' : '1px solid transparent',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: isSelected ? 600 : 400,
                  textAlign: 'left',
                  width: '100%',
                  transition: 'var(--transition-fast)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <Folder size={14} />
                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {mod.name}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: 'var(--bg-subtle)',
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  {mod.test_case_count}
                </span>
              </button>
            );
          })}

          {modules.length === 0 && (
            <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              No custom folders created yet.
            </div>
          )}
        </div>
      </Card>

      {/* 2. Right Pane: Test Cases Table & Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Controls Row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Search & Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '320px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <Input
                placeholder="Search by ID, title, tags, preconditions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search size={15} />}
              />
            </div>

            {/* Test Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 12px',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            >
              <option value="">All Test Types</option>
              {TEST_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              style={{
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 12px',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            >
              <option value="">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 12px',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="DEPRECATED">Deprecated</option>
            </select>
          </div>

          {/* Action Button */}
          <Button
            variant="primary"
            onClick={() => setIsCaseModalOpen(true)}
            leftIcon={<Plus size={16} />}
          >
            Create Test Case
          </Button>
        </div>

        {/* Test Cases Table */}
        <Card padding="none" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderBottom: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <th style={{ padding: '12px 16px', width: '130px' }}>ID</th>
                  <th style={{ padding: '12px 16px' }}>Title & Preconditions</th>
                  <th style={{ padding: '12px 16px', width: '110px' }}>Type</th>
                  <th style={{ padding: '12px 16px', width: '120px' }}>Module</th>
                  <th style={{ padding: '12px 16px', width: '90px' }}>Priority</th>
                  <th style={{ padding: '12px 16px', width: '70px' }}>Steps</th>
                  <th style={{ padding: '12px 16px', width: '100px' }}>Last Run</th>
                  <th style={{ padding: '12px 16px', width: '70px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {testCases.map((tc) => (
                  <tr
                    key={tc.id}
                    onClick={() => navigate(`/projects/${projectId}/manual/cases/${tc.id}`)}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--primary)' }}>
                      {tc.key}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tc.title}</div>
                      {tc.preconditions && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Pre: {tc.preconditions}
                        </div>
                      )}
                      {tc.tags && tc.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                          {tc.tags.map((tg) => (
                            <span
                              key={tg}
                              style={{
                                fontSize: '0.6875rem',
                                padding: '1px 6px',
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
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          color: getTypeBadgeColor(tc.test_type),
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${getTypeBadgeColor(tc.test_type)}40`,
                        }}
                      >
                        {tc.test_type || 'FUNCTIONAL'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                      {tc.module_name ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Folder size={12} color="var(--text-muted)" />
                          {tc.module_name}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <Badge variant={getPriorityBadgeVariant(tc.priority)}>{tc.priority}</Badge>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {tc.step_count}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {getExecutionBadge(tc.last_execution_status)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={(e) => handleArchiveCase(e, tc.id)}
                        title="Archive"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                      >
                        <Archive size={15} />
                      </button>
                    </td>
                  </tr>
                ))}

                {testCases.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <FileText size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                      <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        No test cases found
                      </div>
                      <p style={{ fontSize: '0.8125rem', marginTop: '4px' }}>
                        Create your first test case to begin building your manual testing suite.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* 3. Modal: Create Module / Folder */}
      <Modal
        isOpen={isModuleModalOpen}
        onClose={() => setIsModuleModalOpen(false)}
        title="Create Test Module / Folder"
        size="sm"
      >
        <form onSubmit={handleCreateModule} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Module Name"
            placeholder="e.g. Authentication, Checkout, User Settings"
            value={moduleName}
            onChange={(e) => setModuleName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Description (Optional)"
            placeholder="What area of the product does this module cover?"
            value={moduleDesc}
            onChange={(e) => setModuleDesc(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsModuleModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isCreatingModule}>
              Create Module
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Modal: Create Test Case */}
      <Modal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        title="Create New Test Case"
        size="lg"
      >
        <form onSubmit={handleCreateCase} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '80vh', overflowY: 'auto', paddingRight: '4px' }}>
          {caseFormError && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--status-fail-bg)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--status-fail)',
                fontSize: '0.8125rem',
              }}
            >
              {caseFormError}
            </div>
          )}

          {/* Section 1: Template Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Test Case Template
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setCaseTemplate('STANDARD')}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: caseTemplate === 'STANDARD' ? 'rgba(79, 70, 229, 0.12)' : 'var(--bg-subtle)',
                  border: caseTemplate === 'STANDARD' ? '1.5px solid var(--primary)' : '1px solid var(--border-subtle)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                }}
              >
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ListOrdered size={16} color="var(--primary)" /> Standard Step-by-Step
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Actions, step test data, and expected results.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCaseTemplate('SIMPLE')}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: caseTemplate === 'SIMPLE' ? 'rgba(79, 70, 229, 0.12)' : 'var(--bg-subtle)',
                  border: caseTemplate === 'SIMPLE' ? '1.5px solid var(--primary)' : '1px solid var(--border-subtle)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                }}
              >
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={16} color="var(--accent-cyan)" /> Simple / Acceptance
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Summary, description & single overall outcome.
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: General Information */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              General Information
            </div>

            <Input
              label="Test Case Title"
              placeholder="e.g. Verify user login with valid credentials"
              value={caseTitle}
              onChange={(e) => setCaseTitle(e.target.value)}
              required
            />

            <Input
              label="Description (Optional)"
              placeholder="Brief summary of test scope and purpose"
              value={caseDesc}
              onChange={(e) => setCaseDesc(e.target.value)}
            />

            {/* Test Type, Priority, Status, Module */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Test Type
                </label>
                <select
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8125rem',
                    outline: 'none',
                  }}
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
                  value={casePriority}
                  onChange={(e) => setCasePriority(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8125rem',
                    outline: 'none',
                  }}
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
                  value={caseStatus}
                  onChange={(e) => setCaseStatus(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8125rem',
                    outline: 'none',
                  }}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="DRAFT">Draft</option>
                  <option value="DEPRECATED">Deprecated</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Module / Folder
                </label>
                <select
                  value={caseModuleId}
                  onChange={(e) => setCaseModuleId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8125rem',
                    outline: 'none',
                  }}
                >
                  <option value="">(None / Root)</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tags Input */}
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Tags
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  placeholder="Type tag (e.g. Smoke, Auth, Release-1.0) and press Add"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8125rem',
                    outline: 'none',
                  }}
                />
                <Button type="button" variant="secondary" size="sm" onClick={handleAddTag}>
                  Add Tag
                </Button>
              </div>

              {caseTags.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {caseTags.map((tg) => (
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
                        onClick={() => handleRemoveTag(tg)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '0.875rem',
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Preconditions, Test Data & Duration */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Conditions & Global Data
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: '12px' }}>
              <Input
                label="Preconditions"
                placeholder="e.g. Active user account registered in DB"
                value={casePreconditions}
                onChange={(e) => setCasePreconditions(e.target.value)}
              />
              <Input
                label="Global Test Data"
                placeholder="e.g. validuser@lumen.qa / Pass123"
                value={caseTestData}
                onChange={(e) => setCaseTestData(e.target.value)}
              />
              <Input
                label="Est. Min"
                type="number"
                value={caseDuration}
                onChange={(e) => setCaseDuration(e.target.value)}
                min="1"
              />
            </div>
          </div>

          {/* Section 4: Steps or Acceptance Outcome */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            {caseTemplate === 'STANDARD' ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Test Steps & Step Data
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Define chronological steps with specific inputs and verification checkpoints.
                    </span>
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={handleAddStep} leftIcon={<Plus size={13} />}>
                    Add Step
                  </Button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {caseSteps.map((step, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px',
                        display: 'grid',
                        gridTemplateColumns: '28px 1.2fr 1fr 1.2fr 56px 28px',
                        gap: '8px',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--primary)', textAlign: 'center' }}>
                        {idx + 1}
                      </span>
                      <input
                        placeholder="Action (e.g. Navigate to /login)"
                        value={step.action}
                        onChange={(e) => handleStepChange(idx, 'action', e.target.value)}
                        style={{
                          padding: '8px 10px',
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          fontSize: '0.8125rem',
                          outline: 'none',
                        }}
                      />
                      <input
                        placeholder="Step Test Data (optional)"
                        value={step.test_data || ''}
                        onChange={(e) => handleStepChange(idx, 'test_data', e.target.value)}
                        style={{
                          padding: '8px 10px',
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--accent-cyan)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.75rem',
                          outline: 'none',
                        }}
                      />
                      <input
                        placeholder="Expected Result"
                        value={step.expected_result}
                        onChange={(e) => handleStepChange(idx, 'expected_result', e.target.value)}
                        style={{
                          padding: '8px 10px',
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          fontSize: '0.8125rem',
                          outline: 'none',
                        }}
                      />

                      {/* Reorder Buttons */}
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <button
                          type="button"
                          onClick={() => handleMoveStep(idx, 'up')}
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
                          onClick={() => handleMoveStep(idx, 'down')}
                          disabled={idx === caseSteps.length - 1}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: idx === caseSteps.length - 1 ? 'var(--border-subtle)' : 'var(--text-secondary)',
                            cursor: idx === caseSteps.length - 1 ? 'default' : 'pointer',
                            padding: '2px',
                          }}
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>

                      {/* Remove Button */}
                      {caseSteps.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--status-fail)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <div />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Overall Expected Result
                </label>
                <textarea
                  placeholder="Describe what successful outcome is expected from this acceptance test..."
                  value={caseExpectedResult}
                  onChange={(e) => setCaseExpectedResult(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsCaseModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingCase}>
              Save Test Case
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
