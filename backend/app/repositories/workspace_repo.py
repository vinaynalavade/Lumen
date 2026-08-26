import re
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember, WorkspaceRole
from app.repositories.base import BaseRepository
from app.schemas.workspace import WorkspaceCreate


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text.strip('-')


class WorkspaceRepository(BaseRepository[Workspace]):
    def __init__(self):
        super().__init__(Workspace)

    def get_by_slug(self, db: Session, slug: str) -> Optional[Workspace]:
        return db.query(Workspace).filter(Workspace.slug == slug).first()

    def get_user_workspaces(self, db: Session, user_id: str) -> List[Workspace]:
        # Return all workspaces where the user is an owner or member
        return (
            db.query(Workspace)
            .join(WorkspaceMember, Workspace.id == WorkspaceMember.workspace_id)
            .filter(WorkspaceMember.user_id == user_id)
            .all()
        )

    def create_workspace_with_owner(
        self, db: Session, obj_in: WorkspaceCreate, owner_id: str
    ) -> Workspace:
        base_slug = obj_in.slug or slugify(obj_in.name)
        slug = base_slug
        counter = 1
        while self.get_by_slug(db, slug):
            slug = f"{base_slug}-{counter}"
            counter += 1

        db_workspace = Workspace(
            name=obj_in.name,
            slug=slug,
            description=obj_in.description,
            owner_id=owner_id
        )
        db.add(db_workspace)
        db.flush()

        # Add owner membership
        member = WorkspaceMember(
            workspace_id=db_workspace.id,
            user_id=owner_id,
            role=WorkspaceRole.OWNER
        )
        db.add(member)
        db.commit()
        db.refresh(db_workspace)
        return db_workspace

    def get_membership(self, db: Session, workspace_id: str, user_id: str) -> Optional[WorkspaceMember]:
        return (
            db.query(WorkspaceMember)
            .filter(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id
            )
            .first()
        )

    def get_members(self, db: Session, workspace_id: str) -> List[WorkspaceMember]:
        return (
            db.query(WorkspaceMember)
            .filter(WorkspaceMember.workspace_id == workspace_id)
            .all()
        )

    def add_member(self, db: Session, workspace_id: str, user_id: str, role: WorkspaceRole) -> WorkspaceMember:
        member = WorkspaceMember(
            workspace_id=workspace_id,
            user_id=user_id,
            role=role
        )
        db.add(member)
        db.commit()
        db.refresh(member)
        return member


workspace_repo = WorkspaceRepository()
