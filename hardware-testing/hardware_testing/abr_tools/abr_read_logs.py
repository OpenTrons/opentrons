"""Read ABR run logs and save data to ABR testing csv."""
from .abr_run_logs import get_run_ids_from_storage, get_unseen_run_ids
from .error_levels import ERROR_LEVELS_PATH
from typing import Set, Dict, Tuple, Any, List
import argparse
import os
import csv
import json
from datetime import datetime


def get_modules(file_results: Dict[str, str]) -> Dict[str, Any]:
    """Get module IPs and models from run log."""
    modList = (
        "heaterShakerModuleV1",
        "temperatureModuleV2",
        "magneticBlockV1",
        "thermocyclerModuleV2",
    )
    all_modules = {key: None for key in modList}
    for module in file_results.get("modules", []):
        if isinstance(module, dict) and module.get("model") in modList:
            try:
                all_modules[module["model"]] = module["serialNumber"]
            except KeyError:
                all_modules[module["model"]] = ""
    return all_modules


def get_error_info(file_results: Dict[str, Any]) -> Tuple[int, str, str, str, str]:
    """Determines if errors exist in run log and documents them."""
    error_levels = []
    # Read error levels file
    with open(ERROR_LEVELS_PATH, "r") as error_file:
        error_levels = list(csv.reader(error_file))
    num_of_errors: int = len(file_results["errors"])
    if num_of_errors > 0:
        commands_of_run = file_results.get("commands", [])  # type: List[Dict[str, Any]]
        run_command_error = commands_of_run[-1]  # type: Dict[str, Any]
        error_str = len(run_command_error.get("error", ""))  # type: int
        if error_str > 1:
            error_type = run_command_error["error"].get("errorType", None)
            error_code = run_command_error["error"].get("errorCode", None)
            try:
                # Instrument Error
                error_instrument = run_command_error["error"]["errorInfo"].get(
                    "node", None
                )
            except KeyError:
                # Module Error
                error_instrument = run_command_error["error"]["errorInfo"].get(
                    "port", None
                )
            for error in error_levels:
                code_error = error[1]
                if code_error == error_code:
                    error_level = error[4]
    else:
        error_type = ""
        error_code = ""
        error_instrument = ""
        error_level = ""
    return num_of_errors, error_type, error_code, error_instrument, error_level


def create_abr_data_sheet(storage_directory: str) -> None:
    """Creates csv file to log ABR data."""
    sheet_location = os.path.join(storage_directory, "ABR-run-data.csv")
    if os.path.exists(sheet_location):
        print(f"File {sheet_location} located.")
    else:
        with open(sheet_location, "w") as csvfile:
            headers = [
                "Robot",
                "Run_ID",
                "Protocol_Name",
                "Software Version",
                "Date",
                "Start_Time",
                "End_Time",
                "Run_Time (min)",
                "Errors",
                "Error_Code",
                "Error_Type",
                "Error_Instrument",
                "Error_Level",
                "Left Mount",
                "Right Mount",
                "Extension",
                "heaterShakerModuleV1",
                "temperatureModuleV2",
                "magneticBlockV1",
                "thermocyclerModuleV2",
            ]
            writer = csv.DictWriter(csvfile, fieldnames=headers)
            writer.writeheader()


