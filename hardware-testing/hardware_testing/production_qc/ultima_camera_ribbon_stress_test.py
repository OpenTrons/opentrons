"""OT3 Overnight Test."""
import argparse
import asyncio
import os
import time

from dataclasses import dataclass
from typing import Optional, Callable, List, Any, Tuple, Dict, cast
from pathlib import Path

from opentrons.config.defaults_ot3 import (
    DEFAULT_MAX_SPEEDS,
    DEFAULT_ACCELERATIONS,
    DEFAULT_RUN_CURRENT,
    DEFAULT_MAX_SPEED_DISCONTINUITY,
)
from opentrons.hardware_control.ot3api import OT3API
from opentrons.hardware_control.backends.ot3controller import OT3Controller

from hardware_testing.opentrons_api import types
from hardware_testing.opentrons_api.types import Axis, OT3Mount, Point, OT3AxisKind
from hardware_testing.opentrons_api import helpers_ot3
from hardware_testing import data
from hardware_testing.data import ui
from hardware_testing.drivers.camera.omron_camera import OmronMircoscanCamera
from hardware_testing.drivers.camera.omron_camera import scan_ports

import logging
import csv
from datetime import datetime

LOG = logging.getLogger(__name__)
LOG.setLevel(logging.CRITICAL)

# tells all movement settings
logging.getLogger("opentrons.hardware_control.ot3api.OT3API").setLevel(logging.CRITICAL)

# confirms speeds
logging.getLogger("opentrons_hardware.hardware_control").setLevel(logging.CRITICAL)


GANTRY_AXES = [
    Axis.X,
    Axis.Y,
    Axis.by_mount(OT3Mount.LEFT),
    Axis.by_mount(OT3Mount.RIGHT),
]
MOUNT_AXES = [OT3Mount.LEFT, OT3Mount.RIGHT]
THRESHOLD_MM = 0.125

DEFAULT_X_CURRENT = DEFAULT_RUN_CURRENT.low_throughput[OT3AxisKind.X]
DEFAULT_Y_CURRENT = DEFAULT_RUN_CURRENT.low_throughput[OT3AxisKind.Y]
DEFAULT_Z_CURRENT = DEFAULT_RUN_CURRENT.low_throughput[OT3AxisKind.Z]

DEFAULT_X_MAX_SPEED = 1500
DEFAULT_Y_MAX_SPEED = 1700
DEFAULT_Z_MAX_SPEED = 1500

DEFAULT_X_DISCONTINUITY = 40
DEFAULT_Y_DISCONTINUITY = 40
DEFAULT_Z_DISCONTINUITY = 20

DEFAULT_X_ACCELERATION = 1600
DEFAULT_Y_ACCELERATION = 1600
DEFAULT_Z_ACCELERATION = 1600

@dataclass
class CSVCallbacks:
    """CSV callback functions."""

    write: Callable


@dataclass
class CSVProperties:
    """CSV properties."""

    id: str
    name: str
    path: str


def _create_csv_and_get_callbacks(sn: str) -> Tuple[CSVProperties, CSVCallbacks]:
    """Create CSV and get callback functions."""
    run_id = data.create_run_id()
    test_name = data.create_test_name_from_file(__file__)
    test_path = data.create_folder_for_test_data(test_name)
    run_path = data.create_folder_for_test_data(test_path / run_id)
    file_name = data.create_file_name(test_name=test_name, run_id=run_id, tag=sn)
    csv_display_name = os.path.join(run_path, file_name)
    print(f"CSV: {csv_display_name}")
    start_time = time.time()

    def _append_csv_data(
        data_list: List[Any],
        line_number: Optional[int] = None,
        first_row_value: Optional[str] = None,
        first_row_value_included: bool = False,
    ) -> None:
        # every line in the CSV file begins with the elapsed seconds
        if not first_row_value_included:
            if first_row_value is None:
                first_row_value = str(round(time.time() - start_time, 2))
            data_list = [first_row_value] + data_list
        data_str = ",".join([str(d) for d in data_list])
        if line_number is None:
            data.append_data_to_file(test_name, run_id, file_name, data_str + "\n")
        else:
            data.insert_data_to_file(
                test_name, run_id, file_name, data_str + "\n", line_number
            )

    return (
        CSVProperties(id=run_id, name=test_name, path=csv_display_name),
        CSVCallbacks(
            write=_append_csv_data,
        ),
    )


