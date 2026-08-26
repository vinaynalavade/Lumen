from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.manual_testing import (
    TestCaseTemplate,
    TestCasePriority,
    TestCaseStatus,
    TestRunStatus,
    ExecutionStatus,
    EvidenceType,
)
from app.schemas.user import UserResponse


# 1. Test Module Schemas
class TestModuleBase(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[str] = None


class TestModuleCreate(TestModuleBase):
    pass


class TestModuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[str] = None


class TestModuleResponse(TestModuleBase):
    id: str
    project_id: str
    test_case_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# 2. Test Step Schemas
class TestCaseStepBase(BaseModel):
    step_number: int
    action: str
    expected_result: str
    test_data: Optional[str] = None


class TestCaseStepCreate(TestCaseStepBase):
    pass


class TestCaseStepResponse(TestCaseStepBase):
    id: str
    test_case_id: str

    model_config = ConfigDict(from_attributes=True)


# 3. Test Case Schemas
class TestCaseBase(BaseModel):
    title: str
    description: Optional[str] = None
    module_id: Optional[str] = None
    template_type: TestCaseTemplate = TestCaseTemplate.STANDARD
    priority: TestCasePriority = TestCasePriority.MEDIUM
    status: TestCaseStatus = TestCaseStatus.ACTIVE
    preconditions: Optional[str] = None
    test_data: Optional[str] = None
    expected_result: Optional[str] = None
    estimated_duration_minutes: Optional[int] = None


class TestCaseCreate(TestCaseBase):
    steps: List[TestCaseStepCreate] = []


class TestCaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    module_id: Optional[str] = None
    template_type: Optional[TestCaseTemplate] = None
    priority: Optional[TestCasePriority] = None
    status: Optional[TestCaseStatus] = None
    preconditions: Optional[str] = None
    test_data: Optional[str] = None
    expected_result: Optional[str] = None
    estimated_duration_minutes: Optional[int] = None
    steps: Optional[List[TestCaseStepCreate]] = None


class TestCaseResponse(TestCaseBase):
    id: str
    project_id: str
    case_number: int
    key: str
    created_by_id: Optional[str] = None
    updated_by_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    creator: Optional[UserResponse] = None
    module_name: Optional[str] = None
    step_count: int = 0
    last_execution_status: Optional[ExecutionStatus] = None

    model_config = ConfigDict(from_attributes=True)


class TestCaseDetailResponse(TestCaseResponse):
    steps: List[TestCaseStepResponse] = []


# 4. Test Suite Schemas
class TestSuiteBase(BaseModel):
    name: str
    description: Optional[str] = None


class TestSuiteCreate(TestSuiteBase):
    test_case_ids: List[str] = []


class TestSuiteUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class TestSuiteResponse(TestSuiteBase):
    id: str
    project_id: str
    created_by_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    test_case_count: int = 0
    creator: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)


class TestSuiteDetailResponse(TestSuiteResponse):
    test_cases: List[TestCaseResponse] = []


class TestSuiteAddCasesRequest(BaseModel):
    test_case_ids: List[str]


# 5. Execution Evidence Schemas
class ExecutionEvidenceBase(BaseModel):
    evidence_type: EvidenceType = EvidenceType.NOTE
    title: str
    content: Optional[str] = None


class ExecutionEvidenceCreate(ExecutionEvidenceBase):
    pass


class ExecutionEvidenceResponse(ExecutionEvidenceBase):
    id: str
    test_run_item_id: str
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    mime_type: Optional[str] = None
    file_size_bytes: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# 6. Test Run Step Result Schemas
class TestRunItemStepResultResponse(BaseModel):
    id: str
    step_number: int
    action: str
    expected_result: str
    actual_result: Optional[str] = None
    status: ExecutionStatus

    model_config = ConfigDict(from_attributes=True)


class StepExecutionInput(BaseModel):
    step_number: int
    status: ExecutionStatus
    actual_result: Optional[str] = None


# 7. Test Run Item Schemas (Execution record per case)
class TestRunItemResponse(BaseModel):
    id: str
    test_run_id: str
    test_case_id: Optional[str] = None
    order_index: int
    case_key: str
    title: str
    description: Optional[str] = None
    preconditions: Optional[str] = None
    test_data: Optional[str] = None
    expected_result: Optional[str] = None
    priority: str
    status: ExecutionStatus
    actual_result: Optional[str] = None
    notes: Optional[str] = None
    executed_by_id: Optional[str] = None
    executed_at: Optional[datetime] = None
    duration_seconds: int = 0
    executor: Optional[UserResponse] = None
    step_results: List[TestRunItemStepResultResponse] = []
    evidences: List[ExecutionEvidenceResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ExecuteTestItemRequest(BaseModel):
    status: ExecutionStatus
    actual_result: Optional[str] = None
    notes: Optional[str] = None
    duration_seconds: Optional[int] = 0
    step_results: Optional[List[StepExecutionInput]] = None


# 8. Test Run Schemas
class TestRunCreate(BaseModel):
    name: str
    environment: str = "Staging"
    suite_id: Optional[str] = None
    test_case_ids: Optional[List[str]] = None  # If not using suite


class TestRunResponse(BaseModel):
    id: str
    project_id: str
    suite_id: Optional[str] = None
    name: str
    environment: str
    status: TestRunStatus
    created_by_id: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    creator: Optional[UserResponse] = None
    suite_name: Optional[str] = None
    
    # Progress Counts
    total_items: int = 0
    passed_count: int = 0
    failed_count: int = 0
    blocked_count: int = 0
    untested_count: int = 0
    skipped_count: int = 0
    completion_percentage: float = 0.0

    model_config = ConfigDict(from_attributes=True)


class TestRunDetailResponse(TestRunResponse):
    items: List[TestRunItemResponse] = []


# 9. Test Case Execution History Entry
class TestCaseHistoryEntry(BaseModel):
    test_run_id: str
    test_run_name: str
    environment: str
    item_id: str
    status: ExecutionStatus
    actual_result: Optional[str] = None
    executed_at: Optional[datetime] = None
    executor_name: Optional[str] = None
    duration_seconds: int = 0
