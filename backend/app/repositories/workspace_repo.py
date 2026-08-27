import re
from typing import List, Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember, WorkspaceRole
from app.models.organization import OrganizationMember, OrganizationRole
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

    def get_user_workspaces(
        self, db: Session, user_id: str, organization_id: Optional[str] = None
    ) -> List[Workspace]:
        """
        Return all workspaces accessible to the user:
        1. User is the workspace owner
        2. User has a direct WorkspaceMember record
        3. User is an OrganizationMember in the workspace's parent organization
        """
        user_org_ids = [
            om.organization_id
            for om in db.query(OrganizationMember.organization_id)
            .filter(OrganizationMember.user_id == user_id)
            .all()
        ]

        query = db.query(Workspace).outerjoin(
            WorkspaceMember, Workspace.id == WorkspaceMember.workspace_id
        )

        conditions = [
            Workspace.owner_id == user_id,
            WorkspaceMember.user_id == user_id,
        ]
        if user_org_ids:
            conditions.append(Workspace.organization_id.in_(user_org_ids))

        query = query.filter(or_(*conditions))

        if organization_id:
            from app.models.organization import Organization
            org = db.query(Organization).filter(Organization.id == organization_id).first()
            if org:
                query = query.filter(
                    or_(
                        Workspace.organization_id == organization_id,
                        (Workspace.organization_id.is_(None) & (Workspace.owner_id == org.owner_id))
                    )
                )
            else:
                query = query.filter(Workspace.organization_id == organization_id)

        return query.distinct().all()

    def create_workspace_with_owner(
        self, db: Session, obj_in: WorkspaceCreate, owner_id: str, organization_id: Optional[str] = None
    ) -> Workspace:
        base_slug = obj_in.slug or slugify(obj_in.name)
        slug = base_slug
        counter = 1
        while self.get_by_slug(db, slug):
            slug = f"{base_slug}-{counter}"
            counter += 1

        org_id = obj_in.organization_id or organization_id
        if not org_id:
            user_org = (
                db.query(OrganizationMember)
                .filter(
                    OrganizationMember.user_id == owner_id,
                    OrganizationMember.role.in_([OrganizationRole.OWNER, OrganizationRole.ADMIN])
                )
                .order_by(OrganizationMember.created_at.asc())
                .first()
            )
            if user_org:
                org_id = user_org.organization_id

        db_workspace = Workspace(
            name=obj_in.name,
            slug=slug,
            description=obj_in.description,
            owner_id=owner_id,
            organization_id=org_id,
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

        # Propagate workspace access to all existing organization members
        if org_id:
            org_members = (
                db.query(OrganizationMember)
                .filter(OrganizationMember.organization_id == org_id)
                .all()
            )
            role_map = {
                OrganizationRole.OWNER: WorkspaceRole.OWNER,
                OrganizationRole.ADMIN: WorkspaceRole.ADMIN,
                OrganizationRole.MEMBER: WorkspaceRole.MEMBER,
                OrganizationRole.VIEWER: WorkspaceRole.VIEWER,
            }
            for om in org_members:
                if om.user_id != owner_id:
                    db.add(WorkspaceMember(
                        workspace_id=db_workspace.id,
                        user_id=om.user_id,
                        role=role_map.get(om.role, WorkspaceRole.MEMBER)
                    ))

        db.commit()
        db.refresh(db_workspace)
        return db_workspace

    def get_membership(self, db: Session, workspace_id: str, user_id: str) -> Optional[WorkspaceMember]:
        """
        Get workspace membership. If no explicit WorkspaceMember row exists,
        check if user has access via parent Organization membership and synthesize effective role.
        """
        # Direct membership check
        direct = (
            db.query(WorkspaceMember)
            .filter(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id
            )
            .first()
        )
        if direct:
            return direct

        ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not ws:
            return None

        if ws.owner_id == user_id:
            return WorkspaceMember(
                id=f"owner-{ws.id}-{user_id}",
                workspace_id=ws.id,
                user_id=user_id,
                role=WorkspaceRole.OWNER,
                user=ws.owner,
            )

        if ws.organization_id:
            org_member = (
                db.query(OrganizationMember)
                .filter(
                    OrganizationMember.organization_id == ws.organization_id,
                    OrganizationMember.user_id == user_id
                )
                .first()
            )
            if org_member:
                role_map = {
                    OrganizationRole.OWNER: WorkspaceRole.OWNER,
                    OrganizationRole.ADMIN: WorkspaceRole.ADMIN,
                    OrganizationRole.MEMBER: WorkspaceRole.MEMBER,
                    OrganizationRole.VIEWER: WorkspaceRole.VIEWER,
                }
                ws_role = role_map.get(org_member.role, WorkspaceRole.MEMBER)
                return WorkspaceMember(
                    id=f"org-{ws.id}-{user_id}",
                    workspace_id=ws.id,
                    user_id=user_id,
                    role=ws_role,
                    user=org_member.user,
                )

        return None

    def get_members(self, db: Session, workspace_id: str) -> List[WorkspaceMember]:
        """
        Return all members of a workspace, including organization members who inherit access.
        """
        ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not ws:
            return []

        direct_members = (
            db.query(WorkspaceMember)
            .filter(WorkspaceMember.workspace_id == workspace_id)
            .all()
        )
        member_user_ids = {m.user_id for m in direct_members}
        result = list(direct_members)

        if ws.organization_id:
            org_members = (
                db.query(OrganizationMember)
                .filter(OrganizationMember.organization_id == ws.organization_id)
                .all()
            )
            role_map = {
                OrganizationRole.OWNER: WorkspaceRole.OWNER,
                OrganizationRole.ADMIN: WorkspaceRole.ADMIN,
                OrganizationRole.MEMBER: WorkspaceRole.MEMBER,
                OrganizationRole.VIEWER: WorkspaceRole.VIEWER,
            }
            for om in org_members:
                if om.user_id not in member_user_ids:
                    synth_member = WorkspaceMember(
                        id=f"org-{ws.id}-{om.user_id}",
                        workspace_id=ws.id,
                        user_id=om.user_id,
                        role=role_map.get(om.role, WorkspaceRole.MEMBER),
                        user=om.user,
                        created_at=om.created_at,
                    )
                    result.append(synth_member)
                    member_user_ids.add(om.user_id)

        return result

    def add_member(self, db: Session, workspace_id: str, user_id: str, role: WorkspaceRole) -> WorkspaceMember:
        existing = (
            db.query(WorkspaceMember)
            .filter(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id
            )
            .first()
        )
        if existing:
            return existing

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
