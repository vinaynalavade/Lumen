from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceRole, WorkspaceMember
from app.repositories.workspace_repo import workspace_repo
from app.repositories.user_repo import user_repo
from app.schemas.workspace import (
    WorkspaceCreate,
    WorkspaceUpdate,
    WorkspaceResponse,
    WorkspaceMemberResponse,
    WorkspaceMemberAdd,
    WorkspaceMemberUpdate,
)
from app.schemas.user import UserResponse


class WorkspaceService:
    @staticmethod
    def create_workspace(db: Session, obj_in: WorkspaceCreate, current_user: User) -> WorkspaceResponse:
        workspace = workspace_repo.create_workspace_with_owner(
            db, obj_in, current_user.id, organization_id=obj_in.organization_id
        )
        return WorkspaceResponse(
            id=workspace.id,
            name=workspace.name,
            slug=workspace.slug,
            description=workspace.description,
            owner_id=workspace.owner_id,
            organization_id=workspace.organization_id,
            created_at=workspace.created_at,
            updated_at=workspace.updated_at,
            owner=UserResponse.model_validate(current_user),
            current_user_role=WorkspaceRole.OWNER,
            project_count=0,
            member_count=1
        )

    @staticmethod
    def get_user_workspaces(
        db: Session, current_user: User, organization_id: Optional[str] = None
    ) -> List[WorkspaceResponse]:
        workspaces = workspace_repo.get_user_workspaces(db, current_user.id, organization_id=organization_id)
        result = []
        for ws in workspaces:
            membership = workspace_repo.get_membership(db, ws.id, current_user.id)
            user_role = membership.role if membership else None
            result.append(
                WorkspaceResponse(
                    id=ws.id,
                    name=ws.name,
                    slug=ws.slug,
                    description=ws.description,
                    owner_id=ws.owner_id,
                    organization_id=ws.organization_id,
                    created_at=ws.created_at,
                    updated_at=ws.updated_at,
                    owner=UserResponse.model_validate(ws.owner) if ws.owner else None,
                    current_user_role=user_role,
                    project_count=len(ws.projects),
                    member_count=len(ws.members)
                )
            )
        return result

    @staticmethod
    def get_workspace_by_id(db: Session, workspace_id: str, current_user: User) -> WorkspaceResponse:
        ws = workspace_repo.get(db, workspace_id)
        if not ws:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
        
        membership = workspace_repo.get_membership(db, ws.id, current_user.id)
        if not membership and not current_user.is_superuser:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this workspace.")
        
        return WorkspaceResponse(
            id=ws.id,
            name=ws.name,
            slug=ws.slug,
            description=ws.description,
            owner_id=ws.owner_id,
            created_at=ws.created_at,
            updated_at=ws.updated_at,
            owner=UserResponse.model_validate(ws.owner) if ws.owner else None,
            current_user_role=membership.role if membership else WorkspaceRole.VIEWER,
            project_count=len(ws.projects),
            member_count=len(ws.members)
        )

    @staticmethod
    def update_workspace(
        db: Session, workspace_id: str, obj_in: WorkspaceUpdate, current_user: User
    ) -> WorkspaceResponse:
        ws = workspace_repo.get(db, workspace_id)
        if not ws:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
        
        membership = workspace_repo.get_membership(db, ws.id, current_user.id)
        if not membership or membership.role not in [WorkspaceRole.OWNER, WorkspaceRole.ADMIN]:
            if not current_user.is_superuser:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owners and admins can edit workspace settings.")
        
        updated_ws = workspace_repo.update(db, ws, obj_in)
        return WorkspaceResponse(
            id=updated_ws.id,
            name=updated_ws.name,
            slug=updated_ws.slug,
            description=updated_ws.description,
            owner_id=updated_ws.owner_id,
            created_at=updated_ws.created_at,
            updated_at=updated_ws.updated_at,
            owner=UserResponse.model_validate(updated_ws.owner) if updated_ws.owner else None,
            current_user_role=membership.role if membership else WorkspaceRole.OWNER,
            project_count=len(updated_ws.projects),
            member_count=len(updated_ws.members)
        )

    @staticmethod
    def get_workspace_members(db: Session, workspace_id: str, current_user: User) -> List[WorkspaceMemberResponse]:
        ws = workspace_repo.get(db, workspace_id)
        if not ws:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
        
        membership = workspace_repo.get_membership(db, ws.id, current_user.id)
        if not membership and not current_user.is_superuser:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        
        members = workspace_repo.get_members(db, workspace_id)
        return [
            WorkspaceMemberResponse(
                id=m.id,
                workspace_id=m.workspace_id,
                user_id=m.user_id,
                role=m.role,
                joined_at=m.created_at,
                user=UserResponse.model_validate(m.user)
            )
            for m in members
        ]

    @staticmethod
    def add_workspace_member(
        db: Session, workspace_id: str, obj_in: WorkspaceMemberAdd, current_user: User
    ) -> WorkspaceMemberResponse:
        ws = workspace_repo.get(db, workspace_id)
        if not ws:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")

        caller_membership = workspace_repo.get_membership(db, ws.id, current_user.id)
        if not caller_membership or caller_membership.role not in [WorkspaceRole.OWNER, WorkspaceRole.ADMIN]:
            if not current_user.is_superuser:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owners and admins can add members.")

        target_user = user_repo.get_by_email(db, obj_in.email)
        if not target_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with email '{obj_in.email}' not found.")

        existing = workspace_repo.get_membership(db, ws.id, target_user.id)
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already a member of this workspace.")

        member = workspace_repo.add_member(db, workspace_id=ws.id, user_id=target_user.id, role=obj_in.role)
        return WorkspaceMemberResponse(
            id=member.id,
            workspace_id=member.workspace_id,
            user_id=member.user_id,
            role=member.role,
            joined_at=member.created_at,
            user=UserResponse.model_validate(target_user)
        )

    @staticmethod
    def update_workspace_member(
        db: Session, workspace_id: str, member_user_id: str, obj_in: WorkspaceMemberUpdate, current_user: User
    ) -> WorkspaceMemberResponse:
        ws = workspace_repo.get(db, workspace_id)
        if not ws:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")

        caller_membership = workspace_repo.get_membership(db, ws.id, current_user.id)
        if not caller_membership or caller_membership.role not in [WorkspaceRole.OWNER, WorkspaceRole.ADMIN]:
            if not current_user.is_superuser:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owners and admins can update member roles.")

        member = workspace_repo.get_membership(db, ws.id, member_user_id)
        if not member:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace member not found.")

        if member.user_id == ws.owner_id and obj_in.role != WorkspaceRole.OWNER:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot change role of workspace owner.")

        member.role = obj_in.role
        db.commit()
        db.refresh(member)

        return WorkspaceMemberResponse(
            id=member.id,
            workspace_id=member.workspace_id,
            user_id=member.user_id,
            role=member.role,
            joined_at=member.created_at,
            user=UserResponse.model_validate(member.user)
        )

    @staticmethod
    def remove_workspace_member(
        db: Session, workspace_id: str, member_user_id: str, current_user: User
    ) -> None:
        ws = workspace_repo.get(db, workspace_id)
        if not ws:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")

        caller_membership = workspace_repo.get_membership(db, ws.id, current_user.id)
        is_self = member_user_id == current_user.id
        if not is_self and (not caller_membership or caller_membership.role not in [WorkspaceRole.OWNER, WorkspaceRole.ADMIN]):
            if not current_user.is_superuser:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owners and admins can remove members.")

        member = workspace_repo.get_membership(db, ws.id, member_user_id)
        if not member:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace member not found.")

        if member.user_id == ws.owner_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove the workspace owner.")

        db.delete(member)
        db.commit()


workspace_service = WorkspaceService()
