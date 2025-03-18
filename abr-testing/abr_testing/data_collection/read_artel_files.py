"""Read folder of Artel Results Files."""
import argparse
import os
from typing import List, Dict, Union, Any
import re
import sys
from abr_testing.automation import google_sheets_tool


def read_html_file(file_path: str) -> str:
    """Read html file."""
    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as file:
            html_string = file.read()
            return html_string
    except FileNotFoundError:
        print(f"Error: File not found at path: {file_path}")
        return ""
    except Exception as e:
        print(f"An error occurred: {e}")
        return ""


def parse_file(html_str: str) -> Dict[str, Union[Any, List[Any]]]:
    """Parse File and extract raw data."""
    # Determine target volume of file
    pattern_target_ul = r"Target volume.*?<td align=\"left\">([\d\.]+)"
    target_ul = float(re.findall(pattern_target_ul, html_str)[0])
    pattern_raw_data = r'<td align="center" class="ht_?\d+">([\d\.]+)</td>'
    raw_data = re.findall(pattern_raw_data, html_str)
    raw_data = [float(x) for x in raw_data]
    mean_vol = raw_data[-1]
    raw_data = raw_data[:-1]
    date_match = re.search(r"<b>Date:\s*</b>(.*?)<br", html_str, re.DOTALL)
    date = date_match.group(1).strip() if date_match else ""
    file_name_match = re.search(r"<title>(.*?)</title", html_str, re.DOTALL)
    file_name = file_name_match.group(1).strip() if file_name_match else ""
    dict_raw_data = {
        "Date": date,
        "File Name": file_name,
        "Target Volume (ul)": target_ul,
        "Mean Volume": mean_vol,
        "Raw Data": raw_data,
    }
    return dict_raw_data


if __name__ == "__main__":
    print("started")
    parser = argparse.ArgumentParser(description="Read folder of artel results")
    parser.add_argument(
        "storage_directory",
        metavar="STORAGE_DIRECTORY",
        type=str,
        nargs=1,
        help="Path to long term storage directory for run logs.",
    )
    parser.add_argument(
        "google_sheet_name",
        metavar="GOOGLE_SHEET_NAME",
        type=str,
        nargs=1,
        help="Google sheet name.",
    )
    parser.add_argument(
        "tab_name",
        metavar="TAB_NAME",
        type=str,
        nargs=1,
        help="Name of tab on google sheet.",
    )
    args = parser.parse_args()
    storage_directory = args.storage_directory[0]
    try:
        credentials_path = os.path.join(storage_directory, "credentials.json")
    except FileNotFoundError:
        print(f"Add credentials.json file to: {storage_directory}.")
        sys.exit()
    google_sheet_name = args.google_sheet_name[0]
    google_sheet = google_sheets_tool.google_sheet(
        credentials_path, google_sheet_name, 0
    )
    sheet_name = args.tab_name[0]
    list_of_files = os.listdir(storage_directory)
    print(list_of_files)
    all_sheet_name_ids = google_sheet.get_all_sheets()
    sheet_name_list = []
    for sheet_id in all_sheet_name_ids:
        name = str(sheet_id).split(" '")[1].split("'")[0]
        sheet_name_list.append(name)
    if sheet_name in sheet_name_list:
        sheet_id = google_sheet.get_sheet_by_name(sheet_name)
        if isinstance(sheet_id, str):
            new_sheet_id = sheet_id
        print(f"Adding data to existing sheet {sheet_name}")
    else:
        new_sheet_id = google_sheet.create_worksheet(str(sheet_name))
        print(f"creating new sheet {sheet_name}")
    header = []
    for file in list_of_files:
        if file.endswith(".html"):
            header.append(os.path.basename(file))
            header.extend([""] * 16)
    col_start = 0
    raw_data_positioning = {1.0: 70, 1.2: 91, 1.5: 112, 2.0: 133, 5.0: 154}
    for file in list_of_files:
        file_path = os.path.join(storage_directory, file)
        if file_path.endswith(".html"):
            html_str = read_html_file(file_path)
            raw_data = parse_file(html_str)
            target_vol = raw_data["Target Volume (ul)"]
            if isinstance(target_vol, float):
                initial_row = raw_data_positioning.get(target_vol)
                if not initial_row:
                    initial_row = int(
                        input(
                            "Volume not found in positioning dictionary. Specify start row: "
                        )
                    )
                # update sheet with raw data frame
                raw_data_only = raw_data.get("Raw Data", [0.0])
                lists_by_row = [
                    raw_data_only[i : i + 12] for i in range(0, len(raw_data_only), 12)
                ]
                transposed = list(map(list, zip(*lists_by_row)))
                if sheet_id:
                    google_sheet.batch_update_cells(
                        transposed, 6, initial_row, new_sheet_id
                    )
