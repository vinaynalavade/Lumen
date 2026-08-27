from typing import List, Optional, Tuple, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.project import Project
from app.models.workspace_member import WorkspaceRole
from app.models.manual_testing import (
    TestModule,
    TestCase,
    TestCaseReview,
    TestSuite,
    TestRun,
    TestRunItem,
    ExecutionEvidence,
    TestCaseStatus,
    TestCaseReviewStatus,
    TestCasePriority,
    TestCaseSeverity,
    TestRunStatus,
    ExecutionStatus,
)
from app.repositories.project_repo import project_repo
from app.repositories.workspace_repo import workspace_repo
from app.repositories.manual_testing_repo import (
    test_module_repo,
    test_case_repo,
    test_suite_repo,
    test_run_repo,
)
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
    TestCaseStepResponse,
    TestSuiteCreate,
    TestSuiteUpdate,
    TestSuiteResponse,
    TestSuiteDetailResponse,
    TestRunCreate,
    TestRunResponse,
    TestRunDetailResponse,
    TestRunItemResponse,
    TestRunItemStepResultResponse,
    TestRunItemAssignRequest,
    ExecuteTestItemRequest,
    ExecutionEvidenceCreate,
    ExecutionEvidenceResponse,
    TestCaseHistoryEntry,
)
from app.schemas.user import UserResponse


