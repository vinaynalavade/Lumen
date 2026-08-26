export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  user?: User;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  owner_id: string;
  current_user_role?: WorkspaceRole;
  project_count?: number;
  member_count?: number;
  created_at: string;
  updated_at: string;
}

export type ProjectStatus = 'ACTIVE' | 'ARCHIVED';

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  key: string;
  description?: string | null;
  status: ProjectStatus;
  created_by_id?: string | null;
  created_at: string;
  updated_at: string;
  creator?: User | null;
}

export interface ProjectSummary {
  total_test_cases: number;
  total_test_runs: number;
  total_bugs: number;
  total_api_endpoints: number;
  total_db_validations: number;
  total_automation_runs: number;
  recent_activity: any[];
}

// -------------------------------------------------------------
// Phase 1: Manual Testing Types
// -------------------------------------------------------------
export type TestCaseTemplate = 'STANDARD' | 'SIMPLE';
export type TestCasePriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type TestCaseStatus = 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';
export type TestRunStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABORTED';
export type ExecutionStatus = 'UNTESTED' | 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED';
export type EvidenceType = 'NOTE' | 'LOG_TEXT' | 'FILE_ATTACHMENT';

export interface TestModule {
  id: string;
  project_id: string;
  name: string;
  description?: string | null;
  parent_id?: string | null;
  test_case_count: number;
  created_at: string;
  updated_at: string;
}

export interface TestCaseStep {
  id?: string;
  test_case_id?: string;
  step_number: number;
  action: string;
  expected_result: string;
  test_data?: string | null;
}

export interface TestCase {
  id: string;
  project_id: string;
  module_id?: string | null;
  case_number: number;
  key: string;
  title: string;
  description?: string | null;
  template_type: TestCaseTemplate;
  priority: TestCasePriority;
  status: TestCaseStatus;
  preconditions?: string | null;
  test_data?: string | null;
  expected_result?: string | null;
  estimated_duration_minutes?: number | null;
  created_by_id?: string | null;
  updated_by_id?: string | null;
  created_at: string;
  updated_at: string;
  creator?: User | null;
  module_name?: string | null;
  step_count: number;
  last_execution_status?: ExecutionStatus | null;
  steps?: TestCaseStep[];
}

export interface TestSuite {
  id: string;
  project_id: string;
  name: string;
  description?: string | null;
  created_by_id?: string | null;
  created_at: string;
  updated_at: string;
  test_case_count: number;
  creator?: User | null;
  test_cases?: TestCase[];
}

export interface ExecutionEvidence {
  id: string;
  test_run_item_id: string;
  evidence_type: EvidenceType;
  title: string;
  content?: string | null;
  file_path?: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  file_size_bytes?: number | null;
  created_at: string;
}

export interface TestRunItemStepResult {
  id: string;
  step_number: number;
  action: string;
  expected_result: string;
  actual_result?: string | null;
  status: ExecutionStatus;
}

export interface TestRunItem {
  id: string;
  test_run_id: string;
  test_case_id?: string | null;
  order_index: number;
  case_key: string;
  title: string;
  description?: string | null;
  preconditions?: string | null;
  test_data?: string | null;
  expected_result?: string | null;
  priority: string;
  status: ExecutionStatus;
  actual_result?: string | null;
  notes?: string | null;
  executed_by_id?: string | null;
  executed_at?: string | null;
  duration_seconds: number;
  executor?: User | null;
  step_results: TestRunItemStepResult[];
  evidences: ExecutionEvidence[];
}

export interface TestRun {
  id: string;
  project_id: string;
  suite_id?: string | null;
  name: string;
  environment: string;
  status: TestRunStatus;
  created_by_id?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  creator?: User | null;
  suite_name?: string | null;
  total_items: number;
  passed_count: number;
  failed_count: number;
  blocked_count: number;
  untested_count: number;
  skipped_count: number;
  completion_percentage: number;
  items?: TestRunItem[];
}

export interface TestCaseHistoryEntry {
  test_run_id: string;
  test_run_name: string;
  environment: string;
  item_id: string;
  status: ExecutionStatus;
  actual_result?: string | null;
  executed_at?: string | null;
  executor_name?: string | null;
  duration_seconds: number;
}
