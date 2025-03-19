NUMBER_OF_ZONES = 10
NUMBER_OF_BINS = 128


def validate_histogram_frame(data: bytes, next_frame_id: int) -> bool:
    """Validate Histogram frame, Raise error if invalid."""
    start_delimn = data[0]
    assert (
        start_delimn == 0x81  # histogram start byte
    ), f"Invalid delimn, {hex(start_delimn)} != 0x81."
    frame_id = data[4]
    assert (
        next_frame_id == frame_id
    ), f"Invalid frame id, expected {next_frame_id} got {frame_id}."
    frame_len = data[5]
    assert (
        frame_len == 128  # len is always 128
    ), f"Invalid frame length, expected 128 got {frame_len}."
    return True
