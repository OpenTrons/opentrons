"""Data for hardware-testing."""
from datetime import datetime
import os
from PIL import Image
from pathlib import Path
from subprocess import check_output
from time import time
from typing import Tuple, Union, List, Any

from opentrons.config import infer_config_base_dir, IS_ROBOT

GIT_DESCRIBE_NAME = ".hardware-testing-description"


def _git(*args: str) -> str:
    return check_output(["git"] + list(args)).decode("utf-8").strip()


def _build_git_description_string() -> str:
    if IS_ROBOT:
        raise RuntimeError("unable to run git describe on robot")
    raw_description = _git("describe")
    raw_hash = _git("rev-parse", "--short", "HEAD")
    description_split = raw_description.split("-")
    description = "_".join(description_split)
    desc_with_hash = description + "-" + raw_hash
    mods = _git("ls-files", "-m").replace("\n", " ")
    if not mods:
        return desc_with_hash
    return f"{desc_with_hash}-[{mods}]"


def get_git_description() -> str:
    """Get git description file."""
    if IS_ROBOT:
        file_path = infer_config_base_dir() / GIT_DESCRIBE_NAME
        if not file_path.exists():
            return "unknown"
        with open(file_path, "r") as f:
            return f.read().strip()
    else:
        return _build_git_description_string()


def create_git_description_file() -> str:
    """Create git description file."""
    if IS_ROBOT:
        raise RuntimeError("unable to create git description file on robot")
    contents = _build_git_description_string()
    file_path = infer_config_base_dir() / GIT_DESCRIBE_NAME
    with open(GIT_DESCRIBE_NAME, "w+") as f:
        f.write(contents)
    return str(file_path)


def get_testing_data_directory() -> Path:
    """Get testing_data directory."""
    if "TESTING_DATA_DIR" in os.environ:
        return Path(os.environ["TESTING_DATA_DIR"])
    return infer_config_base_dir() / "testing_data"


def _initialize_testing_data_base_dir() -> Path:
    base = get_testing_data_directory()
    base.mkdir(parents=True, exist_ok=True)
    return base


def create_test_name_from_file(f: str) -> str:
    """Create test name from file name."""
    return os.path.basename(f).replace("_", "-").replace(".py", "")


def create_folder_for_test_data(test_name: Union[str, Path]) -> Path:
    """Create a folder for test data."""
    base = _initialize_testing_data_base_dir()
    test_path = base / test_name
    test_path.mkdir(parents=False, exist_ok=True)
    return test_path


def create_datetime_string() -> str:
    """Create datetime string."""
    return datetime.utcnow().strftime("%y-%m-%d-%H-%M-%S")


def create_run_id() -> str:
    """Create a run ID using datetime string."""
    return f"run-{create_datetime_string()}"


def create_run_id_and_start_time() -> Tuple[str, float]:
    """Create a run ID using datetime string."""
    return create_run_id(), time()


def create_file_name(
    test_name: str, run_id: str, tag: str, extension: str = "csv"
) -> str:
    """Create a file name, given a test name."""
    return f"{test_name}_{run_id}_{tag}.{extension}"


def _save_data(
    test_name: str, run_id: str, file_name: str, data: str, perm: str = "w+"
) -> Path:
    test_path = create_folder_for_test_data(test_name)
    run_path = create_folder_for_test_data(test_path / run_id)
    data_path = test_path / run_path / file_name
    with open(data_path, perm) as f:
        f.write(data)
    return data_path


def dump_data_to_file(test_name: str, run_id: str, file_name: str, data: str) -> Path:
    """Save entire file contents to a file on disk."""
    return _save_data(test_name, run_id, file_name, data, perm="w+")


def append_data_to_file(test_name: str, run_id: str, file_name: str, data: str) -> Path:
    """Append new content to an already existing file on disk."""
    return _save_data(test_name, run_id, file_name, data, perm="a+")


def insert_data_to_file(
    test_name: str, run_id: str, file_name: str, data: str, line: int
) -> None:
    """Insert new data at a specified line."""
    test_path = create_folder_for_test_data(test_name)
    run_path = create_folder_for_test_data(test_path / run_id)
    data_path = run_path / file_name
    # read data from file, insert line, then overwrite previous file
    with open(data_path, "r") as f:
        contents = f.readlines()
    contents.insert(line, data)
    with open(data_path, "w") as f:
        f.write("".join(contents))


def convert_list_to_csv_line(elements: List[Any]) -> str:
    """Convert list of something into CSV line."""
    return ",".join(str(elements))


def jpg_to_pdf_letter(input_jpg: str, output_pdf: str) -> None:
    # Define letter size in pixels at 72 DPI
    LETTER_SIZE = (612, 792)  # 8.5 x 11 inches at 72 DPI

    # Open and process the image
    image = Image.open(input_jpg).convert("RGB")
    new_image = Image.new("RGB", LETTER_SIZE, (255, 255, 255))  # White background
    image.thumbnail(LETTER_SIZE)  # Scale while keeping aspect ratio

    # Center the image on the page
    x_offset = (LETTER_SIZE[0] - image.width) // 2
    y_offset = (LETTER_SIZE[1] - image.height) // 2
    new_image.paste(image, (x_offset, y_offset))

    # If the PDF already exists, append new page
    if os.path.exists(output_pdf):
        existing_pdf = Image.open(output_pdf)
        existing_pages = []

        try:
            while True:
                existing_pages.append(existing_pdf.copy())  # Store existing pages
                existing_pdf.seek(len(existing_pages))  # Move to next page
        except EOFError:
            pass  # End of pages reached

        existing_pages.append(new_image)  # Add new page
        existing_pages[0].save(
            output_pdf, save_all=True, append_images=existing_pages[1:]
        )
    else:
        # First image creates the new PDF
        new_image.save(output_pdf, "PDF")
