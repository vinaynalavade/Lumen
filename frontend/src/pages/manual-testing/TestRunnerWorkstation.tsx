import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Server,
  Plus,
  Paperclip,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { manualTestingApi } from '../../services/manualTestingApi';
import type {
  TestRun,
  TestRunItem,
  ExecutionStatus,
} from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const TestRunnerWorkstation: React.FC = () => {
  const { projectId, runId } = useParams<{ projectId: string; runId: string }>();

  const [testRun, setTestRun] = useState<TestRun | null>(null);
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active item execution state
  const [actualResult, setActualResult] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [stepStatuses, setStepStatuses] = useState<{ [stepNum: number]: ExecutionStatus }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Evidence state
  const [evidenceTitle, setEvidenceTitle] = useState<string>('');
  const [evidenceContent, setEvidenceContent] = useState<string>('');
  const [isAddingEvidence, setIsAddingEvidence] = useState<boolean>(false);

  const loadRun = async () => {
    if (!runId) return;
    setIsLoading(true);
    try {
      const data = await manualTestingApi.getRunDetail(runId);
      setTestRun(data);

      if (data.items && data.items.length > 0) {
        const item = data.items[activeItemIndex] || data.items[0];
        setActualResult(item.actual_result || '');
        setNotes(item.notes || '');

        const initSteps: { [stepNum: number]: ExecutionStatus } = {};
        item.step_results?.forEach((s) => {
          initSteps[s.step_number] = s.status;
        });
        setStepStatuses(initSteps);
      }
    } catch (err) {
      console.error('Failed to load test run execution data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRun();
  }, [runId]);

  const activeItem: TestRunItem | undefined = testRun?.items?.[activeItemIndex];

  const handleSelectCase = (index: number) => {
    if (!testRun?.items) return;
    setActiveItemIndex(index);
    const item = testRun.items[index];
    setActualResult(item.actual_result || '');
    setNotes(item.notes || '');

    const initSteps: { [stepNum: number]: ExecutionStatus } = {};
    item.step_results?.forEach((s) => {
      initSteps[s.step_number] = s.status;
    });
    setStepStatuses(initSteps);
  };

  const handleStepStatusChange = (stepNum: number, status: ExecutionStatus) => {
    setStepStatuses((prev) => ({
      ...prev,
      [stepNum]: status,
    }));
  };

  const handleRecordExecution = async (status: ExecutionStatus) => {
    if (!runId || !activeItem) return;
    setIsSubmitting(true);
    try {
      const stepResultsArray = Object.entries(stepStatuses).map(([sNum, sStatus]) => ({
        step_number: parseInt(sNum, 10),
        status: sStatus,
      }));

      await manualTestingApi.executeTestItem(runId, activeItem.id, {
        status,
        actual_result: actualResult.trim() || undefined,
        notes: notes.trim() || undefined,
        step_results: stepResultsArray.length > 0 ? stepResultsArray : undefined,
      });

      // Reload run data to update progress counters
      const updatedRun = await manualTestingApi.getRunDetail(runId);
      setTestRun(updatedRun);

      // Auto-advance to next untested test case if available
      if (activeItemIndex < (updatedRun.items?.length || 0) - 1) {
        handleSelectCase(activeItemIndex + 1);
      }
    } catch (err) {
      console.error('Failed to record execution:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!runId || !activeItem || !evidenceTitle.trim()) return;
    setIsAddingEvidence(true);
    try {
      await manualTestingApi.addEvidence(runId, activeItem.id, {
        evidence_type: 'LOG_TEXT',
        title: evidenceTitle.trim(),
        content: evidenceContent.trim() || undefined,
      });
      setEvidenceTitle('');
      setEvidenceContent('');
      loadRun();
    } catch (err) {
      console.error('Failed to attach evidence:', err);
    } finally {
      setIsAddingEvidence(false);
    }
  };

  if (isLoading || !testRun) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Initializing Test Runner Workstation...
      </div>
    );
  }

  const items = testRun.items || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Top Runner Header Bar */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            to={`/projects/${projectId}/manual/runs`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={16} />
          </Link>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {testRun.name}
              </h1>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--accent-cyan)',
                  border: '1px solid var(--border-subtle)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Server size={10} /> {testRun.environment}
              </span>
              <Badge variant={testRun.status === 'COMPLETED' ? 'pass' : 'primary'}>
                {testRun.status}
              </Badge>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Case {activeItemIndex + 1} of {items.length} • {testRun.completion_percentage}% Completed
            </p>
          </div>
        </div>

        {/* Live Metrics Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.8125rem' }}>
          <span style={{ color: 'var(--status-pass)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <CheckCircle2 size={15} /> {testRun.passed_count} Passed
          </span>
          <span style={{ color: 'var(--status-fail)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <XCircle size={15} /> {testRun.failed_count} Failed
          </span>
          {testRun.blocked_count > 0 && (
            <span style={{ color: 'var(--status-blocked)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <AlertOctagon size={15} /> {testRun.blocked_count} Blocked
            </span>
          )}
          <span style={{ color: 'var(--text-muted)' }}>{testRun.untested_count} Untested</span>
        </div>
      </div>

      {/* 2. Main Split Runner Workstation */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '16px', alignItems: 'start' }}>
        {/* Left: Test Cases Playlist */}
        <Card padding="sm" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '78vh', overflowY: 'auto' }}>
          <div style={{ padding: '8px 12px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Run Test Cases ({items.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {items.map((item, idx) => {
              const isActive = activeItemIndex === idx;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectCase(idx)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isActive ? 'rgba(79, 70, 229, 0.15)' : 'transparent',
                    border: isActive ? '1px solid var(--primary)' : '1px solid transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    transition: 'var(--transition-fast)',
                  }}
                >
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--primary)' }}>
                        {item.case_key}
                      </span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: isActive ? 600 : 500, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </span>
                    </div>
                  </div>

                  <div>
                    {item.status === 'PASSED' && <CheckCircle2 size={15} color="var(--status-pass)" />}
                    {item.status === 'FAILED' && <XCircle size={15} color="var(--status-fail)" />}
                    {item.status === 'BLOCKED' && <AlertOctagon size={15} color="var(--status-blocked)" />}
                    {item.status === 'UNTESTED' && (
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--border-strong)', display: 'inline-block' }} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Right: Active Test Case Execution Cockpit */}
        {activeItem ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Case Snapshot Card */}
            <Card padding="lg" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        color: 'var(--primary)',
                        backgroundColor: 'rgba(79, 70, 229, 0.12)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      {activeItem.case_key}
                    </span>
                    <Badge variant="neutral">{activeItem.priority}</Badge>
                    <Badge
                      variant={
                        activeItem.status === 'PASSED'
                          ? 'pass'
                          : activeItem.status === 'FAILED'
                          ? 'fail'
                          : activeItem.status === 'BLOCKED'
                          ? 'blocked'
                          : 'neutral'
                      }
                    >
                      {activeItem.status}
                    </Badge>
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {activeItem.title}
                  </h2>
                  {activeItem.description && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {activeItem.description}
                    </p>
                  )}
                </div>

                {/* Case Prev / Next switcher */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={activeItemIndex === 0}
                    onClick={() => handleSelectCase(activeItemIndex - 1)}
                    leftIcon={<ChevronLeft size={14} />}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={activeItemIndex === items.length - 1}
                    onClick={() => handleSelectCase(activeItemIndex + 1)}
                    rightIcon={<ChevronRight size={14} />}
                  >
                    Next
                  </Button>
                </div>
              </div>

              {/* Preconditions & Test Data banner */}
              {(activeItem.preconditions || activeItem.test_data) && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    padding: '12px 16px',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8125rem',
                  }}
                >
                  {activeItem.preconditions && (
                    <div>
                      <strong style={{ color: 'var(--text-muted)' }}>Preconditions:</strong>{' '}
                      <span style={{ color: 'var(--text-primary)' }}>{activeItem.preconditions}</span>
                    </div>
                  )}
                  {activeItem.test_data && (
                    <div>
                      <strong style={{ color: 'var(--text-muted)' }}>Test Data:</strong>{' '}
                      <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                        {activeItem.test_data}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Steps Execution Checklist */}
              {activeItem.step_results && activeItem.step_results.length > 0 ? (
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
                    Execution Steps Checklist
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {activeItem.step_results.map((step) => {
                      const currentStatus = stepStatuses[step.step_number] || 'UNTESTED';
                      return (
                        <div
                          key={step.step_number}
                          style={{
                            padding: '12px 14px',
                            backgroundColor: 'var(--bg-subtle)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-subtle)',
                            display: 'grid',
                            gridTemplateColumns: '32px 1fr 1fr 140px',
                            gap: '12px',
                            alignItems: 'center',
                          }}
                        >
                          <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--primary)', textAlign: 'center' }}>
                            {step.step_number}
                          </span>
                          <div>
                            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                              Action
                            </span>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                              {step.action}
                            </div>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                              Expected Result
                            </span>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {step.expected_result}
                            </div>
                          </div>

                          {/* Quick Step Status Toggle */}
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => handleStepStatusChange(step.step_number, 'PASSED')}
                              style={{
                                padding: '4px 8px',
                                borderRadius: 'var(--radius-sm)',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                backgroundColor: currentStatus === 'PASSED' ? 'var(--status-pass)' : 'rgba(255, 255, 255, 0.05)',
                                color: currentStatus === 'PASSED' ? '#ffffff' : 'var(--text-muted)',
                              }}
                            >
                              Pass
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStepStatusChange(step.step_number, 'FAILED')}
                              style={{
                                padding: '4px 8px',
                                borderRadius: 'var(--radius-sm)',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                backgroundColor: currentStatus === 'FAILED' ? 'var(--status-fail)' : 'rgba(255, 255, 255, 0.05)',
                                color: currentStatus === 'FAILED' ? '#ffffff' : 'var(--text-muted)',
                              }}
                            >
                              Fail
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStepStatusChange(step.step_number, 'BLOCKED')}
                              style={{
                                padding: '4px 8px',
                                borderRadius: 'var(--radius-sm)',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                backgroundColor: currentStatus === 'BLOCKED' ? 'var(--status-blocked)' : 'rgba(255, 255, 255, 0.05)',
                                color: currentStatus === 'BLOCKED' ? '#ffffff' : 'var(--text-muted)',
                              }}
                            >
                              Block
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '16px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem' }}>
                  <strong style={{ color: 'var(--text-muted)' }}>Expected Outcome:</strong>{' '}
                  <span style={{ color: 'var(--text-primary)' }}>{activeItem.expected_result || 'Acceptance criteria passed.'}</span>
                </div>
              )}

              {/* Actual Result & Notes Input */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    Actual Result Recorded
                  </label>
                  <textarea
                    placeholder="Enter what actually happened during execution..."
                    value={actualResult}
                    onChange={(e) => setActualResult(e.target.value)}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    Execution Notes / Comments
                  </label>
                  <textarea
                    placeholder="Optional notes, environmental details, or observations..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>

              {/* Execution Action Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {activeItem.executed_at ? (
                    <span>Last executed at {new Date(activeItem.executed_at).toLocaleTimeString()}</span>
                  ) : (
                    <span>Ready for execution</span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Button
                    type="button"
                    variant="pass"
                    isLoading={isSubmitting}
                    onClick={() => handleRecordExecution('PASSED')}
                    leftIcon={<CheckCircle2 size={16} />}
                  >
                    Pass Test
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    isLoading={isSubmitting}
                    onClick={() => handleRecordExecution('FAILED')}
                    leftIcon={<XCircle size={16} />}
                  >
                    Fail Test
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    isLoading={isSubmitting}
                    onClick={() => handleRecordExecution('BLOCKED')}
                    leftIcon={<AlertOctagon size={16} color="var(--status-blocked)" />}
                  >
                    Block Test
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleRecordExecution('SKIPPED')}
                  >
                    Skip
                  </Button>
                </div>
              </div>
            </Card>

            {/* Evidence & Logs Section */}
            <Card padding="md">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Paperclip size={16} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Execution Evidence & Failure Logs ({activeItem.evidences?.length || 0})
                </h3>
              </div>

              {/* Existing Evidences */}
              {activeItem.evidences && activeItem.evidences.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {activeItem.evidences.map((ev) => (
                    <div
                      key={ev.id}
                      style={{
                        padding: '10px 14px',
                        backgroundColor: 'var(--bg-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {ev.title}
                      </div>
                      {ev.content && (
                        <pre
                          style={{
                            marginTop: '6px',
                            padding: '8px',
                            backgroundColor: 'var(--bg-app)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.75rem',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--status-fail)',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {ev.content}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add Evidence Form */}
              <form onSubmit={handleAddEvidence} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr auto', gap: '10px', alignItems: 'center' }}>
                  <input
                    placeholder="Evidence Title (e.g. Stacktrace / HTTP Error)"
                    value={evidenceTitle}
                    onChange={(e) => setEvidenceTitle(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem',
                      outline: 'none',
                    }}
                  />
                  <input
                    placeholder="Paste error snippet or failure log..."
                    value={evidenceContent}
                    onChange={(e) => setEvidenceContent(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem',
                      outline: 'none',
                    }}
                  />
                  <Button type="submit" variant="secondary" size="sm" isLoading={isAddingEvidence} leftIcon={<Plus size={13} />}>
                    Attach Evidence
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        ) : (
          <Card style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Select a test case to begin execution.
          </Card>
        )}
      </div>
    </div>
  );
};
