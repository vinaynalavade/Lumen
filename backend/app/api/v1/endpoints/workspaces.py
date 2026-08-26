from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.workspace import (
    WorkspaceCreate,
    WorkspaceUpdate,
    WorkspaceResponse,
    WorkspaceMemberResponse,
    WorkspaceMemberAdd,
    WorkspaceMemberUpdate,
)
from app.schemas.project import ProjectCreate, ProjectResponse
from app.services.workspace_service import workspace_service
from app.services.project_service import project_service

router = APIRouter()


@router.get("", response_model=List[WorkspaceResponse])
def get_workspaces(
    organization_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all workspaces the authenticated user belongs to (optionally filtered by organization)."""
    return workspace_service.get_user_workspaces(db, current_user, organization_id=organization_id)


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
def create_workspace(
    workspace_in: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new workspace with current user as owner."""
    return workspace_service.create_workspace(db, workspace_in, current_user)


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get details of a specific workspace."""
    return workspace_service.get_workspace_by_id(db, workspace_id, current_user)


@router.put("/{workspace_id}", response_model=WorkspaceResponse)
def update_workspace(
    workspace_id: str,
    workspace_in: WorkspaceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update workspace details (admin/owner only)."""
    return workspace_service.update_workspace(db, workspace_id, workspace_in, current_user)


@router.get("/{workspace_id}/members", response_model=List[WorkspaceMemberResponse])
def get_workspace_members(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List members of a workspace."""
    return workspace_service.get_workspace_members(db, workspace_id, current_user)


@router.post("/{workspace_id}/members", response_model=WorkspaceMemberResponse, status_code=status.HTTP_201_CREATED)
def add_workspace_member(
    workspace_id: str,
    member_in: WorkspaceMemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a new member to the workspace (admin/owner only)."""
    return workspace_service.add_workspace_member(db, workspace_id, member_in, current_user)


@router.put("/{workspace_id}/members/{user_id}", response_model=WorkspaceMemberResponse)
def update_workspace_member(
    workspace_id: str,
    user_id: str,
    member_in: WorkspaceMemberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a workspace member's role (admin/owner only)."""
    return workspace_service.update_workspace_member(db, workspace_id, user_id, member_in, current_user)


@router.delete("/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_workspace_member(
    workspace_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a member from the workspace (admin/owner or self)."""
    workspace_service.remove_workspace_member(db, workspace_id, user_id, current_user)


@router.get("/{workspace_id}/projects", response_model=List[ProjectResponse])
def get_workspace_projects(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all projects within the given workspace."""
    return project_service.get_workspace_projects(db, workspace_id, current_user)


@router.post("/{workspace_id}/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    workspace_id: str,
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new project inside the given workspace."""
    return project_service.create_project(db, workspace_id, project_in, current_user)