def create_data_dictionary(
    runs_to_save: Set[str], storage_directory: str
) -> Dict[Any, Dict[str, Any]]:
    """Pull data from run files and format into a dictionary."""
    runs_and_robots = {}
    for filename in os.listdir(storage_directory):
        file_path = os.path.join(storage_directory, filename)
        try:
            with open(file_path) as file:
                file_results = json.load(file)
        except (json.JSONDecodeError, KeyError):
            print(f"Ignoring unparsable file {file_path}.")
            continue

        run_id = file_results.get("run_id")
        if run_id in runs_to_save:
            robot = file_results.get("robot_name")
            protocol_name = file_results["protocol"]["metadata"].get("protocolName", "")
            software_version = file_results.get("API_Version", None)
            left_pipette = file_results.get("left", None)
            right_pipette = file_results.get("right", None)
            extension = file_results.get("extension", None)
            (
                num_of_errors,
                error_type,
                error_code,
                error_instrument,
                error_level,
            ) = get_error_info(file_results)
            all_modules = get_modules(file_results)

            start_time_str, complete_time_str, start_date, run_time_min = (
                "",
                "",
                "",
                0.0,
            )
            try:
                start_time = datetime.strptime(
                    file_results.get("startedAt", ""), "%Y-%m-%dT%H:%M:%S.%f%z"
                )
                start_date = str(start_time.date())
                start_time_str = str(start_time).split("+")[0]
                complete_time = datetime.strptime(
                    file_results.get("completedAt", ""), "%Y-%m-%dT%H:%M:%S.%f%z"
                )
                complete_time_str = str(complete_time).split("+")[0]
                run_time = complete_time - start_time
                run_time_min = run_time.total_seconds() / 60
            except ValueError:
                pass  # Handle datetime parsing errors if necessary

            if run_time_min > 0:
                row = {
                    "Robot": robot,
                    "Run_ID": run_id,
                    "Protocol_Name": protocol_name,
                    "Software Version": software_version,
                    "Date": start_date,
                    "Start_Time": start_time_str,
                    "End_Time": complete_time_str,
                    "Run_Time (min)": run_time_min,
                    "Errors": num_of_errors,
                    "Error_Code": error_code,
                    "Error_Type": error_type,
                    "Error_Instrument": error_instrument,
                    "Error_Level": error_level,
                    "Left Mount": left_pipette,
                    "Right Mount": right_pipette,
                    "Extension": extension,
                }
                row_2 = {**row, **all_modules}
                runs_and_robots[run_id] = row_2
            else:
                print(
                    f"Run ID: {run_id} has a run time of 0 minutes. Run not recorded."
                )
    return runs_and_robots


def read_abr_data_sheet(storage_directory: str) -> Set[str]:
    """Reads current run sheet to determine what new run data should be added."""
    sheet_location = os.path.join(storage_directory, "ABR-run-data.csv")
    runs_in_sheet = set()
    # Read the CSV file
    with open(sheet_location, "r") as csv_start:
        data = csv.DictReader(csv_start)
        headers = data.fieldnames
        if headers is not None:
            for row in data:
                run_id = row[headers[1]]
                runs_in_sheet.add(run_id)
        print(f"There are {str(len(runs_in_sheet))} runs documented in the ABR sheet.")
    return runs_in_sheet


def write_to_abr_sheet(
    runs_and_robots: Dict[Any, Dict[str, Any]], storage_directory: str
) -> None:
    """Write dict of data to abr csv."""
    sheet_location = os.path.join(storage_directory, "ABR-run-data.csv")
    list_of_runs = list(runs_and_robots.keys())
    with open(sheet_location, "a", newline="") as f:
        writer = csv.writer(f)
        for run in range(len(list_of_runs)):
            row = runs_and_robots[list_of_runs[run]].values()
            writer.writerow(row)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pulls run logs from ABR robots.")
    parser.add_argument(
        "storage_directory",
        metavar="STORAGE_DIRECTORY",
        type=str,
        nargs=1,
        help="Path to long term storage directory for run logs.",
    )
    args = parser.parse_args()
    storage_directory = args.storage_directory[0]
    runs_from_storage = get_run_ids_from_storage(storage_directory)
    create_abr_data_sheet(storage_directory)
    runs_in_sheet = read_abr_data_sheet(storage_directory)
    runs_to_save = get_unseen_run_ids(runs_from_storage, runs_in_sheet)
    runs_and_robots = create_data_dictionary(runs_to_save, storage_directory)
    write_to_abr_sheet(runs_and_robots, storage_directory)
