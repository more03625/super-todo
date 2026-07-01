from sqlalchemy.ext.asyncio import AsyncSession

from app.common.constants import error_codes as EC
from app.common.handlers.error_handler import ErrorHandler
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models import LifeArea, Streak, User, UserRole
from app.repositories.user_repository import UserRepository
from app.schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse


DEFAULT_LIFE_AREAS = [
    ("Career", "briefcase", "#6366f1"),
    ("Finance", "wallet", "#10b981"),
    ("Health", "heart", "#ef4444"),
    ("Learning", "book", "#f59e0b"),
    ("Family", "people", "#8b5cf6"),
    ("Business", "building", "#0ea5e9"),
    ("Relationship", "chat-heart", "#ec4899"),
    ("Fun", "emoji-smile", "#14b8a6"),
]


class AuthService:
    def __init__(self, db: AsyncSession):
        self.repo = UserRepository(db)
        self.db = db

    async def register(self, data: RegisterRequest) -> UserResponse:
        existing = await self.repo.get_by_email(data.email)
        if existing:
            ErrorHandler.bad_request({"code": EC.AUTH_EMAIL_EXISTS, "message": "Email already registered"})

        user = User(
            email=data.email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
            role=UserRole.USER,
        )
        user = await self.repo.create(user)

        for i, (name, icon, color) in enumerate(DEFAULT_LIFE_AREAS):
            self.db.add(LifeArea(user_id=user.id, name=name, icon=icon, color=color, display_order=i))

        self.db.add(Streak(user_id=user.id))
        await self.db.flush()
        return UserResponse.model_validate(user)

    async def login(self, data: LoginRequest) -> TokenResponse:
        user = await self.repo.get_by_email(data.email)
        if not user or not verify_password(data.password, user.hashed_password):
            ErrorHandler.unauthorized({"code": EC.AUTH_INVALID_CREDENTIALS, "message": "Invalid email or password"})

        return TokenResponse(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )

    async def refresh(self, refresh_token: str) -> TokenResponse:
        from jose import JWTError
        from app.core.security import decode_token, verify_token_type

        try:
            payload = decode_token(refresh_token)
            if not verify_token_type(payload, "refresh"):
                ErrorHandler.unauthorized({"code": EC.AUTH_TOKEN_INVALID, "message": "Invalid refresh token"})
            from uuid import UUID
            user = await self.repo.get_by_id(UUID(payload["sub"]))
            if not user or not user.is_active:
                ErrorHandler.unauthorized({"code": EC.AUTH_UNAUTHORIZED, "message": "User not found"})
        except (JWTError, KeyError, ValueError):
            ErrorHandler.unauthorized({"code": EC.AUTH_TOKEN_EXPIRED, "message": "Refresh token expired"})

        return TokenResponse(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )

    async def get_profile(self, user: User) -> UserResponse:
        return UserResponse.model_validate(user)
