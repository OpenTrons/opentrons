from datetime import datetime
import enum
from pathlib import Path
from time import time
from typing import Any, List, Union, Optional

from hardware_testing import data as data_io


class Result(enum.Enum):
    SKIP = "Skip"
    PASS = "Pass"
    FAIL = "Fail"

    def __str__(self) -> str:
        return self.value


META_DATA_TITLE = "META-DATA"
META_DATA_TEST_NAME = "test-name"
META_DATA_TEST_TAG = "test-tag"
META_DATA_TEST_RUN_ID = "test-run-id"
META_DATA_TEST_TIME_UTC = "test-time-utc"


class Line:
    def __init__(self, tag: str, data: List[Any]) -> None:
        self._tag: str = tag
        self._data_types: List[Any] = data
        self._data: List[Any] = [None] * len(data)
        self._timestamp: Optional[float] = None
        self._start_time: Optional[float] = None

    def __str__(self) -> str:
        data_str = ",".join(str(d) for d in self._data)
        full_str = f"{self._tag},{data_str}"
        _elapsed = round(time() - self._start_time, 1)
        return f"{_elapsed},{full_str}"

    @property
    def tag(self) -> str:
        return self._tag

    @property
    def timestamp(self) -> float:
        return self._timestamp

    def cache_start_time(self, start_time: float) -> None:
        self._start_time = start_time

    def store(self, *data: Any):
        if len(data) != len(self._data_types):
            raise ValueError(f"[{self.tag}] unexpected data length ({len(data)}), "
                             f"should equal {len(self._data_types)}")
        self._timestamp = time() - self._start_time
        for i, expected_type in enumerate(self._data_types):
            d_type = type(data[i])
            if d_type != expected_type:
                raise ValueError(f"[{self.tag}] unexpected data type {d_type} "
                                 f"with value \"{data[i]}\" at index {i}")
            self._data[i] = data[i]


class LineRepeating:
    def __init__(self, repeat: int, tag: str, data: List[Any]) -> None:
        self._lines: List[Line] = [Line(tag, data) for _ in range(repeat)]

    @property
    def length(self) -> int:
        return len(self._lines)

    def __getitem__(self, item: int) -> Line:
        return self._lines[item]

    def __str__(self) -> str:
        return "\n".join([str(line) for line in self._lines])


class Section:
    def __init__(self, title: str, lines: List[Union[Line, LineRepeating]]) -> None:
        self._title = title
        self._lines = lines

    def __getitem__(self, item: str) -> Line:
        for line in self._lines:
            if line.tag == item:
                return line
        raise ValueError(f"[{self._title}] unexpected line tag: {item}")

    def __str__(self) -> str:
        dashes = "-" * len(self.title)
        lines = "\n".join([str(line) for line in self._lines])
        all_lines = [line for line in self._lines]
        stamps = [line.timestamp for line in self._lines if line.timestamp is not None]
        if stamps:
            min_timestamp = min([line.timestamp for line in self._lines if line.timestamp is not None])
            min_timestamp = round(min_timestamp, 1)
        else:
            min_timestamp = None
        return f"{min_timestamp},{dashes}\n" \
               f"{min_timestamp},{self.title}\n" \
               f"{lines}"

    @property
    def lines(self) -> List[Line]:
        return self._lines

    @property
    def title(self) -> str:
        return self._title


def _generate_meta_data_section() -> Section:
    return Section(
        title=META_DATA_TITLE,
        lines=[
            Line(
                tag=META_DATA_TEST_NAME,
                data=[str]
            ),
            Line(
                tag=META_DATA_TEST_TAG,
                data=[str]
            ),
            Line(
                tag=META_DATA_TEST_RUN_ID,
                data=[str]
            ),
            Line(
                tag=META_DATA_TEST_TIME_UTC,
                data=[str]
            )
        ]
    )


class Report:
    def __init__(self, script_path: str, sections: List[Section]) -> None:
        self._script_path = script_path
        self._test_name = data_io.create_test_name_from_file(script_path)
        self._run_id = data_io.create_run_id()
        self._tag: Optional[str] = None
        self._file_name: Optional[str] = None
        self._sections = [_generate_meta_data_section()] + sections
        self._cache_start_time()  # must happen before storing any data
        self[META_DATA_TITLE][META_DATA_TEST_NAME].store(self._test_name)
        self[META_DATA_TITLE][META_DATA_TEST_RUN_ID].store(self._run_id)
        _now = datetime.utcnow().strftime("%Y/%m/%d-%H:%M:%S")
        self[META_DATA_TITLE][META_DATA_TEST_TIME_UTC].store(_now)

    def __getitem__(self, item: str) -> Section:
        for s in self._sections:
            if s.title == item:
                return s
        raise ValueError(f"unexpected section title: {item}")

    def __str__(self) -> str:
        return "\n".join([str(s) for s in self._sections])

    def _cache_start_time(self) -> None:
        start_time = time()
        for section in self._sections:
            for line in section.lines:
                if isinstance(line, LineRepeating):
                    for i in range(line.length):
                        line[i].cache_start_time(start_time)
                else:
                    line.cache_start_time(start_time)

    def setup(self, tag: str) -> None:
        self._tag = tag
        self[META_DATA_TITLE][META_DATA_TEST_TAG].store(self._tag)
        self._file_name = data_io.create_file_name(self._test_name, self._run_id, self._tag)

    def save_to_disk(self) -> Path:
        _report_str = str(self)
        return data_io.dump_data_to_file(self._test_name, self._file_name, _report_str + "\n")
