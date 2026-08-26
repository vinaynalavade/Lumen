from typing import List, Optional, Tuple, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.project import Project
from app.models.workspace_member import WorkspaceRole
from app.models.manual_testing import (
    TestModule,
    TestCase,
    TestSuite,
    TestRun,
    TestRunItem,
    ExecutionEvidence,
    TestCaseStatus,
    TestCasePriority,
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
        priority: Optional[TestCasePriority] = None,
        status: Optional[TestCaseStatus] = None,
        test_type: Optional[Any] = None,
        tag: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[TestCaseResponse]:
        cls.get_authorized_project(db, project_id, current_user, require_write=False)
        cases, _ = test_case_repo.get_project_cases(
            db, project_id, module_id, priority, status, test_type, tag, search, skip, limit
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
                    status=c.status,
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
    def archive_test_case(cls, db: Session, case_id: str, current_user: User) -> TestCaseResponse:
        case = test_case_repo.get(db, case_id)
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found.")
        cls.get_authorized_project(db, case.project_id, current_user, require_write=True)

        case.status = TestCaseStatus.ARCHIVED
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
            target_cases = [m.test_case for m in suite.cases if m.test_case.status != TestCaseStatus.ARCHIVED]
        elif obj_in.test_case_ids:
            target_cases = (
                db.query(TestCase)
                .filter(TestCase.id.in_(obj_in.test_case_ids), TestCase.project_id == project_id)
                .all()
            )

        if not target_cases:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot create a test run without at least one active test case.",
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
            status=case.status,
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
            module_name=case.module.name if case.module else None,
            step_count=len(case.steps),
            steps=steps_resp,
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
                status=m.test_case.status,
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
            started_at=run.started_at,
            completed_at=run.completed_at,
            created_at=run.created_at,
            updated_at=run.updated_at,
            creator=UserResponse.model_validate(run.creator) if run.creator else None,
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
            test_type=item.test_type,
            tags=cls._parse_tags(item.tags),
            status=item.status,
            actual_result=item.actual_result,
            notes=item.notes,
            executed_by_id=item.executed_by_id,
            executed_at=item.executed_at,
            duration_seconds=item.duration_seconds,
            executor=UserResponse.model_validate(item.executor) if item.executor else None,
            step_results=step_res_resp,
            evidences=evidences_resp,
        )


manual_testing_service = ManualTestingService()
