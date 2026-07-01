import json
from datetime import datetime, timezone


class JFLogger:
    _instance: "JFLogger | None" = None

    @classmethod
    def get_instance(cls) -> "JFLogger":
        if cls._instance is None:
            cls._instance = JFLogger()
        return cls._instance

    def info(self, payload: dict) -> None:
        print(json.dumps({"level": "info", "timestamp": datetime.now(timezone.utc).isoformat(), **payload}))

    def error(self, message: str, err: Exception | None = None) -> None:
        data = {"level": "error", "timestamp": datetime.now(timezone.utc).isoformat(), "message": message}
        if err:
            data["error"] = str(err)
        print(json.dumps(data))

    def warn(self, payload: dict) -> None:
        print(json.dumps({"level": "warn", "timestamp": datetime.now(timezone.utc).isoformat(), **payload}))
