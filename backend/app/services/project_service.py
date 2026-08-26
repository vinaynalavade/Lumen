from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.project import Project, ProjectStatus
from app.models.workspace_member import WorkspaceRole
from app.models.manual_testing import TestCase, TestRun, TestCaseStatus
from app.repositories.workspace_repo import workspace_repo
from app.repositories.project_repo import project_repo
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectSummary
from app.schemas.user import UserResponse


class ProjectService:
    @staticmethod
    def create_project(
        db: Session, workspace_id: str, obj_in: ProjectCreate, current_user: User
    ) -> ProjectResponse:
        # Check workspace access & permissions
        membership = workspace_repo.get_membership(db, workspace_id, current_user.id)
        if not membership and not current_user.is_superuser:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this workspace.")
        
        if membership.role == WorkspaceRole.VIEWER and not current_user.is_superuser:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Viewers cannot create projects.")

        # Check unique key within workspace
        existing = project_repo.get_by_key(db, workspace_id, obj_in.key)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A project with key '{obj_in.key.upper()}' already exists in this workspace."
            )

        project = project_repo.create_project(db, obj_in, workspace_id, current_user.id)
        return ProjectResponse(
            id=project.id,
            workspace_id=project.workspace_id,
            name=project.name,
            key=project.key,
            description=project.description,
            status=project.status,
            created_by_id=project.created_by_id,
            created_at=project.created_at,
            updated_at=project.updated_at,
            creator=UserResponse.model_validate(current_user)
        )

    @staticmethod
    def get_workspace_projects(
        db: Session, workspace_id: str, current_user: User, status: Optional[ProjectStatus] = None
    ) -> List[ProjectResponse]:
        membership = workspace_repo.get_membership(db, workspace_id, current_user.id)
        if not membership and not current_user.is_superuser:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this workspace.")

        projects = project_repo.get_workspace_projects(db, workspace_id, status)
        return [
            ProjectResponse(
                id=p.id,
                workspace_id=p.workspace_id,
                name=p.name,
                key=p.key,
                description=p.description,
                status=p.status,
                created_by_id=p.created_by_id,
                created_at=p.created_at,
                updated_at=p.updated_at,
                creator=UserResponse.model_validate(p.creator) if p.creator else None
            )
            for p in projects
        ]

    @staticmethod
    def get_project_by_id(db: Session, project_id: str, current_user: User) -> ProjectResponse:
        project = project_repo.get(db, project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

        membership = workspace_repo.get_membership(db, project.workspace_id, current_user.id)
        if not membership and not current_user.is_superuser:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this project.")

        return ProjectResponse(
            id=project.id,
            workspace_id=project.workspace_id,
            name=project.name,
            key=project.key,
            description=project.description,
            status=project.status,
            created_by_id=project.created_by_id,
            created_at=project.created_at,
            updated_at=project.updated_at,
            creator=UserResponse.model_validate(project.creator) if project.creator else None
        )

    @staticmethod
    def update_project(
        db: Session, project_id: str, obj_in: ProjectUpdate, current_user: User
    ) -> ProjectResponse:
        project = project_repo.get(db, project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

        membership = workspace_repo.get_membership(db, project.workspace_id, current_user.id)
        if not membership or membership.role == WorkspaceRole.VIEWER:
            if not current_user.is_superuser:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to modify project.")

        updated_project = project_repo.update(db, project, obj_in)
        return ProjectResponse(
            id=updated_project.id,
            workspace_id=updated_project.workspace_id,
            name=updated_project.name,
            key=updated_project.key,
            description=updated_project.description,
            status=updated_project.status,
            created_by_id=updated_project.created_by_id,
            created_at=updated_project.created_at,
            updated_at=updated_project.updated_at,
            creator=UserResponse.model_validate(updated_project.creator) if updated_project.creator else None
        )

    @staticmethod
    def get_project_summary(db: Session, project_id: str, current_user: User) -> ProjectSummary:
        project = project_repo.get(db, project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

        membership = workspace_repo.get_membership(db, project.workspace_id, current_user.id)
        if not membership and not current_user.is_superuser:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        # Real-time counts from Phase 1 manual testing entities
        case_count = (
            db.query(TestCase)
            .filter(TestCase.project_id == project_id, TestCase.status != TestCaseStatus.ARCHIVED)
            .count()
        )
        run_count = db.query(TestRun).filter(TestRun.project_id == project_id).count()

        return ProjectSummary(
            total_test_cases=case_count,
            total_test_runs=run_count,
            total_bugs=0,
            total_api_endpoints=0,
            total_db_validations=0,
            total_automation_runs=0,
            recent_activity=[]
        )


project_service = ProjectService()
