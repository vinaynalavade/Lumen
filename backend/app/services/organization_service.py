import re
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.organization import (
    Organization,
    OrganizationMember,
    OrganizationRole,
    OrganizationInvite,
    OrganizationJoinCode,
)
from app.models.user import User
from app.repositories.organization_repo import OrganizationRepository
from app.repositories.user_repo import user_repo
from app.repositories.workspace_repo import workspace_repo
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationResponse,
    OrganizationMemberResponse,
    OrganizationMemberAdd,
    OrganizationMemberUpdate,
    OrganizationInviteCreate,
    OrganizationInviteResponse,
    OrganizationInvitePublicResponse,
    OrganizationJoinCodeResponse,
    OrganizationJoinRequest,
)
from app.schemas.workspace import WorkspaceCreate


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text.strip('-')


class OrganizationService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = OrganizationRepository(db)

    def _get_user_org_role(self, organization_id: str, user: User) -> Optional[OrganizationRole]:
        if user.is_superuser:
            return OrganizationRole.OWNER

        org = self.repo.get(organization_id)
        if not org:
            return None

        if org.owner_id == user.id:
            return OrganizationRole.OWNER

        member = self.repo.get_member(organization_id, user.id)
        return member.role if member else None

    def _ensure_org_access(
        self,
        organization_id: str,
        user: User,
        min_role: OrganizationRole = OrganizationRole.VIEWER,
    ) -> OrganizationRole:
        role = self._get_user_org_role(organization_id, user)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this Organization.",
            )

        hierarchy = {
            OrganizationRole.VIEWER: 1,
            OrganizationRole.MEMBER: 2,
            OrganizationRole.ADMIN: 3,
            OrganizationRole.OWNER: 4,
        }

        if hierarchy[role] < hierarchy[min_role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action requires at least {min_role.value} permission in this Organization.",
            )

        return role

    def create_organization(self, obj_in: OrganizationCreate, current_user: User) -> OrganizationResponse:
        base_slug = obj_in.slug or slugify(obj_in.name)
        slug = base_slug
        counter = 1
        while self.repo.get_by_slug(slug):
            slug = f"{base_slug}-{counter}"
            counter += 1

        org = Organization(
            name=obj_in.name.strip(),
            slug=slug,
            description=obj_in.description.strip() if obj_in.description else None,
            owner_id=current_user.id,
        )
        self.db.add(org)
        self.db.flush()

        # Add creator as OWNER member
        self.repo.add_member(org.id, current_user.id, OrganizationRole.OWNER)

        # Generate default join code
        self.repo.create_or_regenerate_join_code(org.id, current_user.id, OrganizationRole.MEMBER)

        # Optionally create initial default workspace
        if obj_in.create_default_workspace:
            ws_name = obj_in.default_workspace_name or "Main Workspace"
            workspace_repo.create_workspace_with_owner(
                self.db,
                WorkspaceCreate(name=ws_name, organization_id=org.id),
                owner_id=current_user.id,
                organization_id=org.id,
            )

        self.db.commit()
        self.db.refresh(org)
        return self._to_response(org, current_user)

    def list_user_organizations(self, current_user: User) -> List[OrganizationResponse]:
        orgs = self.repo.list_for_user(current_user.id)
        return [self._to_response(org, current_user) for org in orgs]

    def get_organization(self, organization_id: str, current_user: User) -> OrganizationResponse:
        self._ensure_org_access(organization_id, current_user, OrganizationRole.VIEWER)
        org = self.repo.get(organization_id)
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")
        return self._to_response(org, current_user)

    def update_organization(
        self, organization_id: str, obj_in: OrganizationUpdate, current_user: User
    ) -> OrganizationResponse:
        self._ensure_org_access(organization_id, current_user, OrganizationRole.ADMIN)
        org = self.repo.get(organization_id)
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

        if obj_in.name is not None:
            org.name = obj_in.name.strip()
        if obj_in.description is not None:
            org.description = obj_in.description.strip() if obj_in.description else None

        self.db.commit()
        self.db.refresh(org)
        return self._to_response(org, current_user)

    def delete_organization(self, organization_id: str, current_user: User) -> dict:
        self._ensure_org_access(organization_id, current_user, OrganizationRole.OWNER)
        org = self.repo.get(organization_id)
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

        self.repo.delete(org)
        return {"message": "Organization deleted successfully"}

    # -------------------------------------------------------------
    # Member Management
    # -------------------------------------------------------------
    def list_members(self, organization_id: str, current_user: User) -> List[OrganizationMemberResponse]:
        self._ensure_org_access(organization_id, current_user, OrganizationRole.VIEWER)
        members = self.repo.list_members(organization_id)
        return [OrganizationMemberResponse.model_validate(m) for m in members]

    def add_member(
        self, organization_id: str, email: str, role: OrganizationRole, current_user: User
    ) -> OrganizationMemberResponse:
        self._ensure_org_access(organization_id, current_user, OrganizationRole.ADMIN)
        target_user = user_repo.get_by_email(self.db, email.strip().lower())
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No user found with email '{email}'. They must register first or join via invitation link.",
            )

        member = self.repo.add_member(
            organization_id,
            target_user.id,
            role=role,
            invited_by_id=current_user.id,
        )
        return OrganizationMemberResponse.model_validate(member)

    def update_member_role(
        self, organization_id: str, target_user_id: str, new_role: OrganizationRole, current_user: User
    ) -> OrganizationMemberResponse:
        self._ensure_org_access(organization_id, current_user, OrganizationRole.ADMIN)
        org = self.repo.get(organization_id)
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

        if org.owner_id == target_user_id and new_role != OrganizationRole.OWNER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the primary Organization Owner.",
            )

        member = self.repo.update_member_role(organization_id, target_user_id, new_role)
        if not member:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization member not found.")
        return OrganizationMemberResponse.model_validate(member)

    def remove_member(self, organization_id: str, target_user_id: str, current_user: User) -> dict:
        self._ensure_org_access(organization_id, current_user, OrganizationRole.ADMIN)
        org = self.repo.get(organization_id)
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

        if org.owner_id == target_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the Organization Owner.",
            )

        removed = self.repo.remove_member(organization_id, target_user_id)
        if not removed:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization member not found.")
        return {"message": "Member removed from Organization successfully"}

    # -------------------------------------------------------------
    # Organization Invites
    # -------------------------------------------------------------
    def create_invite(
        self, organization_id: str, obj_in: OrganizationInviteCreate, current_user: User
    ) -> OrganizationInviteResponse:
        self._ensure_org_access(organization_id, current_user, OrganizationRole.ADMIN)
        expires_at = None
        if obj_in.expires_in_days:
            expires_at = datetime.now(timezone.utc) + timedelta(days=obj_in.expires_in_days)

        invite = self.repo.create_invite(
            organization_id=organization_id,
            created_by_id=current_user.id,
            role=obj_in.role,
            expires_at=expires_at,
            max_uses=obj_in.max_uses or 1,
        )
        return OrganizationInviteResponse.model_validate(invite)

    def list_invites(self, organization_id: str, current_user: User) -> List[OrganizationInviteResponse]:
        self._ensure_org_access(organization_id, current_user, OrganizationRole.ADMIN)
        invites = self.repo.list_invites(organization_id)
        return [OrganizationInviteResponse.model_validate(inv) for inv in invites]

    def revoke_invite(self, organization_id: str, invite_id: str, current_user: User) -> dict:
        self._ensure_org_access(organization_id, current_user, OrganizationRole.ADMIN)
        revoked = self.repo.revoke_invite(invite_id)
        if not revoked:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found.")
        return {"message": "Invite revoked successfully"}

    def _is_expired(self, dt: Optional[datetime]) -> bool:
        if not dt:
            return False
        now = datetime.now(timezone.utc)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt < now

    def get_public_invite_preview(self, token: str) -> OrganizationInvitePublicResponse:
        invite = self.repo.get_invite_by_token(token)
        if not invite:
            return OrganizationInvitePublicResponse(
                token=token,
                organization_name="",
                organization_id="",
                role=OrganizationRole.MEMBER,
                is_valid=False,
                message="Invitation link is invalid or does not exist.",
            )

        if invite.is_revoked:
            return OrganizationInvitePublicResponse(
                token=token,
                organization_name=invite.organization.name,
                organization_id=invite.organization_id,
                role=invite.role,
                is_valid=False,
                message="This invitation has been revoked by the organization administrator.",
            )

        if self._is_expired(invite.expires_at):
            return OrganizationInvitePublicResponse(
                token=token,
                organization_name=invite.organization.name,
                organization_id=invite.organization_id,
                role=invite.role,
                is_valid=False,
                message="This invitation has expired.",
            )

        if invite.max_uses and invite.uses_count >= invite.max_uses:
            return OrganizationInvitePublicResponse(
                token=token,
                organization_name=invite.organization.name,
                organization_id=invite.organization_id,
                role=invite.role,
                is_valid=False,
                message="This invitation link has reached its maximum allowed uses.",
            )

        return OrganizationInvitePublicResponse(
            token=token,
            organization_name=invite.organization.name,
            organization_id=invite.organization_id,
            role=invite.role,
            is_valid=True,
            message="Invitation is valid.",
        )

    def accept_invite(self, token: str, current_user: User) -> OrganizationResponse:
        invite = self.repo.get_invite_by_token(token)
        if not invite or invite.is_revoked:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invitation is invalid or has been revoked.",
            )

        if self._is_expired(invite.expires_at):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This invitation link has expired.",
            )

        if invite.max_uses and invite.uses_count >= invite.max_uses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This invitation link has reached its maximum uses.",
            )

        # Add user to organization
        self.repo.add_member(
            organization_id=invite.organization_id,
            user_id=current_user.id,
            role=invite.role,
            invited_by_id=invite.created_by_id,
        )

        invite.uses_count += 1
        self.db.commit()

        org = self.repo.get(invite.organization_id)
        return self._to_response(org, current_user)

    # -------------------------------------------------------------
    # Organization Join Codes
    # -------------------------------------------------------------
    def get_join_code(self, organization_id: str, current_user: User) -> OrganizationJoinCodeResponse:
        self._ensure_org_access(organization_id, current_user, OrganizationRole.ADMIN)
        code_obj = self.repo.get_join_code(organization_id)
        if not code_obj:
            code_obj = self.repo.create_or_regenerate_join_code(organization_id, current_user.id)
        return OrganizationJoinCodeResponse.model_validate(code_obj)

    def regenerate_join_code(self, organization_id: str, current_user: User) -> OrganizationJoinCodeResponse:
        self._ensure_org_access(organization_id, current_user, OrganizationRole.ADMIN)
        code_obj = self.repo.create_or_regenerate_join_code(organization_id, current_user.id)
        return OrganizationJoinCodeResponse.model_validate(code_obj)

    def toggle_join_code(
        self, organization_id: str, is_active: bool, current_user: User
    ) -> OrganizationJoinCodeResponse:
        self._ensure_org_access(organization_id, current_user, OrganizationRole.ADMIN)
        code_obj = self.repo.toggle_join_code(organization_id, is_active)
        if not code_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Join code not found.")
        return OrganizationJoinCodeResponse.model_validate(code_obj)

    def join_by_code(self, req: OrganizationJoinRequest, current_user: User) -> OrganizationResponse:
        code_str = req.join_code.strip().upper()
        code_obj = self.repo.get_by_join_code(code_str)
        if not code_obj or not code_obj.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or disabled Organization join code.",
            )

        if self._is_expired(code_obj.expires_at):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This Organization join code has expired.",
            )

        if code_obj.max_uses and code_obj.uses_count >= code_obj.max_uses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This join code has reached its maximum allowed uses.",
            )

        # Add member to organization
        self.repo.add_member(
            organization_id=code_obj.organization_id,
            user_id=current_user.id,
            role=code_obj.role,
            invited_by_id=code_obj.created_by_id,
        )

        code_obj.uses_count += 1
        self.db.commit()

        org = self.repo.get(code_obj.organization_id)
        return self._to_response(org, current_user)

    def _to_response(self, org: Organization, current_user: User) -> OrganizationResponse:
        current_role = self._get_user_org_role(org.id, current_user)
        ws_count = len(org.workspaces) if org.workspaces else 0
        mem_count = len(org.members) if org.members else 0

        return OrganizationResponse(
            id=org.id,
            name=org.name,
            slug=org.slug,
            description=org.description,
            owner_id=org.owner_id,
            current_user_role=current_role,
            workspace_count=ws_count,
            member_count=mem_count,
            created_at=org.created_at,
            updated_at=org.updated_at,
        )
