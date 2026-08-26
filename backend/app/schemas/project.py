from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models.project import ProjectStatus
from app.schemas.user import UserResponse


class ProjectBase(BaseModel):
    name: str
    key: str = Field(..., min_length=2, max_length=10, description="Uppercase project key prefix e.g. ECOMM")
    description: str | None = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: ProjectStatus | None = None


class ProjectSummary(BaseModel):
    total_test_cases: int = 0
    total_test_runs: int = 0
    total_bugs: int = 0
    total_api_endpoints: int = 0
    total_db_validations: int = 0
    total_automation_runs: int = 0
    recent_activity: list = []


class ProjectResponse(ProjectBase):
    id: str
    workspace_id: str
    status: ProjectStatus
    created_by_id: str | None = None
    created_at: datetime
    updated_at: datetime
    creator: UserResponse | None = None

    model_config = ConfigDict(from_attributes=True)
