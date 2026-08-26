from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, or_

from app.models.manual_testing import (
    TestModule,
    TestCase,
    TestCaseStep,
    TestCaseReview,
    TestSuite,
    TestSuiteTestCase,
    TestRun,
    TestRunItem,
    TestRunItemStepResult,
    ExecutionEvidence,
    TestCaseStatus,
    TestCaseReviewStatus,
    TestCasePriority,
    TestCaseSeverity,
    TestRunStatus,
    ExecutionStatus,
    EvidenceType,
)
from app.models.project import Project
from app.repositories.base import BaseRepository
from app.schemas.manual_testing import (
    TestModuleCreate,
    TestModuleUpdate,
    TestCaseCreate,
    TestCaseUpdate,
    TestSuiteCreate,
    TestSuiteUpdate,
    TestRunCreate,
    ExecuteTestItemRequest,
    ExecutionEvidenceCreate,
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# 1. Test Module Repository
class TestModuleRepository(BaseRepository[TestModule]):
    def __init__(self):
        super().__init__(TestModule)

    def get_project_modules(self, db: Session, project_id: str) -> List[TestModule]:
        return (
            db.query(TestModule)
            .filter(TestModule.project_id == project_id)
            .order_by(TestModule.name.asc())
            .all()
        )

    def create_module(self, db: Session, project_id: str, obj_in: TestModuleCreate) -> TestModule:
        db_obj = TestModule(
            project_id=project_id,
            parent_id=obj_in.parent_id,
            name=obj_in.name.strip(),
            description=obj_in.description.strip() if obj_in.description else None,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


# 2. Test Case Repository
class TestCaseRepository(BaseRepository[TestCase]):
    def __init__(self):
        super().__init__(TestCase)

    def get_next_case_number(self, db: Session, project_id: str) -> int:
        max_num = (
            db.query(func.max(TestCase.case_number))
            .filter(TestCase.project_id == project_id)
            .scalar()
        )
        return (max_num or 0) + 1

    def get_project_cases(
        self,
        db: Session,
        project_id: str,
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
    ) -> Tuple[List[TestCase], int]:
        query = (
            db.query(TestCase)
            .options(
                joinedload(TestCase.creator),
                joinedload(TestCase.updater),
                joinedload(TestCase.reviewer),
                joinedload(TestCase.module),
            )
            .filter(TestCase.project_id == project_id)
        )

        if unassigned_only:
            query = query.filter(TestCase.module_id == None)
        elif module_id:
            query = query.filter(TestCase.module_id == module_id)

        if priority:
            query = query.filter(TestCase.priority == priority)
        if severity:
            query = query.filter(TestCase.severity == severity)
        if status:
            query = query.filter(TestCase.status == status)
        else:
            # By default exclude ARCHIVED unless explicitly filtered
            query = query.filter(TestCase.status != TestCaseStatus.ARCHIVED)
        if review_status:
            query = query.filter(TestCase.review_status == review_status)
        if reviewer_id:
            query = query.filter(TestCase.reviewer_id == reviewer_id)
        if test_type:
            query = query.filter(TestCase.test_type == test_type)
        if tag:
            query = query.filter(TestCase.tags.ilike(f"%{tag.strip()}%"))

        if search:
            search_pattern = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    TestCase.title.ilike(search_pattern),
                    TestCase.key.ilike(search_pattern),
                    TestCase.description.ilike(search_pattern),
                    TestCase.tags.ilike(search_pattern),
                    TestCase.preconditions.ilike(search_pattern),
                )
            )

        total = query.count()
        cases = query.order_by(TestCase.case_number.asc()).offset(skip).limit(limit).all()
        return cases, total

    def create_case_with_steps(
        self, db: Session, project: Project, obj_in: TestCaseCreate, user_id: str
    ) -> TestCase:
        next_num = self.get_next_case_number(db, project.id)
        key = f"{project.key}-TC-{next_num}"

        tags_str = ", ".join([t.strip() for t in obj_in.tags if t.strip()]) if obj_in.tags else None

        db_case = TestCase(
            project_id=project.id,
            module_id=obj_in.module_id,
            case_number=next_num,
            key=key,
            title=obj_in.title.strip(),
            description=obj_in.description.strip() if obj_in.description else None,
            template_type=obj_in.template_type,
            test_type=obj_in.test_type,
            priority=obj_in.priority,
            severity=obj_in.severity,
            status=obj_in.status,
            review_status=obj_in.review_status,
            reviewer_id=obj_in.reviewer_id,
            tags=tags_str,
            preconditions=obj_in.preconditions.strip() if obj_in.preconditions else None,
            test_data=obj_in.test_data.strip() if obj_in.test_data else None,
            expected_result=obj_in.expected_result.strip() if obj_in.expected_result else None,
            estimated_duration_minutes=obj_in.estimated_duration_minutes,
            created_by_id=user_id,
            updated_by_id=user_id,
        )
        db.add(db_case)
        db.flush()

        # Add steps if present
        for idx, step_in in enumerate(obj_in.steps, start=1):
            db_step = TestCaseStep(
                test_case_id=db_case.id,
                step_number=idx,
                action=step_in.action.strip(),
                expected_result=step_in.expected_result.strip(),
                test_data=step_in.test_data.strip() if step_in.test_data else None,
            )
            db.add(db_step)

        db.commit()
        db.refresh(db_case)
        return db_case

    def update_case_with_steps(
        self, db: Session, db_case: TestCase, obj_in: TestCaseUpdate, user_id: str
    ) -> TestCase:
        update_data = obj_in.model_dump(exclude_unset=True)

        # Update case attributes
        for field in [
            "title",
            "description",
            "module_id",
            "template_type",
            "test_type",
            "priority",
            "severity",
            "status",
            "review_status",
            "reviewer_id",
            "preconditions",
            "test_data",
            "expected_result",
            "estimated_duration_minutes",
        ]:
            if field in update_data:
                val = update_data[field]
                if isinstance(val, str):
                    val = val.strip() if val else None
                setattr(db_case, field, val)

        if "tags" in update_data:
            if obj_in.tags is not None:
                db_case.tags = ", ".join([t.strip() for t in obj_in.tags if t.strip()]) if obj_in.tags else None

        db_case.updated_by_id = user_id
        db_case.updated_at = utc_now()

        # Replace steps if supplied
        if "steps" in update_data and obj_in.steps is not None:
            # Delete existing steps
            db.query(TestCaseStep).filter(TestCaseStep.test_case_id == db_case.id).delete()
            # Add updated steps
            for idx, step_in in enumerate(obj_in.steps, start=1):
                db_step = TestCaseStep(
                    test_case_id=db_case.id,
                    step_number=idx,
                    action=step_in.action.strip(),
                    expected_result=step_in.expected_result.strip(),
                    test_data=step_in.test_data.strip() if step_in.test_data else None,
                )
                db.add(db_step)

        db.commit()
        db.refresh(db_case)
        return db_case

    def bulk_move_cases(
        self, db: Session, project_id: str, case_ids: List[str], target_module_id: Optional[str], user_id: str
    ) -> int:
        updated_count = (
            db.query(TestCase)
            .filter(TestCase.project_id == project_id, TestCase.id.in_(case_ids))
            .update(
                {
                    TestCase.module_id: target_module_id,
                    TestCase.updated_by_id: user_id,
                    TestCase.updated_at: utc_now(),
                },
                synchronize_session=False,
            )
        )
        db.commit()
        return updated_count

    def create_review(
        self,
        db: Session,
        test_case_id: str,
        reviewer_id: str,
        status: TestCaseReviewStatus,
        comments: Optional[str] = None,
    ) -> TestCaseReview:
        review = TestCaseReview(
            test_case_id=test_case_id,
            reviewer_id=reviewer_id,
            status=status,
            comments=comments.strip() if comments else None,
        )
        db.add(review)
        db.commit()
        db.refresh(review)
        return review

    def get_reviews(self, db: Session, test_case_id: str) -> List[TestCaseReview]:
        return (
            db.query(TestCaseReview)
            .options(joinedload(TestCaseReview.reviewer))
            .filter(TestCaseReview.test_case_id == test_case_id)
            .order_by(TestCaseReview.created_at.desc())
            .all()
        )

    def get_case_history(self, db: Session, test_case_id: str) -> List[TestRunItem]:
        return (
            db.query(TestRunItem)
            .options(
                joinedload(TestRunItem.test_run),
                joinedload(TestRunItem.executor),
                joinedload(TestRunItem.assigned_to),
            )
            .join(TestRun, TestRunItem.test_run_id == TestRun.id)
            .filter(TestRunItem.test_case_id == test_case_id)
            .order_by(desc(TestRunItem.executed_at), desc(TestRun.created_at))
            .all()
        )


