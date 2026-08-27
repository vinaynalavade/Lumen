import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Folder,
  Layers,
  Edit3,
  Archive,
  Square,
  CheckSquare,
  FolderCheck,
  FolderInput,
  FileText,
} from 'lucide-react';
import { manualTestingApi } from '../../services/manualTestingApi';
import type {
  TestCase,
  TestModule,
  TestCasePriority,
  TestCaseSeverity,
  TestCaseType,
  TestCaseReviewStatus,
} from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { TestCaseEditorModal } from '../../components/manual-testing/TestCaseEditorModal';

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

  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [modules, setModules] = useState<TestModule[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<TestCasePriority | ''>('');
  const [severityFilter, setSeverityFilter] = useState<TestCaseSeverity | ''>('');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<TestCaseReviewStatus | ''>('');

  // Bulk Selection State
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [bulkTargetModuleId, setBulkTargetModuleId] = useState<string>('');
  const [isBulkMoving, setIsBulkMoving] = useState<boolean>(false);

  // Modal States
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);

  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [moduleName, setModuleName] = useState('');
  const [moduleDesc, setModuleDesc] = useState('');
  const [isCreatingModule, setIsCreatingModule] = useState(false);

  const loadData = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const [cases, mods] = await Promise.all([
        manualTestingApi.getTestCases(projectId, {
          module_id: selectedModuleId === 'unassigned' ? undefined : selectedModuleId || undefined,
          search: search.trim() || undefined,
          test_type: typeFilter || undefined,
          priority: priorityFilter || undefined,
          severity: severityFilter || undefined,
          review_status: reviewStatusFilter || undefined,
        }),
        manualTestingApi.getModules(projectId),
      ]);

      // If user specifically picked "unassigned", filter in memory if needed
      if (selectedModuleId === 'unassigned') {
        setTestCases(cases.filter((c) => !c.module_id));
      } else {
        setTestCases(cases);
      }

      setModules(mods);
    } catch (err) {
      console.error('Failed to load test cases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setSelectedCaseIds([]);
  }, [projectId, selectedModuleId, search, typeFilter, priorityFilter, severityFilter, reviewStatusFilter]);

  const handleSaveCase = async (caseData: any, submitForReview = false, reviewerId?: string | null) => {
    if (!projectId) return;
    try {
      if (editingCase) {
        await manualTestingApi.updateTestCase(editingCase.id, caseData);
        if (submitForReview) {
          await manualTestingApi.submitForReview(editingCase.id, { reviewer_id: reviewerId });
        }
      } else {
        const created = await manualTestingApi.createTestCase(projectId, caseData);
        if (submitForReview) {
          await manualTestingApi.submitForReview(created.id, { reviewer_id: reviewerId });
        }
      }
      setIsCaseModalOpen(false);
      setEditingCase(null);
      loadData();
    } catch (err) {
      console.error('Failed to save test case:', err);
    }
  };

  const handleArchiveCase = async (e: React.MouseEvent, caseId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to archive this test case?')) return;
    try {
      await manualTestingApi.archiveTestCase(caseId);
      loadData();
    } catch (err) {
      console.error('Failed to archive test case:', err);
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !moduleName.trim()) return;
    setIsCreatingModule(true);
    try {
      await manualTestingApi.createModule(projectId, {
        name: moduleName.trim(),
        description: moduleDesc.trim() || undefined,
      });
      setIsModuleModalOpen(false);
      setModuleName('');
      setModuleDesc('');
      loadData();
    } catch (err) {
      console.error('Failed to create folder module:', err);
    } finally {
      setIsCreatingModule(false);
    }
  };

  // Bulk Selection Handlers
  const handleToggleSelectAll = () => {
    if (selectedCaseIds.length === testCases.length) {
      setSelectedCaseIds([]);
    } else {
      setSelectedCaseIds(testCases.map((c) => c.id));
    }
  };

  const handleToggleSelectCase = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (selectedCaseIds.includes(id)) {
      setSelectedCaseIds(selectedCaseIds.filter((item) => item !== id));
    } else {
      setSelectedCaseIds([...selectedCaseIds, id]);
    }
  };

  const handleBulkMove = async () => {
    if (selectedCaseIds.length === 0 || !projectId) return;
    setIsBulkMoving(true);
    try {
      const targetModuleId = bulkTargetModuleId === 'unassigned' || !bulkTargetModuleId ? null : bulkTargetModuleId;
      await manualTestingApi.bulkMoveTestCases(projectId, selectedCaseIds, targetModuleId);
      setSelectedCaseIds([]);
      setBulkTargetModuleId('');
      loadData();
    } catch (err) {
      console.error('Failed to bulk move test cases:', err);
    } finally {
      setIsBulkMoving(false);
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

  const getSeverityBadge = (severity?: TestCaseSeverity | string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span
            style={{
              fontSize: '0.625rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--status-fail-bg)',
              color: 'var(--status-fail)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            💥 CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span
            style={{
              fontSize: '0.625rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--status-blocked-bg)',
              color: 'var(--status-blocked)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            🔥 HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span
            style={{
              fontSize: '0.625rem',
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(79, 70, 229, 0.15)',
              color: '#818cf8',
              border: '1px solid rgba(79, 70, 229, 0.3)',
            }}
          >
            ⚡ MEDIUM
          </span>
        );
      case 'LOW':
        return (
          <span
            style={{
              fontSize: '0.625rem',
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            🌱 LOW
          </span>
        );
      default:
        return null;
    }
  };

  const getReviewStatusBadge = (reviewStatus?: TestCaseReviewStatus | string) => {
    switch (reviewStatus) {
      case 'APPROVED':
        return (
          <span
            style={{
              fontSize: '0.625rem',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--status-pass-bg)',
              color: 'var(--status-pass)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            ✓ APPROVED
          </span>
        );
      case 'IN_REVIEW':
        return (
          <span
            style={{
              fontSize: '0.625rem',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--status-blocked-bg)',
              color: 'var(--status-blocked)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            ⏳ IN REVIEW
          </span>
        );
      case 'CHANGES_REQUESTED':
        return (
          <span
            style={{
              fontSize: '0.625rem',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--status-blocked-bg)',
              color: 'var(--status-blocked)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            ✍ CHANGES REQ.
          </span>
        );
      case 'REJECTED':
        return (
          <span
            style={{
              fontSize: '0.625rem',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--status-fail-bg)',
              color: 'var(--status-fail)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            ✕ REJECTED
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span
            style={{
              fontSize: '0.625rem',
              fontWeight: 600,
              padding: '2px 7px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            DRAFT
          </span>
        );
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

  const filterSelectStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-subtle)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 12px',
    color: 'var(--text-primary)',
    fontSize: '0.8125rem',
    outline: 'none',
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '250px minmax(0, 1fr)',
        gap: '20px',
        alignItems: 'start',
        width: '100%',
      }}
    >
      {/* 1. Left Sidebar: Folder / Module Hierarchy */}
      <Card padding="md" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Folder size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Modules & Folders
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsModuleModalOpen(true)}
            leftIcon={<Plus size={13} />}
            title="Create Folder"
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

          {/* Unassigned Test Cases Option */}
          <button
            type="button"
            onClick={() => setSelectedModuleId('unassigned')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: selectedModuleId === 'unassigned' ? 'rgba(79, 70, 229, 0.15)' : 'transparent',
              color: selectedModuleId === 'unassigned' ? 'var(--primary)' : 'var(--text-secondary)',
              border: selectedModuleId === 'unassigned' ? '1px solid rgba(79, 70, 229, 0.3)' : '1px solid transparent',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: selectedModuleId === 'unassigned' ? 600 : 400,
              textAlign: 'left',
              width: '100%',
              transition: 'var(--transition-fast)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderInput size={14} color="var(--text-muted)" />
              <span>Unassigned Cases</span>
            </div>
          </button>

          <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />

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
        </div>
      </Card>

      {/* 2. Right Pane: Test Cases Table & Governance Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
        {/* Controls Row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          {/* Search & Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 300px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 180px', minWidth: '160px' }}>
              <Input
                placeholder="Search test cases..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search size={15} />}
              />
            </div>

            {/* Test Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={filterSelectStyle}
            >
              <option value="">All Types</option>
              {TEST_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* Review Status Filter */}
            <select
              value={reviewStatusFilter}
              onChange={(e) => setReviewStatusFilter(e.target.value as any)}
              style={filterSelectStyle}
            >
              <option value="">All Review Statuses</option>
              <option value="APPROVED">✓ Approved</option>
              <option value="IN_REVIEW">⏳ In Review</option>
              <option value="CHANGES_REQUESTED">✍ Changes Requested</option>
              <option value="REJECTED">✕ Rejected</option>
              <option value="DRAFT">Draft</option>
            </select>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as any)}
              style={filterSelectStyle}
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">💥 Critical</option>
              <option value="HIGH">🔥 High</option>
              <option value="MEDIUM">⚡ Medium</option>
              <option value="LOW">🌱 Low</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              style={filterSelectStyle}
            >
              <option value="">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Action Button */}
          <Button
            variant="primary"
            onClick={() => {
              setEditingCase(null);
              setIsCaseModalOpen(true);
            }}
            leftIcon={<Plus size={16} />}
          >
            Create Test Case
          </Button>
        </div>

        {/* Bulk Actions Floating Bar */}
        {selectedCaseIds.length > 0 && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#818cf8',
                  backgroundColor: 'rgba(79, 70, 229, 0.15)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(79, 70, 229, 0.3)',
                }}
              >
                {selectedCaseIds.length} Cases Selected
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Bulk Actions:</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value={bulkTargetModuleId}
                onChange={(e) => setBulkTargetModuleId(e.target.value)}
                style={filterSelectStyle}
              >
                <option value="">-- Choose Target Folder --</option>
                <option value="unassigned">[ Unassign / Root ]</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>

              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isBulkMoving || !bulkTargetModuleId}
                onClick={handleBulkMove}
                leftIcon={<FolderCheck size={14} />}
              >
                {isBulkMoving ? 'Moving...' : 'Move to Folder'}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSelectedCaseIds([])}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Test Cases Table */}
        <Card padding="none" style={{ overflow: 'hidden', width: '100%' }}>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', minWidth: '920px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderBottom: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    fontSize: '0.6875rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <th style={{ padding: '10px 12px', width: '36px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      style={{ color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {selectedCaseIds.length > 0 && selectedCaseIds.length === testCases.length ? (
                        <CheckSquare size={16} color="var(--primary)" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </th>
                  <th style={{ padding: '10px 12px', width: '95px' }}>ID</th>
                  <th style={{ padding: '10px 14px', minWidth: '220px' }}>Title & Scope</th>
                  <th style={{ padding: '10px 12px', width: '85px' }}>Type</th>
                  <th style={{ padding: '10px 12px', width: '110px' }}>Folder</th>
                  <th style={{ padding: '10px 12px', width: '85px' }}>Severity</th>
                  <th style={{ padding: '10px 12px', width: '80px' }}>Priority</th>
                  <th style={{ padding: '10px 12px', width: '105px' }}>Review</th>
                  <th style={{ padding: '10px 12px', width: '50px', textAlign: 'center' }}>Steps</th>
                  <th style={{ padding: '10px 12px', width: '90px' }}>Last Run</th>
                  <th style={{ padding: '10px 12px', width: '65px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {testCases.map((tc) => {
                  const isSelected = selectedCaseIds.includes(tc.id);

                  return (
                    <tr
                      key={tc.id}
                      onClick={() => navigate(`/projects/${projectId}/manual/cases/${tc.id}`)}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'var(--transition-fast)',
                        backgroundColor: isSelected ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isSelected ? 'rgba(79, 70, 229, 0.12)' : 'rgba(255, 255, 255, 0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isSelected ? 'rgba(79, 70, 229, 0.08)' : 'transparent')}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={(e) => handleToggleSelectCase(e, tc.id)}
                          style={{ color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          {isSelected ? (
                            <CheckSquare size={16} color="var(--primary)" />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      </td>

                      {/* Case Key */}
                      <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--primary)' }}>
                        {tc.key}
                      </td>

                      {/* Title & Metadata */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                          {tc.title}
                        </div>
                        {tc.preconditions && (
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '340px' }}>
                            Pre: {tc.preconditions}
                          </div>
                        )}
                        {tc.tags && tc.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                            {tc.tags.map((tg) => (
                              <span
                                key={tg}
                                style={{
                                  fontSize: '0.625rem',
                                  padding: '1px 5px',
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

                      {/* Test Type */}
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: 'var(--radius-sm)',
                            color: getTypeBadgeColor(tc.test_type),
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            border: `1px solid ${getTypeBadgeColor(tc.test_type)}40`,
                          }}
                        >
                          {tc.test_type || 'FUNCTIONAL'}
                        </span>
                      </td>

                      {/* Module / Folder */}
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                        {tc.module_name ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }} title={tc.module_name}>
                            <Folder size={12} color="var(--text-muted)" />
                            {tc.module_name}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.6875rem' }}>[ Unassigned ]</span>
                        )}
                      </td>

                      {/* Severity */}
                      <td style={{ padding: '12px' }}>
                        {getSeverityBadge(tc.severity)}
                      </td>

                      {/* Priority */}
                      <td style={{ padding: '12px' }}>
                        <Badge variant={getPriorityBadgeVariant(tc.priority)} size="sm">{tc.priority}</Badge>
                      </td>

                      {/* Review Governance Status */}
                      <td style={{ padding: '12px' }}>
                        {getReviewStatusBadge(tc.review_status)}
                      </td>

                      {/* Step Count */}
                      <td style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {tc.step_count}
                      </td>

                      {/* Last Execution */}
                      <td style={{ padding: '12px' }}>
                        {getExecutionBadge(tc.last_execution_status)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCase(tc);
                              setIsCaseModalOpen(true);
                            }}
                            title="Edit Test Case"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                          >
                            <Edit3 size={14} />
                          </button>
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
                            <Archive size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {testCases.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={11} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
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
        title="Create Test Folder / Module"
        size="sm"
      >
        <form onSubmit={handleCreateModule} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Folder Name"
            placeholder="e.g. Authentication, Checkout, User Settings"
            value={moduleName}
            onChange={(e) => setModuleName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Description (Optional)"
            placeholder="What area of the product does this folder cover?"
            value={moduleDesc}
            onChange={(e) => setModuleDesc(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsModuleModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isCreatingModule}>
              Create Folder
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Large Responsive Test Case Editor Modal */}
      <TestCaseEditorModal
        isOpen={isCaseModalOpen}
        onClose={() => {
          setIsCaseModalOpen(false);
          setEditingCase(null);
        }}
        onSave={handleSaveCase}
        initialData={editingCase}
        modules={modules}
        defaultModuleId={selectedModuleId === 'unassigned' ? null : selectedModuleId}
        projectId={projectId}
      />
    </div>
  );
};
