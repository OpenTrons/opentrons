import re
from typing import Any, Dict, List, Tuple, Union

from syrupy.extensions.json import JSONSnapshotExtension

ReplacementPatterns = Dict[str, List[Tuple[str, str]]]


class CustomJSONSnapshotExtension(JSONSnapshotExtension):
    def __init__(self) -> None:
        super().__init__()
        self.replacement_patterns: ReplacementPatterns = {
            "detail": [
                (r"moduleId='[^']+'", "moduleId='UUID'"),
            ],
            "traceback": [
                (r"line \d+,", "line N,"),
            ],
        }
        self.id_keys_to_replace = ["id", "pipetteId", "labwareId", "serialNumber", "moduleId", "liquidId", "offsetId", "lidId"]
        self.timestamp_keys_to_replace = [
            "createdAt",
            "startedAt",
            "completedAt",
            "lastModified",
            "created",
        ]

    def serialize(self, data: Any, **kwargs: Any) -> str:
        processed_data = self.preprocess_data(data)
        return str(super().serialize(processed_data, **kwargs))

    def preprocess_data(self, data: Any) -> Any:
        if isinstance(data, dict):
            return {k: self.process_field(k, self.preprocess_data(v)) for k, v in data.items()}
        elif isinstance(data, list):
            return [self.preprocess_data(v) for v in data]
        return data

    def process_field(self, key: str, value: Union[str, Any]) -> Union[str, Any]:
        if key in self.id_keys_to_replace:
            return "UUID"
        if key in self.timestamp_keys_to_replace:
            return "TIMESTAMP"
        if isinstance(value, str):
            patterns = self.replacement_patterns.get(key, [])
            for pattern, replacement in patterns:
                value = re.sub(pattern, replacement, value)
        return value
