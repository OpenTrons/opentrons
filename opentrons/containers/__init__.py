import json
import os

from opentrons.containers.persisted_containers import get_persisted_container
from opentrons.containers.persisted_containers import list_container_names
from opentrons.containers.placeable import (
    Deck,
    Slot,
    Container,
    Well,
    WellSeries,
    unpack_location
)
from opentrons.containers.calibrator import apply_calibration
from opentrons.util import environment

__all__ = [
    get_persisted_container,
    Deck,
    Slot,
    Container,
    Well,
    WellSeries,
    unpack_location,
    apply_calibration]


def load(container_name, slot, label=None):
    """
    Examples
    --------
    >>> from opentrons import containers
    >>> containers.load('96-flat', 'A1')
    <Deck>/<Slot A1>/<Container 96-flat>
    >>> containers.load('96-flat', 'A2', 'plate')
    <Deck>/<Slot A2>/<Container plate>
    >>> containers.load('non-existent-type', 'A2') # doctest: +ELLIPSIS
    Exception: Container type "non-existent-type" not found in file ...
    """
    from opentrons import Robot
    if not label:
        label = container_name
    protocol = Robot.get_instance()
    return protocol.add_container(container_name, slot, label)


def list():
    return list_container_names()


def create(slot, grid, spacing, diameter, depth, volume=0, name=None):
    columns, rows = grid
    col_spacing, row_spacing = spacing
    custom_container = Container()
    properties = {
        'type': 'custom',
        'radius': diameter / 2,
        'height': depth,
        'total-liquid-volume': volume
    }

    for r in range(rows):
        for c in range(columns):
            well = Well(properties=properties)
            well_name = chr(c + ord('A')) + str(1 + r)
            coordinates = (c * col_spacing, r * row_spacing, 0)
            custom_container.add(well, well_name, coordinates)
    from opentrons import Robot
    if name is None:
        name = 'custom_{0}x{1}'.format(columns, rows)
    else:
        json_container = container_to_json(c, name)
        update_container_create_file(json_container)
    Robot.get_instance().deck[slot].add(custom_container, name)
    return custom_container


def container_to_json(c, name):
    locations = {}
    for w in c:
        x, y, z = w.coordinates()
        locations[w.get_name()] = {
            'x': x, 'y': y, 'z': z,
            'depth': w.z_size(),
            'diameter': w.x_size(),
            'total-liquid-volume': 0
        }
    return {name: {'locations': locations}}


def update_container_create_file(data):
    container_file_path = environment.get_path('CONTAINERS_FILE')
    if not os.path.isfile(container_file_path):
        with open(container_file_path, 'w') as f:
            f.write(json.dumps({'containers': {}}))
    with open(container_file_path, 'r+') as f:
        old_data = json.load(f)
        old_data['containers'].update(data)
        f.seek(0)
        f.write(json.dumps(old_data))
        f.truncate()