# 3. Test Suite Repository
class TestSuiteRepository(BaseRepository[TestSuite]):
    def __init__(self):
        super().__init__(TestSuite)

    def get_project_suites(self, db: Session, project_id: str) -> List[TestSuite]:
        return (
            db.query(TestSuite)
            .options(joinedload(TestSuite.creator))
            .filter(TestSuite.project_id == project_id)
            .order_by(TestSuite.created_at.desc())
            .all()
        )

    def create_suite_with_cases(
        self, db: Session, project_id: str, obj_in: TestSuiteCreate, user_id: str
    ) -> TestSuite:
        db_suite = TestSuite(
            project_id=project_id,
            name=obj_in.name.strip(),
            description=obj_in.description.strip() if obj_in.description else None,
            created_by_id=user_id,
        )
        db.add(db_suite)
        db.flush()

        for idx, case_id in enumerate(obj_in.test_case_ids):
            membership = TestSuiteTestCase(
                suite_id=db_suite.id,
                test_case_id=case_id,
                order_index=idx,
            )
            db.add(membership)

        db.commit()
        db.refresh(db_suite)
        return db_suite

    def set_suite_cases(self, db: Session, suite_id: str, test_case_ids: List[str]) -> None:
        db.query(TestSuiteTestCase).filter(TestSuiteTestCase.suite_id == suite_id).delete()
        for idx, case_id in enumerate(test_case_ids):
            membership = TestSuiteTestCase(
                suite_id=suite_id,
                test_case_id=case_id,
                order_index=idx,
            )
            db.add(membership)
        db.commit()


