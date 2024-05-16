"""Google Sheet Tool."""
import gspread  # type: ignore[import]
import socket
import httplib2
import time as t
import sys
from datetime import datetime
from oauth2client.service_account import ServiceAccountCredentials  # type: ignore[import]
from typing import Dict, List, Any, Set, Tuple

"""Google Sheets Tool.

This module requires a credentials.json file before getting started.
Retrieve from https://console.cloud.google.com/apis/credentials.
"""


class google_sheet:
    """Google Sheets Tool."""

    def __init__(self, credentials: Any, file_name: str, tab_number: int) -> None:
        """Connects to google sheet via credentials file."""
        try:
            self.scope = [
                "https://spreadsheets.google.com/feeds",
                "https://www.googleapis.com/auth/drive",
            ]
            self.credentials = ServiceAccountCredentials.from_json_keyfile_name(
                credentials, self.scope
            )
            self.gc = gspread.authorize(self.credentials)
            self.file_name = file_name
            self.tab_number = tab_number
            self.spread_sheet = self.open_google_sheet()
            self.worksheet = self.open_worksheet(self.tab_number)
            self.row_index = 1
            print(f"Connected to google sheet: {self.file_name}")
        except gspread.exceptions.APIError:
            print("ERROR: Check google sheet name. Check credentials file.")
            sys.exit()

    def open_google_sheet(self) -> Any:
        """Open Google Spread Sheet."""
        sheet = self.gc.open(self.file_name)
        return sheet

    def open_worksheet(self, tab_number: int) -> Any:
        """Open individual worksheet within a googlesheet."""
        return self.spread_sheet.get_worksheet(tab_number)

    def create_worksheet(self, title: str) -> None:
        """Create a worksheet with tab name. Existing spreadsheet needed."""
        try:
            new_sheet = self.spread_sheet.add_worksheet(title, rows="2000", cols="26")
            return new_sheet.id
        except gspread.exceptions.APIError:
            print("Sheet already exists.")

    def write_header(self, header: List) -> None:
        """Write Header to first row if not present."""
        header_list = self.worksheet.row_values(1)
        if header_list != header:
            self.worksheet.insert_row(header, self.row_index)

    def write_to_row(self, data: List, title: str = "Sheet1") -> None:
        """Write data into a row in a List[] format."""
        try:
            self.row_index += 1
            data = [
                item.strftime("%Y/%m/%d %H:%M:%S")
                if isinstance(item, datetime)
                else item
                for item in data
            ]
            self.worksheet.insert_row(data, index=self.row_index)
        except socket.gaierror:
            pass
        except httplib2.ServerNotFoundError:
            print("UNABLE TO CONNECT TO SERVER!!, CHECK CONNECTION")
        except Exception as error:
            print(error.__traceback__)
        except gspread.exceptions.APIError:
            print("Write quotes exceeded. Waiting 30 sec before writing.")
            t.sleep(30)
            self.worksheet.insert_row(data, index=self.row_index)

    def delete_row(self, row_index: int) -> None:
        """Delete Row from google sheet."""
        self.worksheet.delete_rows(row_index)

    def batch_delete_rows(self, row_indices: List[int]) -> None:
        """Batch delete rows in list of indices."""
        delete_body = {
            "requests": [
                {
                    "deleteDimension": {
                        "range": {
                            "sheetId": 0,
                            "dimension": "ROWS",
                            "startIndex": index,
                            "endIndex": index + 1,
                        }
                    }
                }
                for index in row_indices
            ]
        }
        self.spread_sheet.batch_update(body=delete_body)

    def batch_update_cells(
        self, sheet_title: str, data: List[List[str]], start_column: str, start_row: int
    ) -> None:
        """Writes to multiple cells at once in a specific sheet."""
        sheet = self.spread_sheet.worksheet(sheet_title)
        for idx, values in enumerate(data):
            column = chr(ord(start_column) + idx)  # Convert index to column letter
            location = f"{column}{start_row}:{column}{start_row + len(values) - 1}"
            cells_to_update = sheet.range(location)
            for cell, value in zip(cells_to_update, values):
                cell.value = value
            sheet.update_cells(cells_to_update)

    def update_cell(
        self, sheet_title: str, row: int, column: int, single_data: Any
    ) -> Tuple[int, int, Any]:
        """Update ONE individual cell according to a row and column."""
        self.spread_sheet.worksheet(sheet_title).update_cell(row, column, single_data)
        return row, column, single_data

    def get_all_data(self) -> List[Dict[str, Any]]:
        """Get all the Data recorded from worksheet."""
        return self.worksheet.get_all_records()

    def get_column(self, column_number: int) -> Set[str]:
        """Get all values in column."""
        return self.worksheet.col_values(column_number)

    def get_cell(self, cell: str) -> Any:
        """Get cell value with location ex: 'A1'."""
        return self.worksheet.acell(cell).value

    def get_single_col_range(self, range: str) -> List:
        """Get cell values from one column range."""
        values_range = self.worksheet.range(range)
        return [cell.value for cell in values_range]

    def get_index_row(self) -> int:
        """Check for the next available row to write too."""
        row_index = len(self.get_column(1))
        print(f"Row Index: {row_index} recorded on google sheet.")
        return row_index

    def update_row_index(self) -> None:
        """Update self.row_index instance variable."""
        self.row_index = self.get_index_row()

    def get_all_sheets(self) -> List[str]:
        """List all tabs in the spreadsheets."""
        worksheets = self.spread_sheet.worksheets()
        return worksheets

    def get_sheet_by_name(self, title: str) -> None:
        """Reference sheet by name."""
        try:
            worksheet = self.spread_sheet.worksheet(title)
            return worksheet
        except gspread.exceptions.WorksheetNotFound:
            raise gspread.exceptions.WorksheetNotFound(
                "Worksheet does not exist!!, Use create_worksheet() function first."
            )

    def token_check(self) -> None:
        """Check if still credentials are still logged in."""
        if self.credentials.access_token_expired:
            self.gc.login()

    def get_row_index_with_value(self, some_string: str, col_num: int) -> Any:
        """Find row index of string by looking in specific column."""
        cell = self.worksheet.find(some_string, in_column=col_num)
        try:
            row_index = int(cell.row)
        except AttributeError:
            print("Row not found.")
            return None
        return row_index

    def create_line_chart(
        self,
        titles: List[str],
        series: List[Dict[str, Any]],
        domains: List[Dict[str, Any]],
        axis: Dict[str, Any],
        col_position: int = 0,
        sheet_id: str = "0",
    ) -> None:
        """Create chart of data on google sheet."""
        request_body = {
            "requests": [
                {
                    "addChart": {
                        "chart": {
                            "spec": {
                                "title": titles[0],
                                "basicChart": {
                                    "chartType": "LINE",
                                    "legendPosition": "RIGHT_LEGEND",
                                    "axis": axis,
                                    "domains": domains,
                                    "series": series,
                                    "headerCount": 1,
                                },
                            },
                            "position": {
                                "overlayPosition": {
                                    "anchorCell": {
                                        "sheetId": sheet_id,
                                        "rowIndex": 1,
                                        "columnIndex": col_position,
                                    }
                                }
                            },
                        }
                    }
                }
            ]
        }
        self.spread_sheet.batch_update(body=request_body)
