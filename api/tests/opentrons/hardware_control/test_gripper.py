from opentrons.types import Point
from opentrons.hardware_control.robot_calibration import load_gripper_calibration_offset
from opentrons.hardware_control.instruments import gripper
from opentrons.calibration_storage.delete import clear_gripper_calibration_offsets
from opentrons.config import gripper_config
from opentrons_shared_data.gripper.dev_types import GripperModel

fake_gripper_conf = gripper_config.load(GripperModel.V1)

FAKE_OFFSET = load_gripper_calibration_offset("fakeid123")


def test_config_update():
    gripr = gripper.Gripper(fake_gripper_conf, FAKE_OFFSET, "fakeid123")
    config_to_update = {"z_idle_current": 1.0, "jaw_reference_voltage": 0.5}
    for k, v in config_to_update.items():
        gripr.update_config_item(k, v)
    assert gripr.config.z_idle_current == config_to_update["z_idle_current"]
    assert (
        gripr.config.jaw_reference_voltage == config_to_update["jaw_reference_voltage"]
    )


def test_id_get_added_to_dict():
    gripr = gripper.Gripper(fake_gripper_conf, FAKE_OFFSET, "fakeid123")
    assert gripr.as_dict()["gripper_id"] == "fakeid123"


def test_critical_point():
    gripr = gripper.Gripper(fake_gripper_conf, FAKE_OFFSET, "fakeid123")
    # TODO: update test when critical_point() is fully implemented
    assert gripr.critical_point() == Point(0, 0, 0)


def test_load_gripper_cal_offset():
    clear_gripper_calibration_offsets()
    gripr = gripper.Gripper(
        fake_gripper_conf, load_gripper_calibration_offset("fakeid123"), "fakeid123"
    )
    # if offset data do not exist, loaded values should match DEFAULT
    assert (
        gripr._calibration_offset.offset
        == gripper_config.DEFAULT_GRIPPER_CALIBRATION_OFFSET
    )
