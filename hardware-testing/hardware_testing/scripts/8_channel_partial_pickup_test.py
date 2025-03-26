"""8-Channel Partial Tip Pick-up Test."""
import argparse
import asyncio
import json
import string
import termios
import time
import tty
import os, sys
from datetime import datetime
from typing import Tuple, Dict, Optional

from opentrons.types import _ot3_to_ot2
from hardware_testing.opentrons_api.types import (
    OT3Mount,
    Axis,
    Point,
    CriticalPoint,
)
from hardware_testing.opentrons_api.helpers_ot3 import (
    build_async_ot3_hardware_api,
    update_pick_up_speed,
    _get_pipette_from_mount,
)
from opentrons.hardware_control.ot3api import OT3API
from opentrons_shared_data.deck import (
    get_calibration_square_position_in_slot,
)
from hardware_testing import data
from hardware_testing.drivers import mitutoyo_digimatic_indicator

def build_arg_parser():
    arg_parser = argparse.ArgumentParser(description='OT-3 8-Channel Partial Tip Pick-up Test')
    arg_parser.add_argument('-m', '--mount', choices=['left','right'], required=False, help='Sets the pipette mount', default='left')
    arg_parser.add_argument('-l', '--channels', choices=['1CH','8CH'], required=False, help='Sets the pipette number of channels', default='8CH')
    arg_parser.add_argument('-d', '--direction', choices=['front','rear'], required=False, help='Sets the pipette nozzles direction', default='front')
    arg_parser.add_argument('-p', '--pipette', choices=['P50','P1K'], required=False, help='Sets the pipette type', default='P1K')
    arg_parser.add_argument('-i', '--tip_size', choices=['T20','T50','T200','T1K'], required=False, help='Sets tip size', default='T1K')
    arg_parser.add_argument('-n', '--tip_num', type=int, required=False, help='Sets the number of tips', default=8)
    arg_parser.add_argument('-c', '--cycles', type=int, required=False, help='Number of testing cycles', default=10)
    arg_parser.add_argument('-g', '--gauge_slot', type=str, required=False, help='Sets the gauge slot', default='D2')
    arg_parser.add_argument('-k', '--tiprack_slot', type=str, required=False, help='Sets the tiprack slot', default='B2')
    arg_parser.add_argument('-r', '--trough_slot', type=str, required=False, help='Sets the trough slot', default='D3')
    arg_parser.add_argument('-t', '--trash_slot', type=str, required=False, help='Sets the trash slot', default='A3')
    arg_parser.add_argument('-f', '--feel_slot', type=str, required=False, help='Sets the feel tip slot', default='D1')
    arg_parser.add_argument('-e', '--center_slot', type=str, required=False, help='Sets the concentricity slot', default='D1')
    arg_parser.add_argument('-v', '--volume', type=float, required=False, help='Sets the leak test volume', default=1000)
    arg_parser.add_argument('-o', '--liquid_offset', type=float, required=False, help='Sets the liquid offset for aspiration', default=25)
    arg_parser.add_argument('-a', '--calibrate', action="store_true", required=False, help='Calibrates tiprack position')
    arg_parser.add_argument('-y', '--concentricity', action="store_true", required=False, help='Enables concentricity test')
    arg_parser.add_argument('-s', '--simulate', action="store_true", required=False, help='Simulate this test script')
    return arg_parser

