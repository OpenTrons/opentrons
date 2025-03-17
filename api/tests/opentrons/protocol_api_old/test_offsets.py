import typing
from opentrons.protocol_api import labware
from opentrons.protocol_api.core.legacy.legacy_labware_core import LegacyLabwareCore
from opentrons.protocols.api_support.types import APIVersion
from opentrons.types import Point, Location

if typing.TYPE_CHECKING:
    from opentrons_shared_data.labware.types import LabwareDefinition2


def test_wells_rebuilt_with_offset(minimal_labware_def: "LabwareDefinition2") -> None:
    test_labware = labware.Labware(
        core=LegacyLabwareCore(minimal_labware_def, Location(Point(0, 0, 0), "deck")),
        api_version=APIVersion(2, 13),  # set_offset() is not implemented in 2.14.
        protocol_core=None,  # type: ignore[arg-type]
        core_map=None,  # type: ignore[arg-type]
    )
    old_well_top = test_labware.wells()[0].top().point
    assert test_labware._core.get_geometry().offset == Point(10, 10, 5)  # type: ignore[attr-defined]
    assert test_labware._core.get_calibrated_offset() == Point(10, 10, 5)

    test_labware.set_offset(x=2, y=2, z=2)
    new_well = test_labware.wells()[0]
    assert new_well.top().point != old_well_top
    assert test_labware._core.get_geometry().offset == Point(10, 10, 5)  # type: ignore[attr-defined]
    assert test_labware._core.get_calibrated_offset() == Point(12, 12, 7)
