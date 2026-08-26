from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.services.organization_service import OrganizationService
from app.schemas.organization import (
    OrganizationResponse,
    OrganizationInvitePublicResponse,
)

router = APIRouter()


@router.get("/{token}", response_model=OrganizationInvitePublicResponse)
def get_public_invite_preview(
    token: str,
    db: Session = Depends(get_db),
):
    """Public endpoint to check if an invitation token is valid before acceptance or login."""
    service = OrganizationService(db)
    return service.get_public_invite_preview(token)


@router.post("/{token}/accept", response_model=OrganizationResponse)
def accept_organization_invite(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Accept an organization invitation and become an active member."""
    service = OrganizationService(db)
    return service.accept_invite(token, current_user)
