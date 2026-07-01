from pydantic import BaseModel


class ErrorDetail(BaseModel):
    code: str | int
    message: str
    details: str | None = None
    path: str | None = None


class OpenApiErrorResponse(BaseModel):
    success: bool = False
    status_code: int
    error: ErrorDetail
    error_meta: dict | None = None
