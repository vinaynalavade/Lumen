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
  WorkspaceMember,
} from '../../types';
import { workspaceApi } from '../../services/workspaceApi';
import { useWorkspace } from '../../context/WorkspaceContext';

interface TestCaseEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (caseData: Partial<TestCase> & { steps?: TestCaseStep[] }, submitForReview?: boolean, reviewerId?: string | null) => Promise<void>;
  initialData?: TestCase | null;
  modules: TestModule[];
  defaultModuleId?: string | null;
}

export const TestCaseEditorModal: React.FC<TestCaseEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  modules,
  defaultModuleId,
}) => {
  const { activeWorkspace } = useWorkspace();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);

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

  // Load workspace members for reviewer assignment
  useEffect(() => {
    if (isOpen && activeWorkspace) {
      workspaceApi.getWorkspaceMembers(activeWorkspace.id).then(setMembers).catch(console.error);
    }
  }, [isOpen, activeWorkspace?.id]);

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
        setSteps(initialData.steps.map(s => ({ ...s })));
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
    setTags(tags.filter(t => t !== tagToRemove));
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
        steps: templateType === 'STANDARD' ? steps.filter(s => s.action.trim()) : [],
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

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isMaximized ? 'p-0' : 'p-2 sm:p-4 md:p-6'} bg-slate-950/85 backdrop-blur-md animate-in fade-in overflow-y-auto`}>
      <div className={`relative w-full ${isMaximized ? 'h-full max-w-none max-h-none rounded-none' : 'max-w-5xl rounded-2xl max-h-[94vh]'} border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col transition-all duration-200`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-4 sm:py-5 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <FileCode className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2.5 flex-wrap">
                {initialData ? `Edit Test Case: ${initialData.key}` : 'Create New Test Case'}
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                    reviewStatus === 'APPROVED'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : reviewStatus === 'IN_REVIEW'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : reviewStatus === 'CHANGES_REQUESTED' || reviewStatus === 'REJECTED'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}>
                    {reviewStatus}
                  </span>
              </h2>
              <p className="text-xs text-slate-400">Structured Quality Validation & Execution Specification</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? 'Restore window' : 'Maximize window'}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              {isMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-8 overflow-y-auto flex-1 space-y-8">
          {/* Section 1: Title & Template */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Test Case Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Verify user login with valid email & password"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-base font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                required
              />
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-slate-400">Template Style:</span>
              <button
                type="button"
                onClick={() => setTemplateType('STANDARD')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  templateType === 'STANDARD'
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Standard (Step-by-Step)
              </button>
              <button
                type="button"
                onClick={() => setTemplateType('SIMPLE')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  templateType === 'SIMPLE'
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Simple / Exploratory
              </button>
            </div>
          </div>

          {/* Section 2: Metadata Grid */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {/* Module / Folder */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Module / Folder
              </label>
              <select
                value={moduleId || ''}
                onChange={(e) => setModuleId(e.target.value ? e.target.value : null)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">[ Unassigned Cases ]</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    📁 {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Test Type */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Test Type
              </label>
              <select
                value={testType}
                onChange={(e) => setTestType(e.target.value as TestCaseType)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="FUNCTIONAL">Functional</option>
                <option value="SMOKE">Smoke</option>
                <option value="SANITY">Sanity</option>
                <option value="REGRESSION">Regression</option>
                <option value="INTEGRATION">Integration</option>
                <option value="UI">UI / Visual</option>
                <option value="API">API / Backend</option>
                <option value="NEGATIVE">Negative Test</option>
                <option value="EDGE_CASE">Edge Case</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Execution Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TestCasePriority)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="CRITICAL">🔴 Critical</option>
                <option value="HIGH">🟠 High</option>
                <option value="MEDIUM">🟡 Medium</option>
                <option value="LOW">⚪ Low</option>
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Impact Severity
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as TestCaseSeverity)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="CRITICAL">💥 Critical Impact</option>
                <option value="HIGH">🔥 High Impact</option>
                <option value="MEDIUM">⚡ Medium Impact</option>
                <option value="LOW">🌱 Low Impact</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Lifecycle Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TestCaseStatus)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="DEPRECATED">Deprecated</option>
              </select>
            </div>
          </div>

          {/* Section 3: Tags & Duration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-400" />
                Tags / Labels
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Auth, Checkout, v1.2"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  className="flex-1 px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                >
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="text-indigo-400 hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Est. Duration (mins)
              </label>
              <input
                type="number"
                min={1}
                placeholder="10"
                value={estimatedDurationMinutes}
                onChange={(e) => setEstimatedDurationMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Section 4: Preconditions, Description, Global Test Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Preconditions
              </label>
              <textarea
                rows={2}
                placeholder="Prerequisites needed before test execution starts..."
                value={preconditions}
                onChange={(e) => setPreconditions(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Global Test Data / Credentials
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Test user credentials, mock payment tokens..."
                value={testData}
                onChange={(e) => setTestData(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Section 5: Step Builder (Standard Template) */}
          {templateType === 'STANDARD' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Test Execution Steps ({steps.length})
                </h3>
                <button
                  type="button"
                  onClick={handleAddStep}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Step
                </button>
              </div>

              <div className="space-y-3">
                {steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                        Step {idx + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveStep(idx, 'up')}
                          className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                          title="Move Step Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === steps.length - 1}
                          onClick={() => handleMoveStep(idx, 'down')}
                          className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                          title="Move Step Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={steps.length === 1}
                          onClick={() => handleRemoveStep(idx)}
                          className="p-1 text-slate-400 hover:text-rose-400 disabled:opacity-30 ml-2"
                          title="Delete Step"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Step Action <span className="text-rose-400">*</span>
                        </label>
                        <textarea
                          rows={2}
                          placeholder="e.g. Enter valid password and click 'Sign In'..."
                          value={step.action}
                          onChange={(e) => handleStepChange(idx, 'action', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none resize-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Step Test Data (Optional)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Specific input value for this step..."
                          value={step.test_data || ''}
                          onChange={(e) => handleStepChange(idx, 'test_data', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Expected Result <span className="text-rose-400">*</span>
                        </label>
                        <textarea
                          rows={2}
                          placeholder="e.g. Dashboard loads with session active..."
                          value={step.expected_result}
                          onChange={(e) => handleStepChange(idx, 'expected_result', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none resize-none"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Expected Overall Outcome <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={4}
                placeholder="Describe the expected overall behaviour or verification condition..."
                value={expectedResult}
                onChange={(e) => setExpectedResult(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none resize-none"
                required
              />
            </div>
          )}

          {/* Section 6: Governance Review Assignment */}
          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Assigned Reviewer</h4>
                <p className="text-[11px] text-slate-400">Designate a peer or QA Lead to review and approve this test case.</p>
              </div>
            </div>

            <select
              value={reviewerId || ''}
              onChange={(e) => setReviewerId(e.target.value || null)}
              className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none min-w-[200px]"
            >
              <option value="">-- No Reviewer Assigned --</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user?.full_name} ({m.user?.professional_title || m.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-4 border-t border-slate-800 bg-slate-900/90 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-sm font-medium transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Save as Draft
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {initialData ? 'Save & Submit Review' : 'Create & Submit Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
