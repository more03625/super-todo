from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.handlers.response_handler import ResponseHandler
from app.common.interfaces.openapi_success_response import PaginationMeta
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models import User
from app.schemas import LoginRequest, RefreshRequest, RegisterRequest
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user = await AuthService(db).register(data)
    return ResponseHandler.created(user.model_dump(), "Registration successful")


@router.post("/login")
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    tokens = await AuthService(db).login(data)
    return ResponseHandler.success(tokens.model_dump(), message="Login successful")


@router.post("/refresh")
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    tokens = await AuthService(db).refresh(data.refresh_token)
    return ResponseHandler.success(tokens.model_dump(), message="Token refreshed")


@router.post("/logout")
async def logout(user: User = Depends(get_current_user)):
    return ResponseHandler.success(None, message="Logged out successfully")


@router.get("/me")
async def me(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    profile = await AuthService(db).get_profile(user)
    return ResponseHandler.success(profile.model_dump())
