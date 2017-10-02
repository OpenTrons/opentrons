from opentrons.data_storage import database
from opentrons.robot import base

'''
 IDEA: For OT1, we calibrate everything with respect to one of the pipettes,
 including the other pipette. So, we have the user jog the first pipette
 to MY_PLATE[0]. Then calibrate the whole deck with respect to that pipette.
 Then the user brings the second pipette to any well that the first has already
 been to. This creates a relationship between second pipette and the first.
 Since the first already has a relationship with all the plates, we should
then be able to avoid calibrating all the other plates with with the
second pipette.
'''


def calibrate_container_with_delta(
        container, position_tracker, delta_x,
        delta_y, delta_z, save, new_container_name=None
):
    delta = (delta_x, delta_y, delta_z)
    position_tracker.translate_object(container, *delta)
    container._coordinates += delta
    if save and new_container_name:
        database.save_new_container(container, new_container_name)
    elif save:
        database.overwrite_container(container)





from opentrons.robot import gantry, base
from opentrons  import instruments
from opentrons.drivers.smoothie_drivers.v3_0_0 import driver_3_0
from opentrons.trackers.pose_tracker import PoseTracker
from opentrons.instruments.pipette import PipetteTip



#FIXME: Offset calculations should alraedy be reflected in switch_position
def _probe_instrument_axis(instrument, axis, probing_movement, probe_location, safe_height):
    probing_pos = probe_location.copy()
    if axis is not 'z': #FIXME: [JG & Andy | 9/27/17] this edge case should not be handled here
        probing_pos[axis] -= probing_movement

    instrument._move(z=safe_height)
    instrument._move(x=probing_pos['x'], y=probing_pos['y'])
    print("MOVING TO Y: ", probing_pos['y'])
    instrument._move(z=probing_pos['z'])
    #
    # if 'z' in switch_position:
    #     driver.move(z=safe_height)
    # else:
    #     driver.move(a=safe_height)
    # driver.move(x=switch_position.get('x'), y=switch_position.get('y'))
    #
    # # TODO: make this non-implicit
    # driver.move(a=switch_position.get('a'), z=switch_position.get('z'))
    print("PROBING_DISTANCE: ", probing_movement)
    probed_pos = instrument._probe(axis, probing_movement)
    instrument._move(**probing_pos)
    return probed_pos



    # # for axis is 'xya':
    # #     _probe_switch(axis, )
    #
    # switch_pos_1 = {
    #     'x': probe_center['x'] - (probe_dimensions['width'] / 2),
    #     'y': probe_center['y'] - switch_offset,
    #     'a': probe_dimensions['height'] + 1
    # }
    #
    # switch_pos_2 = {
    #     'x': probe_center['x'] + (probe_dimensions['width'] / 2),
    #     'y': probe_center['y'] - switch_offset,
    #     'a': probe_dimensions['height'] + 1
    # }
    #
    # switch_pos_3 = {
    #     'x': probe_center['x'] - switch_offset,
    #     'y': probe_center['y'] + (probe_dimensions['length'] / 2),
    #     'a': probe_dimensions['height'] + 1
    # }
    #
    # switch_pos_4 = {
    #     'x': probe_center['x'] - switch_offset,
    #     'y': probe_center['y'] - (probe_dimensions['length'] / 2),
    #     'a': probe_dimensions['height'] + 1
    # }
    #
    # switch_pos_5 = {
    #     'x': probe_center['x'],
    #     'y': probe_center['y'] + switch_offset,
    #     'a': probe_dimensions['height']
    # }




def calibrate_pipette(probing_values, probe):
    ''' Interprets values generated from tip probing returns '''
    pass
    # x_left, x_right, y_top, y_bottom, z = probing_values
    # probed_x = avg(x_left, x_right)
    # probed_y = avg(y_top, y_bottom)
    #
    # update_position_with_delta((pobed_x, probed_y) - probe.position)
    # save_tip_length(tip_type, probing_values['z'] - probe.height)


def probe_instrument(instrument, robot):
    robot.home()
    robot.connect()
    pose_tracker = robot.pose_tracker

    frame_base = base.Base(pose_tracker)
    frame_probe = frame_base._probe
    max_expected_tip_length = 90

    probing_distance = 10
    switch_offset = 4  # because they're angled and have holes
    probe_height = 63



    probe_x_left = _probe_instrument_axis(instrument, 'x', probing_distance, frame_probe.left_switch, frame_probe.top_switch['z'] + 90)
    probe_x_right = _probe_instrument_axis(instrument, 'x', -probing_distance, frame_probe.right_switch, frame_probe.top_switch['z'] + 90)
    probe_y_top = _probe_instrument_axis(instrument, 'y', -probing_distance, frame_probe.back_switch, frame_probe.top_switch['z'] + 90)
    probe_y_bottom = _probe_instrument_axis(instrument, 'y', probing_distance, frame_probe.front_switch, frame_probe.top_switch['z'] + 90)


    avg_x = (probe_x_left + probe_x_right)/ 2.0
    avg_y = (probe_y_bottom + probe_y_top) / 2.0

    x_delta =  avg_x - frame_probe.top_switch['x']
    y_delta = avg_y - frame_probe.top_switch['y']

    print('DELTAS: x={}, y={}'.format(x_delta, y_delta))

    robot.pose_tracker.translate_object(instrument, x=x_delta, y=y_delta, z=0)
    instrument.attached_tip = PipetteTip(length=max_expected_tip_length)

    # calibrate instrument XY here

    probe_5 = _probe_instrument_axis(instrument, 'z', -max_expected_tip_length, frame_probe.top_switch, frame_probe.top_switch['z'])

    # calibrate tip length here

    print('probe_x_left: ', probe_x_left)
    print('probe_x_right: ', probe_x_right)
    print('probe_y_top: ', probe_y_top)
    print('probe_y_bottom: ', probe_y_bottom)
    print('PROBE_5: ', probe_5)



def move_instrument_for_probing_prep(instrument, robot):
    position = {instrument.axis: 150, 'x':150, 'y':150}
    robot.move_head(**position)
















