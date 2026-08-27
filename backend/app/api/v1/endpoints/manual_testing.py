from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.manual_testing import (
    TestCasePriority,
    TestCaseSeverity,
    TestCaseStatus,
    TestCaseReviewStatus,
    TestCaseType,
)
from app.services.manual_testing_service import manual_testing_service
from app.schemas.user import UserResponse
from app.schemas.manual_testing import (
    TestModuleCreate,
    TestModuleUpdate,
    TestModuleResponse,
    TestCaseCreate,
    TestCaseUpdate,
    TestCaseMoveModuleRequest,
    TestCaseBulkMoveRequest,
    TestCaseSubmitReviewRequest,
    TestCaseReviewCreate,
    TestCaseReviewResponse,
    TestCaseResponse,
    TestCaseDetailResponse,
    TestSuiteCreate,
    TestSuiteUpdate,
    TestSuiteResponse,
    TestSuiteDetailResponse,
    TestSuiteAddCasesRequest,
    TestRunCreate,
    TestRunResponse,
    TestRunDetailResponse,
    TestRunItemResponse,
    TestRunItemAssignRequest,
    ExecuteTestItemRequest,
    ExecutionEvidenceCreate,
    ExecutionEvidenceResponse,
    TestCaseHistoryEntry,
)

router = APIRouter()