class Eight_Channel_Partial_Pickup_Test:
    def __init__(
        self, simulate: bool, calibrate: bool, concentricity: bool, cycles: int, channels: str, direction: str, pipette: str, tip_num: int, gauge_slot: str, tiprack_slot: str, trough_slot: str, trash_slot: str, feel_slot: str, center_slot: str, tip_size: str, volume: float, liquid_offset: float
    ) -> None:
        self.simulate = simulate
        self.calibrate = calibrate
        self.concentricity = concentricity
        self.cycles = cycles
        self.channels = channels
        self.direction = direction
        self.pipette = pipette
        self.tip_num = tip_num
        self.tip_size = tip_size
        self.gauge_slot = gauge_slot
        self.tiprack_slot = tiprack_slot
        self.trough_slot = trough_slot
        self.trash_slot = trash_slot
        self.feel_slot = feel_slot
        self.center_slot = center_slot
        self.liquid_offset = liquid_offset
        self.volume = volume
        self.api = None
        self.mount = None
        self.home = None
        self.pipette_id = None
        self.deck_slot = None
        self.tiprack_position = None
        self.drop_position = None
        self.gauge_position = None
        self.trough_position = None
        self.feel_position = None
        self.hole_plate_position = None
        self.motor_current = None
        self.pick_up_distance = None
        self.pick_up_speed = None
        self.tip_overlap = None
        self.tip_diff = None
        self.end_effector = None
        self.max_volume = None
        self.axes = [Axis.X, Axis.Y, Axis.Z_L, Axis.Z_R]
        self.test_data ={
            "Time":"None",
            "Cycle":"None",
            "Gauge Slot":"None",
            "Tiprack Slot":"None",
            "Pipette":"None",
            "Current":"None",
            "Distance":"None",
            "Speed":"None",
            "Nozzles":"None",
            "Initial Press":"None",
            "Final Press":"None",
            "Overlap":"None",
            "End Effector":"None",
            "Leak":"None",
            "Feel":"None",
            "Concentricity":"None",
            "Tip":"None",
        }
        self.gauges = {}
        self.gauge_ports = {
            "Z":"/dev/ttyUSB0",
            # "Y":"/dev/ttyUSB1",
            # "X":"/dev/ttyUSB2",
        }
        self.gauge_offsets = {
            "Z":Point(x=0, y=0, z=-5),
            # "Y":Point(x=0, y=0, z=-5),
            # "X":Point(x=0, y=0, z=-5),
        }
        self.leak_time = 30 # seconds
        self.tip_distance = 9 # mm
        self.tip_overlap_ref = 10.5 # mm
        self.tip_length = {
            "T1K":95.7,
            "T200":58.35,
            "T50":57.9,
            "T20":52.0,
        }
        if self.channels == "8CH":
            if self.direction == "front":
                self.nozzles = [i+"1" for i in reversed(list(string.ascii_uppercase))][-8:]
            else:
                self.nozzles = [i+"1" for i in list(string.ascii_uppercase)][:8]
        else:
            self.nozzles = ["A1"]
        self.nozzle_file = "_nozzle_offsets.csv"
        self.nozzle_offset = False
        self.nozzle_offsets = {nozzle:"None" for nozzle in self.nozzles}
        self.nozzle_encoders = {nozzle:"None" for nozzle in self.nozzles}

    async def test_setup(self):
        self.api = await build_async_ot3_hardware_api(is_simulating=self.simulate, use_defaults=True)
        await self.pipette_setup()
        await self.deck_setup()
        await self.gauge_setup()
        self.file_setup()
        print(f"\nStarting 8-Channel Partial Tip Pick-up Test!\n")
        self.start_time = time.time()

    def file_setup(self):
        class_name = self.__class__.__name__
        self.test_name = class_name.lower()
        self.test_tag = f"{self.pipette}_{self.tip_size}_V{int(self.volume)}_N{self.tip_num}_C{int(self.motor_current*1000)}_R{self.cycles}"
        self.test_header = self.dict_keys_to_line(self.test_data)
        self.test_id = data.create_run_id()
        self.test_date = "run-" + datetime.utcnow().strftime("%y-%m-%d")
        self.test_path = data.create_folder_for_test_data(self.test_name)
        self.test_file = data.create_file_name(self.test_name, self.test_id, self.test_tag)
        data.append_data_to_file(test_name=self.test_name, run_id=self.test_date, file_name=self.test_file, data=self.test_header)
        print("FILE PATH = ", self.test_path)
        print("FILE NAME = ", self.test_file)
        self.nozzle_file = self.test_file.replace(".csv","") + self.nozzle_file
        self.nozzle_path = f"/data/testing_data/{self.test_name}/{self.test_date}/{self.nozzle_file}"
        if not os.path.exists(self.nozzle_path):
            self.nozzle_offset = True
            self.nozzle_header = self.dict_keys_to_line(self.nozzle_offsets)
            data.append_data_to_file(test_name=self.test_name, run_id=self.test_date, file_name=self.nozzle_file, data=self.nozzle_header)

    async def pipette_setup(self):
        if self.tip_size == "T20":
            self.max_volume = 20
        elif self.tip_size == "T50":
            self.max_volume = 50
        elif self.tip_size == "T200":
            self.max_volume = 200
        elif self.tip_size == "T1K":
            self.max_volume = 1000
        if self.volume > self.max_volume:
            self.volume = self.max_volume
        await self.api.cache_instruments()
        self.mount = OT3Mount.LEFT if args.mount == "left" else OT3Mount.RIGHT
        self.pipette_id = "SIMULATION" if self.simulate else self.api._pipette_handler.get_pipette(self.mount).pipette_id
        self.tip_diff = float(input("Tip Lenght Difference (mm) [Default = 0.2 mm]: ") or "0.2")
        self.motor_current = float(input("Motor Current (Amps) [Default = 550 mA]: ") or "0.55")
        self.pick_up_distance = float(input("Pick-up Distance (mm) [Default = 13 mmm]: ") or "13")
        self.pick_up_speed = float(input("Pick-up Tip Speed (mm/s) [Default = 10 mm/s]: ") or "10")
        self.test_data["Current"] = str(self.motor_current)
        self.test_data["Distance"] = str(self.pick_up_distance)
        self.test_data["Speed"] = str(self.pick_up_speed)
        self.test_data["Pipette"] = str(self.pipette_id)
        self.test_data["Nozzles"] = str(self.tip_num)
        await self._update_pick_up_current(self.api, self.mount, self.tip_num, self.motor_current)
        await self._update_pick_up_distance(self.api, self.mount, self.tip_num, self.pick_up_distance)
        await self._update_pick_up_speed(self.api, self.mount, self.tip_num, self.pick_up_speed)
        if self.channels == "8CH":
            await self._update_nozzle_manager(self.api, self.mount, self.tip_num)
        pipette = _get_pipette_from_mount(self.api, self.mount)
        print(f"Pipette Settings: {pipette.get_pick_up_configuration_for_tip_count(self.tip_num)}")

    async def deck_setup(self):
        self.test_data["Gauge Slot"] = str(self.gauge_slot)
        self.test_data["Tiprack Slot"] = str(self.tiprack_slot)
        self.calibration_path = "/data/testing_data/"
        self.calibration_file = "calibrations.json"
        with open(self.calibration_path + self.calibration_file, 'r') as f:
            self.deck_slot = json.load(f)

    async def gauge_setup(self):
        for key, value in self.gauge_ports.items():
            self.gauges[key] = mitutoyo_digimatic_indicator.Mitutoyo_Digimatic_Indicator(port=value)
            self.gauges[key].connect()
            self.test_data[f"{key} Gauge"] = "None"
            self.test_data[f"{key} Gauge Nozzle"] = "None"
            self.test_data[f"{key} Delta"] = "None"
            self.test_data[f"{key} Overlap"] = "None"
            self.test_data[f"{key} Overlap 2"] = "None"
            self.test_data[f"{key} Encoder Tip"] = "None"
            self.test_data[f"{key} Encoder Nozzle"] = "None"

    def dict_keys_to_line(self, dict):
        return str.join(",", list(dict.keys()))+"\n"

    def dict_values_to_line(self, dict):
        return str.join(",", list(dict.values()))+"\n"

    async def _update_nozzle_manager(
        self, api: OT3API, mount: OT3Mount, tip_num: int
    ) -> None:
        if self.direction == "front":
            await api.update_nozzle_configuration_for_mount(mount, self.nozzles[(tip_num - 1)], self.nozzles[0])
        else:
            await api.update_nozzle_configuration_for_mount(mount, self.nozzles[0], self.nozzles[-1])

    def getch(self):
        """
        fd: file descriptor stdout, stdin, stderr
        This functions gets a single input keyboard character from the user
        """
        def _getch():
            fd = sys.stdin.fileno()
            old_settings = termios.tcgetattr(fd)
            try:
                tty.setraw(fd)
                ch = sys.stdin.read(1)
            finally:
                termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
            return ch
        return _getch()

    async def jog(
        self, api: OT3API, mount: OT3Mount, position, cp
    ) -> Dict[Axis, float]:
        step_size = [0.01, 0.05, 0.1, 0.5, 1, 10, 20, 50]
        step_length_index = 3
        step = step_size[step_length_index]
        xy_speed = 60
        za_speed = 65
        information_str = """
            Click  >>   i   << to move up
            Click  >>   k   << to move down
            Click  >>   a  << to move left
            Click  >>   d  << to move right
            Click  >>   w  << to move forward
            Click  >>   s  << to move back
            Click  >>   +   << to Increase the length of each step
            Click  >>   -   << to decrease the length of each step
            Click  >> Enter << to save position
            Click  >> q << to quit the test script
                        """
        print(information_str)
        while True:
            input = self.getch()
            if input == "a":
                # minus x direction
                sys.stdout.flush()
                await api.move_rel(
                    mount, Point(-step_size[step_length_index], 0, 0), speed=xy_speed
                )

            elif input == "d":
                # plus x direction
                sys.stdout.flush()
                await api.move_rel(
                    mount, Point(step_size[step_length_index], 0, 0), speed=xy_speed
                )

            elif input == "w":
                # minus y direction
                sys.stdout.flush()
                await api.move_rel(
                    mount, Point(0, step_size[step_length_index], 0), speed=xy_speed
                )

            elif input == "s":
                # plus y direction
                sys.stdout.flush()
                await api.move_rel(
                    mount, Point(0, -step_size[step_length_index], 0), speed=xy_speed
                )

            elif input == "i":
                sys.stdout.flush()
                await api.move_rel(
                    mount, Point(0, 0, step_size[step_length_index]), speed=za_speed
                )

            elif input == "k":
                sys.stdout.flush()
                await api.move_rel(
                    mount, Point(0, 0, -step_size[step_length_index]), speed=za_speed
                )

            elif input == "q":
                sys.stdout.flush()
                await self.exit()
                print("\nTest Cancelled!")
                quit()

            elif input == "+":
                sys.stdout.flush()
                step_length_index = step_length_index + 1
                if step_length_index >= 7:
                    step_length_index = 7
                step = step_size[step_length_index]

            elif input == "-":
                sys.stdout.flush()
                step_length_index = step_length_index - 1
                if step_length_index <= 0:
                    step_length_index = 0
                step = step_size[step_length_index]

            elif input == "\r":
                sys.stdout.flush()
                await api._update_position_estimation([Axis.by_mount(mount)])
                position = await api.encoder_current_position_ot3(
                    mount, critical_point=cp, refresh=True
                )
                print("\r\n")
                return position
            await api._update_position_estimation([Axis.by_mount(mount)])
            position = await api.encoder_current_position_ot3(mount, critical_point=cp, refresh=True)

            print(
                "Coordinates: ",round(position[Axis.X], 2),",",
                                round(position[Axis.Y], 2),",",
                                round(position[Axis.by_mount(mount)], 2),
                " Motor Step: ",step_size[step_length_index],
                                end="",
            )
            print("\r", end="")

    async def _move_to_point(
        self, api: OT3API, mount: OT3Mount, point, cp
    ) -> None:
        home_position = api.get_instrument_max_height(mount, cp)
        current_position = await api.current_position_ot3(mount, refresh=True, critical_point = cp)
        await api.move_to(mount, Point(current_position[Axis.X], current_position[Axis.Y], home_position))
        await api.move_to(mount, Point(point.x, point.y, home_position))
        await api.move_to(mount, Point(point.x, point.y, point.z))

    async def _calibrate_tiprack(
        self, api: OT3API, mount: OT3Mount
    ) -> None:
        await api.home_z()
        cp = CriticalPoint.NOZZLE
        print(f"\nCalibrating Pick-up Tip Position at Slot {self.tiprack_slot}!")
        tiprack_loc = Point(self.deck_slot['deck_slot'][self.tiprack_slot]['X'],
                            self.deck_slot['deck_slot'][self.tiprack_slot]['Y'],
                            self.deck_slot['deck_slot'][self.tiprack_slot]['Z'])
        await self._move_to_point(api, mount, tiprack_loc, cp)
        current_position = await api.current_position_ot3(mount, cp)
        tiprack_loc = await self.jog(api, mount, current_position, cp)
        tiprack_loc = Point(tiprack_loc[Axis.X], tiprack_loc[Axis.Y], tiprack_loc[Axis.by_mount(mount)])
        initial_press = await api.encoder_current_position_ot3(mount, cp)
        print(f"\nInitial Press Position: {initial_press[Axis.by_mount(mount)]}")
        final_press = await api.pick_up_tip(mount, tip_length=(self.tip_length[self.tip_size] - self.tip_overlap_ref))
        print(f"Final Press Position: {final_press[Axis.by_mount(mount)]}")
        self.tip_overlap = abs(final_press[Axis.by_mount(mount)] - initial_press[Axis.by_mount(mount)])
        print(f"Tip Overlap: {self.tip_overlap}")
        self.end_effector = self.tip_length[self.tip_size] - self.tip_overlap
        print(f"End Effector: {self.end_effector}")
        self.test_data["Initial Press"] = str(initial_press[Axis.by_mount(mount)])
        self.test_data["Final Press"] = str(final_press[Axis.by_mount(mount)])
        self.test_data["Overlap"] = str(self.tip_overlap)
        self.test_data["End Effector"] = str(self.end_effector)
        self.deck_slot['deck_slot'][self.tiprack_slot][Axis.X.name] = tiprack_loc.x
        self.deck_slot['deck_slot'][self.tiprack_slot][Axis.Y.name] = tiprack_loc.y
        self.deck_slot['deck_slot'][self.tiprack_slot]['Z'] = tiprack_loc.z
        self._save_config(self.calibration_path + self.calibration_file, self.deck_slot)
        self.tiprack_position = tiprack_loc
        await asyncio.sleep(1)

    async def _calibrate_trash(
        self, api: OT3API, mount: OT3Mount
    ) -> None:
        await api.home_z(mount)
        cp = CriticalPoint.TIP
        print(f"\nCalibrating Drop Tip Position at Slot {self.trash_slot}!")
        drop_tip_loc = Point(self.deck_slot['deck_slot'][self.trash_slot]['X'],
                            self.deck_slot['deck_slot'][self.trash_slot]['Y'],
                            self.deck_slot['deck_slot'][self.trash_slot]['Z'])
        await self._move_to_point(api, mount, drop_tip_loc, cp)
        home_with_tip = await api.current_position(mount, cp)
        drop_tip_loc = await self.jog(api, mount, home_with_tip, cp)
        drop_tip_loc = Point(drop_tip_loc[Axis.X], drop_tip_loc[Axis.Y], drop_tip_loc[Axis.by_mount(mount)])
        self.deck_slot['deck_slot'][self.trash_slot][Axis.X.name] = drop_tip_loc.x
        self.deck_slot['deck_slot'][self.trash_slot][Axis.Y.name] = drop_tip_loc.y
        self.deck_slot['deck_slot'][self.trash_slot]['Z'] = drop_tip_loc.z
        self._save_config(self.calibration_path + self.calibration_file, self.deck_slot)
        self.drop_position = drop_tip_loc

    async def _calibrate_gauge(
        self, api: OT3API, mount: OT3Mount
    ) -> None:
        await api.home_z(mount)
        cp = CriticalPoint.TIP
        print(f"\nCalibrating Gauge at Slot {self.gauge_slot}!")
        gauge_loc = Point(self.deck_slot['deck_slot'][self.gauge_slot]['X'],
                            self.deck_slot['deck_slot'][self.gauge_slot]['Y'],
                            self.deck_slot['deck_slot'][self.gauge_slot]['Z'])
        await self._move_to_point(api, mount, gauge_loc, cp)
        current_position = await api.current_position_ot3(mount, cp)
        gauge_loc = await self.jog(api, mount, current_position, cp)
        gauge_loc = Point(gauge_loc[Axis.X], gauge_loc[Axis.Y], gauge_loc[Axis.by_mount(mount)])
        self.deck_slot['deck_slot'][self.gauge_slot][Axis.X.name] = gauge_loc.x
        self.deck_slot['deck_slot'][self.gauge_slot][Axis.Y.name] = gauge_loc.y
        self.deck_slot['deck_slot'][self.gauge_slot]['Z'] = gauge_loc.z
        self._save_config(self.calibration_path + self.calibration_file, self.deck_slot)
        self.gauge_position = gauge_loc

    async def _calibrate_trough(
        self, api: OT3API, mount: OT3Mount
    ) -> None:
        await api.home_z(mount)
        cp = CriticalPoint.TIP
        print(f"\nCalibrating Trough at Slot {self.trough_slot}!")
        trough_loc = Point(self.deck_slot['deck_slot'][self.trough_slot]['X'],
                            self.deck_slot['deck_slot'][self.trough_slot]['Y'],
                            self.deck_slot['deck_slot'][self.trough_slot]['Z'])
        await self._move_to_point(api, mount, trough_loc, cp)
        current_position = await api.current_position_ot3(mount, cp)
        trough_loc = await self.jog(api, mount, current_position, cp)
        trough_loc = Point(trough_loc[Axis.X], trough_loc[Axis.Y], trough_loc[Axis.by_mount(mount)])
        self.deck_slot['deck_slot'][self.trough_slot][Axis.X.name] = trough_loc.x
        self.deck_slot['deck_slot'][self.trough_slot][Axis.Y.name] = trough_loc.y
        self.deck_slot['deck_slot'][self.trough_slot]['Z'] = trough_loc.z
        self._save_config(self.calibration_path + self.calibration_file, self.deck_slot)
        self.trough_position = trough_loc
        self.feel_position = Point(self.deck_slot['deck_slot'][self.feel_slot]['X'],
                                    self.deck_slot['deck_slot'][self.feel_slot]['Y'],
                                    self.deck_slot['deck_slot'][self.feel_slot]['Z'])

    async def _calibrate_hole_plate(
        self, api: OT3API, mount: OT3Mount
    ) -> None:
        await api.home_z(mount)
        cp = CriticalPoint.TIP
        print(f"\nCalibrating Hole Plate at Slot {self.center_slot}!")
        hole_plate_loc = Point(self.deck_slot['deck_slot'][self.center_slot]['X'],
                            self.deck_slot['deck_slot'][self.center_slot]['Y'],
                            self.deck_slot['deck_slot'][self.center_slot]['Z'])
        await self._move_to_point(api, mount, hole_plate_loc, cp)
        current_position = await api.current_position_ot3(mount, cp)
        hole_plate_loc = await self.jog(api, mount, current_position, cp)
        hole_plate_loc = Point(hole_plate_loc[Axis.X], hole_plate_loc[Axis.Y], hole_plate_loc[Axis.by_mount(mount)])
        self.deck_slot['deck_slot'][self.center_slot][Axis.X.name] = hole_plate_loc.x
        self.deck_slot['deck_slot'][self.center_slot][Axis.Y.name] = hole_plate_loc.y
        self.deck_slot['deck_slot'][self.center_slot]['Z'] = hole_plate_loc.z
        self._save_config(self.calibration_path + self.calibration_file, self.deck_slot)
        self.hole_plate_position = hole_plate_loc

    async def _get_nozzles_offset(
        self, api: OT3API, mount: OT3Mount
    ) -> None:
        await api.home()
        for i, (k, v) in enumerate(self.nozzle_offsets.items()):
            print(f"\n-> Measuring Nozzle {k}")
            tip = i+1
            await self._select_tip(api, mount, tip, True)
            if len(self.gauges) > 0:
                gauge, encoder = await self._measure_gauge(api, mount, "Z", True)
                encoder_z = round(encoder[Axis.by_mount(mount)], 2)
                self.nozzle_offsets[k] = str(gauge)
                self.nozzle_encoders[k] = str(encoder_z)
        await api.home_z()
        print(self.nozzle_offsets)
        print(self.nozzle_encoders)
        nozzle_data = self.dict_values_to_line(self.nozzle_offsets)
        data.append_data_to_file(test_name=self.test_name, run_id=self.test_date, file_name=self.nozzle_file, data=nozzle_data)

    async def _update_pick_up_current(
        self, api: OT3API, mount: OT3Mount, tip_count, current
    ) -> None:
        """Update pick-up-tip current."""
        pipette = _get_pipette_from_mount(api, mount)
        # pipette.get_pick_up_configuration_for_tip_count(tip_count).current_by_tip_count.update({tip_count: current})
        if tip_count > 1:
            for i in range(8):
                pipette.get_pick_up_configuration_for_tip_count(i+1).current_by_tip_count.update({(i+1): current})
            else:
                pipette.get_pick_up_configuration_for_tip_count(tip_count).current_by_tip_count.update({tip_count: current})
    async def _update_pick_up_distance(
        self, api: OT3API, mount: OT3Mount, tip_count, distance
    ) -> None:
        """Update pick-up-tip distance."""
        pipette = _get_pipette_from_mount(api, mount)
        pipette.get_pick_up_configuration_for_tip_count(tip_count).distance = distance

    async def _update_pick_up_speed(
        self, api: OT3API, mount: OT3Mount, tip_count, speed
    ) -> None:
        await update_pick_up_speed(api, mount, speed, tip_count)

    async def _record_data(self, cycle):
        elapsed_time = (time.time() - self.start_time)/60
        self.test_data["Time"] = str(round(elapsed_time, 3))
        self.test_data["Cycle"] = str(cycle)
        test_data = self.dict_values_to_line(self.test_data)
        data.append_data_to_file(test_name=self.test_name, run_id=self.test_date, file_name=self.test_file, data=test_data)

    async def _pick_up_tips(
        self, api: OT3API, mount: OT3Mount, cycle
    ) -> None:
        await api.home_z()
        cp = CriticalPoint.NOZZLE
        print(f"\nPicking up Tips at Column {cycle}/12!")
        x_offset = self.tip_distance*(cycle - 1)
        tiprack_loc = self.tiprack_position._replace(x=self.tiprack_position.x + x_offset)
        await self._move_to_point(api, mount, tiprack_loc, cp)
        initial_press = await api.encoder_current_position_ot3(mount, cp)
        print(f"\nInitial Press Position: {initial_press[Axis.by_mount(mount)]}")
        final_press = await api.pick_up_tip(mount, tip_length=(self.tip_length[self.tip_size] - self.tip_overlap_ref))
        print(f"Final Press Position: {final_press[Axis.by_mount(mount)]}")
        self.tip_overlap = abs(final_press[Axis.by_mount(mount)] - initial_press[Axis.by_mount(mount)])
        print(f"Tip Overlap: {self.tip_overlap}")
        self.end_effector = self.tip_length[self.tip_size] - self.tip_overlap
        print(f"End Effector: {self.end_effector}")
        self.test_data["Initial Press"] = str(initial_press[Axis.by_mount(mount)])
        self.test_data["Final Press"] = str(final_press[Axis.by_mount(mount)])
        self.test_data["Overlap"] = str(self.tip_overlap)
        self.test_data["End Effector"] = str(self.end_effector)

    async def _measure_tips(
        self, api: OT3API, mount: OT3Mount, cycle: int
    ) -> None:
        for i in range(self.tip_num):
            tip = i + 1
            print(f"\n-> Measuring Tip {tip}/{self.tip_num}")
            await self._select_tip(api, mount, tip)
            if len(self.gauges) > 0:
                gauge, encoder = await self._measure_gauge(api, mount, "Z")
                encoder_z = round(encoder[Axis.by_mount(mount)], 2)
                nozzle_offset = float(self.nozzle_offsets[self.nozzles[i]])
                nozzle_encoder = float(self.nozzle_encoders[self.nozzles[i]])
                delta = gauge - nozzle_offset
                true_overlap = self.tip_overlap - delta
                true_overlap_two = self.tip_overlap_ref - (delta + self.tip_diff)
                self.test_data[f"Z Gauge"] = str(gauge)
                self.test_data[f"Z Gauge Nozzle"] = str(nozzle_offset)
                self.test_data[f"Z Delta"] = str(delta)
                self.test_data[f"Z Overlap"] = str(true_overlap)
                self.test_data[f"Z Overlap 2"] = str(true_overlap_two)
                self.test_data[f"Z Encoder Tip"] = str(encoder_z)
                self.test_data[f"Z Encoder Nozzle"] = str(nozzle_encoder)
                print(f"Z Encoder Tip = {encoder_z}mm")
                print(f"True Overlap = {true_overlap}mm")
                print(f"True Overlap 2 = {true_overlap_two}mm")
            await self._record_data(cycle)

    async def _select_tip(
        self, api: OT3API, mount: OT3Mount, tip: int, nozzle: bool = False
    ) -> None:
        self.test_data["Tip"] = str(tip)
        y_offset = self.tip_distance*(tip - 1)
        if self.direction == "front":
            y_offset = y_offset*(-1)
        gauge_loc = self.gauge_position._replace(y=self.gauge_position.y + y_offset)
        if tip == 1:
            if nozzle:
                cp = CriticalPoint.NOZZLE
            else:
                cp = CriticalPoint.TIP
            await self._move_to_point(api, mount, gauge_loc, cp)
        else:
            await api.move_to(mount, gauge_loc)

    async def _measure_gauge(
        self, api: OT3API, mount: OT3Mount, axis: str, nozzle: bool = False
    ) -> float:
        # Jog gauge
        print(f"Reading {axis} Gauge...")
        await api.move_rel(mount, self.gauge_offsets[axis], speed=10)
        cp = CriticalPoint.NOZZLE
        # Read encoder
        encoder = await api.encoder_current_position_ot3(mount, critical_point=cp, refresh=True)
        encoder_z = round(encoder[Axis.by_mount(mount)], 2)
        print(f"{axis} Encoder = {encoder_z}mm")
        # Read gauge
        gauge = self.gauges[axis].read_stable(timeout=20)
        print(f"{axis} Gauge = {gauge}mm")
        # Relax gauge
        await api.move_rel(mount, (-1)*self.gauge_offsets[axis])
        return gauge, encoder

    async def _leak_test(
        self, api: OT3API, mount: OT3Mount
    ) -> None:
        await api.home_z(mount)
        cp = CriticalPoint.TIP
        liquid_height = self.trough_position - Point(x=0, y=0, z=self.liquid_offset)
        await self._move_to_point(api, mount, self.trough_position, cp)
        await api.prepare_for_aspirate(mount)
        await api.move_to(mount, liquid_height)
        await api.aspirate(mount, self.volume)
        await api.home_z(mount)
        await self._countdown(self.leak_time)
        await api.move_to(mount, liquid_height)
        await api.dispense(mount)
        await api.home_z(mount)
        leak_result = float(input("\nLeak Test Result [Default = 1]: \n1 = Pass \n2 = Fail \nAnswer:") or "1")
        self.test_data["Leak"] = str(leak_result)

    async def _feel_test(
        self, api: OT3API, mount: OT3Mount
    ) -> None:
        await api.home_z(mount)
        cp = CriticalPoint.TIP
        await self._move_to_point(api, mount, self.feel_position, cp)
        input("\nFeel the Tip!\n[Press ENTER to Finish]")
        feel_result = float(input("\nFeel Test Result [Default = 1]: \n1 = Pass \n2 = Fail \nAnswer:") or "1")
        self.test_data["Feel"] = str(feel_result)
        if self.concentricity:
            await self._concentricity_test(self.api, self.mount)
        await self._move_to_point(api, mount, self.drop_position, cp)
        await api.drop_tip(mount)
        await api.home_z(mount)

    async def _concentricity_test(
        self, api: OT3API, mount: OT3Mount
    ) -> None:
        await api.home_z(mount)
        cp = CriticalPoint.TIP
        await self._move_to_point(api, mount, self.hole_plate_position, cp)
        center_result = float(input("\nConcentricity Test Result [Default = 1]: \n1 = Pass \n2 = Fail \nAnswer:") or "1")
        self.test_data["Concentricity"] = str(center_result)

    def _reset_data(self):
        self.test_data["Leak"] = "None"
        self.test_data["Feel"] = "None"

    def _save_config(
        self, filename: str, data: str
    ) -> Dict:
        """This function saves a given config file with data"""
        try:
            with open(filename, 'w') as file:
                json.dump(data, file, sort_keys=True, indent=4, separators=(',', ': '))
        except FileNotFoundError:
            print('Warning: {0} not found'.format(filename))
            data = {}
        except json.decoder.JSONDecodeError:
            print('Error: {0} is corrupt'.format(filename))
            data = {}
        return data

    def _load_config(self, tip_num):
        y_offset = self.tip_distance*(8 - tip_num)
        max_y_offset = self.tip_distance*(7)
        if self.direction == "front":
            self.tiprack_position = Point(self.deck_slot['deck_slot'][self.tiprack_slot]['X'],
                                        self.deck_slot['deck_slot'][self.tiprack_slot]['Y'],
                                        self.deck_slot['deck_slot'][self.tiprack_slot]['Z'])

            self.drop_position = Point(self.deck_slot['deck_slot'][self.trash_slot]['X'],
                                        self.deck_slot['deck_slot'][self.trash_slot]['Y'],# - y_offset,
                                        self.deck_slot['deck_slot'][self.trash_slot]['Z'])

            self.gauge_position = Point(self.deck_slot['deck_slot'][self.gauge_slot]['X'],
                                        self.deck_slot['deck_slot'][self.gauge_slot]['Y'],# - y_offset,
                                        self.deck_slot['deck_slot'][self.gauge_slot]['Z'])

            self.trough_position = Point(self.deck_slot['deck_slot'][self.trough_slot]['X'],
                                        self.deck_slot['deck_slot'][self.trough_slot]['Y'] - y_offset,
                                        self.deck_slot['deck_slot'][self.trough_slot]['Z'])

            self.feel_position = Point(self.deck_slot['deck_slot'][self.feel_slot]['X'],
                                        self.deck_slot['deck_slot'][self.feel_slot]['Y'] - y_offset,
                                        self.deck_slot['deck_slot'][self.feel_slot]['Z'])

            self.hole_plate_position = Point(self.deck_slot['deck_slot'][self.center_slot]['X'],
                                        self.deck_slot['deck_slot'][self.center_slot]['Y'] - y_offset,
                                        self.deck_slot['deck_slot'][self.center_slot]['Z'])
        else:
            self.tiprack_position = Point(self.deck_slot['deck_slot'][self.tiprack_slot]['X'],
                                        self.deck_slot['deck_slot'][self.tiprack_slot]['Y'] - y_offset,
                                        self.deck_slot['deck_slot'][self.tiprack_slot]['Z'])

            self.drop_position = Point(self.deck_slot['deck_slot'][self.trash_slot]['X'],
                                        self.deck_slot['deck_slot'][self.trash_slot]['Y'],
                                        self.deck_slot['deck_slot'][self.trash_slot]['Z'])

            self.gauge_position = Point(self.deck_slot['deck_slot'][self.gauge_slot]['X'],
                                        self.deck_slot['deck_slot'][self.gauge_slot]['Y'],# - max_y_offset,
                                        self.deck_slot['deck_slot'][self.gauge_slot]['Z'])

            self.trough_position = Point(self.deck_slot['deck_slot'][self.trough_slot]['X'],
                                        self.deck_slot['deck_slot'][self.trough_slot]['Y'],
                                        self.deck_slot['deck_slot'][self.trough_slot]['Z'])

            self.feel_position = Point(self.deck_slot['deck_slot'][self.feel_slot]['X'],
                                        self.deck_slot['deck_slot'][self.feel_slot]['Y'],
                                        self.deck_slot['deck_slot'][self.feel_slot]['Z'])

            self.hole_plate_position = Point(self.deck_slot['deck_slot'][self.center_slot]['X'],
                                        self.deck_slot['deck_slot'][self.feel_slot]['Y'],
                                        self.deck_slot['deck_slot'][self.center_slot]['Z'])

    async def _countdown(
        self, count_time: float
    ) -> None:
        """
        This function loops through a countdown before checking the leak visually
        """
        time_suspend = 0
        print("")
        while time_suspend < count_time:
            await asyncio.sleep(1)
            time_suspend += 1
            print(f"Remaining: {count_time - time_suspend} (s)", end="")
            print("\r", end="")
        print("")

    async def _home(
        self, api: OT3API, mount: OT3Mount
    ) -> None:
        # Home grantry
        await api.home()
        self.home = await api.gantry_position(mount)

    async def _reset(
        self, api: OT3API, mount: OT3Mount
    ) -> None:
        # Home Z
        await api.home_z()
        # Move next to XY home
        await api.move_to(mount, self.home + Point(x=-5, y=-5, z=0))

    async def exit(self):
        if self.api:
            await self.api.disengage_axes(self.axes)

    async def run(self) -> None:
        try:
            await self.test_setup()
            if self.api and self.mount:
                await self._home(self.api, self.mount)
                if self.calibrate:
                    await self._calibrate_tiprack(self.api, self.mount)
                    await self._calibrate_trash(self.api, self.mount)
                    await self._calibrate_gauge(self.api, self.mount)
                    await self._calibrate_trough(self.api, self.mount)
                    if self.concentricity:
                        await self._calibrate_hole_plate(self.api, self.mount)
                else:
                    self._load_config(self.tip_num)
                if self.nozzle_offset:
                    await self._get_nozzles_offset(self.api, self.mount)
                await self._home(self.api, self.mount)
                for i in range(self.cycles):
                    cycle = i + 1
                    print(f"\n-> Starting Test Cycle {cycle}/{self.cycles}")
                    if self.calibrate and cycle > 1:
                        await self._pick_up_tips(self.api, self.mount, cycle)
                    if not self.calibrate:
                        await self._pick_up_tips(self.api, self.mount, cycle)
                    await self._measure_tips(self.api, self.mount, cycle)
                    # await self._leak_test(self.api, self.mount)
                    await self._feel_test(self.api, self.mount)
                    await self._record_data(cycle)
                    self._reset_data()
                await self._reset(self.api, self.mount)
        except Exception as e:
            await self.exit()
            raise e
        except KeyboardInterrupt:
            await self.exit()
            print("\nTest Cancelled!")
        finally:
            await self.exit()
            print("\nTest Completed!")

if __name__ == '__main__':
    print("\nOT-3 8-Channel Partial Tip Pick-up Test\n")
    arg_parser = build_arg_parser()
    args = arg_parser.parse_args()
    test = Eight_Channel_Partial_Pickup_Test(args.simulate, args.calibrate, args.concentricity, args.cycles, args.channels, args.direction, args.pipette, args.tip_num, args.gauge_slot, args.tiprack_slot, args.trough_slot, args.trash_slot, args.feel_slot, args.center_slot, args.tip_size, args.volume, args.liquid_offset)
    asyncio.run(test.run())
