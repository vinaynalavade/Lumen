import enum
from sqlalchemy import (
    Column,
    String,
    Integer,
    Text,
    ForeignKey,
    Enum as SQLEnum,
    UniqueConstraint,
    DateTime,
)
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class TestCaseTemplate(str, enum.Enum):
    STANDARD = "STANDARD"
    SIMPLE = "SIMPLE"


class TestCaseType(str, enum.Enum):
    FUNCTIONAL = "FUNCTIONAL"
    SMOKE = "SMOKE"
    SANITY = "SANITY"
    REGRESSION = "REGRESSION"
    INTEGRATION = "INTEGRATION"
    UI = "UI"
    API = "API"
    NEGATIVE = "NEGATIVE"
    EDGE_CASE = "EDGE_CASE"


class TestCasePriority(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class TestCaseStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    DEPRECATED = "DEPRECATED"
    ARCHIVED = "ARCHIVED"


class TestRunStatus(str, enum.Enum):
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    ABORTED = "ABORTED"


class ExecutionStatus(str, enum.Enum):
    UNTESTED = "UNTESTED"
    PASSED = "PASSED"
    FAILED = "FAILED"
    BLOCKED = "BLOCKED"
    SKIPPED = "SKIPPED"


class EvidenceType(str, enum.Enum):
    NOTE = "NOTE"
    LOG_TEXT = "LOG_TEXT"
    FILE_ATTACHMENT = "FILE_ATTACHMENT"


# 1. Test Module / Folder
class TestModule(BaseModel):
    __tablename__ = "test_modules"

    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_id = Column(String(36), ForeignKey("test_modules.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(String(1000), nullable=True)

    # Relationships
    parent = relationship("TestModule", remote_side="TestModule.id", backref="sub_modules")
    test_cases = relationship("TestCase", back_populates="module")


# 2. Test Case Definition
class TestCase(BaseModel):
    __tablename__ = "test_cases"
    __table_args__ = (
        UniqueConstraint("project_id", "case_number", name="uq_project_case_number"),
    )

    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    module_id = Column(String(36), ForeignKey("test_modules.id", ondelete="SET NULL"), nullable=True, index=True)
    case_number = Column(Integer, nullable=False)
    key = Column(String(50), nullable=False, index=True)  # e.g. ECOMM-TC-1
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    template_type = Column(SQLEnum(TestCaseTemplate), default=TestCaseTemplate.STANDARD, nullable=False)
    test_type = Column(SQLEnum(TestCaseType), default=TestCaseType.FUNCTIONAL, nullable=False)
    priority = Column(SQLEnum(TestCasePriority), default=TestCasePriority.MEDIUM, nullable=False)
    status = Column(SQLEnum(TestCaseStatus), default=TestCaseStatus.ACTIVE, nullable=False)
    tags = Column(String(500), nullable=True)
    preconditions = Column(Text, nullable=True)
    test_data = Column(Text, nullable=True)
    expected_result = Column(Text, nullable=True)
    estimated_duration_minutes = Column(Integer, nullable=True)
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    project = relationship("Project", backref="test_cases")
    module = relationship("TestModule", back_populates="test_cases")
    steps = relationship("TestCaseStep", back_populates="test_case", cascade="all, delete-orphan", order_by="TestCaseStep.step_number")
    creator = relationship("User", foreign_keys=[created_by_id])
    updater = relationship("User", foreign_keys=[updated_by_id])
    suite_memberships = relationship("TestSuiteTestCase", back_populates="test_case", cascade="all, delete-orphan")


# 3. Test Case Step
class TestCaseStep(BaseModel):
    __tablename__ = "test_case_steps"
    __table_args__ = (
        UniqueConstraint("test_case_id", "step_number", name="uq_case_step_number"),
    )

    test_case_id = Column(String(36), ForeignKey("test_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    step_number = Column(Integer, nullable=False)
    action = Column(Text, nullable=False)
    expected_result = Column(Text, nullable=False)
    test_data = Column(Text, nullable=True)

    # Relationships
    test_case = relationship("TestCase", back_populates="steps")


# 4. Test Suite
class TestSuite(BaseModel):
    __tablename__ = "test_suites"

    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    project = relationship("Project", backref="test_suites")
    creator = relationship("User", foreign_keys=[created_by_id])
    cases = relationship("TestSuiteTestCase", back_populates="suite", cascade="all, delete-orphan", order_by="TestSuiteTestCase.order_index")
    runs = relationship("TestRun", back_populates="suite")


# 5. Test Suite Test Case (Junction)
class TestSuiteTestCase(BaseModel):
    __tablename__ = "test_suite_cases"
    __table_args__ = (
        UniqueConstraint("suite_id", "test_case_id", name="uq_suite_test_case"),
    )

    suite_id = Column(String(36), ForeignKey("test_suites.id", ondelete="CASCADE"), nullable=False, index=True)
    test_case_id = Column(String(36), ForeignKey("test_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    order_index = Column(Integer, default=0, nullable=False)

    # Relationships
    suite = relationship("TestSuite", back_populates="cases")
    test_case = relationship("TestCase", back_populates="suite_memberships")


# 6. Test Run (Execution Session)
class TestRun(BaseModel):
    __tablename__ = "test_runs"

    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    suite_id = Column(String(36), ForeignKey("test_suites.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    environment = Column(String(100), default="Staging", nullable=False)
    status = Column(SQLEnum(TestRunStatus), default=TestRunStatus.IN_PROGRESS, nullable=False)
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    project = relationship("Project", backref="test_runs")
    suite = relationship("TestSuite", back_populates="runs")
    creator = relationship("User", foreign_keys=[created_by_id])
    items = relationship("TestRunItem", back_populates="test_run", cascade="all, delete-orphan", order_by="TestRunItem.order_index")


# 7. Test Run Item (Snapshot of test case at execution time)
class TestRunItem(BaseModel):
    __tablename__ = "test_run_items"

    test_run_id = Column(String(36), ForeignKey("test_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    test_case_id = Column(String(36), ForeignKey("test_cases.id", ondelete="SET NULL"), nullable=True, index=True)
    order_index = Column(Integer, default=0, nullable=False)
    
    # Snapshot of test case at execution time
    case_key = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    preconditions = Column(Text, nullable=True)
    test_data = Column(Text, nullable=True)
    expected_result = Column(Text, nullable=True)
    priority = Column(String(20), default="MEDIUM", nullable=False)
    test_type = Column(String(50), default="FUNCTIONAL", nullable=False)
    tags = Column(String(500), nullable=True)

    # Execution State
    status = Column(SQLEnum(ExecutionStatus), default=ExecutionStatus.UNTESTED, nullable=False)
    actual_result = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    executed_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    executed_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, default=0, nullable=False)

    # Relationships
    test_run = relationship("TestRun", back_populates="items")
    source_case = relationship("TestCase", foreign_keys=[test_case_id])
    executor = relationship("User", foreign_keys=[executed_by_id])
    step_results = relationship("TestRunItemStepResult", back_populates="test_run_item", cascade="all, delete-orphan", order_by="TestRunItemStepResult.step_number")
    evidences = relationship("ExecutionEvidence", back_populates="test_run_item", cascade="all, delete-orphan")


# 8. Test Run Item Step Result (Snapshot of step execution)
class TestRunItemStepResult(BaseModel):
    __tablename__ = "test_run_step_results"

    test_run_item_id = Column(String(36), ForeignKey("test_run_items.id", ondelete="CASCADE"), nullable=False, index=True)
    step_number = Column(Integer, nullable=False)
    action = Column(Text, nullable=False)
    expected_result = Column(Text, nullable=False)
    test_data = Column(Text, nullable=True)
    actual_result = Column(Text, nullable=True)
    status = Column(SQLEnum(ExecutionStatus), default=ExecutionStatus.UNTESTED, nullable=False)

    # Relationships
    test_run_item = relationship("TestRunItem", back_populates="step_results")


# 9. Execution Evidence
class ExecutionEvidence(BaseModel):
    __tablename__ = "execution_evidences"

    test_run_item_id = Column(String(36), ForeignKey("test_run_items.id", ondelete="CASCADE"), nullable=False, index=True)
    evidence_type = Column(SQLEnum(EvidenceType), default=EvidenceType.NOTE, nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=True)
    file_path = Column(String(512), nullable=True)
    file_name = Column(String(255), nullable=True)
    mime_type = Column(String(100), nullable=True)
    file_size_bytes = Column(Integer, nullable=True)

    # Relationships
    test_run_item = relationship("TestRunItem", back_populates="evidences")
