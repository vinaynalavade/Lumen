from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.workspace_member import WorkspaceRole
from app.schemas.user import UserResponse


class WorkspaceBase(BaseModel):
    name: str
    description: str | None = None
    organization_id: str | None = None


class WorkspaceCreate(WorkspaceBase):
    slug: str | None = None  # Auto-generated if not supplied


class WorkspaceUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    organization_id: str | None = None


class WorkspaceMemberResponse(BaseModel):
    id: str
    workspace_id: str
    user_id: str
    role: WorkspaceRole
    joined_at: datetime
    user: UserResponse

    model_config = ConfigDict(from_attributes=True)


class WorkspaceMemberAdd(BaseModel):
    email: str
    role: WorkspaceRole = WorkspaceRole.MEMBER


class WorkspaceMemberUpdate(BaseModel):
    role: WorkspaceRole


class WorkspaceResponse(WorkspaceBase):
    id: str
    slug: str
    owner_id: str
    organization_id: str | None = None
    created_at: datetime
    updated_at: datetime
    owner: UserResponse | None = None
    current_user_role: WorkspaceRole | None = None
    project_count: int = 0
    member_count: int = 0

    model_config = ConfigDict(from_attributes=True)
