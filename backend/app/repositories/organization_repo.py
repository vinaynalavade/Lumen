from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from app.models.organization import (
    Organization,
    OrganizationMember,
    OrganizationRole,
    OrganizationInvite,
    OrganizationJoinCode,
    generate_join_code,
    generate_invite_token,
)
from app.repositories.base import BaseRepository


class OrganizationRepository(BaseRepository[Organization]):
    def __init__(self, db: Session):
        super().__init__(Organization)
        self.db = db

    def get(self, id: str) -> Optional[Organization]:
        return self.db.get(Organization, str(id))

    def create(self, obj_in: Organization) -> Organization:
        self.db.add(obj_in)
        self.db.commit()
        self.db.refresh(obj_in)
        return obj_in

    def update(self, db_obj: Organization, update_data: dict) -> Organization:
        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def delete(self, db_obj: Organization) -> None:
        self.db.delete(db_obj)
        self.db.commit()

    def get_by_slug(self, slug: str) -> Optional[Organization]:
        return self.db.query(Organization).filter(Organization.slug == slug).first()

    def list_for_user(self, user_id: str) -> List[Organization]:
        """List all organizations where the user is an owner or member."""
        return (
            self.db.query(Organization)
            .outerjoin(OrganizationMember, Organization.id == OrganizationMember.organization_id)
            .filter(
                (Organization.owner_id == user_id) | (OrganizationMember.user_id == user_id)
            )
            .distinct()
            .order_by(Organization.created_at.desc())
            .all()
        )

    def get_member(self, organization_id: str, user_id: str) -> Optional[OrganizationMember]:
        return (
            self.db.query(OrganizationMember)
            .options(joinedload(OrganizationMember.user))
            .filter(
                OrganizationMember.organization_id == organization_id,
                OrganizationMember.user_id == user_id,
            )
            .first()
        )

    def list_members(self, organization_id: str) -> List[OrganizationMember]:
        return (
            self.db.query(OrganizationMember)
            .options(joinedload(OrganizationMember.user))
            .filter(OrganizationMember.organization_id == organization_id)
            .order_by(OrganizationMember.joined_at.asc())
            .all()
        )

    def add_member(
        self,
        organization_id: str,
        user_id: str,
        role: OrganizationRole = OrganizationRole.MEMBER,
        invited_by_id: Optional[str] = None,
    ) -> OrganizationMember:
        existing = self.get_member(organization_id, user_id)
        if existing:
            existing.role = role
            self.db.commit()
            self.db.refresh(existing)
            return existing

        member = OrganizationMember(
            organization_id=organization_id,
            user_id=user_id,
            role=role,
            invited_by_id=invited_by_id,
            joined_at=datetime.now(timezone.utc),
        )
        self.db.add(member)
        self.db.commit()
        self.db.refresh(member)
        return member

    def update_member_role(
        self,
        organization_id: str,
        user_id: str,
        new_role: OrganizationRole,
    ) -> Optional[OrganizationMember]:
        member = self.get_member(organization_id, user_id)
        if member:
            member.role = new_role
            self.db.commit()
            self.db.refresh(member)
        return member

    def remove_member(self, organization_id: str, user_id: str) -> bool:
        member = self.get_member(organization_id, user_id)
        if member:
            self.db.delete(member)
            self.db.commit()
            return True
        return False

    # -------------------------------------------------------------
    # Organization Invites
    # -------------------------------------------------------------
    def create_invite(
        self,
        organization_id: str,
        created_by_id: str,
        role: OrganizationRole = OrganizationRole.MEMBER,
        expires_at: Optional[datetime] = None,
        max_uses: int = 1,
    ) -> OrganizationInvite:
        invite = OrganizationInvite(
            organization_id=organization_id,
            token=generate_invite_token(),
            role=role,
            created_by_id=created_by_id,
            expires_at=expires_at,
            max_uses=max_uses,
            uses_count=0,
            is_revoked=False,
        )
        self.db.add(invite)
        self.db.commit()
        self.db.refresh(invite)
        return invite

    def get_invite_by_token(self, token: str) -> Optional[OrganizationInvite]:
        return (
            self.db.query(OrganizationInvite)
            .options(joinedload(OrganizationInvite.organization))
            .filter(OrganizationInvite.token == token)
            .first()
        )

    def list_invites(self, organization_id: str) -> List[OrganizationInvite]:
        return (
            self.db.query(OrganizationInvite)
            .filter(
                OrganizationInvite.organization_id == organization_id,
                OrganizationInvite.is_revoked == False,
            )
            .order_by(OrganizationInvite.created_at.desc())
            .all()
        )

    def revoke_invite(self, invite_id: str) -> bool:
        invite = self.db.query(OrganizationInvite).filter(OrganizationInvite.id == invite_id).first()
        if invite:
            invite.is_revoked = True
            self.db.commit()
            return True
        return False

    # -------------------------------------------------------------
    # Organization Join Codes
    # -------------------------------------------------------------
    def get_join_code(self, organization_id: str) -> Optional[OrganizationJoinCode]:
        return (
            self.db.query(OrganizationJoinCode)
            .filter(OrganizationJoinCode.organization_id == organization_id)
            .order_by(OrganizationJoinCode.created_at.desc())
            .first()
        )

    def get_by_join_code(self, code: str) -> Optional[OrganizationJoinCode]:
        return (
            self.db.query(OrganizationJoinCode)
            .options(joinedload(OrganizationJoinCode.organization))
            .filter(OrganizationJoinCode.code == code.strip().upper())
            .first()
        )

    def create_or_regenerate_join_code(
        self,
        organization_id: str,
        created_by_id: str,
        role: OrganizationRole = OrganizationRole.MEMBER,
        expires_at: Optional[datetime] = None,
        max_uses: Optional[int] = None,
    ) -> OrganizationJoinCode:
        existing = self.get_join_code(organization_id)
        if existing:
            existing.code = generate_join_code()
            existing.role = role
            existing.created_by_id = created_by_id
            existing.is_active = True
            existing.expires_at = expires_at
            existing.max_uses = max_uses
            existing.uses_count = 0
            self.db.commit()
            self.db.refresh(existing)
            return existing

        join_code = OrganizationJoinCode(
            organization_id=organization_id,
            code=generate_join_code(),
            role=role,
            created_by_id=created_by_id,
            is_active=True,
            expires_at=expires_at,
            max_uses=max_uses,
            uses_count=0,
        )
        self.db.add(join_code)
        self.db.commit()
        self.db.refresh(join_code)
        return join_code

    def toggle_join_code(self, organization_id: str, is_active: bool) -> Optional[OrganizationJoinCode]:
        join_code = self.get_join_code(organization_id)
        if join_code:
            join_code.is_active = is_active
            self.db.commit()
            self.db.refresh(join_code)
        return join_code
