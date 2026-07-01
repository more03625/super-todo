from uuid import UUID

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.constants import error_codes as EC
from app.common.handlers.error_handler import ErrorHandler
from app.core.security import decode_token, verify_token_type
from app.database.session import get_db
from app.models import User

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = decode_token(token)
        if not verify_token_type(payload, "access"):
            ErrorHandler.unauthorized({"code": EC.AUTH_TOKEN_INVALID, "message": "Invalid token type"})
        user_id = UUID(payload["sub"])
    except (JWTError, KeyError, ValueError):
        ErrorHandler.unauthorized({"code": EC.AUTH_TOKEN_INVALID, "message": "Invalid or expired token"})

    result = await db.execute(select(User).where(User.id == user_id, User.is_active.is_(True)))
    user = result.scalar_one_or_none()
    if not user:
        ErrorHandler.unauthorized({"code": EC.AUTH_UNAUTHORIZED, "message": "User not found or inactive"})
    return user
