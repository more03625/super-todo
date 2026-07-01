from typing import Any

from app.common.interfaces.openapi_success_response import (
    OpenApiSuccessResponse,
    PaginatedData,
    PaginationMeta,
    RateLimitMeta,
    ResponseMetadata,
)


class ResponseHandler:
    @staticmethod
    def success(
        data: Any,
        status_code: int = 200,
        message: str = "Operation completed successfully",
        metadata: ResponseMetadata | None = None,
    ) -> OpenApiSuccessResponse[Any]:
        return OpenApiSuccessResponse(
            success=True,
            status_code=status_code,
            message=message,
            data=data,
            metadata=metadata,
        )

    @staticmethod
    def success_with_rate_limit(
        data: Any,
        message: str,
        rate_limit: RateLimitMeta,
        status_code: int = 200,
    ) -> OpenApiSuccessResponse[Any]:
        return ResponseHandler.success(
            data, status_code, message, ResponseMetadata(rate_limit=rate_limit)
        )

    @staticmethod
    def success_with_pagination(
        data: list[Any],
        pagination: PaginationMeta,
        message: str = "Data retrieved successfully",
        status_code: int = 200,
    ) -> OpenApiSuccessResponse[PaginatedData[Any]]:
        return ResponseHandler.success(
            PaginatedData(items=data, pagination=pagination),
            status_code,
            message,
        )

    @staticmethod
    def created(data: Any, message: str = "Resource created successfully") -> OpenApiSuccessResponse[Any]:
        return ResponseHandler.success(data, 201, message)

    @staticmethod
    def updated(data: Any, message: str = "Resource updated successfully") -> OpenApiSuccessResponse[Any]:
        return ResponseHandler.success(data, 200, message)

    @staticmethod
    def deleted(message: str = "Resource deleted successfully") -> OpenApiSuccessResponse[None]:
        return ResponseHandler.success(None, 200, message)

    @staticmethod
    def no_content() -> OpenApiSuccessResponse[None]:
        return ResponseHandler.success(None, 204, "Operation completed successfully")