def bool_to_string(result: bool) -> str:
    """Turn bool into String."""
    return "PASS" if result else "FAIL"


def _record_axis_data(
    type: str,
    write_cb: Callable,
    estimate: Dict[Axis, float],
    encoder: Dict[Axis, float],
    aligned: bool,
) -> None:
    """Record raw axis movement to csv."""
    data_str: List[str] = []
    for ax in GANTRY_AXES:
        data_str = data_str + [str(ax)] + [str(round(encoder[ax] - estimate[ax], 5))]
    write_cb([type] + [bool_to_string(aligned)] + data_str)


def _record_run_data(
    type: str,
    write_cb: Callable,
    error: Dict[Axis, float],
    aligned: bool,
) -> None:
    """Record series of axis movements to csv."""
    data_str: List[str] = []
    for ax in GANTRY_AXES:
        data_str = data_str + [str(ax)] + [str(round(error[ax], 5))]
    write_cb([type] + [bool_to_string(aligned)] + data_str)


def _record_motion_check_data(
    type: str,
    write_cb: Callable,
    speed: float,
    acceleration: float,
    current: float,
    cycles: int,
    pass_count: int,
    fail_count: int,
) -> None:
    """Record motion log to csv."""
    write_cb(
        [type]
        + ["Speed"]
        + [str(speed)]
        + ["Acceleration"]
        + [str(acceleration)]
        + ["Current"]
        + [str(current)]
        + ["Run Cycle"]
        + [str(cycles)]
        + ["Pass Count"]
        + [str(pass_count)]
        + ["Fail Count"]
        + [str(fail_count)]
    )


def _create_bowtie_points(homed_position: types.Point) -> List[types.Point]:
    """Create points for the bowtie movement."""
    pos_max = homed_position - types.Point(x=1, y=1, z=1)
    pos_min = types.Point(x=0, y=25, z=pos_max.z)  # stay above deck to be safe
    bowtie_points = [
        pos_max,  # back-right
        pos_min,  # front-left
        # pos_min._replace(y=pos_max.y),  # back-left
        # pos_max._replace(y=pos_min.y),  # front-right
        # pos_max,  # back-right
    ]
    return bowtie_points

async def _move_and_check(
    api: OT3API, is_simulating: bool, mount: OT3Mount, position: types.Point
) -> None:
# ) -> Tuple[Dict[Axis, float], Dict[Axis, float], bool]:
    """Move and check accuracy with encoder."""
    await api.move_to(mount, position)

async def _run_bowtie(
    api: OT3API,
    is_simulating: bool,
    mount: OT3Mount,
    bowtie_points: List[types.Point]
) -> bool:
    """Run XY in bowtie pattern."""
    ui.print_header("Run bowtie")
    for p in bowtie_points:
        await _move_and_check(api, is_simulating, mount, p)
    return True

def print_motion_settings(
    axis: str, speed: float, accel: float, current: float
) -> None:
    """Prints the motion settings."""
    print(f"{axis}: Run speed={speed}, acceleration={accel}, current={current}")


def print_cycle_results(a: str, c: int, r: int, p: int, f: int) -> None:
    """Prints the cycle results."""
    print(f"Run {a} cycle: {c}, results: {r}, pass count: {p}, fail count: {f}")

