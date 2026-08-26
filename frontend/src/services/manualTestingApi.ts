import { ApiClient } from './api';
import type {
  TestModule,
  TestCase,
  TestSuite,
  TestRun,
  TestRunItem,
  TestCaseHistoryEntry,
  ExecutionEvidence,
  TestCasePriority,
  TestCaseStatus,
  ExecutionStatus,
} from '../types';

export const manualTestingApi = {
  // -----------------------------------------------------------
  // 1. Modules
  // -----------------------------------------------------------
  getModules: async (projectId: string): Promise<TestModule[]> => {
    return ApiClient.get<TestModule[]>(`/projects/${projectId}/modules`);
  },

  createModule: async (projectId: string, data: { name: string; description?: string; parent_id?: string }): Promise<TestModule> => {
    return ApiClient.post<TestModule>(`/projects/${projectId}/modules`, data);
  },

  updateModule: async (moduleId: string, data: { name?: string; description?: string; parent_id?: string }): Promise<TestModule> => {
    return ApiClient.put<TestModule>(`/modules/${moduleId}`, data);
  },

  deleteModule: async (moduleId: string): Promise<void> => {
    return ApiClient.delete<void>(`/modules/${moduleId}`);
  },

  // -----------------------------------------------------------
  // 2. Test Cases
  // -----------------------------------------------------------
  getTestCases: async (
    projectId: string,
    params?: {
      module_id?: string;
      priority?: TestCasePriority;
      status?: TestCaseStatus;
      test_type?: string;
      tag?: string;
      search?: string;
    }
  ): Promise<TestCase[]> => {
    const searchParams = new URLSearchParams();
    if (params?.module_id) searchParams.append('module_id', params.module_id);
    if (params?.priority) searchParams.append('priority', params.priority);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.test_type) searchParams.append('test_type', params.test_type);
    if (params?.tag) searchParams.append('tag', params.tag);
    if (params?.search) searchParams.append('search', params.search);

    const query = searchParams.toString();
    const endpoint = query ? `/projects/${projectId}/test-cases?${query}` : `/projects/${projectId}/test-cases`;
    return ApiClient.get<TestCase[]>(endpoint);
  },

  createTestCase: async (projectId: string, data: Partial<TestCase> & { steps?: any[] }): Promise<TestCase> => {
    return ApiClient.post<TestCase>(`/projects/${projectId}/test-cases`, data);
  },

  getTestCaseDetail: async (caseId: string): Promise<TestCase> => {
    return ApiClient.get<TestCase>(`/test-cases/${caseId}`);
  },

  updateTestCase: async (caseId: string, data: Partial<TestCase> & { steps?: any[] }): Promise<TestCase> => {
    return ApiClient.put<TestCase>(`/test-cases/${caseId}`, data);
  },

  archiveTestCase: async (caseId: string): Promise<TestCase> => {
    return ApiClient.patch<TestCase>(`/test-cases/${caseId}/archive`, {});
  },

  deleteTestCase: async (caseId: string): Promise<void> => {
    return ApiClient.delete<void>(`/test-cases/${caseId}`);
  },

  getTestCaseHistory: async (caseId: string): Promise<TestCaseHistoryEntry[]> => {
    return ApiClient.get<TestCaseHistoryEntry[]>(`/test-cases/${caseId}/history`);
  },

  // -----------------------------------------------------------
  // 3. Test Suites
  // -----------------------------------------------------------
  getSuites: async (projectId: string): Promise<TestSuite[]> => {
    return ApiClient.get<TestSuite[]>(`/projects/${projectId}/suites`);
  },

  createSuite: async (projectId: string, data: { name: string; description?: string; test_case_ids?: string[] }): Promise<TestSuite> => {
    return ApiClient.post<TestSuite>(`/projects/${projectId}/suites`, data);
  },

  getSuiteDetail: async (suiteId: string): Promise<TestSuite> => {
    return ApiClient.get<TestSuite>(`/suites/${suiteId}`);
  },

  updateSuite: async (suiteId: string, data: { name?: string; description?: string }): Promise<TestSuite> => {
    return ApiClient.put<TestSuite>(`/suites/${suiteId}`, data);
  },

  setSuiteCases: async (suiteId: string, testCaseIds: string[]): Promise<TestSuite> => {
    return ApiClient.post<TestSuite>(`/suites/${suiteId}/cases`, { test_case_ids: testCaseIds });
  },

  deleteSuite: async (suiteId: string): Promise<void> => {
    return ApiClient.delete<void>(`/suites/${suiteId}`);
  },

  // -----------------------------------------------------------
  // 4. Test Runs & Execution
  // -----------------------------------------------------------
  getRuns: async (projectId: string): Promise<TestRun[]> => {
    return ApiClient.get<TestRun[]>(`/projects/${projectId}/runs`);
  },

  createRun: async (projectId: string, data: { name: string; environment: string; suite_id?: string; test_case_ids?: string[] }): Promise<TestRun> => {
    return ApiClient.post<TestRun>(`/projects/${projectId}/runs`, data);
  },

  getRunDetail: async (runId: string): Promise<TestRun> => {
    return ApiClient.get<TestRun>(`/runs/${runId}`);
  },

  executeTestItem: async (
    runId: string,
    itemId: string,
    data: {
      status: ExecutionStatus;
      actual_result?: string;
      notes?: string;
      duration_seconds?: number;
      step_results?: { step_number: number; status: ExecutionStatus; actual_result?: string }[];
    }
  ): Promise<TestRunItem> => {
    return ApiClient.post<TestRunItem>(`/runs/${runId}/items/${itemId}/execute`, data);
  },

  addEvidence: async (
    runId: string,
    itemId: string,
    data: { evidence_type: string; title: string; content?: string }
  ): Promise<ExecutionEvidence> => {
    return ApiClient.post<ExecutionEvidence>(`/runs/${runId}/items/${itemId}/evidence`, data);
  },
};
