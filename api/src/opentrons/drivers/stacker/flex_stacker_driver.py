import serial
from serial import Serial # type: ignore[import]
from abc import ABC, abstractmethod
import time
from typing import Tuple
import re
from datetime import datetime
from enum import Enum
from opentrons.drivers.command_builder import CommandBuilder
import math
from typing import List, Optional, Iterator

import serial.tools
import serial.tools.list_ports

class GCODE(str, Enum):
    CR = '\r\n',
    MOVE_DIST = 'G0',
    MOVE_MIRCROSTEP = 'G0.S',
    MOVE_LS = 'G5',
    LIMITSWITCH_STATUS = 'M119'
    CURRENT_MOTION_PARMS = 'M120'
    PLATFORM_STATUS = 'M121'
    ENABLE_MOTOR = 'M17'
    DISABLE_MOTOR = 'M18'
    WRITE_TO_REGISTER = 'M921'
    READ_FROM_REGISTER = 'M920'
    SET_PEAK_CURRENT = 'M906'
    SET_IHOLD_CURRENT = 'M907'
    SET_MICROSTEPPING = 'M909'
    STALLGUARD = 'M910'
    GET_STALLGUARD_VAL = 'M911'
    SET_SERIAL_NUM = 'M996'
    DEVICE_INFO = 'M115'


class DIR(str, Enum):
    POSITIVE = '',
    NEGATIVE = '-',
    NEGATIVE_HOME = '0'
    POSITIVE_HOME = '1'

class AXIS(str, Enum):
    X = 'X',
    Z = 'Z',
    L = 'L',

class LABWARE_Z_HEIGHT(float, Enum):
    BIORAD_HARDSHELL_PCR = 24.0,
    OPENTRONS_TIPRACKS = 122,
    DEEPWELL_96 = 40.5,
    FLEX_STACKER_PLATFORM = 8.4,
    NEST_200_ul_PCR_PLATE = 15.5,
    NEST_96_WELL_PLATE_FLATBOTTOM = 18,
    NEST_96_WELL_PLATE_FLATBOTTOM_WITH_LID = 16,
    NEST_96_DEEP_WELL_PLATE_VBOTTOM = 39.1,
    NEST_12_DEEP_WEEL_PLATE_VBOTTOM = 29.75,
    CORSTAR_24_WELL_WITH_LID = 16*2,
    CORSTAR_24_WELL_WITHOUT_LID = 16*2,
    SARSTEDT_PCR_PLATE_FULLSKIRT = 16,
    ARMADILLO_384_PLATE = 15.5
    THERMOCYLER_LID_WITH_ADAPTER = 40

FS_BAUDRATE = 115200
DEFAULT_FS_TIMEOUT = 0.1
FS_COMMAND_TERMINATOR = "\r\n"
FS_ACK = "OK"+ FS_COMMAND_TERMINATOR.strip("\r")
FS_STALL = "async ERR403:motor stall error" + FS_COMMAND_TERMINATOR.strip("\r")
DEFAULT_COMMAND_RETRIES = 1
TOTAL_TRAVEL_X = 192.5
TOTAL_TRAVEL_Z = 136
TOTAL_TRAVEL_L = 22
RETRACT_DIST_X = 1
RETRACT_DIST_Z = 1
HOME_SPEED = 10
HOME_SPEED_L = 100
HOME_ACCELERATION = 100
HOME_ACCELERATION_L = 800
MOVE_ACCELERATION_X = 1500
MOVE_ACCELERATION_Z = 500
MOVE_ACCELERATION_L = 800
MAX_SPEED_DISCONTINUITY_X = 40
MAX_SPEED_DISCONTINUITY_Z = 40
MAX_SPEED_DISCONTINUITY_L = 40
HOME_CURRENT_X = 1.5
HOME_CURRENT_Z = 1.5
HOME_CURRENT_L = 0.8
MOVE_CURRENT_X = 1.0
MOVE_CURRENT_Z = 1.5
MOVE_CURRENT_L = 0.6
MOVE_SPEED_X = 200
MOVE_SPEED_UPZ = 200
MOVE_SPEED_L = 100
MOVE_SPEED_DOWNZ = 200
x_sg_value = 8
z_sg_value = 16
l_sg_value = 8