async def _run_gantry_cycles(
    arguments: argparse.Namespace,
    api: OT3API,
    mount: OT3Mount,
    bowtie_points: List[types.Point],
    csv_cb: CSVCallbacks,
    test_data: Dict[str, Any],
    writer: csv.DictWriter,
    csvfile: csv.DictWriter,
) -> bool:
    """Cycle the gantry at nominal settings."""
    qc_pass = True
    start_time = time.time()
    for i in range(arguments.cycles):
        csv_cb.write(["--------"])
        csv_cb.write(["run-cycle", i + 1])
        print(f"Cycle {i + 1}/{arguments.cycles}")
        if not arguments.skip_bowtie:
            qc_pass = await _run_bowtie(
                api,
                arguments.simulate,
                mount,
                bowtie_points,
            )
            if not qc_pass:
                return qc_pass
        test_data['Time(s)'] = time.time() - start_time
        test_data['Cycle'] = i
        test_data['Error'] = None
        writer.writerow(test_data)
        csvfile.flush()

    return qc_pass


async def get_test_metadata(
    api: OT3API, arguments: argparse.Namespace
) -> Tuple[str, str]:
    """Get the operator name and robot serial number."""
    if arguments.no_input:
        _operator = args.operator if isinstance(args.operator, str) else "None"
        _robot_id = cast(OT3Controller, api._backend).eeprom_data.serial_number
        if not _robot_id:
            ui.print_error("no serial number saved on this robot")
            _robot_id = "None"
    else:
        if arguments.simulate:
            _robot_id = "ot3-simulated-A01"
            _operator = "simulation"
        else:
            _robot_id = cast(OT3Controller, api._backend).eeprom_data.serial_number
            if not _robot_id:
                ui.print_error("no serial number saved on this robot")
                _robot_id = input("enter ROBOT SERIAL number: ").strip()
            if isinstance(args.operator, str):
                _operator = args.operator
            else:
                _operator = input("enter OPERATOR name: ")

    return (_operator, _robot_id)

async def camera_task(camera) -> None:
    global end_loop
    today = datetime.now().strftime("%m-%d-%y_%H-%M")
    with open(f'/data/camera_data_{today}.csv', 'w', newline='') as csvfile:
        test_data = {'Time(s)': None, 'omron_data': None,'State':None, 'Error': None}
        writer = csv.DictWriter(csvfile, test_data)
        writer.writeheader()
        try:
            start_time = time.time()
            camera_okay = True
            while camera_okay:
                connection = await camera.check_camera_communication()
                print(f'Camera connection: {connection}')
                test_data['Time(s)'] = time.time() - start_time
                test_data['omron_data'] = connection
                test_data['State'] = 'Working'
                test_data['Error'] = None
                writer.writerow(test_data)
                csvfile.flush()
                if connection != '!OK':
                    test_data['State'] = 'Failed'
                    writer.writerow(test_data)
                    csvfile.flush()
                    raise("Camera connection failed")
                    camera_okay = False
                if end_loop:
                    camera_okay = False
        except Exception as e:
            test_data['Error'] = str(e)
            writer.writerow(test_data)
            csvfile.flush()
            raise("Camera connection failed: ", e)
        finally:
            await camera.disconnect()

async def setup_gantry_motion_settings(api: OT3API) -> None:
    # set high throughput hold current
    await helpers_ot3.set_gantry_load_per_axis_motion_settings_ot3(
        api,
        Axis.X,
        api.gantry_load,
        DEFAULT_X_MAX_SPEED,
        DEFAULT_X_ACCELERATION,
        DEFAULT_X_DISCONTINUITY,
        None,
    )

    await helpers_ot3.set_gantry_load_per_axis_motion_settings_ot3(
        api,
        Axis.Y,
        api.gantry_load,
        DEFAULT_Y_MAX_SPEED,
        DEFAULT_Y_ACCELERATION,
        DEFAULT_Y_DISCONTINUITY,
        None,
    )

    await helpers_ot3.set_gantry_load_per_axis_motion_settings_ot3(
        api,
        Axis.Z,
        api.gantry_load,
        DEFAULT_Z_MAX_SPEED,
        DEFAULT_Z_ACCELERATION,
        DEFAULT_Z_DISCONTINUITY,
        None,
    )

