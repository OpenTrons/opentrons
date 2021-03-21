# from tests.opentrons.conftest import fuzzy_assert

# Simulating how the firmware will handle commands and respond
# The ACK argument given to 'write_and_return' is what the
# 'serial_communication' module searhces for.
# Once it sees those characters, it then stops reading,
# strips those ACK characters from the response, the return the response
# If you send a commmand to the serial comm module and it never sees the
# expected ACK, then it'll eventually time out and return an error

import types
from unittest.mock import patch
import pytest
from opentrons.drivers.thermocycler import (
    Thermocycler, ThermocyclerError, driver
)


@pytest.fixture
def patch_poller_wait():
    with patch.object(driver, 'DEFAULT_POLLER_WAIT_SECONDS', new=0) as p:
        yield p


async def test_set_block_temperature(patch_poller_wait):
    # set the block target temperature

    tc = Thermocycler(lambda x: None)
    command_log = []

    tc._target_temp = 25
    tc._current_temp = 25

    async def _mock_write_and_wait(self, command):
        nonlocal command_log
        command_log.append(command)
        return command

    tc._write_and_wait = types.MethodType(_mock_write_and_wait, tc)

    # raises error if unable to verify temp has been set
    expected_error = "Thermocycler driver set the block temp to T=21 & " \
                     "H=None but status reads T=25 & H=None"
    with pytest.raises(ThermocyclerError, match=expected_error):
        await tc.set_temperature(21)
    assert command_log.pop(0) == 'M104 S21'

    # hold set block temp
    tc._target_temp = 21
    tc._hold_time = 1
    await tc.set_temperature(21, hold_time=1)
    assert command_log.pop(0) == 'M104 S21 H1'
    tc._hold_time = None

    # basic set block temp
    tc._target_temp = 21
    await tc.set_temperature(21)
    assert command_log.pop(0) == 'M104 S21'

    # upper clamp set block temp
    tc._target_temp = 99.0
    await tc.set_temperature(130)
    assert command_log.pop(0) == 'M104 S99.0'

    # lower clamp set block temp
    tc._target_temp = 0.0
    await tc.set_temperature(-30)
    assert command_log.pop(0) == 'M104 S0.0'

    # volume set block temp
    tc._target_temp = 21
    await tc.set_temperature(21, volume=75)
    assert command_log.pop(0) == 'M104 S21 V75'

    # hold and volume set block temp
    tc._target_temp = 21
    tc._hold_time = 1
    await tc.set_temperature(21, hold_time=1, volume=75)
    assert command_log.pop(0) == 'M104 S21 H1 V75'
    tc._hold_time = None

    # ramp rate set block temp
    tc._target_temp = 21
    await tc.set_temperature(21, ramp_rate=3)
    assert command_log.pop(0) == 'M566 S3'
    assert command_log.pop(0) == 'M104 S21'


async def test_set_temperature_with_fuzzy_hold_time(patch_poller_wait):
    tc = Thermocycler(lambda x: None)
    command_log = []

    async def _mock_write_and_wait(self, command):
        nonlocal command_log
        command_log.append(command)
        return command

    tc._write_and_wait = types.MethodType(_mock_write_and_wait, tc)

    tc._current_temp = 21
    tc._target_temp = 21

    # set block temp with same temp as previous, different hold time
    tc._hold_time = 48      # Hold time returned by thermocycler
    try:
        await tc.set_temperature(21, hold_time=50)
    except ThermocyclerError:
        pytest.fail("Fuzzy hold_time test failed")
    assert command_log.pop(0) == 'M104 S21 H50'

    # set block temp with same temp and different hold time. But serial poller
    # did not read back from thermocycler within HOLD_TIME_FUZZY_SECONDS
    tc._hold_time = 0
    expected_error = "Thermocycler driver set the block temp to T=21 & " \
                     "H=40 but status reads T=21 & H=0"
    with pytest.raises(ThermocyclerError, match=expected_error):
        await tc.set_temperature(21, hold_time=40)
    assert command_log.pop(0) == 'M104 S21 H40'

    # set block temp with same temp but hold_time < HOLD_TIME_FUZZY_SECONDS
    # will return immediately regardless of no hold_time update read.
    tc._hold_time = 0  # Hold time from previous set_temperature cmd
    try:
        await tc.set_temperature(21, hold_time=5)
    except ThermocyclerError:
        pytest.fail("Fuzzy hold_time test (with <=5 sec hold_time) failed")
    assert command_log.pop(0) == 'M104 S21 H5'


async def test_deactivates(patch_poller_wait):
    tc = Thermocycler(lambda x: None)
    command_log = []

    tc._target_temp = 25
    tc._current_temp = 25

    async def _mock_write_and_wait(self, command):
        nonlocal command_log
        command_log.append(command)
        return command

    tc._write_and_wait = types.MethodType(_mock_write_and_wait, tc)

    await tc.deactivate_all()
    assert command_log.pop(0) == 'M18'
    await tc.deactivate_lid()
    assert command_log.pop(0) == 'M108'
    await tc.deactivate_block()
    assert command_log.pop(0) == 'M14'


async def test_set_lid_temperature(patch_poller_wait):
    tc = Thermocycler(lambda x: None)
    command_log = []

    tc._lid_target = 45

    async def _mock_write_and_wait(self, command):
        nonlocal command_log
        command_log.append(command)
        return command

    tc._write_and_wait = types.MethodType(_mock_write_and_wait, tc)

    # raises error if unable to verify temp has been set
    expected_error = "Thermocycler driver set lid temp to 100 " \
                     "but self._lid_target reads 45"
    with pytest.raises(ThermocyclerError, match=expected_error):
        await tc.set_lid_temperature(100)
    assert command_log.pop(0) == 'M140 S100'

    # basic set lid temp
    tc._lid_target = 60
    await tc.set_lid_temperature(60)
    assert command_log.pop(0) == 'M140 S60'


def test_holding_at_target(patch_poller_wait):
    tc = Thermocycler(lambda x: None)

    tc._target_temp = 30
    tc._current_temp = 30.1

    # not yet stabilized
    tc._block_temp_buffer = [26, 28, 29, 30, 30.5, 29.8, 30.25, 29.9, 30, 30.1]
    assert not tc._is_holding_at_target()

    # stabilized at target
    tc._block_temp_buffer = [30.25, 29.9, 30.0, 30.1, 30, 30, 30, 30, 30, 30.1]
    assert tc._is_holding_at_target()

    # not enough history
    tc._block_temp_buffer = [29.8, 30, 30, 30.1]
    assert not tc._is_holding_at_target()


def test_temp_status_update_callback():
    tc = Thermocycler(lambda x: None)
    tc._temp_status_update_callback('T:95.0 C:77.4 H:600')

    assert tc.target == 95
    assert tc.temperature == 77.4
    assert tc.hold_time == 600


def test_lid_temp_status_callback():
    tc = Thermocycler(lambda x: None)
    tc._lid_temp_status_callback('T:96 C:78')

    assert tc.lid_temp == 78
    assert tc.lid_target == 96
