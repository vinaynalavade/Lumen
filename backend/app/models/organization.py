import enum
import secrets
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Integer,
    ForeignKey,
    Enum as SQLEnum,
    UniqueConstraint,
    DateTime,
)
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class OrganizationRole(str, enum.Enum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"
    VIEWER = "VIEWER"


def generate_join_code() -> str:
    """Generate a human-friendly secure join code in format LUMEN-XXXX-YYYY."""
    token = secrets.token_hex(4).upper()
    return f"LUMEN-{token[:4]}-{token[4:]}"


def generate_invite_token() -> str:
    """Generate a secure url-safe token for organization invitations."""
    return secrets.token_urlsafe(32)


class Organization(BaseModel):
    __tablename__ = "organizations"

    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(String(1000), nullable=True)
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    owner = relationship("User", foreign_keys=[owner_id], back_populates="owned_organizations")
    members = relationship("OrganizationMember", back_populates="organization", cascade="all, delete-orphan")
    invites = relationship("OrganizationInvite", back_populates="organization", cascade="all, delete-orphan")
    join_codes = relationship("OrganizationJoinCode", back_populates="organization", cascade="all, delete-orphan")
    workspaces = relationship("Workspace", back_populates="organization", cascade="all, delete-orphan")


class OrganizationMember(BaseModel):
    __tablename__ = "organization_members"
    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", name="uq_organization_member"),
    )

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(SQLEnum(OrganizationRole), default=OrganizationRole.MEMBER, nullable=False)
    invited_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    joined_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="members")
    user = relationship("User", foreign_keys=[user_id], back_populates="organization_memberships")
    inviter = relationship("User", foreign_keys=[invited_by_id])


class OrganizationInvite(BaseModel):
    __tablename__ = "organization_invites"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String(128), unique=True, index=True, default=generate_invite_token, nullable=False)
    role = Column(SQLEnum(OrganizationRole), default=OrganizationRole.MEMBER, nullable=False)
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    max_uses = Column(Integer, default=1, nullable=False)
    uses_count = Column(Integer, default=0, nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="invites")
    creator = relationship("User", foreign_keys=[created_by_id])


class OrganizationJoinCode(BaseModel):
    __tablename__ = "organization_join_codes"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(50), unique=True, index=True, default=generate_join_code, nullable=False)
    role = Column(SQLEnum(OrganizationRole), default=OrganizationRole.MEMBER, nullable=False)
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    max_uses = Column(Integer, nullable=True)
    uses_count = Column(Integer, default=0, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="join_codes")
    creator = relationship("User", foreign_keys=[created_by_id])
