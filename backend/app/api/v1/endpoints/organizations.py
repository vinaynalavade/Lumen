from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.organization import OrganizationRole
from app.services.organization_service import OrganizationService
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationResponse,
    OrganizationMemberResponse,
    OrganizationMemberCreate,
    OrganizationMemberUpdate,
    OrganizationInviteCreate,
    OrganizationInviteResponse,
    OrganizationJoinCodeResponse,
    OrganizationJoinRequest,
)

router = APIRouter()


@router.get("", response_model=List[OrganizationResponse])
def list_organizations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all organizations the current user belongs to."""
    service = OrganizationService(db)
    return service.list_user_organizations(current_user)


@router.post("", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
def create_organization(
    obj_in: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new organization. Creator automatically becomes OWNER."""
    service = OrganizationService(db)
    return service.create_organization(obj_in, current_user)


@router.post("/join-by-code", response_model=OrganizationResponse)
def join_organization_by_code(
    req: OrganizationJoinRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Join an organization using a human-friendly join code (e.g. LUMEN-XXXX-YYYY)."""
    service = OrganizationService(db)
    return service.join_by_code(req, current_user)


@router.get("/{organization_id}", response_model=OrganizationResponse)
def get_organization(
    organization_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get details of a specific organization."""
    service = OrganizationService(db)
    return service.get_organization(organization_id, current_user)


@router.put("/{organization_id}", response_model=OrganizationResponse)
def update_organization(
    organization_id: str,
    obj_in: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update organization name or description (OWNER/ADMIN only)."""
    service = OrganizationService(db)
    return service.update_organization(organization_id, obj_in, current_user)


@router.delete("/{organization_id}")
def delete_organization(
    organization_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an organization and all its data (OWNER only)."""
    service = OrganizationService(db)
    return service.delete_organization(organization_id, current_user)


# -------------------------------------------------------------
# Member Management
# -------------------------------------------------------------
@router.get("/{organization_id}/members", response_model=List[OrganizationMemberResponse])
def list_organization_members(
    organization_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List members of the organization."""
    service = OrganizationService(db)
    return service.list_members(organization_id, current_user)


@router.post("/{organization_id}/members", response_model=OrganizationMemberResponse, status_code=status.HTTP_201_CREATED)
def add_organization_member(
    organization_id: str,
    obj_in: OrganizationMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Directly add an existing registered user to the organization by email (ADMIN/OWNER only)."""
    service = OrganizationService(db)
    return service.add_member(organization_id, obj_in.email, obj_in.role, current_user)


@router.put("/{organization_id}/members/{user_id}", response_model=OrganizationMemberResponse)
def update_organization_member_role(
    organization_id: str,
    user_id: str,
    obj_in: OrganizationMemberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an organization member's permission role (ADMIN/OWNER only)."""
    service = OrganizationService(db)
    return service.update_member_role(organization_id, user_id, obj_in.role, current_user)


@router.delete("/{organization_id}/members/{user_id}")
def remove_organization_member(
    organization_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a member from the organization (ADMIN/OWNER only)."""
    service = OrganizationService(db)
    return service.remove_member(organization_id, user_id, current_user)


# -------------------------------------------------------------
# Organization Invites
# -------------------------------------------------------------
@router.post("/{organization_id}/invites", response_model=OrganizationInviteResponse, status_code=status.HTTP_201_CREATED)
def create_organization_invite(
    organization_id: str,
    obj_in: OrganizationInviteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a secure invitation link for joining the organization (ADMIN/OWNER only)."""
    service = OrganizationService(db)
    return service.create_invite(organization_id, obj_in, current_user)


@router.get("/{organization_id}/invites", response_model=List[OrganizationInviteResponse])
def list_organization_invites(
    organization_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List active organization invitations (ADMIN/OWNER only)."""
    service = OrganizationService(db)
    return service.list_invites(organization_id, current_user)


@router.delete("/{organization_id}/invites/{invite_id}")
def revoke_organization_invite(
    organization_id: str,
    invite_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revoke an active invitation link (ADMIN/OWNER only)."""
    service = OrganizationService(db)
    return service.revoke_invite(organization_id, invite_id, current_user)


# -------------------------------------------------------------
# Organization Join Code
# -------------------------------------------------------------
@router.get("/{organization_id}/join-code", response_model=OrganizationJoinCodeResponse)
def get_organization_join_code(
    organization_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the active join code for this organization (ADMIN/OWNER only)."""
    service = OrganizationService(db)
    return service.get_join_code(organization_id, current_user)


@router.post("/{organization_id}/join-code/regenerate", response_model=OrganizationJoinCodeResponse)
def regenerate_organization_join_code(
    organization_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Regenerate a new join code, invalidating previous code (ADMIN/OWNER only)."""
    service = OrganizationService(db)
    return service.regenerate_join_code(organization_id, current_user)


@router.put("/{organization_id}/join-code/toggle", response_model=OrganizationJoinCodeResponse)
def toggle_organization_join_code(
    organization_id: str,
    is_active: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Enable or disable the organization join code (ADMIN/OWNER only)."""
    service = OrganizationService(db)
    return service.toggle_join_code(organization_id, is_active, current_user)
