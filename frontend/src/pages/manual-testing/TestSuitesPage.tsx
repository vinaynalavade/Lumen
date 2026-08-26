import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layers,
  Plus,
  Play,
  Trash2,
  CheckSquare,
  Square,
  Search,
  ChevronRight,
} from 'lucide-react';
import { manualTestingApi } from '../../services/manualTestingApi';
import type { TestSuite, TestCase } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const TestSuitesPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [availableCases, setAvailableCases] = useState<TestCase[]>([]);
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Create Suite Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [suiteName, setSuiteName] = useState('');
  const [suiteDesc, setSuiteDesc] = useState('');
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [caseSearch, setCaseSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Launch Run Modal from Suite
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [runName, setRunName] = useState('');
  const [runEnv, setRunEnv] = useState('Staging');
  const [launchSuiteId, setLaunchSuiteId] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);

  const loadData = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const [suitesList, casesList] = await Promise.all([
        manualTestingApi.getSuites(projectId),
        manualTestingApi.getTestCases(projectId),
      ]);
      setSuites(suitesList);
      setAvailableCases(casesList);

      if (selectedSuite) {
        const detail = await manualTestingApi.getSuiteDetail(selectedSuite.id);
        setSelectedSuite(detail);
      }
    } catch (err) {
      console.error('Failed to load test suites:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleSelectSuite = async (suite: TestSuite) => {
    try {
      const detail = await manualTestingApi.getSuiteDetail(suite.id);
      setSelectedSuite(detail);
    } catch (err) {
      console.error('Failed to load suite details:', err);
    }
  };

  const handleToggleCaseSelection = (caseId: string) => {
    if (selectedCaseIds.includes(caseId)) {
      setSelectedCaseIds(selectedCaseIds.filter((id) => id !== caseId));
    } else {
      setSelectedCaseIds([...selectedCaseIds, caseId]);
    }
  };

  const handleSelectAllCases = () => {
    if (selectedCaseIds.length === availableCases.length) {
      setSelectedCaseIds([]);
    } else {
      setSelectedCaseIds(availableCases.map((c) => c.id));
    }
  };

  const handleCreateSuite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !suiteName.trim()) return;
    setIsSubmitting(true);
    try {
      await manualTestingApi.createSuite(projectId, {
        name: suiteName.trim(),
        description: suiteDesc.trim() || undefined,
        test_case_ids: selectedCaseIds,
      });
      setIsCreateModalOpen(false);
      setSuiteName('');
      setSuiteDesc('');
      setSelectedCaseIds([]);
      loadData();
    } catch (err) {
      console.error('Failed to create suite:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSuite = async (e: React.MouseEvent, suiteId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this test suite?')) return;
    try {
      await manualTestingApi.deleteSuite(suiteId);
      if (selectedSuite?.id === suiteId) {
        setSelectedSuite(null);
      }
      loadData();
    } catch (err) {
      console.error('Failed to delete suite:', err);
    }
  };

  const openLaunchModal = (e: React.MouseEvent, suite: TestSuite) => {
    e.stopPropagation();
    setLaunchSuiteId(suite.id);
    setRunName(`${suite.name} - ${new Date().toLocaleDateString()}`);
    setRunEnv('Staging');
    setIsLaunchModalOpen(true);
  };

  const handleLaunchRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !launchSuiteId) return;
    setIsLaunching(true);
    try {
      const run = await manualTestingApi.createRun(projectId, {
        name: runName.trim(),
        environment: runEnv.trim(),
        suite_id: launchSuiteId,
      });
      setIsLaunchModalOpen(false);
      navigate(`/projects/${projectId}/manual/runs/${run.id}/execute`);
    } catch (err) {
      console.error('Failed to launch run:', err);
    } finally {
      setIsLaunching(false);
    }
  };

  const filteredCasesForModal = availableCases.filter(
    (c) =>
      c.title.toLowerCase().includes(caseSearch.toLowerCase()) ||
      c.key.toLowerCase().includes(caseSearch.toLowerCase())
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selectedSuite ? '1fr 1fr' : '1fr', gap: '20px' }}>
      {/* 1. Suites List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Test Suites ({suites.length})
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Group test cases for smoke, sanity, regression, or release milestones.
            </p>
          </div>
          <Button variant="primary" onClick={() => setIsCreateModalOpen(true)} leftIcon={<Plus size={16} />}>
            New Suite
          </Button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {suites.map((suite) => {
            const isSelected = selectedSuite?.id === suite.id;
            return (
              <Card
                key={suite.id}
                padding="md"
                onClick={() => handleSelectSuite(suite)}
                style={{
                  cursor: 'pointer',
                  border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-subtle)',
                  backgroundColor: isSelected ? 'rgba(79, 70, 229, 0.04)' : 'var(--bg-card)',
                  transition: 'var(--transition-fast)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary)',
                      }}
                    >
                      <Layers size={18} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {suite.name}
                      </h3>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {suite.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={(e) => openLaunchModal(e, suite)}
                      leftIcon={<Play size={13} />}
                      title="Launch Test Run"
                    >
                      Run Suite
                    </Button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSuite(e, suite.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '12px',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                    {suite.test_case_count} Test Cases Included
                  </span>
                  <span>Created {new Date(suite.created_at).toLocaleDateString()}</span>
                </div>
              </Card>
            );
          })}

          {suites.length === 0 && !isLoading && (
            <Card padding="lg" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <Layers size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                No Test Suites Defined
              </div>
              <p style={{ fontSize: '0.8125rem', marginTop: '4px' }}>
                Create a test suite to group your test cases into reusable regression sets.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* 2. Suite Detail / Test Cases Membership Drawer */}
      {selectedSuite && (
        <Card padding="md" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase' }}>
                Selected Suite
              </span>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {selectedSuite.name}
              </h3>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={(e) => openLaunchModal(e, selectedSuite)}
              leftIcon={<Play size={14} />}
            >
              Launch Run
            </Button>
          </div>

          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            {selectedSuite.description || 'No description.'}
          </div>

          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
            Included Test Cases ({selectedSuite.test_cases?.length || 0})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
            {selectedSuite.test_cases?.map((tc) => (
              <div
                key={tc.id}
                onClick={() => navigate(`/projects/${projectId}/manual/cases/${tc.id}`)}
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                      {tc.key}
                    </span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {tc.title}
                    </span>
                  </div>
                  {tc.module_name && (
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                      Folder: {tc.module_name}
                    </span>
                  )}
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </div>
            ))}

            {(!selectedSuite.test_cases || selectedSuite.test_cases.length === 0) && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                No test cases added to this suite yet.
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 3. Modal: Create Test Suite */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Test Suite" size="lg">
        <form onSubmit={handleCreateSuite} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Suite Name"
            placeholder="e.g. Smoke & Critical Sanity, Regression v1.0"
            value={suiteName}
            onChange={(e) => setSuiteName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Description (Optional)"
            placeholder="Purpose and testing scope for this suite"
            value={suiteDesc}
            onChange={(e) => setSuiteDesc(e.target.value)}
          />

          {/* Test Case Picker */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Select Test Cases ({selectedCaseIds.length} of {availableCases.length} selected)
              </label>
              <button
                type="button"
                onClick={handleSelectAllCases}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
              >
                {selectedCaseIds.length === availableCases.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <Input
              placeholder="Filter test cases..."
              value={caseSearch}
              onChange={(e) => setCaseSearch(e.target.value)}
              leftIcon={<Search size={14} />}
            />

            <div
              style={{
                marginTop: '10px',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                maxHeight: '220px',
                overflowY: 'auto',
                backgroundColor: 'var(--bg-subtle)',
              }}
            >
              {filteredCasesForModal.map((tc) => {
                const isChecked = selectedCaseIds.includes(tc.id);
                return (
                  <div
                    key={tc.id}
                    onClick={() => handleToggleCaseSelection(tc.id)}
                    style={{
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      backgroundColor: isChecked ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                    }}
                  >
                    {isChecked ? <CheckSquare size={16} color="var(--primary)" /> : <Square size={16} color="var(--text-muted)" />}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                      {tc.key}
                    </span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', flex: 1 }}>{tc.title}</span>
                    <Badge variant="neutral">{tc.priority}</Badge>
                  </div>
                );
              })}

              {filteredCasesForModal.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  No matching test cases found.
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Create Suite
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Modal: Launch Test Run */}
      <Modal isOpen={isLaunchModalOpen} onClose={() => setIsLaunchModalOpen(false)} title="Launch New Test Run" size="sm">
        <form onSubmit={handleLaunchRun} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input label="Run Name" value={runName} onChange={(e) => setRunName(e.target.value)} required />

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
            <Button type="button" variant="secondary" onClick={() => setIsLaunchModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLaunching} leftIcon={<Play size={14} />}>
              Start Execution
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