# -------------------------------------------------------------
# 1. Test Modules / Folders
# -------------------------------------------------------------
@router.get("/projects/{project_id}/modules", response_model=List[TestModuleResponse])
def get_project_modules(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all modules/folders for a project."""
    return manual_testing_service.get_modules(db, project_id, current_user)


@router.post("/projects/{project_id}/modules", response_model=TestModuleResponse, status_code=status.HTTP_201_CREATED)
def create_module(
    project_id: str,
    module_in: TestModuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new module/folder within a project."""
    return manual_testing_service.create_module(db, project_id, module_in, current_user)


@router.put("/modules/{module_id}", response_model=TestModuleResponse)
def update_module(
    module_id: str,
    module_in: TestModuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update module name or parent."""
    return manual_testing_service.update_module(db, module_id, module_in, current_user)


@router.delete("/modules/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_module(
    module_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a module and unassign child test cases."""
    manual_testing_service.delete_module(db, module_id, current_user)


# -------------------------------------------------------------
# 2. Test Cases & Steps
# -------------------------------------------------------------
@router.get("/projects/{project_id}/test-cases", response_model=List[TestCaseResponse])
def get_project_test_cases(
    project_id: str,
    module_id: Optional[str] = Query(None, description="Filter by module"),
    unassigned_only: bool = Query(False, description="Filter for unassigned test cases"),
    priority: Optional[TestCasePriority] = Query(None, description="Filter by priority"),
    severity: Optional[TestCaseSeverity] = Query(None, description="Filter by severity"),
    status: Optional[TestCaseStatus] = Query(None, description="Filter by status"),
    review_status: Optional[TestCaseReviewStatus] = Query(None, description="Filter by review status"),
    reviewer_id: Optional[str] = Query(None, description="Filter by reviewer"),
    test_type: Optional[TestCaseType] = Query(None, description="Filter by test type"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
    search: Optional[str] = Query(None, description="Search query across title, key, desc, tags"),
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List test cases in a project with comprehensive filtering."""
    return manual_testing_service.get_test_cases(
        db=db,
        project_id=project_id,
        current_user=current_user,
        module_id=module_id,
        unassigned_only=unassigned_only,
        priority=priority,
        severity=severity,
        status=status,
        review_status=review_status,
        reviewer_id=reviewer_id,
        test_type=test_type,
        tag=tag,
        search=search,
        skip=skip,
        limit=limit,
    )


@router.post("/projects/{project_id}/test-cases", response_model=TestCaseDetailResponse, status_code=status.HTTP_201_CREATED)
def create_test_case(
    project_id: str,
    case_in: TestCaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new test case with ordered steps."""
    return manual_testing_service.create_test_case(db, project_id, case_in, current_user)


@router.get("/test-cases/{case_id}", response_model=TestCaseDetailResponse)
def get_test_case_detail(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get test case details including all steps and review history."""
    return manual_testing_service.get_test_case_detail(db, case_id, current_user)


@router.put("/test-cases/{case_id}", response_model=TestCaseDetailResponse)
def update_test_case(
    case_id: str,
    case_in: TestCaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update test case details and steps."""
    return manual_testing_service.update_test_case(db, case_id, case_in, current_user)


@router.put("/test-cases/{case_id}/move-module", response_model=TestCaseDetailResponse)
def move_test_case_module(
    case_id: str,
    req: TestCaseMoveModuleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Move a test case to a different module or unassign it."""
    return manual_testing_service.move_test_case_module(db, case_id, req, current_user)


@router.post("/projects/{project_id}/test-cases/bulk-move")
def bulk_move_test_cases(
    project_id: str,
    req: TestCaseBulkMoveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Move multiple test cases to a target module or unassign them."""
    return manual_testing_service.bulk_move_test_cases(db, project_id, req, current_user)


# -------------------------------------------------------------
# 2b. Test Case Review Governance Workflow
# -------------------------------------------------------------
@router.get("/projects/{project_id}/reviewer-candidates", response_model=List[UserResponse])
def get_reviewer_candidates(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List eligible peer reviewers for test case specification reviews."""
    return manual_testing_service.get_reviewer_candidates(db, project_id, current_user)


@router.post("/test-cases/{case_id}/submit-review", response_model=TestCaseDetailResponse)
def submit_test_case_for_review(
    case_id: str,
    req: TestCaseSubmitReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a draft test case for peer review and assign a reviewer."""
    return manual_testing_service.submit_for_review(db, case_id, req, current_user)


@router.post("/test-cases/{case_id}/approve", response_model=TestCaseDetailResponse)
def approve_test_case(
    case_id: str,
    req: TestCaseReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Approve test case and mark it ready for execution."""
    return manual_testing_service.approve_test_case(db, case_id, req, current_user)


@router.post("/test-cases/{case_id}/request-changes", response_model=TestCaseDetailResponse)
def request_changes_on_test_case(
    case_id: str,
    req: TestCaseReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Request changes on test case with reviewer feedback."""
    return manual_testing_service.request_changes(db, case_id, req, current_user)


@router.post("/test-cases/{case_id}/reject", response_model=TestCaseDetailResponse)
def reject_test_case(
    case_id: str,
    req: TestCaseReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reject test case with reviewer feedback."""
    return manual_testing_service.reject_test_case(db, case_id, req, current_user)


@router.get("/test-cases/{case_id}/reviews", response_model=List[TestCaseReviewResponse])
def get_test_case_reviews(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get review audit history for a test case."""
    return manual_testing_service.get_test_case_reviews(db, case_id, current_user)


@router.patch("/test-cases/{case_id}/archive", response_model=TestCaseResponse)
def archive_test_case(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Archive a test case."""
    return manual_testing_service.archive_test_case(db, case_id, current_user)


@router.delete("/test-cases/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_test_case(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Permanently delete a test case."""
    manual_testing_service.delete_test_case(db, case_id, current_user)


@router.get("/test-cases/{case_id}/history", response_model=List[TestCaseHistoryEntry])
def get_test_case_history(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve historical execution results for this test case across test runs."""
    return manual_testing_service.get_test_case_history(db, case_id, current_user)


# -------------------------------------------------------------
# 3. Test Suites
# -------------------------------------------------------------
@router.get("/projects/{project_id}/suites", response_model=List[TestSuiteResponse])
def get_project_suites(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all test suites for a project."""
    return manual_testing_service.get_suites(db, project_id, current_user)


@router.post("/projects/{project_id}/suites", response_model=TestSuiteDetailResponse, status_code=status.HTTP_201_CREATED)
def create_suite(
    project_id: str,
    suite_in: TestSuiteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new test suite."""
    return manual_testing_service.create_suite(db, project_id, suite_in, current_user)


@router.get("/suites/{suite_id}", response_model=TestSuiteDetailResponse)
def get_suite_detail(
    suite_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get suite details and included test cases."""
    return manual_testing_service.get_suite_detail(db, suite_id, current_user)


@router.put("/suites/{suite_id}", response_model=TestSuiteDetailResponse)
def update_suite(
    suite_id: str,
    suite_in: TestSuiteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update test suite metadata."""
    return manual_testing_service.update_suite(db, suite_id, suite_in, current_user)


@router.post("/suites/{suite_id}/cases", response_model=TestSuiteDetailResponse)
def set_suite_cases(
    suite_id: str,
    req: TestSuiteAddCasesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sync/set the list of test cases in a suite."""
    return manual_testing_service.set_suite_cases(db, suite_id, req.test_case_ids, current_user)


@router.delete("/suites/{suite_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_suite(
    suite_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a test suite."""
    manual_testing_service.delete_suite(db, suite_id, current_user)


# -------------------------------------------------------------
# 4. Test Runs & Execution
# -------------------------------------------------------------
@router.get("/projects/{project_id}/runs", response_model=List[TestRunResponse])
def get_project_test_runs(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all test runs and their execution progress for a project."""
    return manual_testing_service.get_runs(db, project_id, current_user)


@router.post("/projects/{project_id}/runs", response_model=TestRunDetailResponse, status_code=status.HTTP_201_CREATED)
def create_test_run(
    project_id: str,
    run_in: TestRunCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new test run with immutable snapshots of selected test cases."""
    return manual_testing_service.create_run(db, project_id, run_in, current_user)


@router.get("/runs/{run_id}", response_model=TestRunDetailResponse)
def get_test_run_detail(
    run_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get full details of a test run including execution status of each test item."""
    return manual_testing_service.get_run_detail(db, run_id, current_user)


@router.post("/runs/{run_id}/items/{item_id}/assign", response_model=TestRunItemResponse)
def assign_test_run_item(
    run_id: str,
    item_id: str,
    req: TestRunItemAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Assign test run item to a designated executor."""
    return manual_testing_service.assign_test_run_item(db, run_id, item_id, req, current_user)


@router.post("/runs/{run_id}/items/{item_id}/execute", response_model=TestRunItemResponse)
def execute_test_run_item(
    run_id: str,
    item_id: str,
    req: ExecuteTestItemRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record execution status, actual results, step statuses, duration, and notes for a test run item."""
    return manual_testing_service.execute_test_run_item(db, run_id, item_id, req, current_user)


@router.post("/runs/{run_id}/items/{item_id}/evidence", response_model=ExecutionEvidenceResponse)
def add_execution_evidence(
    run_id: str,
    item_id: str,
    evidence_in: ExecutionEvidenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Attach notes, logs or evidence to a test execution item."""
    return manual_testing_service.add_evidence_to_item(
        db, run_id, item_id, evidence_in, current_user
    )
