import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  Tag,
  Clock,
  Send,
  Save,
  FileCode,
  UserCheck,
  Maximize2,
  Minimize2,
  FolderDot,
  Flame,
  AlertTriangle,
  ListOrdered,
} from 'lucide-react';
import type {
  TestCase,
  TestModule,
  TestCaseTemplate,
  TestCaseType,
  TestCasePriority,
  TestCaseSeverity,
  TestCaseStatus,
  TestCaseReviewStatus,
  TestCaseStep,
  User,
} from '../../types';
import { manualTestingApi } from '../../services/manualTestingApi';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { Input } from '../common/Input';

interface TestCaseEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (caseData: Partial<TestCase> & { steps?: TestCaseStep[] }, submitForReview?: boolean, reviewerId?: string | null) => Promise<void>;
  initialData?: TestCase | null;
  modules: TestModule[];
  defaultModuleId?: string | null;
  projectId?: string;
}

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

const PRIORITIES: TestCasePriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const SEVERITIES: TestCaseSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export const TestCaseEditorModal: React.FC<TestCaseEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  modules,
  defaultModuleId,
  projectId,
}) => {
  const { user } = useAuth();
  const [reviewerCandidates, setReviewerCandidates] = useState<User[]>([]);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [templateType, setTemplateType] = useState<TestCaseTemplate>('STANDARD');
  const [testType, setTestType] = useState<TestCaseType>('FUNCTIONAL');
  const [priority, setPriority] = useState<TestCasePriority>('MEDIUM');
  const [severity, setSeverity] = useState<TestCaseSeverity>('MEDIUM');
  const [status, setStatus] = useState<TestCaseStatus>('ACTIVE');
  const [reviewStatus, setReviewStatus] = useState<TestCaseReviewStatus>('DRAFT');
  const [reviewerId, setReviewerId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [preconditions, setPreconditions] = useState('');
  const [testData, setTestData] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState<number | ''>(10);

  // Steps
  const [steps, setSteps] = useState<TestCaseStep[]>([
    { step_number: 1, action: '', expected_result: '', test_data: '' },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Load eligible reviewer candidates from backend
  useEffect(() => {
    if (isOpen && projectId) {
      manualTestingApi.getReviewerCandidates(projectId).then(setReviewerCandidates).catch(console.error);
    }
  }, [isOpen, projectId]);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || '');
      setModuleId(initialData.module_id || null);
      setTemplateType(initialData.template_type);
      setTestType(initialData.test_type || 'FUNCTIONAL');
      setPriority(initialData.priority);
      setSeverity(initialData.severity || 'MEDIUM');
      setStatus(initialData.status);
      setReviewStatus(initialData.review_status || 'DRAFT');
      setReviewerId(initialData.reviewer_id || null);
      setTags(initialData.tags || []);
      setPreconditions(initialData.preconditions || '');
      setTestData(initialData.test_data || '');
      setExpectedResult(initialData.expected_result || '');
      setEstimatedDurationMinutes(initialData.estimated_duration_minutes || '');
      if (initialData.steps && initialData.steps.length > 0) {
        setSteps(initialData.steps.map((s) => ({ ...s })));
      } else {
        setSteps([{ step_number: 1, action: '', expected_result: '', test_data: '' }]);
      }
    } else {
      setTitle('');
      setDescription('');
      setModuleId(defaultModuleId || null);
      setTemplateType('STANDARD');
      setTestType('FUNCTIONAL');
      setPriority('MEDIUM');
      setSeverity('MEDIUM');
      setStatus('ACTIVE');
      setReviewStatus('DRAFT');
      setReviewerId(null);
      setTags([]);
      setPreconditions('');
      setTestData('');
      setExpectedResult('');
      setEstimatedDurationMinutes(10);
      setSteps([{ step_number: 1, action: '', expected_result: '', test_data: '' }]);
    }
  }, [initialData, defaultModuleId, isOpen]);

  if (!isOpen) return null;

  // Tag management
  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Step management
  const handleAddStep = () => {
    const nextNum = steps.length + 1;
    setSteps([...steps, { step_number: nextNum, action: '', expected_result: '', test_data: '' }]);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length === 1) return;
    const newSteps = steps.filter((_, idx) => idx !== index).map((s, idx) => ({ ...s, step_number: idx + 1 }));
    setSteps(newSteps);
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= steps.length) return;
    const newSteps = [...steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIdx];
    newSteps[targetIdx] = temp;
    setSteps(newSteps.map((s, idx) => ({ ...s, step_number: idx + 1 })));
  };

  const handleStepChange = (index: number, field: keyof TestCaseStep, value: any) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const handleSubmit = async (submitForReview = false) => {
    if (!title.trim()) {
      alert('Please enter a Test Case title.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<TestCase> & { steps?: TestCaseStep[] } = {
        title: title.trim(),
        description: description.trim() || undefined,
        module_id: moduleId,
        template_type: templateType,
        test_type: testType,
        priority,
        severity,
        status,
        tags,
        preconditions: preconditions.trim() || undefined,
        test_data: testData.trim() || undefined,
        expected_result: expectedResult.trim() || undefined,
        estimated_duration_minutes: estimatedDurationMinutes ? Number(estimatedDurationMinutes) : undefined,
        steps: templateType === 'STANDARD' ? steps.filter((s) => s.action.trim()) : [],
      };

      await onSave(payload, submitForReview, reviewerId);
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to save test case.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
    fontSize: '0.8125rem',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '6px',
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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 7, 12, 0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: isMaximized ? '0' : '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: isMaximized ? '100vw' : '1080px',
          height: isMaximized ? '100vh' : 'auto',
          maxHeight: isMaximized ? '100vh' : '92vh',
          backgroundColor: 'var(--bg-card)',
          border: isMaximized ? 'none' : '1px solid var(--border-strong)',
          borderRadius: isMaximized ? '0' : 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all var(--transition-fast)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(79, 70, 229, 0.15)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileCode size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {initialData ? `Edit Test Case: ${initialData.key}` : 'Create New Test Case'}
                </h2>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor:
                      reviewStatus === 'APPROVED'
                        ? 'var(--status-pass-bg)'
                        : reviewStatus === 'IN_REVIEW'
                        ? 'var(--status-blocked-bg)'
                        : reviewStatus === 'CHANGES_REQUESTED' || reviewStatus === 'REJECTED'
                        ? 'var(--status-fail-bg)'
                        : 'var(--bg-subtle)',
                    color:
                      reviewStatus === 'APPROVED'
                        ? 'var(--status-pass)'
                        : reviewStatus === 'IN_REVIEW'
                        ? 'var(--status-blocked)'
                        : reviewStatus === 'CHANGES_REQUESTED' || reviewStatus === 'REJECTED'
                        ? 'var(--status-fail)'
                        : 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {reviewStatus}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Structured Quality Validation & Execution Specification
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? 'Restore normal window' : 'Maximize window'}
              style={{
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section 1: Title & Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Input
              label="Test Case Title"
              placeholder="e.g. Verify user authentication with valid OAuth credentials"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Description (Optional)</label>
              <textarea
                rows={2}
                placeholder="High-level test objective, coverage scope, or context..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={textareaStyle}
              />
            </div>
          </div>

          {/* Section 2: Metadata Grid */}
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '14px',
            }}
          >
            <div>
              <label style={labelStyle}>
                <FolderDot size={13} color="var(--primary)" />
                Folder / Module
              </label>
              <select
                value={moduleId || ''}
                onChange={(e) => setModuleId(e.target.value || null)}
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

            <div>
              <label style={labelStyle}>
                <Layers size={13} color="var(--primary)" />
                Template Type
              </label>
              <select
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value as TestCaseTemplate)}
                style={selectStyle}
              >
                <option value="STANDARD">Step-by-Step (Standard)</option>
                <option value="SIMPLE">Free-form Text (Simple)</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Test Type</label>
              <select
                value={testType}
                onChange={(e) => setTestType(e.target.value as TestCaseType)}
                style={selectStyle}
              >
                {TEST_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                <Flame size={13} color="var(--status-fail)" />
                Severity (Impact)
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as TestCaseSeverity)}
                style={selectStyle}
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                <AlertTriangle size={13} color="var(--status-blocked)" />
                Priority (Urgency)
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TestCasePriority)}
                style={selectStyle}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                <Clock size={13} color="var(--text-muted)" />
                Est. Minutes
              </label>
              <input
                type="number"
                min={1}
                max={480}
                value={estimatedDurationMinutes}
                onChange={(e) => setEstimatedDurationMinutes(e.target.value ? Number(e.target.value) : '')}
                style={selectStyle}
              />
            </div>
          </div>

          {/* Section 3: Preconditions & Global Test Data */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Preconditions</label>
              <textarea
                rows={2}
                placeholder="e.g. User is logged in, feature flag 'v2_checkout' is enabled..."
                value={preconditions}
                onChange={(e) => setPreconditions(e.target.value)}
                style={textareaStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Global Test Data</label>
              <textarea
                rows={2}
                placeholder="e.g. Email: qa-test@lumen.qa | Card: 4111-2222-3333-4444"
                value={testData}
                onChange={(e) => setTestData(e.target.value)}
                style={{ ...textareaStyle, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}
              />
            </div>
          </div>

          {/* Section 4: Tags */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>
              <Tag size={13} color="var(--text-muted)" />
              Tags & Labels
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Type tag name and press Enter..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                style={{ ...selectStyle, maxWidth: '280px' }}
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleAddTag}>
                Add Tag
              </Button>
            </div>

            {tags.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                {tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      style={{ color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Section 5: Step Editor (Standard) vs Free-form Expected Result (Simple) */}
          {templateType === 'STANDARD' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ListOrdered size={16} color="var(--primary)" />
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Test Steps & Data ({steps.length})
                  </h3>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={handleAddStep} leftIcon={<Plus size={13} />}>
                  Add Step
                </Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {steps.map((step, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px 14px',
                      backgroundColor: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      display: 'grid',
                      gridTemplateColumns: '40px 1.4fr 1fr 1.4fr 70px',
                      gap: '10px',
                      alignItems: 'start',
                    }}
                  >
                    {/* Step Number & Reordering */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', paddingTop: '4px' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                        #{step.step_number}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveStep(idx, 'up')}
                          style={{ color: idx === 0 ? 'var(--border-strong)' : 'var(--text-muted)', cursor: idx === 0 ? 'default' : 'pointer' }}
                          title="Move step up"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === steps.length - 1}
                          onClick={() => handleMoveStep(idx, 'down')}
                          style={{ color: idx === steps.length - 1 ? 'var(--border-strong)' : 'var(--text-muted)', cursor: idx === steps.length - 1 ? 'default' : 'pointer' }}
                          title="Move step down"
                        >
                          <ArrowDown size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Action */}
                    <div>
                      <label style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px', display: 'block' }}>
                        Step Action
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Action to perform..."
                        value={step.action}
                        onChange={(e) => handleStepChange(idx, 'action', e.target.value)}
                        style={{ ...textareaStyle, fontSize: '0.8125rem', padding: '6px 8px' }}
                        required
                      />
                    </div>

                    {/* Step Test Data */}
                    <div>
                      <label style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px', display: 'block' }}>
                        Step Test Data
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. payload: {id: 123}"
                        value={step.test_data || ''}
                        onChange={(e) => handleStepChange(idx, 'test_data', e.target.value)}
                        style={{ ...textareaStyle, fontSize: '0.75rem', padding: '6px 8px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}
                      />
                    </div>

                    {/* Expected Result */}
                    <div>
                      <label style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px', display: 'block' }}>
                        Expected Result
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Expected behavior / UI state..."
                        value={step.expected_result}
                        onChange={(e) => handleStepChange(idx, 'expected_result', e.target.value)}
                        style={{ ...textareaStyle, fontSize: '0.8125rem', padding: '6px 8px' }}
                        required
                      />
                    </div>

                    {/* Delete button */}
                    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '18px' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(idx)}
                        disabled={steps.length === 1}
                        style={{
                          padding: '6px',
                          color: steps.length === 1 ? 'var(--border-strong)' : 'var(--status-fail)',
                          cursor: steps.length === 1 ? 'not-allowed' : 'pointer',
                        }}
                        title="Delete step"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Expected Outcome / Acceptance Criteria</label>
              <textarea
                rows={4}
                placeholder="Describe the overall expected outcome..."
                value={expectedResult}
                onChange={(e) => setExpectedResult(e.target.value)}
                style={textareaStyle}
                required
              />
            </div>
          )}

          {/* Section 6: Governance Review Assignment */}
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(79, 70, 229, 0.15)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UserCheck size={16} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Assigned Reviewer
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Designate a teammate or QA Lead to review and approve this specification.
                </p>
              </div>
            </div>

            <select
              value={reviewerId || ''}
              onChange={(e) => setReviewerId(e.target.value || null)}
              style={{ ...selectStyle, maxWidth: '280px' }}
            >
              <option value="">-- No Reviewer Assigned --</option>
              {reviewerCandidates.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || 'Team Member'} {u.professional_title ? `— ${u.professional_title}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sticky Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Button
              type="button"
              variant="secondary"
              isLoading={isSubmitting}
              onClick={() => handleSubmit(false)}
              leftIcon={<Save size={14} />}
            >
              Save as Draft
            </Button>

            <Button
              type="button"
              variant="primary"
              isLoading={isSubmitting}
              onClick={() => handleSubmit(true)}
              leftIcon={<Send size={14} />}
            >
              {initialData ? 'Save & Submit Review' : 'Create & Submit Review'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