class FlexStacker():
    """Flex Stacker Driver."""

    def __init__(self, connection: Serial) -> None:
        """
        Constructor

        Args:
            connection: SerialConnection to the plate stacker
        """
        self._stacker_connection = connection
        self._ack = FS_ACK.encode()
        self._stall = FS_STALL.encode()
        self.move_speed_x = MOVE_SPEED_X
        self.move_speed_up_z = MOVE_SPEED_UPZ
        self.move_speed_down_z = MOVE_SPEED_DOWNZ
        self.home_acceleration = HOME_ACCELERATION
        self.home_acceleration_l = HOME_ACCELERATION_L
        self.home_speed = HOME_SPEED
        self.home_speed_l = HOME_SPEED_L
        self.move_acceleration_x = MOVE_ACCELERATION_X
        self.move_acceleration_z = MOVE_ACCELERATION_Z
        self.move_acceleration_l = MOVE_ACCELERATION_L
        self.max_speed_discontinuity_x = MAX_SPEED_DISCONTINUITY_X
        self.max_speed_discontinuity_z = MAX_SPEED_DISCONTINUITY_Z
        self.max_speed_discontinuity_l = MAX_SPEED_DISCONTINUITY_L
        self.current_position = {'X': None, 'Z': None, 'L': None}
        self.x_sg_value = x_sg_value
        self.z_sg_value = z_sg_value
        self.l_sg_value = l_sg_value
        # self.__class__.__name__ == 'FlexStacker'

    @classmethod
    def create(cls, port: str, baudrate: int = 115200, timeout: float = 1.0) -> "FlexStacker":
        """Flex Stacker Driver"""
        conn = Serial(port = port, baudrate = baudrate, timeout = timeout)
        return cls(connection = conn)
    
    @classmethod
    def create_from_sn(cls, sn: str, baudrate: int = 115200, timeout: float = 1.0) -> "FlexStacker":
        """Flex Stacker Driver"""
        port = None
        for comport in serial.tools.list_ports.comports():
            if comport.serial_number is sn:
                port = comport.device
                break
        if not port:
            raise ValueError(f"Could not find connected stacker with serial number {sn}")
        
        return cls.create(port=port, baudrate=baudrate, timeout=timeout)

    def setup_stall_detection(self):
        self.enable_SG(AXIS.X, self.x_sg_value, True)
        self.enable_SG(AXIS.Z, self.z_sg_value, True)
        self.enable_SG(AXIS.L, self.l_sg_value, True)

    def send_command(
        self, command: CommandBuilder, retries: int = 0, timeout: Optional[float] = None
    ) -> str:
        """
        Send a command and return the response.

        Args:
            command: A command builder.
            retries: number of times to retry in case of timeout
            timeout: optional override of default timeout in seconds

        Returns: The command response

        Raises: SerialException
        """
        return self._send_data(
            data=command.build(), retries=retries, timeout=DEFAULT_FS_TIMEOUT
        )

    def _send_data(self, data: str, retries: int = 0, timeout: Optional[float] = None) -> str:
        """
        Send data and return the response.

        Args:
            data: The data to send.
            retries: number of times to retry in case of timeout

        Returns: The command response

        Raises: SerialException
        """
        data_encode = data.encode()
        self._stacker_connection.write(data=data_encode)
        start = time.time()
        while True:
            response = self._stacker_connection.readline()
            print(response)
            #if (self._ack in response) or (self._stall in response):
            if (self._ack in response):
                # Remove ack from response
                response = response.replace(self._ack, b"OK\n")
                str_response = self.process_raw_response(
                    command=data, response=response.decode()
                )
                return str_response
            elif (self._stall in response):
                # Remove ack from response
                str_response = self.process_raw_response(
                    command=data, response=response.decode()
                )
                print(str_response)
                return str_response
            end = time.time()
            if (end-start) > 120:
                str_response = b"OK\n"
                return str_response

        self.on_retry()

    def on_retry(self) -> None:
        """
        Opportunity for derived classes to perform action between retries. Default
        behaviour is to wait then re-open the connection.

        Returns: None
        """
        time.sleep(DEFAULT_FS_TIMEOUT)
        self._stacker_connection.close()
        self._stacker_connection.open()

    def process_raw_response(self, command: str, response: str) -> str:
        """
        Opportunity for derived classes to process the raw response. Default
         strips white space.

        Args:
            command: The sent command.
            response: The raw read response minus ack.

        Returns:
            processed response.
        """
        return response.strip()

    def is_simulator(self)-> bool:
        """Is Simulator"""
        return False

    def connect(self) -> None:
        """Check connection"""
        self._stacker_connection.open()

    def disconnect(self) -> None:
        """Disconnect from Flex Stacker"""
        self._stacker_connection.close()

    def get_device_info(self) -> str:
        """Get the serial number of the flex stacker unit"""
        c = CommandBuilder(terminator=FS_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.DEVICE_INFO)
        print(c)
        response = self.send_command(command=c, retries=DEFAULT_COMMAND_RETRIES).strip('OK')
        return response

    def get_device_firmware_version(self) -> str:
        """Get the firmware version of the flex stacker unit"""
        firmware_version = self.get_device_info().split()[1].split(':')[1]
        return firmware_version

    def get_device_serial_number(self) -> str:
        """Get the serial number of the flex stacker unit"""
        serial_number = self.get_device_info().split()[3].split(':')[1]
        return serial_number

    def set_device_serial_number(self, serial_number) -> None:
        """Set the serial number of the flex stacker unit"""
        c = CommandBuilder(terminator=FS_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.SET_SERIAL_NUM).add_element(serial_number)
        print(c)
        response = self.send_command(command=c, retries=DEFAULT_COMMAND_RETRIES).strip('OK')

    def enable_motor(self, axis: AXIS):
        """Enables a Axis motor
        Args:
            command: Axis
        """
        c = CommandBuilder(terminator=FS_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.ENABLE_MOTOR
        ).add_element(axis.upper())
        print(c)
        response = self.send_command(command=c, retries=DEFAULT_COMMAND_RETRIES).strip('OK')

    def disable_motor(self, axis: AXIS):
        """Enables a Axis motor
        Args:
            command: Axis
        """
        c = CommandBuilder(terminator=FS_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.DISABLE_MOTOR
        ).add_element(axis.upper())
        print(c)
        response = self.send_command(command=c, retries=DEFAULT_COMMAND_RETRIES).strip('OK')

    def get_sensor_states(self):
        """Returns the limit switch status"""
        c = CommandBuilder(terminator=FS_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.LIMITSWITCH_STATUS
        )
        # print(c)
        response = self.send_command(command=c, retries=DEFAULT_COMMAND_RETRIES).strip('OK')

        return self.sensor_parse(response)

    def get_platform_sensor_states(self) -> str:
        """Returns the limit switch status"""
        c = CommandBuilder(terminator=FS_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.PLATFORM_STATUS
        )
        response = self.send_command(command=c, retries=DEFAULT_COMMAND_RETRIES).strip('OK')

        return self.sensor_parse(response)

    def get_settings(self) -> str:
        """Not Implemented yet"""
        c = CommandBuilder(terminator=FS_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.READ_SET_SETTINGS
        )
        response = self.send_command(command=c, retries=DEFAULT_COMMAND_RETRIES).strip('CMD: rrr')

        return response

    def sensor_parse(self, cmd):
        """
        The response of limit switch command returns a string that needs to be parse.
        Below is the following example of the response from the firmware.

        Example: 2024-09-03 14:58:03.135606 Rx <== M119 XE:0 XR:0 ZE:0 ZR:0 LR:0 LH:1 OK
        """

        punctuation = [':']
        i_tracker = 0
        switch_state = []
        final = []
        # print(cmd.index(GCODE.LIMITSWITCH_STATUS))
        for i in cmd:
            if i in punctuation:
                switch_state.append(i_tracker)
            if len(switch_state) == 1:
                lsw = cmd[switch_state[0]+1:switch_state[0]+2]
                final.append(lsw)
                switch_state = []
            i_tracker += 1
        # print(final)
        if GCODE.LIMITSWITCH_STATUS in cmd:
            final = self._parse_lsw(final)
        elif GCODE.PLATFORM_STATUS in cmd:
            final = self._parse_plat(final)
        return final

    def _parse_lsw(self, parse_data):
        """LSW->X+:0,X-:0,Z+:0,Z-:1,PR:1,PH:1PS->X+1,X-:0"""
        "2024-09-03 14:58:03.135606 Rx <== M119 XE:0 XR:0 ZE:0 ZR:0 LR:0 LH:1 OK"
        states = {}
        states.update({"XE": parse_data[0],
                        "XR": parse_data[1],
                        "ZE": parse_data[2],
                        "ZR": parse_data[3],
                        "LR": parse_data[4]
                        })
        return states

    def _parse_plat(self, parse_data):
        """LSW->X+:0,X-:0,Z+:0,Z-:1,PR:1,PH:1PS->X+1,X-:0"""
        "2024-09-03 14:58:03.135606 Rx <== M119 XE:0 XR:0 ZE:0 ZR:0 LR:0 LH:1 OK"
        states = {}

        states.update({"E": parse_data[0],
                        "R": parse_data[1],
                        })
        return states

    def set_default(self, value, default):
        return value if value is not None else default

    def get_current_motion_params(self, axis)-> str:
        """Read current motion parameters"""
        c = CommandBuilder(terminator=FS_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.CURRENT_MOTION_PARMS
        ).add_element(axis)
        print(c)
        response = self.send_command(command=c, retries=DEFAULT_COMMAND_RETRIES).strip('CMD: rrr')
        return response

    def move(self, axis: AXIS, distance: float, direction: DIR,
                velocity: Optional[float] = None, acceleration: Optional[float] = None,
                msd: Optional[float] = None,
                current: Optional[float] = None):
        if axis == AXIS.X:
            current = self.set_default(current, MOVE_CURRENT_X)
            self.set_run_current(current, AXIS.X)
            velocity = self.set_default(velocity, MOVE_SPEED_X)
            acceleration = self.set_default(acceleration, MOVE_ACCELERATION_X)
            msd = self.set_default(msd, MAX_SPEED_DISCONTINUITY_X)
        elif axis == AXIS.Z:
            current = self.set_default(current, MOVE_CURRENT_Z)
            self.set_run_current(current, AXIS.Z)
            velocity = self.set_default(velocity, MOVE_SPEED_DOWNZ)
            acceleration = self.set_default(acceleration, MOVE_ACCELERATION_Z)
            msd = self.set_default(msd, MAX_SPEED_DISCONTINUITY_Z)
        elif axis == AXIS.L:
            current = self.set_default(current, MOVE_CURRENT_L)
            self.set_run_current(current, AXIS.L)
            velocity = self.set_default(velocity, MOVE_SPEED_L)
            acceleration = self.set_default(acceleration, MOVE_ACCELERATION_L)
            msd = self.set_default(msd, MAX_SPEED_DISCONTINUITY_L)
        else:
            raise(f"AXIS not defined!! {axis}")
        # if self.current_position['X'] == None or self.current_position['Z'] == None:
        #     raise(f"Motor must be Home{axis}")
        c = CommandBuilder(terminator=FS_COMMAND_TERMINATOR).add_gcode(
                                                gcode=GCODE.MOVE_DIST).add_element(
                                                axis.upper() +
                                                f'{direction}' +
                                                f'{distance}').add_element(
                                                    f'V{velocity}'
                                                    ).add_element(
                                                    f'A{acceleration}' #)
                                                    ).add_element(
                                                    f'D{msd}')

        #print(c)
        response = self.send_command(command=c, retries=DEFAULT_COMMAND_RETRIES)
        stall_detection = "async ERR403:motor stall error"
        if response == stall_detection:
            raise(f"Stall Detected on {axis}")
        if direction == DIR.POSITIVE and axis == AXIS.X:
            self.current_position.update({'X': self.current_position['X'] + distance})
        elif direction == DIR.NEGATIVE and axis == AXIS.X:
            self.current_position.update({'X': self.current_position['X'] - distance})
        elif direction == DIR.POSITIVE and axis == AXIS.Z:
            self.current_position.update({'Z': self.current_position['Z'] + distance})
        elif direction == DIR.NEGATIVE and axis == AXIS.Z:
            self.current_position.update({'Z': self.current_position['Z'] - distance})
        elif direction == DIR.POSITIVE and axis == AXIS.L:
            self.current_position.update({'L': self.current_position['L'] + distance})
        elif direction == DIR.NEGATIVE and axis == AXIS.L:
            self.current_position.update({'L': self.current_position['L'] - distance})
        else:
            raise(f"Not recognized {axis} and {direction}")
        #print(self.current_position)


    def microstepping_move(self, axis: AXIS, distance: float, direction: DIR, speed: float, acceleration: float):
        c = CommandBuilder(terminator=FS_COMMAND_TERMINATOR).add_element(
                            axis.upper()).add_element(f'{direction}').add_gcode(
            gcode=GCODE.MOVE_IGNORE_LIMIT
        )
        self.send_command(command=c, retries=DEFAULT_COMMAND_RETRIES)

    def set_microstep(self, axis: AXIS, microstepping: int):
        c = CommandBuilder(terminator=FS_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.SET_MICROSTEPPING).add_element(f'{axis.upper()}{microstepping}')
        #print(c)
        self.send_command(command=c, retries=DEFAULT_COMMAND_RETRIES)

    def home(self, axis: AXIS, direction: DIR, velocity: Optional[float] = None,
                                                acceleration: Optional[float] = None,
                                                current: Optional[float] = None):
        # Set this to max current to overcome spring force on platforms
        if axis == AXIS.X:
            current = self.set_default(current, HOME_CURRENT_X)
            #print(f"current set: {current}")
            self.set_run_current(current, AXIS.X)
            velocity = self.set_default(velocity, self.home_speed)
            acceleration = self.set_default(acceleration, self.home_acceleration)
            # msd = self.set_default(msd, MAX_SPEED_DISCONTINUITY_X)
        elif axis == AXIS.Z:
            current = self.set_default(current, HOME_CURRENT_Z)
            self.set_run_current(current, AXIS.Z)
            velocity = self.set_default(velocity, self.home_speed)
            acceleration = self.set_default(acceleration, self.home_acceleration)
            self.set_ihold_current(1.8, AXIS.Z)
            # msd = self.set_default(msd, MAX_SPEED_DISCONTINUITY_Z)
        elif axis == AXIS.L:
            current = self.set_default(current, HOME_CURRENT_L)
            self.set_run_current(current, AXIS.L)
            velocity = self.set_default(velocity, self.home_speed_l)
            acceleration = self.set_default(acceleration, self.home_acceleration_l)
            #print(velocity)
            #print(acceleration)
            # msd = self.set_default(msd, MAX_SPEED_DISCONTINUITY_L)
        else:
            raise(f"AXIS not defined!! {axis}")
        # G5 X[dir: 0|1] V100 A50
        c = CommandBuilder(terminator=FS_COMMAND_TERMINATOR).add_gcode(
                                                            gcode=GCODE.MOVE_LS
                                                                ).add_element(
                                                            axis.upper()
                                                            + direction).add_element(
                                                            f'V{velocity}'
                                                            ).add_element(
                                                            f'A{acceleration}'
                                                            )
        #print(c)
        self.send_command(command=c, retries=DEFAULT_COMMAND_RETRIES)
        if direction == DIR.POSITIVE_HOME and axis == AXIS.X:
            self.current_position.update({'X': TOTAL_TRAVEL_X})
        elif direction == DIR.NEGATIVE_HOME and axis == AXIS.X:
            self.current_position.update({'X': 0})
        elif direction == DIR.POSITIVE_HOME and axis == AXIS.Z:
            self.current_position.update({'Z': TOTAL_TRAVEL_Z})
        elif direction == DIR.NEGATIVE_HOME and axis == AXIS.Z:
            self.current_position.update({'Z': 0})
        elif direction == DIR.NEGATIVE_HOME and axis == AXIS.L:
            self.current_position.update({'L': 0})
        else:
            raise(f"Not recognized {axis} and {direction}")
        #print(self.current_position)

    def convert_current_to_binary(self, current: float) -> bin:
        # fixed_point_constant = 1398894
        fixed_point_constant = 1419610
        if current > 1.5:
            current = 1.5
        message_current = int((current)*2**16)
        print(message_current)
        shifted_current_cs = fixed_point_constant*message_current
        print(shifted_current_cs)
        current_cs = (shifted_current_cs >> 32) - 1
        print(current_cs)
        if current_cs > 31:
            current_cs = 31
        current = '0b'+ str(bin(current_cs).replace("0b", '')).zfill(5)
        return current

    def set_ihold_current(self, current: float, axis: AXIS) -> str:
        """
            M907 - Set axis hold current in Amps ex: M907 X0.5
            M909 - Set microstepping using power of 2 ex: M90  Z2 = 2^2 microstepping"""
        # current = self.convert_current_to_binary(current)
        # print(current)
        c = CommandBuilder(terminator=FS_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.SET_IHOLD_CURRENT
        ).add_element(axis + f'{current}')
        #print(c)
        self.send_command(command=c, retries=DEFAULT_COMMAND_RETRIES)

    def set_run_current(self, current: float, axis: AXIS) -> str:
        """ M906 - Set axis peak run current in Amps ex: M906 X1.5"""
        # current = convert_current_to_binary(current)
        c = CommandBuilder(terminator=FS_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.SET_PEAK_CURRENT
        ).add_element(axis + f'{current}')
        print(c)
        self.send_command(command=c, retries=DEFAULT_COMMAND_RETRIES)
        time.sleep(0.1)

    def close_latch(self, velocity: Optional[float] = None, acceleration: Optional[float] = None):
        velocity = self.set_default(velocity, MOVE_SPEED_L)
        acceleration = self.set_default(acceleration, HOME_ACCELERATION_L)
        states = self.get_sensor_states()
        #print(states)
        #print(velocity)
        #print(acceleration)
        cur_position = self.current_position['L']
        #print(cur_position)
        #     self.home(AXIS.L, DIR.NEGATIVE_HOME, velocity, acceleration)
        if cur_position == None:
            self.home(AXIS.L, DIR.NEGATIVE_HOME, velocity, acceleration)
        elif cur_position != 0:
            self.move(AXIS.L, TOTAL_TRAVEL_L-2, DIR.NEGATIVE, MOVE_SPEED_L, MOVE_ACCELERATION_L, MAX_SPEED_DISCONTINUITY_L)
            self.home(AXIS.L, DIR.NEGATIVE_HOME, velocity, acceleration)
        else:
            self.home(AXIS.L, DIR.NEGATIVE_HOME, velocity, acceleration)

    def open_latch(self, distance: Optional[float] = None,
                    velocity: Optional[float] = None, acceleration: Optional[float] = None,
                    max_speed_discontinuity: Optional[float] = None):
        # distance = self.set_default(distance, LATCH_DISTANCE_MM)
        velocity = self.set_default(velocity, MOVE_SPEED_L)
        acceleration = self.set_default(acceleration, MOVE_ACCELERATION_L)
        msd = self.set_default(max_speed_discontinuity, MAX_SPEED_DISCONTINUITY_L)
        self.move(AXIS.L, TOTAL_TRAVEL_L, DIR.POSITIVE, velocity, acceleration, msd)

    def load_labware(self, labware_height: float):
        # ----------------Set up the Stacker------------------------
        self.home(AXIS.X, DIR.POSITIVE_HOME, HOME_SPEED, HOME_ACCELERATION)
        self.home(AXIS.Z, DIR.NEGATIVE_HOME, HOME_SPEED, HOME_ACCELERATION)
        self.close_latch()
        self.move(AXIS.X, TOTAL_TRAVEL_X-5, DIR.NEGATIVE, self.move_speed_x, self.move_acceleration_x)
        self.home(AXIS.X, DIR.NEGATIVE_HOME, HOME_SPEED, HOME_ACCELERATION)
        self.move(AXIS.Z, TOTAL_TRAVEL_Z-(labware_height/2)-10, DIR.POSITIVE, self.move_speed_up_z/4, self.move_acceleration_z)
        # #------------------- transfer -----------------------------
        self.open_latch()
        self.move(AXIS.Z, (labware_height/2), DIR.POSITIVE, self.move_speed_up_z/2, self.move_acceleration_z)
        self.home(AXIS.Z, DIR.POSITIVE_HOME, HOME_SPEED, HOME_ACCELERATION)
        self.close_latch()
        self.move(AXIS.Z, TOTAL_TRAVEL_Z-15, DIR.NEGATIVE, self.move_speed_down_z, self.move_acceleration_z)
        self.home(AXIS.Z, DIR.NEGATIVE_HOME, HOME_SPEED, HOME_ACCELERATION)
        self.move(AXIS.X, TOTAL_TRAVEL_X-5, DIR.POSITIVE, self.move_speed_x, self.move_acceleration_x)
        self.home(AXIS.X, DIR.POSITIVE_HOME, HOME_SPEED, HOME_ACCELERATION)

    def unload_labware(self, labware_height: float):
        axis_swap_approach_mm = 10
        # ----------------Set up the Stacker------------------------
        self.home(AXIS.X, DIR.POSITIVE_HOME, HOME_SPEED, HOME_ACCELERATION)
        self.home(AXIS.Z, DIR.NEGATIVE_HOME, HOME_SPEED, HOME_ACCELERATION)
        self.close_latch()
        self.move(AXIS.X, TOTAL_TRAVEL_X-5, DIR.NEGATIVE, self.move_speed_x, self.move_acceleration_x)
        self.home(AXIS.X, DIR.NEGATIVE_HOME, HOME_SPEED, HOME_ACCELERATION)
        self.move(AXIS.Z, TOTAL_TRAVEL_Z-5, DIR.POSITIVE, self.move_speed_up_z, self.move_acceleration_z)
        self.home(AXIS.Z, DIR.POSITIVE_HOME, HOME_SPEED, HOME_ACCELERATION)
        # #------------------- transfer -----------------------------
        self.open_latch()
        self.move(AXIS.Z, (labware_height/2), DIR.NEGATIVE, self.move_speed_down_z, self.move_acceleration_z)
        self.close_latch()
        self.move(AXIS.Z, TOTAL_TRAVEL_Z-(labware_height/2+axis_swap_approach_mm), DIR.NEGATIVE, self.move_speed_down_z, self.move_acceleration_z)
        self.home(AXIS.Z, DIR.NEGATIVE_HOME, HOME_SPEED, HOME_ACCELERATION)
        self.move(AXIS.X, TOTAL_TRAVEL_X-5, DIR.POSITIVE, self.move_speed_x, self.move_acceleration_x)
        self.home(AXIS.X, DIR.POSITIVE_HOME, HOME_SPEED, HOME_ACCELERATION)

    def write_to_motor_drive(self, register, data):
        """
        Example: M921 X32528 103689
        Write Motor Driver Register

        input: the axis, the address, and the contents of the register you want to read
        """
        c = CommandBuilder(terminator=FS_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.WRITE_TO_REGISTER
        ).add_element(axis.upper()).add_element(register).add_element(data)
        #print(c)

        response = self.send_command(command=c, retries=DEFAULT_COMMAND_RETRIES).strip('OK')

    def read_from_motor_drive(self, register):
        """
        Example: M921 X32528 103689
        Write Motor Driver Register

        input: the axis, the address, and the contents of the register you want to read
        """
        c = CommandBuilder(terminator=FS_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.WRITE_TO_REGISTER
        ).add_element(axis.upper()).add_element(register)
        print(c)

        response = self.send_command(command=c, retries=DEFAULT_COMMAND_RETRIES).strip('OK')

    def enable_SG(self, axis: AXIS, sg_value: int, enable: bool):
        """
        Enable StallGuard and set SGT

        *T: StallGuard Threshold (SGT), (-64-63)

        *: optional params, default/previously set values will be used if
        unspecified. You can query the current SGT value with M911 Z
        M910 Z[enable: 0|1] T2
        """
        c = CommandBuilder(terminator=FS_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.STALLGUARD
        ).add_element(f'{axis.upper()}{int(enable)}').add_element(f'T{sg_value}')
        #print(c)

        response = self.send_command(command=c, retries=DEFAULT_COMMAND_RETRIES).strip('OK')

    def read_SG_value(self, axis: AXIS):
        """
        Get the StallGuard (SGT) value

        M911 Z1 T2
        """
        c = CommandBuilder(terminator=FS_COMMAND_TERMINATOR).add_gcode(
            gcode=GCODE.GET_STALLGUARD_VAL
        ).add_element(axis.upper())
        #print(c)

        response = self.send_command(command=c, retries=DEFAULT_COMMAND_RETRIES).strip('OK')
