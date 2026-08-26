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
    WorkspaceMemberAdd
)
from app.schemas.user import UserResponse


class WorkspaceService:
    @staticmethod
    def create_workspace(db: Session, obj_in: WorkspaceCreate, current_user: User) -> WorkspaceResponse:
        workspace = workspace_repo.create_workspace_with_owner(db, obj_in, current_user.id)
        return WorkspaceResponse(
            id=workspace.id,
            name=workspace.name,
            slug=workspace.slug,
            description=workspace.description,
            owner_id=workspace.owner_id,
            created_at=workspace.created_at,
            updated_at=workspace.updated_at,
            owner=UserResponse.model_validate(current_user),
            current_user_role=WorkspaceRole.OWNER,
            project_count=0,
            member_count=1
        )

    @staticmethod
    def get_user_workspaces(db: Session, current_user: User) -> List[WorkspaceResponse]:
        workspaces = workspace_repo.get_user_workspaces(db, current_user.id)
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


workspace_service = WorkspaceService()