async def run_gantry_motion(arguments: argparse.Namespace, api) -> None:
    """Stress Test."""
    # api = await helpers_ot3.build_hardware_controller(
    #     loop=asyncio.get_event_loop()
    #     # is_simulating=arguments.simulate
    # )
    global end_loop
    _operator, _robot_id = await get_test_metadata(api, arguments)

    # callback function for writing new data to CSV file
    csv_props, csv_cb = _create_csv_and_get_callbacks(_robot_id)
    # cache the pressure-data header
    # add metadata to CSV
    # FIXME: create a set of CSV helpers, such that you can define a test-report
    #        schema/format/line-length/etc., before having to fill its contents.
    #        This would be very helpful, because changes to CVS length/contents
    #        will break the analysis done in our Sheets
    csv_cb.write(["--------"])
    csv_cb.write(["METADATA"])
    csv_cb.write(["test-name", csv_props.name])
    csv_cb.write(["serial-number", _robot_id])
    csv_cb.write(["operator-name", _operator])
    csv_cb.write(["date", csv_props.id])  # run-id includes a date/time string
    test_name = Path(__file__).name
    ui.print_title(test_name.replace("_", " ").upper())
    qc_pass = False
    today = datetime.now().strftime("%m-%d-%y_%H-%M")
    with open(f'/data/ot3_data_{today}.csv', 'w', newline='') as csvfile:
        test_data = {'Time(s)': None, 'Cycle': None, 'Error': None}
        writer = csv.DictWriter(csvfile, test_data)
        writer.writeheader()
        try:
            await api.home([Axis.X, Axis.Y, Axis.Z_L, Axis.Z_R])
            home_pos = await api.gantry_position(OT3Mount.LEFT)
            attach_pos = helpers_ot3.get_slot_calibration_square_position_ot3(5)
            attach_pos = attach_pos._replace(z=home_pos.z)

            await api.reset()

            mount = OT3Mount.LEFT

            bowtie_points = _create_bowtie_points(await api.gantry_position(mount))

            # set high throughput hold current
            await helpers_ot3.set_gantry_load_per_axis_current_settings_ot3(
                api,
                Axis.Z,
                api.gantry_load,
                hold_current=DEFAULT_Z_CURRENT,  # NOTE: only set this for Z axes
            )
            LOG.info(DEFAULT_Z_CURRENT)
            LOG.info(
                f"Motor Current Settings: {cast(OT3Controller, api._backend)._current_settings}"
            )

            await setup_gantry_motion_settings(api)

            qc_pass = await _run_gantry_cycles(
                arguments,
                api,
                mount,
                bowtie_points,
                csv_cb,
                test_data,
                writer,
                csvfile,
            )
            if not qc_pass:
                return
        except Exception as e:
            test_data['Error'] = str(e)
            writer.writerow(test_data)
            csvfile.flush()
            raise("Error: ", e)
            

        except KeyboardInterrupt:
            print("Cancelled")
        finally:
            end_loop = True
            await api.clean_up()
            if qc_pass:
                ui.print_title("Test Done - PASSED")
            else:
                ui.print_title("Test Done - FAILED")

async def _main(args: argparse.Namespace) -> None:
    """Main function."""
    global end_loop
    end_loop = False
    # tasks_to_gather: List[asyncio.Task] = []
    api = await helpers_ot3.build_async_ot3_hardware_api(loop=asyncio.get_event_loop())
    camera_port = scan_ports()
    cam = await OmronMircoscanCamera.create(port = camera_port, loop=asyncio.get_event_loop())
    try:
        gantry_task = asyncio.create_task(run_gantry_motion(args, api))
        omron_task = asyncio.create_task(camera_task(cam))
        # tasks_to_gather.append(gantry_task)
        # tasks_to_gather.append(omron_task)
        results = await asyncio.gather(gantry_task, omron_task, return_exceptions=False)
        print("Gantry Task Result: ", results)
    except Exception as e:
        print("Error: ", e)
        raise("Error: ", e)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--operator", type=str, default=None)
    parser.add_argument("--simulate", action="store_true")
    parser.add_argument("--cycles", type=int, default=1)
    parser.add_argument("--skip_bowtie", action="store_true")
    parser.add_argument("--no_input", action="store_true")

    args = parser.parse_args()
    asyncio.run(_main(args))
