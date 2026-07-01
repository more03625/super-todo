from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.router import api_router
from app.common.interfaces.openapi_error_response import ErrorDetail, OpenApiErrorResponse
from app.core.config import settings
from app.middleware.scheduler import setup_scheduler


def create_app() -> FastAPI:
    app = FastAPI(title="SuperToDo API", version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_url, "http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        detail = exc.detail
        if isinstance(detail, dict) and detail.get("success") is False:
            return JSONResponse(status_code=exc.status_code, content=detail)
        return JSONResponse(
            status_code=exc.status_code,
            content=OpenApiErrorResponse(
                status_code=exc.status_code,
                error=ErrorDetail(code=exc.status_code, message=str(detail), path=str(request.url.path)),
            ).model_dump(),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content=OpenApiErrorResponse(
                status_code=422,
                error=ErrorDetail(
                    code="VALIDATION_ERROR",
                    message="Validation failed",
                    details=str(exc.errors()),
                    path=str(request.url.path),
                ),
            ).model_dump(),
        )

    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.on_event("startup")
    async def startup():
        setup_scheduler()

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    return app


app = create_app()
