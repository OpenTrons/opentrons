import pytest
from opentrons.types import Point
from opentrons.hardware_control import pipette
from opentrons.config import pipette_config


def test_tip_tracking():
    pip = pipette.Pipette('p10_single_v1', 'testID')
    with pytest.raises(AssertionError):
        pip.remove_tip()
    assert not pip.has_tip
    pip.add_tip()
    assert pip.has_tip
    with pytest.raises(AssertionError):
        pip.add_tip()
    pip.remove_tip()
    assert not pip.has_tip
    with pytest.raises(AssertionError):
        pip.remove_tip()


def test_critical_points():
    for config in pipette_config.configs:
        loaded = pipette_config.load(config)
        pip = pipette.Pipette(config, 'testID')
        mod_offset = Point(*loaded.model_offset)
        assert pip.critical_point == mod_offset
        pip.add_tip()
        new = mod_offset._replace(z=mod_offset.z - loaded.tip_length)
        assert pip.critical_point == new
        pip.remove_tip()
        assert pip.critical_point == mod_offset


def test_volume_tracking():
    for config in pipette_config.configs:
        loaded = pipette_config.load(config)
        pip = pipette.Pipette(config, 'testID')
        assert pip.current_volume == 0.0
        assert pip.available_volume == loaded.max_volume
        assert pip.ok_to_add_volume(loaded.max_volume - 0.1)
        pip.set_current_volume(0.1)
        with pytest.raises(AssertionError):
            pip.set_current_volume(loaded.max_volume + 0.1)
        with pytest.raises(AssertionError):
            pip.set_current_volume(-1)
        assert pip.current_volume == 0.1
        pip.remove_current_volume(0.1)
        with pytest.raises(AssertionError):
            pip.remove_current_volume(0.1)
        assert pip.current_volume == 0.0
        pip.set_current_volume(loaded.max_volume)
        assert not pip.ok_to_add_volume(0.1)
        with pytest.raises(AssertionError):
            pip.add_current_volume(0.1)
        assert pip.current_volume == loaded.max_volume


def test_config_update():
    for config in pipette_config.configs:
        pip = pipette.Pipette(config, 'testID')
        sample_plunger_pos = {'top': 19.5,
                              'bottom': 2,
                              'blowOut': -1,
                              'dropTip': -4.5}
        pip.update_config_item('plunger_positions', sample_plunger_pos)
        assert pip.config.plunger_positions == sample_plunger_pos