# 4. Test Run Repository (Execution & Snapshots)
class TestRunRepository(BaseRepository[TestRun]):
    def __init__(self):
        super().__init__(TestRun)

    def get_project_runs(self, db: Session, project_id: str) -> List[TestRun]:
        return (
            db.query(TestRun)
            .options(
                joinedload(TestRun.creator),
                joinedload(TestRun.started_by),
                joinedload(TestRun.updater),
                joinedload(TestRun.suite),
            )
            .filter(TestRun.project_id == project_id)
            .order_by(TestRun.created_at.desc())
            .all()
        )

    def create_run_with_snapshots(
        self,
        db: Session,
        project_id: str,
        obj_in: TestRunCreate,
        test_cases: List[TestCase],
        user_id: str,
    ) -> TestRun:
        db_run = TestRun(
            project_id=project_id,
            suite_id=obj_in.suite_id,
            name=obj_in.name.strip(),
            environment=obj_in.environment.strip(),
            status=TestRunStatus.IN_PROGRESS,
            created_by_id=user_id,
            started_by_id=user_id,
            started_at=utc_now(),
        )
        db.add(db_run)
        db.flush()

        # Create snapshots of each test case and its steps
        for idx, tc in enumerate(test_cases):
            run_item = TestRunItem(
                test_run_id=db_run.id,
                test_case_id=tc.id,
                order_index=idx,
                case_key=tc.key,
                title=tc.title,
                description=tc.description,
                preconditions=tc.preconditions,
                test_data=tc.test_data,
                expected_result=tc.expected_result,
                priority=tc.priority.value if hasattr(tc.priority, "value") else str(tc.priority),
                severity=tc.severity.value if hasattr(tc.severity, "value") else str(tc.severity),
                test_type=tc.test_type.value if hasattr(tc.test_type, "value") else str(tc.test_type),
                tags=tc.tags,
                status=ExecutionStatus.UNTESTED,
            )
            db.add(run_item)
            db.flush()

            # Snapshot steps with test_data
            for step in tc.steps:
                step_res = TestRunItemStepResult(
                    test_run_item_id=run_item.id,
                    step_number=step.step_number,
                    action=step.action,
                    expected_result=step.expected_result,
                    test_data=step.test_data,
                    status=ExecutionStatus.UNTESTED,
                )
                db.add(step_res)

        db.commit()
        db.refresh(db_run)
        return db_run

    def assign_item(
        self,
        db: Session,
        item: TestRunItem,
        assigned_to_id: Optional[str],
        user_id: str,
    ) -> TestRunItem:
        item.assigned_to_id = assigned_to_id
        item.updated_by_id = user_id
        item.updated_at = utc_now()
        db.commit()
        db.refresh(item)
        return item

    def execute_item(
        self,
        db: Session,
        item: TestRunItem,
        req: ExecuteTestItemRequest,
        user_id: str,
    ) -> TestRunItem:
        item.status = req.status
        item.actual_result = req.actual_result
        item.notes = req.notes
        item.duration_seconds = req.duration_seconds or 0
        item.executed_by_id = user_id
        item.updated_by_id = user_id
        item.executed_at = utc_now()
        if req.execution_started_at:
            item.execution_started_at = req.execution_started_at
        elif not item.execution_started_at:
            item.execution_started_at = utc_now()
        item.execution_completed_at = req.execution_completed_at or utc_now()

        # Update step statuses if supplied
        if req.step_results:
            step_map = {s.step_number: s for s in item.step_results}
            for input_step in req.step_results:
                if input_step.step_number in step_map:
                    step_obj = step_map[input_step.step_number]
                    step_obj.status = input_step.status
                    if input_step.actual_result is not None:
                        step_obj.actual_result = input_step.actual_result

        db.commit()
        db.refresh(item)

        # Check if all items in test run are completed
        self.check_and_update_run_completion(db, item.test_run_id, user_id)

        return item

    def check_and_update_run_completion(self, db: Session, test_run_id: str, user_id: Optional[str] = None) -> None:
        run = db.get(TestRun, test_run_id)
        if not run or run.status == TestRunStatus.COMPLETED:
            return

        untested = (
            db.query(TestRunItem)
            .filter(
                TestRunItem.test_run_id == test_run_id,
                TestRunItem.status == ExecutionStatus.UNTESTED,
            )
            .count()
        )
        if untested == 0 and len(run.items) > 0:
            run.status = TestRunStatus.COMPLETED
            run.completed_at = utc_now()
            if user_id:
                run.updated_by_id = user_id
            db.commit()

    def add_evidence(
        self,
        db: Session,
        item_id: str,
        obj_in: ExecutionEvidenceCreate,
        file_path: Optional[str] = None,
        file_name: Optional[str] = None,
        mime_type: Optional[str] = None,
        file_size_bytes: Optional[int] = None,
    ) -> ExecutionEvidence:
        evidence = ExecutionEvidence(
            test_run_item_id=item_id,
            evidence_type=obj_in.evidence_type,
            title=obj_in.title,
            content=obj_in.content,
            file_path=file_path,
            file_name=file_name,
            mime_type=mime_type,
            file_size_bytes=file_size_bytes,
        )
        db.add(evidence)
        db.commit()
        db.refresh(evidence)
        return evidence


test_module_repo = TestModuleRepository()
test_case_repo = TestCaseRepository()
test_suite_repo = TestSuiteRepository()
test_run_repo = TestRunRepository()
