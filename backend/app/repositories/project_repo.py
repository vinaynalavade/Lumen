from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.project import Project, ProjectStatus
from app.repositories.base import BaseRepository
from app.schemas.project import ProjectCreate


class ProjectRepository(BaseRepository[Project]):
    def __init__(self):
        super().__init__(Project)

    def get_by_key(self, db: Session, workspace_id: str, key: str) -> Optional[Project]:
        return (
            db.query(Project)
            .filter(
                Project.workspace_id == workspace_id,
                Project.key == key.upper().strip()
            )
            .first()
        )

    def get_workspace_projects(
        self, db: Session, workspace_id: str, status: Optional[ProjectStatus] = None
    ) -> List[Project]:
        query = db.query(Project).filter(Project.workspace_id == workspace_id)
        if status:
            query = query.filter(Project.status == status)
        return query.order_by(Project.created_at.desc()).all()

    def create_project(
        self, db: Session, obj_in: ProjectCreate, workspace_id: str, user_id: str
    ) -> Project:
        db_project = Project(
            workspace_id=workspace_id,
            name=obj_in.name,
            key=obj_in.key.upper().strip(),
            description=obj_in.description,
            status=ProjectStatus.ACTIVE,
            created_by_id=user_id
        )
        db.add(db_project)
        db.commit()
        db.refresh(db_project)
        return db_project


project_repo = ProjectRepository()
