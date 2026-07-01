import os
from typing import Any

from fastapi import HTTPException, status

from app.common.interfaces.openapi_error_response import ErrorDetail, OpenApiErrorResponse
from app.logger.jf_logger import JFLogger

DEFAULT_MESSAGE = "Something went wrong, Please try again"
BLACKLIST = ["sql", "columns", "table", "params", "password", "token"]


class ErrorHandler:
    _logger = JFLogger.get_instance()

    @classmethod
    def bad_request(cls, error_object: dict[str, Any], err: Exception | None = None, path: str | None = None) -> None:
        cls._raise(error_object, status.HTTP_400_BAD_REQUEST, err, path)

    @classmethod
    def unauthorized(cls, error_object: dict[str, Any], err: Exception | None = None, path: str | None = None) -> None:
        cls._logger.error({
            "message": "Unauthorized request",
            "status_code": 401,
            "error_code": error_object.get("code"),
            "error_message": error_object.get("message", "Unauthorized"),
            "path": path,
            "details": str(err) if err else None,
        })
        cls._raise(error_object, status.HTTP_401_UNAUTHORIZED, err, path)

    @classmethod
    def forbidden(cls, error_object: dict[str, Any], err: Exception | None = None, path: str | None = None) -> None:
        cls._raise(error_object, status.HTTP_403_FORBIDDEN, err, path)

    @classmethod
    def not_found(cls, error_object: dict[str, Any], err: Exception | None = None, path: str | None = None) -> None:
        cls._raise(error_object, status.HTTP_404_NOT_FOUND, err, path)

    @classmethod
    def too_many_requests(cls, error_object: dict[str, Any], err: Exception | None = None, path: str | None = None) -> None:
        cls._raise(error_object, status.HTTP_429_TOO_MANY_REQUESTS, err, path)

    @classmethod
    def internal_server_error(cls, error_object: dict[str, Any], err: Exception | None = None, path: str | None = None) -> None:
        cls._raise(error_object, status.HTTP_500_INTERNAL_SERVER_ERROR, err, path)

    @classmethod
    def bad_gateway(cls, error_object: dict[str, Any], err: Exception | None = None, path: str | None = None) -> None:
        cls._raise(error_object, status.HTTP_502_BAD_GATEWAY, err, path)

    @classmethod
    def not_acceptable(cls, error_object: dict[str, Any], err: Exception | None = None, path: str | None = None) -> None:
        cls._raise(error_object, status.HTTP_406_NOT_ACCEPTABLE, err, path)

    @classmethod
    def custom(
        cls,
        error_object: dict[str, Any],
        err: Exception | None = None,
        path: str | None = None,
        status_code: int = status.HTTP_202_ACCEPTED,
    ) -> None:
        cls._raise(error_object, status_code, err, path)

    @classmethod
    def _raise(
        cls,
        error_object: dict[str, Any],
        status_code: int,
        err: Exception | None,
        path: str | None,
    ) -> None:
        response = cls._build_response(error_object, status_code, err, path)
        raise HTTPException(status_code=status_code, detail=response.model_dump())

    @classmethod
    def _build_response(
        cls,
        error_object: dict[str, Any],
        status_code: int,
        err: Exception | None,
        path: str | None,
    ) -> OpenApiErrorResponse:
        cls._logger.error(str(error_object), err)
        is_prod = os.getenv("ENVIRONMENT") == "production"
        error_message = cls._extract_message(err)

        response = OpenApiErrorResponse(
            success=False,
            status_code=status_code,
            error=ErrorDetail(
                code=error_object.get("code", status_code),
                message=error_object.get("message") or cls._default_message(status_code),
                details=None if is_prod else error_message,
                path=path,
            ),
        )

        if not is_prod and err:
            debug_data: dict[str, Any] = {}
            if isinstance(err, Exception):
                debug_data = {"stack": str(err), "name": type(err).__name__}
            for key in BLACKLIST:
                debug_data.pop(key, None)
            if debug_data:
                response.error_meta = debug_data

        return response

    @staticmethod
    def _default_message(status_code: int) -> str:
        messages = {
            400: "Bad Request",
            401: "Unauthorized",
            403: "Forbidden",
            404: "Not Found",
            429: "Too Many Requests",
            500: "Internal Server Error",
            502: "Bad Gateway",
        }
        return messages.get(status_code, DEFAULT_MESSAGE)

    @staticmethod
    def _extract_message(err: Exception | None) -> str | None:
        if err is None:
            return None
        return str(err)
