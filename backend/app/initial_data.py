import logging
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember, WorkspaceRole
from app.models.project import Project, ProjectStatus
from app.models.manual_testing import (
    TestModule,
    TestCase,
    TestCaseStep,
    TestSuite,
    TestSuiteTestCase,
    TestRun,
    TestRunItem,
    TestRunItemStepResult,
    TestCaseTemplate,
    TestCaseType,
    TestCasePriority,
    TestCaseStatus,
    TestRunStatus,
    ExecutionStatus,
)
from app.core.security import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_db(db: Session) -> None:
    Base.metadata.create_all(bind=engine)

    # Check if demo user exists
    user = db.query(User).filter(User.email == "demo@lumen.qa").first()
    if not user:
        logger.info("Creating demo user: demo@lumen.qa / password123")
        user = User(
            email="demo@lumen.qa",
            full_name="Alex Mercer",
            professional_title="QA Lead",
            hashed_password=get_password_hash("password123"),
            is_active=True,
            is_superuser=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Check if workspace exists
    workspace = db.query(Workspace).filter(Workspace.slug == "core-engineering").first()
    if not workspace:
        logger.info("Creating demo workspace: Core Engineering")
        workspace = Workspace(
            name="Core Engineering",
            slug="core-engineering",
            description="Primary testing and QA engineering workspace for Lumen platform.",
            owner_id=user.id
        )
        db.add(workspace)
        db.flush()

        member = WorkspaceMember(
            workspace_id=workspace.id,
            user_id=user.id,
            role=WorkspaceRole.OWNER
        )
        db.add(member)
        db.commit()
        db.refresh(workspace)

    # Check if demo project exists
    project = db.query(Project).filter(Project.workspace_id == workspace.id, Project.key == "ECOMM").first()
    if not project:
        logger.info("Creating demo project: E-Commerce Storefront (ECOMM)")
        project = Project(
            workspace_id=workspace.id,
            name="E-Commerce Storefront & Checkout",
            key="ECOMM",
            description="End-to-end quality validation suite for checkout funnel, cart APIs, inventory DB and Selenium UI suites.",
            status=ProjectStatus.ACTIVE,
            created_by_id=user.id
        )
        db.add(project)
        db.commit()
        db.refresh(project)

    # Check if demo modules exist
    auth_module = db.query(TestModule).filter(TestModule.project_id == project.id, TestModule.name == "Authentication").first()
    if not auth_module:
        logger.info("Creating demo test modules...")
        auth_module = TestModule(
            project_id=project.id,
            name="Authentication",
            description="Login, registration, password recovery and OAuth workflows."
        )
        checkout_module = TestModule(
            project_id=project.id,
            name="Checkout & Payments",
            description="Cart checkout, payment gateway integration, and receipt generation."
        )
        db.add(auth_module)
        db.add(checkout_module)
        db.commit()
        db.refresh(auth_module)
        db.refresh(checkout_module)

        # Create demo test cases
        logger.info("Creating demo test cases...")
        tc1 = TestCase(
            project_id=project.id,
            module_id=auth_module.id,
            case_number=1,
            key="ECOMM-TC-1",
            title="Verify user login with valid email & password",
            description="Ensure registered customer can log into their account and receive active JWT session.",
            template_type=TestCaseTemplate.STANDARD,
            test_type=TestCaseType.SMOKE,
            priority=TestCasePriority.HIGH,
            status=TestCaseStatus.ACTIVE,
            tags="Authentication, Login, Smoke",
            preconditions="User account exists and email is confirmed.",
            test_data="demo@lumen.qa / password123",
            expected_result="User is redirected to the dashboard with active session token.",
            created_by_id=user.id,
            updated_by_id=user.id
        )
        db.add(tc1)
        db.flush()

        steps1 = [
            ("Navigate to the login screen (/login)", "Login form renders with email & password inputs", None),
            ("Enter valid email and password credentials", "Credentials accepted in input fields", "demo@lumen.qa / password123"),
            ("Click 'Sign In to Workspace' button", "User is redirected to project cockpit with active token", None),
        ]
        for idx, (act, exp, tdata) in enumerate(steps1, 1):
            db.add(TestCaseStep(test_case_id=tc1.id, step_number=idx, action=act, expected_result=exp, test_data=tdata))

        tc2 = TestCase(
            project_id=project.id,
            module_id=checkout_module.id,
            case_number=2,
            key="ECOMM-TC-2",
            title="Verify credit card checkout validation with valid CVV",
            description="Validate payment processing and order confirmation receipt generation.",
            template_type=TestCaseTemplate.STANDARD,
            test_type=TestCaseType.FUNCTIONAL,
            priority=TestCasePriority.CRITICAL,
            status=TestCaseStatus.ACTIVE,
            tags="Checkout, Payment, Critical",
            preconditions="Items are present in shopping cart; checkout flow is initiated.",
            test_data="Visa 4111-2222-3333-4444, Exp 12/28, CVV 123",
            expected_result="Payment authorized with HTTP 200, inventory decremented in DB, and order receipt displayed.",
            created_by_id=user.id,
            updated_by_id=user.id
        )
        db.add(tc2)
        db.flush()

        steps2 = [
            ("Proceed to Checkout from cart page", "Checkout summary renders line items and total", None),
            ("Select Credit Card payment option and fill card credentials", "Card fields pass client validation", "4111-2222-3333-4444, Exp 12/28, CVV 123"),
            ("Click 'Place Order' button", "Payment processed, order confirmed with unique confirmation ID", None),
        ]
        for idx, (act, exp, tdata) in enumerate(steps2, 1):
            db.add(TestCaseStep(test_case_id=tc2.id, step_number=idx, action=act, expected_result=exp, test_data=tdata))

        tc3 = TestCase(
            project_id=project.id,
            module_id=checkout_module.id,
            case_number=3,
            key="ECOMM-TC-3",
            title="Verify order inventory rollback on failed payment",
            description="Ensure database inventory lock releases if credit card charge is declined.",
            template_type=TestCaseTemplate.SIMPLE,
            test_type=TestCaseType.NEGATIVE,
            priority=TestCasePriority.HIGH,
            status=TestCaseStatus.ACTIVE,
            tags="Inventory, Payment, Negative",
            expected_result="Inventory count unchanged in database when payment gateway returns decline code.",
            created_by_id=user.id,
            updated_by_id=user.id
        )
        db.add(tc3)
        db.flush()

        # Create demo test suite
        suite = TestSuite(
            project_id=project.id,
            name="Smoke & Critical Path Suite",
            description="High-priority sanity validations for auth and checkout services.",
            created_by_id=user.id
        )
        db.add(suite)
        db.flush()

        db.add(TestSuiteTestCase(suite_id=suite.id, test_case_id=tc1.id, order_index=0))
        db.add(TestSuiteTestCase(suite_id=suite.id, test_case_id=tc2.id, order_index=1))
        db.add(TestSuiteTestCase(suite_id=suite.id, test_case_id=tc3.id, order_index=2))
        db.commit()

        # Create sample test run
        logger.info("Creating demo test run...")
        run = TestRun(
            project_id=project.id,
            suite_id=suite.id,
            name="Release 1.0.0 Staging Sanity Run",
            environment="Staging",
            status=TestRunStatus.IN_PROGRESS,
            created_by_id=user.id
        )
        db.add(run)
        db.flush()

        # Add snapshot run items
        item1 = TestRunItem(
            test_run_id=run.id,
            test_case_id=tc1.id,
            order_index=0,
            case_key=tc1.key,
            title=tc1.title,
            description=tc1.description,
            preconditions=tc1.preconditions,
            test_data=tc1.test_data,
            expected_result=tc1.expected_result,
            priority=tc1.priority.value,
            test_type=tc1.test_type.value,
            tags=tc1.tags,
            status=ExecutionStatus.PASSED,
            actual_result="Login succeeded and session established seamlessly.",
            duration_seconds=12,
            executed_by_id=user.id
        )
        db.add(item1)
        db.flush()
        for s in tc1.steps:
            db.add(TestRunItemStepResult(test_run_item_id=item1.id, step_number=s.step_number, action=s.action, expected_result=s.expected_result, test_data=s.test_data, status=ExecutionStatus.PASSED))

        item2 = TestRunItem(
            test_run_id=run.id,
            test_case_id=tc2.id,
            order_index=1,
            case_key=tc2.key,
            title=tc2.title,
            description=tc2.description,
            preconditions=tc2.preconditions,
            test_data=tc2.test_data,
            expected_result=tc2.expected_result,
            priority=tc2.priority.value,
            test_type=tc2.test_type.value,
            tags=tc2.tags,
            status=ExecutionStatus.UNTESTED
        )
        db.add(item2)
        db.flush()
        for s in tc2.steps:
            db.add(TestRunItemStepResult(test_run_item_id=item2.id, step_number=s.step_number, action=s.action, expected_result=s.expected_result, test_data=s.test_data, status=ExecutionStatus.UNTESTED))

        item3 = TestRunItem(
            test_run_id=run.id,
            test_case_id=tc3.id,
            order_index=2,
            case_key=tc3.key,
            title=tc3.title,
            description=tc3.description,
            priority=tc3.priority.value,
            test_type=tc3.test_type.value,
            tags=tc3.tags,
            status=ExecutionStatus.UNTESTED
        )
        db.add(item3)
        db.commit()
        logger.info("Demo manual testing suite initialized successfully!")


def main() -> None:
    logger.info("Initializing database...")
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
