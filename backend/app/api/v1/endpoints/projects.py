from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.project import ProjectUpdate, ProjectResponse, ProjectSummary
from app.services.project_service import project_service

router = APIRouter()


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve details of a project by ID."""
    return project_service.get_project_by_id(db, project_id, current_user)


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    project_in: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update project details."""
    return project_service.update_project(db, project_id, project_in, current_user)


@router.get("/{project_id}/summary", response_model=ProjectSummary)
def get_project_summary(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get high-level summary & quality dashboard metrics for project."""
    return project_service.get_project_summary(db, project_id, current_user)
