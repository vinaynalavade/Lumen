from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, workspaces, projects, manual_testing

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["Workspaces"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(manual_testing.router, tags=["Manual Testing"])
