from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.user import UserUpdate, UserResponse
from app.repositories.user_repo import user_repo
from app.core.security import get_password_hash

router = APIRouter()


@router.get("/profile", response_model=UserResponse)
def get_user_profile(
    current_user: User = Depends(get_current_user)
):
    """Get current user details."""
    return UserResponse.model_validate(current_user)


@router.put("/profile", response_model=UserResponse)
def update_user_profile(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user profile info."""
    update_data = {}
    if user_in.full_name is not None:
        update_data["full_name"] = user_in.full_name.strip()
    if user_in.avatar_url is not None:
        update_data["avatar_url"] = user_in.avatar_url.strip() if user_in.avatar_url else None
    if user_in.professional_title is not None:
        update_data["professional_title"] = user_in.professional_title.strip() if user_in.professional_title else None
    if user_in.password:
        update_data["hashed_password"] = get_password_hash(user_in.password)

    updated_user = user_repo.update(db, current_user, update_data)
    return UserResponse.model_validate(updated_user)
