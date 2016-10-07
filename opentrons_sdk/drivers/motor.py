import glob
import json
import sys
import time

import serial

from opentrons_sdk.drivers.virtual_smoothie import VirtualSmoothie
from opentrons_sdk.util import log
from opentrons_sdk.util.vector import Vector


JSON_ERROR = None
if sys.version_info > (3, 4):
    JSON_ERROR = ValueError
else:
    JSON_ERROR = json.decoder.JSONDecodeError


class CNCDriver(object):

    """
    This object outputs raw GCode commands to perform high-level tasks.
    """

    MOVE = 'G0'
    DWELL = 'G4'
    HOME = 'G28'
    SET_POSITION = 'G92'
    GET_POSITION = 'M114'
    GET_ENDSTOPS = 'M119'
    SET_SPEED = 'G0'
    HALT = 'M112'
    CALM_DOWN = 'M999'

    DISENGAGE_FEEDBACK = 'M63'

    ABSOLUTE_POSITIONING = 'G90'
    RELATIVE_POSITIONING = 'G91'

    VERSION = 'version'

    GET_OT_VERSION = 'config-get sd ot_version'
    GET_STEPS_PER_MM = {
        'x': 'config-get sd alpha_steps_per_mm',
        'y': 'config-get sd beta_steps_per_mm'
    }

    SET_STEPS_PER_MM = {
        'x': 'config-set sd alpha_steps_per_mm ',
        'y': 'config-set sd beta_steps_per_mm '
    }

    """
    Serial port connection to talk to the device.
    """
    connection = None

    serial_timeout = 0.1

    # TODO: move to config
    ot_version = 'hood'
    ot_one_dimensions = {
        'hood': Vector(300, 120, 120),
        'one_pro': Vector(300, 250, 120),
        'one_standard': Vector(300, 250, 120)
    }

    def get_dimensions(self):
        return self.ot_one_dimensions[self.ot_version]

    def list_serial_ports(self):
        """ Lists serial port names

            :raises EnvironmentError:
                On unsupported or unknown platforms
            :returns:
                A list of the serial ports available on the system
        """
        if sys.platform.startswith('win'):
            ports = ['COM%s' % (i + 1) for i in range(256)]
        elif (sys.platform.startswith('linux') or
              sys.platform.startswith('cygwin')):
            # this excludes your current terminal "/dev/tty"
            ports = glob.glob('/dev/tty[A-Za-z]*')
        elif sys.platform.startswith('darwin'):
            ports = glob.glob('/dev/tty.*')
        else:
            raise EnvironmentError('Unsupported platform')

        result = []
        for port in ports:
            try:
                if 'usbmodem' in port or 'COM' in port:
                    s = serial.Serial(port)
                    s.close()
                    result.append(port)
            except Exception as e:
                log.debug(
                    "Serial",
                    'Exception in testing port {}'.format(port))
                log.debug("Serial", e)
        return result

    def connect(self, device=None, port=None):
        try:
            if device or port:
                self.connection = serial.Serial(
                    port=device or port,
                    baudrate=115200,
                    timeout=self.serial_timeout)
            else:
                settings = {
                    'ot_version': 'one_pro',
                    'alpha_steps_per_mm': 80.0,
                    'beta_steps_per_mm': 80.0
                }
                self.connection = VirtualSmoothie('v1.0.5', settings)

            # sometimes pyserial swallows the initial b"Smoothie\r\nok\r\n"
            # so just always swallow it ourselves
            self.reset_port()

            log.debug("Serial", "Connected to {}".format(device or port))

            return self.calm_down()

        except serial.SerialException as e:
            log.debug(
                "Serial",
                "Error connecting to {}".format(device or port))
            log.error("Serial", e)
            return False

    def reset_port(self):
        self.connection.close()
        self.connection.open()
        self.flush_port()

        self.turn_off_feedback()

        self.get_ot_version()

    def disconnect(self):
        if self.connection and self.connection.isOpen():
            self.connection.close()

    def send_command(self, command, **kwargs):
        """
        Sends a GCode command.  Keyword arguments will be automatically
        converted to GCode syntax.

        Returns a string with the Smoothie board's response
        Empty string if no response from Smoothie

        >>> send_command(self.MOVE, x=100 y=100)
        G0 X100 Y100
        """

        args = ' '.join(['{}{}'.format(k, v) for k, v in kwargs.items()])
        command = '{} {}\r\n'.format(command, args)
        response = self.write_to_serial(command)
        return response

    def write_to_serial(self, data, max_tries=10, try_interval=0.2):
        log.debug("Serial", "Write: {}".format(str(data).encode()))
        if self.connection is None:
            log.warn("Serial", "No connection found.")
            return
        if self.connection.isOpen():
            self.connection.write(str(data).encode())
            return self.wait_for_response()
        elif max_tries > 0:
            # time.sleep(try_interval)
            self.reset_port()
            return self.write_to_serial(
                data, max_tries=max_tries - 1, try_interval=try_interval
            )
        else:
            log.error("Serial", "Cannot connect to serial port.")
            return b''

    def wait_for_response(self, timeout=20.0):
        count = 0
        max_retries = int(timeout / self.serial_timeout)
        while count < max_retries:
            count = count + 1
            out = self.readline_from_serial()
            if out:
                log.debug(
                    "Serial",
                    "Waited {} lines for response {}.".format(count, out)
                )
                return out
            else:
                if count == 1 or count % 10 == 0:
                    # Don't log all the time; gets spammy.
                    log.debug(
                        "Serial",
                        "Waiting {} lines for response.".format(count)
                    )
        raise RuntimeWarning('no response after {} seconds'.format(timeout))

    def flush_port(self):
        # if we are running a virtual smoothie
        # we don't need a timeout for flush
        if isinstance(self.connection, VirtualSmoothie):
            self.readline_from_serial()
        else:
            time.sleep(self.serial_timeout)
            while self.readline_from_serial():
                time.sleep(self.serial_timeout)

    def readline_from_serial(self):
        msg = b''
        if self.connection.isOpen():
            # serial.readline() returns an empty byte string if it times out
            msg = self.connection.readline().strip()
            if msg:
                log.debug("Serial", "Read: {}".format(msg))

        # detect if it hit a home switch
        if b'!!' in msg or b'limit' in msg:
            # TODO (andy): allow this to bubble up so UI is notified
            log.debug('Serial', 'home switch hit')
            self.flush_port()
            self.calm_down()
            raise RuntimeWarning('limit switch hit')

        return msg

    def set_coordinate_system(self, mode):
        if mode == 'absolute':
            self.send_command(self.ABSOLUTE_POSITIONING)
        elif mode == 'relative':
            self.send_command(self.RELATIVE_POSITIONING)
        else:
            raise ValueError('Invalid coordinate mode: ' + mode)

    def move_plunger(self, mode='absolute', **kwargs):
        if 'absolute' in kwargs:
            raise ValueError('absolute parameter is obsolete, ' +
                             'please use mode=(absolute|relative)')

        self.set_coordinate_system(mode)

        args = {axis.upper(): kwargs[axis]
                for axis in 'ab'
                if axis in kwargs}

        log.debug("MotorDriver", "Moving plunger: {}".format(args))
        res = self.send_command(self.MOVE, **args)
        return res == b'ok'

    def move_head(self, mode='absolute', **kwargs):
        if 'absolute' in kwargs:
            raise ValueError('absolute parameter is obsolete, ' +
                             'please use mode=(absolute|relative)')

        self.set_coordinate_system(mode)
        current = self.get_head_position()
        log.debug('Motor Driver', 'Current Head Position: {}'.format(current))
        vector = {
            axis: kwargs.get(
                axis,
                0 if mode == 'relative' else current['target'][axis]
            )
            for axis in 'xyz'
        }
        log.debug('Motor Driver', 'Destination: {}'.format(vector))

        vector = self.flip_coordinates(vector, mode)

        # vector contains every axis, however we are passing
        # only those that were supplied in kwargs down to send_command
        args = {
            axis.upper(): vector[axis]
            for axis in 'xyz' if axis in kwargs}

        log.debug("MotorDriver", "Moving head: {}".format(args))
        res = self.send_command(self.MOVE, **args)
        return res == b'ok'

    def flip_coordinates(self, coordinates, mode='absolute'):
        coordinates = Vector(coordinates) * Vector(1, -1, -1)
        if mode == 'absolute':
            offset = Vector(0, 1, 1) * self.ot_one_dimensions[self.ot_version]
            coordinates += offset
        return coordinates

    def wait_for_arrival(self):
        arrived = False
        coords = self.get_position()
        while not arrived:
            # time.sleep(self.serial_timeout)
            prev_coords = dict(coords)
            coords = self.get_position()
            for axis in coords.get('target', {}):
                axis_diff = coords['current'][axis] - coords['target'][axis]

                """
                smoothie not guaranteed to be EXACTLY where it's target is
                but seems to be about +-0.05 mm from the target coordinate
                the robot's physical resolution is found with:
                1mm / config_steps_per_mm
                """
                if abs(axis_diff) < 0.1:
                    if coords['current'][axis] == prev_coords['current'][axis]:
                        arrived = True
                else:
                    arrived = False
                    break
        return arrived

    def home(self, *axis):
        home_command = self.HOME
        axis_homed = ''
        for a in axis:
            ax = ''.join(sorted(a)).upper()
            if ax in 'ABXYZ':
                axis_homed += ax
        res = self.send_command(home_command + axis_homed)
        if res == b'ok':
            # the axis aren't necessarily set to 0.0
            # values after homing, so force it
            pos_args = {}
            for l in axis_homed:
                pos_args[l] = 0
            return self.set_position(**pos_args)
        else:
            return False

    def wait(self, sec):
        ms = int((sec % 1.0) * 1000)
        s = int(sec)
        res = self.send_command(self.DWELL, S=s, P=ms)
        return res == b'ok'

    def halt(self):
        res = self.send_command(self.HALT)
        return res == (b'ok Emergency Stop Requested - '
                       b'reset or M999 required to continue')

    def calm_down(self):
        res = self.send_command(self.CALM_DOWN)
        return res == b'ok'

    def set_position(self, **kwargs):
        uppercase_args = {}
        for key in kwargs:
            uppercase_args[key.upper()] = kwargs[key]
        res = self.send_command(self.SET_POSITION, **uppercase_args)
        return res == b'ok'

    def get_head_position(self):
        coords = self.get_position()
        coords['current'] = self.flip_coordinates(Vector(coords['current']))
        coords['target'] = self.flip_coordinates(Vector(coords['target']))

        return coords

    def get_plunger_positions(self):
        coords = self.get_position()
        plunger_coords = {}
        for state in ['current', 'target']:
            plunger_coords[state] = {
                axis: coords[state][axis]
                for axis in 'ab'
            }

        return plunger_coords

    def get_position(self):
        res = self.send_command(self.GET_POSITION)
        # remove the "ok " from beginning of response
        res = res.decode('utf-8')[3:]
        coords = {}
        try:
            response_dict = json.loads(res).get(self.GET_POSITION)
            coords = {'target': {}, 'current': {}}
            for letter in 'xyzab':
                # the lowercase axis are the "real-time" values
                coords['current'][letter] = response_dict.get(letter, 0)
                # the uppercase axis are the "target" values
                coords['target'][letter] = response_dict.get(letter.upper(), 0)

        except JSON_ERROR:
            log.debug("Serial", "Error parsing JSON string:")
            log.debug("Serial", res)

        return coords

    def turn_off_feedback(self):
        res = self.send_command(self.DISENGAGE_FEEDBACK)
        if res == b'feedback disengaged':
            res = self.wait_for_response()
            return res == b'ok'
        else:
            return False

    def calibrate_steps_per_mm(self, axis, expected_travel, actual_travel):
        current_steps_per_mm = self.get_steps_per_mm(axis)
        current_steps_per_mm *= (expected_travel / actual_travel)
        current_steps_per_mm = round(current_steps_per_mm, 2)
        return self.set_steps_per_mm(axis, current_steps_per_mm)

    def set_head_speed(self, rate):
        speed_command = self.SET_SPEED
        res = self.send_command(speed_command + "F" + str(rate))
        return res == b'ok'

    def set_plunger_speed(self, rate, axis):
        speed_command = self.SET_SPEED
        res = self.send_command(speed_command + axis + str(rate))
        return res == b'ok'

    def get_ot_version(self):
        res = self.send_command(self.GET_OT_VERSION)
        res = res.decode().split(' ')[-1]
        if res not in self.ot_one_dimensions:
            raise ValueError('{} is not an ot_version'.format(res))
        self.ot_version = res
        return self.ot_version

    def get_steps_per_mm(self, axis):
        if axis not in self.GET_STEPS_PER_MM:
            raise ValueError('Axis {} not supported'.format(axis))
        res = self.send_command(self.GET_STEPS_PER_MM[axis])
        return float(res.decode().split(' ')[-1])

    def set_steps_per_mm(self, axis, value):
        if axis not in self.SET_STEPS_PER_MM:
            raise ValueError('Axis {} not supported'.format(axis))
        command = self.SET_STEPS_PER_MM[axis]
        command += str(value)
        res = self.send_command(command)
        return res.decode().split(' ')[-1] == str(value)
