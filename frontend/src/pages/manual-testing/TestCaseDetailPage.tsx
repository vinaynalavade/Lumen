import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Archive,
  Trash2,
  History,
  ListOrdered,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  FolderInput,
  XCircle,
} from 'lucide-react';
import { manualTestingApi } from '../../services/manualTestingApi';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import type {
  TestCase,
  TestCaseHistoryEntry,
  TestCaseReview,
  TestCasePriority,
  TestCaseSeverity,
  TestCaseReviewStatus,
  TestCaseType,
  TestCaseStep,
  TestModule,
  User,
} from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { TestCaseEditorModal } from '../../components/manual-testing/TestCaseEditorModal';

export const TestCaseDetailPage: React.FC = () => {
  const { projectId, caseId } = useParams<{ projectId: string; caseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();

  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [history, setHistory] = useState<TestCaseHistoryEntry[]>([]);
  const [reviews, setReviews] = useState<TestCaseReview[]>([]);
  const [modules, setModules] = useState<TestModule[]>([]);
  const [reviewerCandidates, setReviewerCandidates] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Editor Modal
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Review Action Modals
  const [isSubmitReviewModalOpen, setIsSubmitReviewModalOpen] = useState(false);
  const [submitReviewerId, setSubmitReviewerId] = useState<string>('');
  const [submitComments, setSubmitComments] = useState('');

  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approveComments, setApproveComments] = useState('');

  const [isChangesModalOpen, setIsChangesModalOpen] = useState(false);
  const [changesComments, setChangesComments] = useState('');

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectComments, setRejectComments] = useState('');

  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Move Module State
  const [selectedTargetModule, setSelectedTargetModule] = useState<string>('');

  const loadData = async () => {
    if (!caseId || !projectId) return;
    setIsLoading(true);
    try {
      const [caseData, histData, reviewData, modList, candidates] = await Promise.all([
        manualTestingApi.getTestCaseDetail(caseId),
        manualTestingApi.getTestCaseHistory(caseId),
        manualTestingApi.getTestCaseReviews(caseId),
        manualTestingApi.getModules(projectId),
        manualTestingApi.getReviewerCandidates(projectId),
      ]);
      setTestCase(caseData);
      setHistory(histData);
      setReviews(reviewData);
      setModules(modList);
      setReviewerCandidates(candidates);
      setSelectedTargetModule(caseData.module_id || '');
      setSubmitReviewerId(caseData.reviewer_id || '');
    } catch (err) {
      console.error('Failed to load test case details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [caseId, projectId, activeWorkspace?.id]);

  const handleSaveEdit = async (caseData: Partial<TestCase> & { steps?: TestCaseStep[] }, submitForReview = false, reviewerId?: string | null) => {
    if (!caseId) return;
    await manualTestingApi.updateTestCase(caseId, caseData);
    if (submitForReview) {
      await manualTestingApi.submitForReview(caseId, { reviewer_id: reviewerId });
    }
    loadData();
  };

  const handleMoveModule = async (newModuleId: string) => {
    if (!caseId) return;
    const targetId = newModuleId === '' ? null : newModuleId;
    try {
      const updated = await manualTestingApi.moveTestCaseModule(caseId, targetId);
      setTestCase(updated);
      setSelectedTargetModule(newModuleId);
    } catch (err) {
      console.error('Failed to move test case module:', err);
    }
  };

  const handleSubmitForReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId) return;
    setIsSubmittingAction(true);
    try {
      await manualTestingApi.submitForReview(caseId, {
        reviewer_id: submitReviewerId || null,
        comments: submitComments.trim() || undefined,
      });
      setIsSubmitReviewModalOpen(false);
      setSubmitComments('');
      loadData();
    } catch (err) {
      console.error('Failed to submit for review:', err);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleApproveTestCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId) return;
    setIsSubmittingAction(true);
    try {
      await manualTestingApi.approveTestCase(caseId, {
        comments: approveComments.trim() || undefined,
      });
      setIsApproveModalOpen(false);
      setApproveComments('');
      loadData();
    } catch (err) {
      console.error('Failed to approve test case:', err);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleRequestChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId) return;
    setIsSubmittingAction(true);
    try {
      await manualTestingApi.requestChanges(caseId, {
        comments: changesComments.trim() || undefined,
      });
      setIsChangesModalOpen(false);
      setChangesComments('');
      loadData();
    } catch (err) {
      console.error('Failed to request changes:', err);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleRejectTestCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId) return;
    setIsSubmittingAction(true);
    try {
      await manualTestingApi.rejectTestCase(caseId, {
        comments: rejectComments.trim() || undefined,
      });
      setIsRejectModalOpen(false);
      setRejectComments('');
      loadData();
    } catch (err) {
      console.error('Failed to reject test case:', err);
    } finally {
      setIsSubmittingAction(false);
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
        Loading test case governance specification...
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

  const getSeverityBadge = (severity?: TestCaseSeverity | string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--status-fail-bg)',
              color: 'var(--status-fail)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            💥 CRITICAL IMPACT
          </span>
        );
      case 'HIGH':
        return (
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--status-blocked-bg)',
              color: 'var(--status-blocked)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            🔥 HIGH IMPACT
          </span>
        );
      case 'MEDIUM':
        return (
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(79, 70, 229, 0.15)',
              color: '#818cf8',
              border: '1px solid rgba(79, 70, 229, 0.3)',
            }}
          >
            ⚡ MEDIUM IMPACT
          </span>
        );
      case 'LOW':
        return (
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            🌱 LOW IMPACT
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
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--status-pass-bg)',
              color: 'var(--status-pass)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckCircle2 size={14} />
            APPROVED (Ready for Run)
          </span>
        );
      case 'IN_REVIEW':
        return (
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--status-blocked-bg)',
              color: 'var(--status-blocked)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Clock size={14} />
            PEER REVIEW IN PROGRESS
          </span>
        );
      case 'CHANGES_REQUESTED':
        return (
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--status-blocked-bg)',
              color: 'var(--status-blocked)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertCircle size={14} />
            CHANGES REQUESTED
          </span>
        );
      case 'REJECTED':
        return (
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--status-fail-bg)',
              color: 'var(--status-fail)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <XCircle size={14} />
            REJECTED
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Edit2 size={14} />
            DRAFT (Authoring)
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

  const selectStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
    fontSize: '0.8125rem',
    outline: 'none',
  };

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '0.8125rem',
    outline: 'none',
    resize: 'vertical',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Navigation & Action Bar */}
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
          <Button variant="primary" size="sm" onClick={() => setIsEditorOpen(true)} leftIcon={<Edit2 size={14} />}>
            Edit Case & Steps
          </Button>
          <Button variant="secondary" size="sm" onClick={handleArchive} leftIcon={<Archive size={14} />}>
            Archive
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete} leftIcon={<Trash2 size={14} />}>
            Delete
          </Button>
        </div>
      </div>

      {/* Review Governance Banner Card */}
      <div
        style={{
          padding: '20px 24px',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-strong)',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(79, 70, 229, 0.15)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Review Governance:
              </span>
              {getReviewStatusBadge(testCase.review_status)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Assigned Reviewer:</span>
              <strong style={{ color: 'var(--text-primary)' }}>
                {testCase.reviewer?.full_name || 'Unassigned'}
              </strong>
              {testCase.reviewer?.professional_title && (
                <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                  ({testCase.reviewer.professional_title})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Governance Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {(testCase.review_status === 'DRAFT' ||
            testCase.review_status === 'CHANGES_REQUESTED' ||
            testCase.review_status === 'REJECTED' ||
            !testCase.review_status) && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsSubmitReviewModalOpen(true)}
              leftIcon={<Send size={14} />}
            >
              {testCase.review_status === 'CHANGES_REQUESTED' || testCase.review_status === 'REJECTED'
                ? 'Resubmit for Review'
                : 'Submit for Peer Review'}
            </Button>
          )}

          {testCase.review_status === 'IN_REVIEW' && (
            isAuthor ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                }}
              >
                <Clock size={14} color="var(--primary)" />
                <span>
                  Awaiting review by <strong style={{ color: 'var(--text-primary)' }}>{testCase.reviewer?.full_name || 'Designated Reviewer'}</strong> (Author self-approval disabled)
                </span>
              </div>
            ) : (
              <>
                <Button
                  variant="pass"
                  size="sm"
                  onClick={() => setIsApproveModalOpen(true)}
                  leftIcon={<CheckCircle2 size={14} />}
                >
                  Approve Test Case
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsChangesModalOpen(true)}
                  leftIcon={<AlertCircle size={14} />}
                >
                  Request Changes
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setIsRejectModalOpen(true)}
                  leftIcon={<XCircle size={14} />}
                >
                  Reject
                </Button>
              </>
            )
          )}

          {testCase.review_status === 'APPROVED' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsChangesModalOpen(true)}
            >
              Request Revisions
            </Button>
          )}
        </div>
      </div>

      {/* Main Details Card */}
      <Card padding="lg" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
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
              {getSeverityBadge(testCase.severity)}
              <Badge variant={getPriorityBadgeVariant(testCase.priority)}>{testCase.priority}</Badge>
              <Badge variant="neutral">{testCase.status}</Badge>
              <Badge variant="primary">{testCase.template_type}</Badge>
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

          {/* Module / Folder Switcher inline */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              minWidth: '220px',
            }}
          >
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <FolderInput size={13} color="var(--primary)" />
              Folder Location
            </span>
            <select
              value={selectedTargetModule}
              onChange={(e) => handleMoveModule(e.target.value)}
              style={selectStyle}
            >
              <option value="">[ Unassigned Cases ]</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  📁 {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Authorship & Metadata Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
              {testCase.estimated_duration_minutes ? `${testCase.estimated_duration_minutes} min` : '10 min'}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Author & Created
            </span>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', marginTop: '4px' }}>
              {testCase.creator?.full_name || 'Engineering'}
              {testCase.creator?.professional_title && ` (${testCase.creator.professional_title})`}
              <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.6875rem' }}>
                {new Date(testCase.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Steps Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <ListOrdered size={18} color="var(--primary)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Test Steps & Data ({testCase.steps?.length || 0})
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

      {/* Review History Audit Log */}
      <Card padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <ShieldCheck size={18} color="var(--primary)" />
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Review Audit Trail ({reviews.length})
          </h2>
        </div>

        {reviews.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {reviews.map((rev) => (
              <div
                key={rev.id}
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor:
                          rev.status === 'APPROVED'
                            ? 'var(--status-pass-bg)'
                            : rev.status === 'CHANGES_REQUESTED' || rev.status === 'REJECTED'
                            ? 'var(--status-fail-bg)'
                            : 'var(--status-blocked-bg)',
                        color:
                          rev.status === 'APPROVED'
                            ? 'var(--status-pass)'
                            : rev.status === 'CHANGES_REQUESTED' || rev.status === 'REJECTED'
                            ? 'var(--status-fail)'
                            : 'var(--status-blocked)',
                      }}
                    >
                      {rev.status}
                    </span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      by {rev.reviewer?.full_name || 'Reviewer'}
                    </span>
                    {rev.reviewer?.professional_title && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        ({rev.reviewer.professional_title})
                      </span>
                    )}
                  </div>
                  {rev.comments && (
                    <p
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--text-secondary)',
                        backgroundColor: 'var(--bg-card)',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        marginTop: '4px',
                      }}
                    >
                      "{rev.comments}"
                    </p>
                  )}
                </div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {new Date(rev.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            No review actions recorded yet. Submit for peer review to begin governance workflow.
          </div>
        )}
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
                  <th style={{ padding: '10px 14px', width: '160px' }}>Executor & Time</th>
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
                    <td style={{ padding: '12px 14px' }}>
                      <Badge variant={entry.status === 'PASSED' ? 'pass' : entry.status === 'FAILED' ? 'fail' : 'neutral'}>
                        {entry.status}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                      {entry.actual_result || '—'}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      <div>{entry.executor_name || 'Anonymous'}</div>
                      <div>{entry.executed_at ? new Date(entry.executed_at).toLocaleString() : '—'}</div>
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

      {/* 1. Modal: Submit for Review */}
      <Modal isOpen={isSubmitReviewModalOpen} onClose={() => setIsSubmitReviewModalOpen(false)} title="Submit Test Case for Peer Review" size="md">
        <form onSubmit={handleSubmitForReview} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Assigned Reviewer
            </label>
            <select
              value={submitReviewerId}
              onChange={(e) => setSubmitReviewerId(e.target.value)}
              style={selectStyle}
            >
              <option value="">-- Choose Reviewer --</option>
              {reviewerCandidates.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || 'Team Member'} {u.professional_title ? `— ${u.professional_title}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Submission Notes / Scope for Reviewer
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Please verify step 3 payload against v2.0 auth specifications..."
              value={submitComments}
              onChange={(e) => setSubmitComments(e.target.value)}
              style={textareaStyle}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsSubmitReviewModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingAction}>
              Submit for Review
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Modal: Approve Test Case */}
      <Modal isOpen={isApproveModalOpen} onClose={() => setIsApproveModalOpen(false)} title="Approve Test Case" size="md">
        <form onSubmit={handleApproveTestCase} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Approving this test case will mark it as <strong style={{ color: 'var(--status-pass)' }}>APPROVED</strong> and ready for execution in test runs.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Approval Feedback Comments (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Test steps verified and matched against checkout requirements."
              value={approveComments}
              onChange={(e) => setApproveComments(e.target.value)}
              style={textareaStyle}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsApproveModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingAction}>
              Confirm Approval
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Modal: Request Changes */}
      <Modal isOpen={isChangesModalOpen} onClose={() => setIsChangesModalOpen(false)} title="Request Changes on Test Case" size="md">
        <form onSubmit={handleRequestChanges} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Provide feedback explaining what revisions are required by the author before approval.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Change Request Comments <span style={{ color: 'var(--status-fail)' }}>*</span>
            </label>
            <textarea
              rows={4}
              placeholder="e.g. Please add a verification step for credit card expiry date validation..."
              value={changesComments}
              onChange={(e) => setChangesComments(e.target.value)}
              style={textareaStyle}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsChangesModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" isLoading={isSubmittingAction}>
              Request Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3b. Modal: Reject Test Case */}
      <Modal isOpen={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} title="Reject Test Case" size="md">
        <form onSubmit={handleRejectTestCase} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--status-fail-bg)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--status-fail)',
              fontSize: '0.8125rem',
            }}
          >
            Rejecting this test case indicates it does not meet quality requirements or is invalid. The author can revise and resubmit it later.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Rejection Reason & Comments <span style={{ color: 'var(--status-fail)' }}>*</span>
            </label>
            <textarea
              rows={4}
              placeholder="Explain why this test case is rejected..."
              value={rejectComments}
              onChange={(e) => setRejectComments(e.target.value)}
              style={textareaStyle}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" isLoading={isSubmittingAction}>
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Large Responsive Test Case Editor Modal */}
      <TestCaseEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveEdit}
        initialData={testCase}
        modules={modules}
        projectId={projectId}
      />
    </div>
  );
};
