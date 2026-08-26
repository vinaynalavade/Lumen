from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.workspace import (
    WorkspaceCreate,
    WorkspaceUpdate,
    WorkspaceResponse,
    WorkspaceMemberResponse
)
from app.schemas.project import ProjectCreate, ProjectResponse
from app.services.workspace_service import workspace_service
from app.services.project_service import project_service

router = APIRouter()


@router.get("", response_model=List[WorkspaceResponse])
def get_workspaces(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all workspaces the authenticated user belongs to."""
    return workspace_service.get_user_workspaces(db, current_user)


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