class ManualTestingService:
    # -------------------------------------------------------------
    # Permission & Project Tenancy Helper
    # -------------------------------------------------------------
    @staticmethod
    def get_authorized_project(
        db: Session, project_id: str, current_user: User, require_write: bool = False
    ) -> Project:
        project = project_repo.get(db, project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Project not found."
            )

        membership = workspace_repo.get_membership(db, project.workspace_id, current_user.id)
        if not membership and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this project's workspace."
            )

        if require_write and membership and membership.role == WorkspaceRole.VIEWER and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Viewers do not have permission to modify test resources."
            )

        return project

    # -------------------------------------------------------------
    # 1. Test Modules
    # -------------------------------------------------------------
    @classmethod
    def get_modules(cls, db: Session, project_id: str, current_user: User) -> List[TestModuleResponse]:
        cls.get_authorized_project(db, project_id, current_user, require_write=False)
        modules = test_module_repo.get_project_modules(db, project_id)

        result = []
        for m in modules:
            count = len(m.test_cases)
            result.append(
                TestModuleResponse(
                    id=m.id,
                    project_id=m.project_id,
                    name=m.name,
                    description=m.description,
                    parent_id=m.parent_id,
                    test_case_count=count,
                    created_at=m.created_at,
                    updated_at=m.updated_at,
                )
            )
        return result

    @classmethod
    def create_module(
        cls, db: Session, project_id: str, obj_in: TestModuleCreate, current_user: User
    ) -> TestModuleResponse:
        cls.get_authorized_project(db, project_id, current_user, require_write=True)
        module = test_module_repo.create_module(db, project_id, obj_in)
        return TestModuleResponse(
            id=module.id,
            project_id=module.project_id,
            name=module.name,
            description=module.description,
            parent_id=module.parent_id,
            test_case_count=0,
            created_at=module.created_at,
            updated_at=module.updated_at,
        )

    @classmethod
    def update_module(
        cls, db: Session, module_id: str, obj_in: TestModuleUpdate, current_user: User
    ) -> TestModuleResponse:
        module = test_module_repo.get(db, module_id)
        if not module:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found.")
        cls.get_authorized_project(db, module.project_id, current_user, require_write=True)

        updated = test_module_repo.update(db, module, obj_in)
        return TestModuleResponse(
            id=updated.id,
            project_id=updated.project_id,
            name=updated.name,
            description=updated.description,
            parent_id=updated.parent_id,
            test_case_count=len(updated.test_cases),
            created_at=updated.created_at,
            updated_at=updated.updated_at,
        )

    @classmethod
    def delete_module(cls, db: Session, module_id: str, current_user: User) -> None:
        module = test_module_repo.get(db, module_id)
        if not module:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found.")
        cls.get_authorized_project(db, module.project_id, current_user, require_write=True)

        # Unassign test cases from this module
        for tc in module.test_cases:
            tc.module_id = None
        db.commit()

        test_module_repo.remove(db, module_id)

    # -------------------------------------------------------------
    # 2. Test Cases & Steps
    # -------------------------------------------------------------
    @staticmethod
    def _parse_tags(tags_str: Optional[str]) -> List[str]:
        if not tags_str:
            return []
        return [t.strip() for t in tags_str.split(",") if t.strip()]

    @classmethod
    def get_test_cases(
        cls,
        db: Session,
        project_id: str,
        current_user: User,
        module_id: Optional[str] = None,
        unassigned_only: bool = False,
        priority: Optional[TestCasePriority] = None,
        severity: Optional[TestCaseSeverity] = None,
        status: Optional[TestCaseStatus] = None,
        review_status: Optional[TestCaseReviewStatus] = None,
        reviewer_id: Optional[str] = None,
        test_type: Optional[Any] = None,
        tag: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[TestCaseResponse]:
        cls.get_authorized_project(db, project_id, current_user, require_write=False)
        cases, _ = test_case_repo.get_project_cases(
            db=db,
            project_id=project_id,
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

        result = []
        for c in cases:
            # Find latest execution status if any
            history = test_case_repo.get_case_history(db, c.id)
            latest_status = history[0].status if history else None

            result.append(
                TestCaseResponse(
                    id=c.id,
                    project_id=c.project_id,
                    module_id=c.module_id,
                    case_number=c.case_number,
                    key=c.key,
                    title=c.title,
                    description=c.description,
                    template_type=c.template_type,
                    test_type=c.test_type,
                    priority=c.priority,
                    severity=c.severity,
                    status=c.status,
                    review_status=c.review_status,
                    reviewer_id=c.reviewer_id,
                    tags=cls._parse_tags(c.tags),
                    preconditions=c.preconditions,
                    test_data=c.test_data,
                    expected_result=c.expected_result,
                    estimated_duration_minutes=c.estimated_duration_minutes,
                    created_by_id=c.created_by_id,
                    updated_by_id=c.updated_by_id,
                    created_at=c.created_at,
                    updated_at=c.updated_at,
                    creator=UserResponse.model_validate(c.creator) if c.creator else None,
                    updater=UserResponse.model_validate(c.updater) if c.updater else None,
                    reviewer=UserResponse.model_validate(c.reviewer) if c.reviewer else None,
                    module_name=c.module.name if c.module else None,
                    step_count=len(c.steps),
                    last_execution_status=latest_status,
                )
            )
        return result

    @classmethod
    def create_test_case(
        cls, db: Session, project_id: str, obj_in: TestCaseCreate, current_user: User
    ) -> TestCaseDetailResponse:
        project = cls.get_authorized_project(db, project_id, current_user, require_write=True)
        case = test_case_repo.create_case_with_steps(db, project, obj_in, current_user.id)
        return cls._build_case_detail_response(case)

    @classmethod
    def get_test_case_detail(
        cls, db: Session, case_id: str, current_user: User
    ) -> TestCaseDetailResponse:
        case = test_case_repo.get(db, case_id)
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found.")
        cls.get_authorized_project(db, case.project_id, current_user, require_write=False)
        return cls._build_case_detail_response(case)

    @classmethod
    def update_test_case(
        cls, db: Session, case_id: str, obj_in: TestCaseUpdate, current_user: User
    ) -> TestCaseDetailResponse:
        case = test_case_repo.get(db, case_id)
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found.")
        cls.get_authorized_project(db, case.project_id, current_user, require_write=True)

        updated_case = test_case_repo.update_case_with_steps(db, case, obj_in, current_user.id)
        return cls._build_case_detail_response(updated_case)

    @classmethod
    def move_test_case_module(
        cls, db: Session, case_id: str, req: TestCaseMoveModuleRequest, current_user: User
    ) -> TestCaseDetailResponse:
        case = test_case_repo.get(db, case_id)
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found.")
        cls.get_authorized_project(db, case.project_id, current_user, require_write=True)

        if req.target_module_id:
            target_mod = test_module_repo.get(db, req.target_module_id)
            if not target_mod or target_mod.project_id != case.project_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target module does not belong to this project.")
            case.module_id = req.target_module_id
        else:
            case.module_id = None

        case.updated_by_id = current_user.id
        db.commit()
        db.refresh(case)
        return cls._build_case_detail_response(case)

    @classmethod
    def bulk_move_test_cases(
        cls, db: Session, project_id: str, req: TestCaseBulkMoveRequest, current_user: User
    ) -> dict:
        cls.get_authorized_project(db, project_id, current_user, require_write=True)
        count = test_case_repo.bulk_move_cases(
            db, project_id, req.test_case_ids, req.target_module_id, current_user.id
        )
        return {"message": f"Successfully moved {count} test cases.", "moved_count": count}

    # -------------------------------------------------------------
    # 2b. Test Case Review Governance Workflow
    # -------------------------------------------------------------
    @classmethod
    def get_reviewer_candidates(
        cls, db: Session, project_id: str, current_user: User
    ) -> List[UserResponse]:
        """List eligible peer reviewers for a project (excluding the current user unless superuser)."""
        project = cls.get_authorized_project(db, project_id, current_user, require_write=False)
        members = workspace_repo.get_members(db, project.workspace_id)
        candidates = []
        for m in members:
            if m.role in [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER]:
                if m.user and (m.user.id != current_user.id or current_user.is_superuser):
                    candidates.append(UserResponse.model_validate(m.user))
        return candidates

    @classmethod
    def submit_for_review(
        cls, db: Session, case_id: str, req: TestCaseSubmitReviewRequest, current_user: User
    ) -> TestCaseDetailResponse:
        case = test_case_repo.get(db, case_id)
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found.")
        cls.get_authorized_project(db, case.project_id, current_user, require_write=True)

        if req.reviewer_id and req.reviewer_id == current_user.id and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Authors cannot assign themselves as reviewer. Please select a qualified peer or lead.",
            )

        case.review_status = TestCaseReviewStatus.IN_REVIEW
        if req.reviewer_id:
            case.reviewer_id = req.reviewer_id
        case.updated_by_id = current_user.id
        db.commit()

        # Log review action
        test_case_repo.create_review(
            db,
            test_case_id=case.id,
            reviewer_id=current_user.id,
            status=TestCaseReviewStatus.IN_REVIEW,
            comments=req.comments or "Submitted for peer review.",
        )

        db.refresh(case)
        return cls._build_case_detail_response(case)

    @classmethod
    def approve_test_case(
        cls, db: Session, case_id: str, req: TestCaseReviewCreate, current_user: User
    ) -> TestCaseDetailResponse:
        case = test_case_repo.get(db, case_id)
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found.")
        cls.get_authorized_project(db, case.project_id, current_user, require_write=True)

        if case.created_by_id == current_user.id and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Authors cannot review and approve their own test cases. A peer or lead must review and approve.",
            )

        case.review_status = TestCaseReviewStatus.APPROVED
        case.status = TestCaseStatus.ACTIVE
        case.reviewer_id = current_user.id
        case.updated_by_id = current_user.id
        db.commit()

        # Log review approval
        test_case_repo.create_review(
            db,
            test_case_id=case.id,
            reviewer_id=current_user.id,
            status=TestCaseReviewStatus.APPROVED,
            comments=req.comments or "Test case approved and marked ready for execution.",
        )

        db.refresh(case)
        return cls._build_case_detail_response(case)

    @classmethod
    def request_changes(
        cls, db: Session, case_id: str, req: TestCaseReviewCreate, current_user: User
    ) -> TestCaseDetailResponse:
        case = test_case_repo.get(db, case_id)
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found.")
        cls.get_authorized_project(db, case.project_id, current_user, require_write=True)

        if case.created_by_id == current_user.id and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Authors cannot request changes on their own test cases.",
            )

        case.review_status = TestCaseReviewStatus.CHANGES_REQUESTED
        case.reviewer_id = current_user.id
        case.updated_by_id = current_user.id
        db.commit()

        # Log changes requested
        test_case_repo.create_review(
            db,
            test_case_id=case.id,
            reviewer_id=current_user.id,
            status=TestCaseReviewStatus.CHANGES_REQUESTED,
            comments=req.comments or "Changes requested by reviewer.",
        )

        db.refresh(case)
        return cls._build_case_detail_response(case)

    @classmethod
    def reject_test_case(
        cls, db: Session, case_id: str, req: TestCaseReviewCreate, current_user: User
    ) -> TestCaseDetailResponse:
        case = test_case_repo.get(db, case_id)
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found.")
        cls.get_authorized_project(db, case.project_id, current_user, require_write=True)

        if case.created_by_id == current_user.id and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Authors cannot reject their own test cases.",
            )

        case.review_status = TestCaseReviewStatus.REJECTED
        case.reviewer_id = current_user.id
        case.updated_by_id = current_user.id
        db.commit()

        # Log rejection action
        test_case_repo.create_review(
            db,
            test_case_id=case.id,
            reviewer_id=current_user.id,
            status=TestCaseReviewStatus.REJECTED,
            comments=req.comments or "Test case rejected by reviewer.",
        )

        db.refresh(case)
        return cls._build_case_detail_response(case)

    @classmethod
    def get_test_case_reviews(
        cls, db: Session, case_id: str, current_user: User
    ) -> List[TestCaseReviewResponse]:
        case = test_case_repo.get(db, case_id)
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found.")
        cls.get_authorized_project(db, case.project_id, current_user, require_write=False)

        reviews = test_case_repo.get_reviews(db, case_id)
        return [
            TestCaseReviewResponse(
                id=r.id,
                test_case_id=r.test_case_id,
                reviewer_id=r.reviewer_id,
                status=r.status,
                comments=r.comments,
                created_at=r.created_at,
                reviewer=UserResponse.model_validate(r.reviewer) if r.reviewer else None,
            )
            for r in reviews
        ]

    @classmethod
    def archive_test_case(cls, db: Session, case_id: str, current_user: User) -> TestCaseResponse:
        case = test_case_repo.get(db, case_id)
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found.")
        cls.get_authorized_project(db, case.project_id, current_user, require_write=True)

        case.status = TestCaseStatus.ARCHIVED
        case.review_status = TestCaseReviewStatus.DEPRECATED
        db.commit()
        db.refresh(case)
        return cls._build_case_detail_response(case)

    @classmethod
    def delete_test_case(cls, db: Session, case_id: str, current_user: User) -> None:
        case = test_case_repo.get(db, case_id)
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found.")
        cls.get_authorized_project(db, case.project_id, current_user, require_write=True)

        test_case_repo.remove(db, case_id)

    @classmethod
    def get_test_case_history(
        cls, db: Session, case_id: str, current_user: User
    ) -> List[TestCaseHistoryEntry]:
        case = test_case_repo.get(db, case_id)
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found.")
        cls.get_authorized_project(db, case.project_id, current_user, require_write=False)

        history_items = test_case_repo.get_case_history(db, case_id)
        return [
            TestCaseHistoryEntry(
                test_run_id=item.test_run_id,
                test_run_name=item.test_run.name if item.test_run else "Unknown Run",
                environment=item.test_run.environment if item.test_run else "Default",
                item_id=item.id,
                status=item.status,
                actual_result=item.actual_result,
                executed_at=item.executed_at,
                executor_name=item.executor.full_name if item.executor else None,
                duration_seconds=item.duration_seconds,
            )
            for item in history_items
        ]

    # -------------------------------------------------------------
    # 3. Test Suites
    # -------------------------------------------------------------
    @classmethod
    def get_suites(cls, db: Session, project_id: str, current_user: User) -> List[TestSuiteResponse]:
        cls.get_authorized_project(db, project_id, current_user, require_write=False)
        suites = test_suite_repo.get_project_suites(db, project_id)
        return [
            TestSuiteResponse(
                id=s.id,
                project_id=s.project_id,
                name=s.name,
                description=s.description,
                created_by_id=s.created_by_id,
                created_at=s.created_at,
                updated_at=s.updated_at,
                test_case_count=len(s.cases),
                creator=UserResponse.model_validate(s.creator) if s.creator else None,
            )
            for s in suites
        ]

    @classmethod
    def create_suite(
        cls, db: Session, project_id: str, obj_in: TestSuiteCreate, current_user: User
    ) -> TestSuiteDetailResponse:
        cls.get_authorized_project(db, project_id, current_user, require_write=True)
        suite = test_suite_repo.create_suite_with_cases(db, project_id, obj_in, current_user.id)
        return cls._build_suite_detail_response(suite)

    @classmethod
    def get_suite_detail(
        cls, db: Session, suite_id: str, current_user: User
    ) -> TestSuiteDetailResponse:
        suite = test_suite_repo.get(db, suite_id)
        if not suite:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suite not found.")
        cls.get_authorized_project(db, suite.project_id, current_user, require_write=False)
        return cls._build_suite_detail_response(suite)

    @classmethod
    def update_suite(
        cls, db: Session, suite_id: str, obj_in: TestSuiteUpdate, current_user: User
    ) -> TestSuiteDetailResponse:
        suite = test_suite_repo.get(db, suite_id)
        if not suite:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suite not found.")
        cls.get_authorized_project(db, suite.project_id, current_user, require_write=True)

        updated_suite = test_suite_repo.update(db, suite, obj_in)
        return cls._build_suite_detail_response(updated_suite)

    @classmethod
    def set_suite_cases(
        cls, db: Session, suite_id: str, case_ids: List[str], current_user: User
    ) -> TestSuiteDetailResponse:
        suite = test_suite_repo.get(db, suite_id)
        if not suite:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suite not found.")
        cls.get_authorized_project(db, suite.project_id, current_user, require_write=True)

        test_suite_repo.set_suite_cases(db, suite_id, case_ids)
        db.refresh(suite)
        return cls._build_suite_detail_response(suite)

    @classmethod
    def delete_suite(cls, db: Session, suite_id: str, current_user: User) -> None:
        suite = test_suite_repo.get(db, suite_id)
        if not suite:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suite not found.")
        cls.get_authorized_project(db, suite.project_id, current_user, require_write=True)
        test_suite_repo.remove(db, suite_id)

    # -------------------------------------------------------------
    # 4. Test Runs & Execution
    # -------------------------------------------------------------
    @classmethod
    def get_runs(cls, db: Session, project_id: str, current_user: User) -> List[TestRunResponse]:
        cls.get_authorized_project(db, project_id, current_user, require_write=False)
        runs = test_run_repo.get_project_runs(db, project_id)
        return [cls._build_run_response(r) for r in runs]

    @classmethod
    def create_run(
        cls, db: Session, project_id: str, obj_in: TestRunCreate, current_user: User
    ) -> TestRunDetailResponse:
        cls.get_authorized_project(db, project_id, current_user, require_write=True)

        target_cases: List[TestCase] = []
        if obj_in.suite_id:
            suite = test_suite_repo.get(db, obj_in.suite_id)
            if not suite:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test suite not found.")
            target_cases = [
                m.test_case
                for m in suite.cases
                if m.test_case.status != TestCaseStatus.ARCHIVED
                and m.test_case.review_status == TestCaseReviewStatus.APPROVED
            ]
            if not target_cases:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot create a test run: None of the test cases in this suite are approved for execution.",
                )
        elif obj_in.test_case_ids:
            target_cases = (
                db.query(TestCase)
                .filter(TestCase.id.in_(obj_in.test_case_ids), TestCase.project_id == project_id)
                .all()
            )
            if not target_cases:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot create a test run without valid test cases.",
                )
            for tc in target_cases:
                if tc.status == TestCaseStatus.ARCHIVED:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Test case '{tc.key}' cannot be executed because it is archived.",
                    )
                if tc.review_status != TestCaseReviewStatus.APPROVED:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Test case '{tc.key}' cannot be executed because its review status is '{tc.review_status.value}'. Only APPROVED test cases can be executed.",
                    )

        if not target_cases:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot create a test run without at least one approved test case.",
            )

        run = test_run_repo.create_run_with_snapshots(
            db, project_id, obj_in, target_cases, current_user.id
        )
        return cls._build_run_detail_response(run)

    @classmethod
    def get_run_detail(
        cls, db: Session, run_id: str, current_user: User
    ) -> TestRunDetailResponse:
        run = test_run_repo.get(db, run_id)
        if not run:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test run not found.")
        cls.get_authorized_project(db, run.project_id, current_user, require_write=False)
        return cls._build_run_detail_response(run)

    @classmethod
    def assign_test_run_item(
        cls, db: Session, run_id: str, item_id: str, req: TestRunItemAssignRequest, current_user: User
    ) -> TestRunItemResponse:
        run = test_run_repo.get(db, run_id)
        if not run:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test run not found.")
        cls.get_authorized_project(db, run.project_id, current_user, require_write=True)

        item = db.query(TestRunItem).filter(TestRunItem.id == item_id, TestRunItem.test_run_id == run_id).first()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test run item not found.")

        updated_item = test_run_repo.assign_item(db, item, req.assigned_to_id, current_user.id)
        return cls._build_run_item_response(updated_item)

    @classmethod
    def execute_test_run_item(
        cls, db: Session, run_id: str, item_id: str, req: ExecuteTestItemRequest, current_user: User
    ) -> TestRunItemResponse:
        run = test_run_repo.get(db, run_id)
        if not run:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test run not found.")
        cls.get_authorized_project(db, run.project_id, current_user, require_write=True)

        item = db.query(TestRunItem).filter(TestRunItem.id == item_id, TestRunItem.test_run_id == run_id).first()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test run item not found.")

        updated_item = test_run_repo.execute_item(db, item, req, current_user.id)
        return cls._build_run_item_response(updated_item)

    @classmethod
    def add_evidence_to_item(
        cls,
        db: Session,
        run_id: str,
        item_id: str,
        obj_in: ExecutionEvidenceCreate,
        current_user: User,
        file_path: Optional[str] = None,
        file_name: Optional[str] = None,
        mime_type: Optional[str] = None,
        file_size_bytes: Optional[int] = None,
    ) -> ExecutionEvidenceResponse:
        run = test_run_repo.get(db, run_id)
        if not run:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test run not found.")
        cls.get_authorized_project(db, run.project_id, current_user, require_write=True)

        item = db.query(TestRunItem).filter(TestRunItem.id == item_id, TestRunItem.test_run_id == run_id).first()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test run item not found.")

        evidence = test_run_repo.add_evidence(
            db, item_id, obj_in, file_path, file_name, mime_type, file_size_bytes
        )
        return ExecutionEvidenceResponse.model_validate(evidence)

    # -------------------------------------------------------------
    # Response Serialization Helpers
    # -------------------------------------------------------------
    @classmethod
    def _build_case_detail_response(cls, case: TestCase) -> TestCaseDetailResponse:
        steps_resp = [
            TestCaseStepResponse(
                id=s.id,
                test_case_id=s.test_case_id,
                step_number=s.step_number,
                action=s.action,
                expected_result=s.expected_result,
                test_data=s.test_data,
            )
            for s in case.steps
        ]
        reviews_resp = [
            TestCaseReviewResponse(
                id=r.id,
                test_case_id=r.test_case_id,
                reviewer_id=r.reviewer_id,
                status=r.status,
                comments=r.comments,
                created_at=r.created_at,
                reviewer=UserResponse.model_validate(r.reviewer) if r.reviewer else None,
            )
            for r in (case.review_history or [])
        ]
        return TestCaseDetailResponse(
            id=case.id,
            project_id=case.project_id,
            module_id=case.module_id,
            case_number=case.case_number,
            key=case.key,
            title=case.title,
            description=case.description,
            template_type=case.template_type,
            test_type=case.test_type,
            priority=case.priority,
            severity=case.severity,
            status=case.status,
            review_status=case.review_status,
            reviewer_id=case.reviewer_id,
            tags=cls._parse_tags(case.tags),
            preconditions=case.preconditions,
            test_data=case.test_data,
            expected_result=case.expected_result,
            estimated_duration_minutes=case.estimated_duration_minutes,
            created_by_id=case.created_by_id,
            updated_by_id=case.updated_by_id,
            created_at=case.created_at,
            updated_at=case.updated_at,
            creator=UserResponse.model_validate(case.creator) if case.creator else None,
            updater=UserResponse.model_validate(case.updater) if case.updater else None,
            reviewer=UserResponse.model_validate(case.reviewer) if case.reviewer else None,
            module_name=case.module.name if case.module else None,
            step_count=len(case.steps),
            steps=steps_resp,
            review_history=reviews_resp,
        )

    @classmethod
    def _build_suite_detail_response(cls, suite: TestSuite) -> TestSuiteDetailResponse:
        cases_resp = [
            TestCaseResponse(
                id=m.test_case.id,
                project_id=m.test_case.project_id,
                module_id=m.test_case.module_id,
                case_number=m.test_case.case_number,
                key=m.test_case.key,
                title=m.test_case.title,
                description=m.test_case.description,
                template_type=m.test_case.template_type,
                test_type=m.test_case.test_type,
                priority=m.test_case.priority,
                severity=m.test_case.severity,
                status=m.test_case.status,
                review_status=m.test_case.review_status,
                reviewer_id=m.test_case.reviewer_id,
                tags=cls._parse_tags(m.test_case.tags),
                preconditions=m.test_case.preconditions,
                test_data=m.test_case.test_data,
                expected_result=m.test_case.expected_result,
                estimated_duration_minutes=m.test_case.estimated_duration_minutes,
                created_by_id=m.test_case.created_by_id,
                updated_by_id=m.test_case.updated_by_id,
                created_at=m.test_case.created_at,
                updated_at=m.test_case.updated_at,
                creator=UserResponse.model_validate(m.test_case.creator) if m.test_case.creator else None,
                updater=UserResponse.model_validate(m.test_case.updater) if m.test_case.updater else None,
                reviewer=UserResponse.model_validate(m.test_case.reviewer) if m.test_case.reviewer else None,
                module_name=m.test_case.module.name if m.test_case.module else None,
                step_count=len(m.test_case.steps),
            )
            for m in suite.cases
        ]
        return TestSuiteDetailResponse(
            id=suite.id,
            project_id=suite.project_id,
            name=suite.name,
            description=suite.description,
            created_by_id=suite.created_by_id,
            created_at=suite.created_at,
            updated_at=suite.updated_at,
            test_case_count=len(suite.cases),
            creator=UserResponse.model_validate(suite.creator) if suite.creator else None,
            test_cases=cases_resp,
        )

    @classmethod
    def _build_run_response(cls, run: TestRun) -> TestRunResponse:
        total = len(run.items)
        passed = sum(1 for i in run.items if i.status == ExecutionStatus.PASSED)
        failed = sum(1 for i in run.items if i.status == ExecutionStatus.FAILED)
        blocked = sum(1 for i in run.items if i.status == ExecutionStatus.BLOCKED)
        skipped = sum(1 for i in run.items if i.status == ExecutionStatus.SKIPPED)
        untested = sum(1 for i in run.items if i.status == ExecutionStatus.UNTESTED)

        completed = passed + failed + blocked + skipped
        pct = round((completed / total * 100.0), 1) if total > 0 else 0.0

        return TestRunResponse(
            id=run.id,
            project_id=run.project_id,
            suite_id=run.suite_id,
            name=run.name,
            environment=run.environment,
            status=run.status,
            created_by_id=run.created_by_id,
            started_by_id=run.started_by_id,
            updated_by_id=run.updated_by_id,
            started_at=run.started_at,
            completed_at=run.completed_at,
            created_at=run.created_at,
            updated_at=run.updated_at,
            creator=UserResponse.model_validate(run.creator) if run.creator else None,
            started_by=UserResponse.model_validate(run.started_by) if run.started_by else None,
            updater=UserResponse.model_validate(run.updater) if run.updater else None,
            suite_name=run.suite.name if run.suite else None,
            total_items=total,
            passed_count=passed,
            failed_count=failed,
            blocked_count=blocked,
            untested_count=untested,
            skipped_count=skipped,
            completion_percentage=pct,
        )

    @classmethod
    def _build_run_detail_response(cls, run: TestRun) -> TestRunDetailResponse:
        base = cls._build_run_response(run)
        items_resp = [cls._build_run_item_response(i) for i in run.items]
        return TestRunDetailResponse(**base.model_dump(), items=items_resp)

    @classmethod
    def _build_run_item_response(cls, item: TestRunItem) -> TestRunItemResponse:
        step_res_resp = [
            TestRunItemStepResultResponse(
                id=s.id,
                step_number=s.step_number,
                action=s.action,
                expected_result=s.expected_result,
                test_data=s.test_data,
                actual_result=s.actual_result,
                status=s.status,
            )
            for s in item.step_results
        ]
        evidences_resp = [
            ExecutionEvidenceResponse(
                id=e.id,
                test_run_item_id=e.test_run_item_id,
                evidence_type=e.evidence_type,
                title=e.title,
                content=e.content,
                file_path=e.file_path,
                file_name=e.file_name,
                mime_type=e.mime_type,
                file_size_bytes=e.file_size_bytes,
                created_at=e.created_at,
            )
            for e in item.evidences
        ]
        return TestRunItemResponse(
            id=item.id,
            test_run_id=item.test_run_id,
            test_case_id=item.test_case_id,
            order_index=item.order_index,
            case_key=item.case_key,
            title=item.title,
            description=item.description,
            preconditions=item.preconditions,
            test_data=item.test_data,
            expected_result=item.expected_result,
            priority=item.priority,
            severity=item.severity,
            test_type=item.test_type,
            tags=cls._parse_tags(item.tags),
            status=item.status,
            actual_result=item.actual_result,
            notes=item.notes,
            assigned_to_id=item.assigned_to_id,
            executed_by_id=item.executed_by_id,
            updated_by_id=item.updated_by_id,
            execution_started_at=item.execution_started_at,
            execution_completed_at=item.execution_completed_at,
            executed_at=item.executed_at,
            duration_seconds=item.duration_seconds,
            assigned_to=UserResponse.model_validate(item.assigned_to) if item.assigned_to else None,
            executor=UserResponse.model_validate(item.executor) if item.executor else None,
            updater=UserResponse.model_validate(item.updater) if item.updater else None,
            step_results=step_res_resp,
            evidences=evidences_resp,
        )


manual_testing_service = ManualTestingService()
