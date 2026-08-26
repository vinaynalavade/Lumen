from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.models.organization import OrganizationRole
from app.schemas.user import UserResponse


class OrganizationBase(BaseModel):
    name: str
    description: Optional[str] = None


class OrganizationCreate(OrganizationBase):
    slug: Optional[str] = None
    create_default_workspace: bool = True
    default_workspace_name: Optional[str] = "Main Workspace"


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class OrganizationResponse(OrganizationBase):
    id: str
    slug: str
    owner_id: str
    current_user_role: Optional[OrganizationRole] = None
    workspace_count: int = 0
    member_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrganizationMemberResponse(BaseModel):
    id: str
    organization_id: str
    user_id: str
    role: OrganizationRole
    joined_at: datetime
    user: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)


class OrganizationMemberCreate(BaseModel):
    email: str
    role: OrganizationRole = OrganizationRole.MEMBER


OrganizationMemberAdd = OrganizationMemberCreate


class OrganizationMemberUpdate(BaseModel):
    role: OrganizationRole


class OrganizationInviteCreate(BaseModel):
    role: OrganizationRole = OrganizationRole.MEMBER
    expires_in_days: Optional[int] = 7
    max_uses: Optional[int] = 1


class OrganizationInviteResponse(BaseModel):
    id: str
    organization_id: str
    token: str
    role: OrganizationRole
    created_by_id: str
    expires_at: Optional[datetime] = None
    max_uses: int
    uses_count: int
    is_revoked: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrganizationInvitePublicResponse(BaseModel):
    token: str
    organization_name: str
    organization_id: str
    role: OrganizationRole
    is_valid: bool
    message: Optional[str] = None


class OrganizationJoinCodeResponse(BaseModel):
    id: str
    organization_id: str
    code: str
    role: OrganizationRole
    is_active: bool
    expires_at: Optional[datetime] = None
    max_uses: Optional[int] = None
    uses_count: int

    model_config = ConfigDict(from_attributes=True)


class OrganizationJoinRequest(BaseModel):
    join_code: str
