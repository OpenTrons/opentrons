# Hello, Opentrons API

```python
from opentrons_sdk.robot import Robot
from opentrons_sdk import containers, instruments

robot = Robot.get_instance()
robot.get_serial_ports_list()

# robot.connect('/dev/tty.usbmodem1421')
# robot.home(now=True)

tiprack = containers.load(
    'tiprack-200ul',  # container type
    'A1',             # slot
    'tiprack'         # user-defined name
)
plate = containers.load('96-flat', 'B1', 'plate')
    
p200 = instruments.Pipette(
    axis="b",
    name="p200"
)

p200.set_max_volume(200)  # volume calibration, can be called whenever you want

robot.clear()

p200.pick_up_tip(tiprack[0])

# loop through the first 95 wells, transfering to the next
for i in range(95):
    p200.aspirate(100, plate[i])
    p200.dispense(plate[i + 1]).blow_out().touch_tip()

p200.drop_tip(tiprack[0])

robot.simulate()

# robot.run()      # run on connected robot (if already calibrated)

```
