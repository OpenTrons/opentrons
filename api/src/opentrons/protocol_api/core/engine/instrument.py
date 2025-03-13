"""ProtocolEngine-based InstrumentContext core implementation."""

from __future__ import annotations

from typing import (
    Optional,
    TYPE_CHECKING,
    cast,
    Union,
    List,
    Tuple,
    NamedTuple,
)
from opentrons.types import (
    Location,
    Mount,
    NozzleConfigurationType,
    NozzleMapInterface,
    MeniscusTrackingTarget,
)
from opentrons.hardware_control import SyncHardwareAPI
from opentrons.hardware_control.dev_types import PipetteDict
from opentrons.protocols.api_support.util import FlowRates, find_value_for_api_version
from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocols.advanced_control.transfers.common import TransferTipPolicyV2
from opentrons.protocols.advanced_control.transfers import common as tx_commons
from opentrons.protocol_engine import commands as cmd
from opentrons.protocol_engine import (
    DeckPoint,
    DropTipWellLocation,
    DropTipWellOrigin,
    WellLocation,
    WellOrigin,
    WellOffset,
    AllNozzleLayoutConfiguration,
    SingleNozzleLayoutConfiguration,
    RowNozzleLayoutConfiguration,
    ColumnNozzleLayoutConfiguration,
    QuadrantNozzleLayoutConfiguration,
)
from opentrons.protocol_engine.types import (
    PRIMARY_NOZZLE_LITERAL,
    NozzleLayoutConfigurationType,
    AddressableOffsetVector,
    LiquidClassRecord,
    NextTipInfo,
)
from opentrons.protocol_engine.types.liquid_level_detection import LiquidTrackingType
from opentrons.protocol_engine.errors.exceptions import TipNotAttachedError
from opentrons.protocol_engine.clients import SyncClient as EngineClient
from opentrons.protocols.api_support.definitions import MAX_SUPPORTED_VERSION
from opentrons_shared_data.pipette.types import PIPETTE_API_NAMES_MAP
from opentrons_shared_data.errors.exceptions import (
    UnsupportedHardwareCommand,
)
from opentrons_shared_data.liquid_classes.liquid_class_definition import BlowoutLocation
from opentrons.protocol_api._nozzle_layout import NozzleLayout
from . import overlap_versions, pipette_movement_conflict
from . import transfer_components_executor as tx_comps_executor

from .well import WellCore
from .labware import LabwareCore
from ..instrument import AbstractInstrument
from ...disposal_locations import TrashBin, WasteChute

if TYPE_CHECKING:
    from .protocol import ProtocolCore
    from opentrons.protocol_api._liquid import LiquidClass
    from opentrons.protocol_api._liquid_properties import (
        TransferProperties,
        MultiDispenseProperties,
    )

_DISPENSE_VOLUME_VALIDATION_ADDED_IN = APIVersion(2, 17)
_RESIN_TIP_DEFAULT_VOLUME = 400
_RESIN_TIP_DEFAULT_FLOW_RATE = 10.0

_FLEX_PIPETTE_NAMES_FIXED_IN = APIVersion(2, 23)
"""The version after which InstrumentContext.name returns the correct API-specific names of Flex pipettes."""
_RETURN_TIP_SCRAPE_ADDED_IN = APIVersion(2, 23)
"""The version after which return-tip for 1/8 channels will scrape off."""


class InstrumentCore(AbstractInstrument[WellCore, LabwareCore]):
    """Instrument API core using a ProtocolEngine.

    Args:
        pipette_id: ProtocolEngine ID of the loaded instrument.
    """

    def __init__(
        self,
        pipette_id: str,
        engine_client: EngineClient,
        sync_hardware_api: SyncHardwareAPI,
        protocol_core: ProtocolCore,
        default_movement_speed: float,
    ) -> None:
        self._pipette_id = pipette_id
        self._engine_client = engine_client
        self._sync_hardware_api = sync_hardware_api
        self._protocol_core = protocol_core

        # TODO(jbl 2022-11-03) flow_rates should not live in the cores, and should be moved to the protocol context
        #   along with other rate related refactors (for the hardware API)
        flow_rates = self._engine_client.state.pipettes.get_flow_rates(pipette_id)
        self._aspirate_flow_rate = find_value_for_api_version(
            MAX_SUPPORTED_VERSION, flow_rates.default_aspirate
        )
        self._dispense_flow_rate = find_value_for_api_version(
            MAX_SUPPORTED_VERSION, flow_rates.default_dispense
        )
        self._blow_out_flow_rate = find_value_for_api_version(
            MAX_SUPPORTED_VERSION, flow_rates.default_blow_out
        )
        self._flow_rates = FlowRates(self)

        self.set_default_speed(speed=default_movement_speed)
        self._liquid_presence_detection = bool(
            self._engine_client.state.pipettes.get_liquid_presence_detection(pipette_id)
        )
        if (
            self._liquid_presence_detection
            and not self._pressure_supported_by_pipette()
        ):
            raise UnsupportedHardwareCommand(
                "Pressure sensor not available for this pipette"
            )

    @property
    def pipette_id(self) -> str:
        """The instrument's unique ProtocolEngine ID."""
        return self._pipette_id

    def get_default_speed(self) -> float:
        speed = self._engine_client.state.pipettes.get_movement_speed(
            pipette_id=self._pipette_id
        )
        assert speed is not None, "Pipette loading should have set a default speed."
        return speed

    def set_default_speed(self, speed: float) -> None:
        self._engine_client.set_pipette_movement_speed(
            pipette_id=self._pipette_id, speed=speed
        )

    def air_gap_in_place(
        self, volume: float, flow_rate: float, correction_volume: Optional[float] = None
    ) -> None:
        """Aspirate a given volume of air from the current location of the pipette.

        Args:
            volume: The volume of air to aspirate, in microliters.
            folw_rate: The flow rate of air into the pipette, in microliters/s
        """
        self._engine_client.execute_command(
            cmd.AirGapInPlaceParams(
                pipetteId=self._pipette_id,
                volume=volume,
                flowRate=flow_rate,
                correctionVolume=correction_volume,
            )
        )

    def aspirate(
        self,
        location: Location,
        well_core: Optional[WellCore],
        volume: float,
        rate: float,
        flow_rate: float,
        in_place: bool,
        meniscus_tracking: Optional[MeniscusTrackingTarget] = None,
        correction_volume: Optional[float] = None,
    ) -> None:
        """Aspirate a given volume of liquid from the specified location.
        Args:
            volume: The volume of liquid to aspirate, in microliters.
            location: The exact location to aspirate from.
            well_core: The well to aspirate from, if applicable.
            rate: Not used in this core.
            flow_rate: The flow rate in µL/s to aspirate at.
            in_place: whether this is a in-place command.
            meniscus_tracking: Optional data about where to aspirate from.
        """
        if meniscus_tracking == MeniscusTrackingTarget.START:
            raise ValueError("Cannot aspirate at the starting liquid height.")
        if well_core is None:
            if not in_place:
                self._engine_client.execute_command(
                    cmd.MoveToCoordinatesParams(
                        pipetteId=self._pipette_id,
                        coordinates=DeckPoint(
                            x=location.point.x, y=location.point.y, z=location.point.z
                        ),
                        minimumZHeight=None,
                        forceDirect=False,
                        speed=None,
                    )
                )

            self._engine_client.execute_command(
                cmd.AspirateInPlaceParams(
                    pipetteId=self._pipette_id,
                    volume=volume,
                    flowRate=flow_rate,
                    correctionVolume=correction_volume,
                )
            )

        else:
            well_name = well_core.get_name()
            labware_id = well_core.labware_id

            (
                well_location,
                dynamic_liquid_tracking,
            ) = self._engine_client.state.geometry.get_relative_liquid_handling_well_location(
                labware_id=labware_id,
                well_name=well_name,
                absolute_point=location.point,
                meniscus_tracking=meniscus_tracking,
            )
            pipette_movement_conflict.check_safe_for_pipette_movement(
                engine_state=self._engine_client.state,
                pipette_id=self._pipette_id,
                labware_id=labware_id,
                well_name=well_name,
                well_location=well_location,
            )
            if dynamic_liquid_tracking:

                self._engine_client.execute_command(
                    cmd.AspirateWhileTrackingParams(
                        pipetteId=self._pipette_id,
                        labwareId=labware_id,
                        wellName=well_name,
                        wellLocation=well_location,
                        volume=volume,
                        flowRate=flow_rate,
                        correctionVolume=correction_volume,
                    )
                )
            else:
                self._engine_client.execute_command(
                    cmd.AspirateParams(
                        pipetteId=self._pipette_id,
                        labwareId=labware_id,
                        wellName=well_name,
                        wellLocation=well_location,
                        volume=volume,
                        flowRate=flow_rate,
                        correctionVolume=correction_volume,
                    )
                )

        self._protocol_core.set_last_location(location=location, mount=self.get_mount())

    def dispense(
        self,
        location: Union[Location, TrashBin, WasteChute],
        well_core: Optional[WellCore],
        volume: float,
        rate: float,
        flow_rate: float,
        in_place: bool,
        push_out: Optional[float],
        meniscus_tracking: Optional[MeniscusTrackingTarget] = None,
        correction_volume: Optional[float] = None,
    ) -> None:
        """Dispense a given volume of liquid into the specified location.
        Args:
            volume: The volume of liquid to dispense, in microliters.
            location: The exact location to dispense to.
            well_core: The well to dispense to, if applicable.
            rate: Not used in this core.
            flow_rate: The flow rate in µL/s to dispense at.
            in_place: whether this is a in-place command.
            push_out: The amount to push the plunger below bottom position.
            meniscus_tracking: Optional data about where to dispense from.
        """
        if self._protocol_core.api_version < _DISPENSE_VOLUME_VALIDATION_ADDED_IN:
            # In older API versions, when you try to dispense more than you can,
            # it gets clamped.
            volume = min(volume, self.get_current_volume())
        else:
            # Newer API versions raise an error if you try to dispense more than
            # you can. Let the error come from Protocol Engine's validation.
            pass

        if well_core is None:
            if not in_place:
                if isinstance(location, (TrashBin, WasteChute)):
                    self._move_to_disposal_location(
                        disposal_location=location, force_direct=False, speed=None
                    )
                else:
                    self._engine_client.execute_command(
                        cmd.MoveToCoordinatesParams(
                            pipetteId=self._pipette_id,
                            coordinates=DeckPoint(
                                x=location.point.x,
                                y=location.point.y,
                                z=location.point.z,
                            ),
                            minimumZHeight=None,
                            forceDirect=False,
                            speed=None,
                        )
                    )

            self._engine_client.execute_command(
                cmd.DispenseInPlaceParams(
                    pipetteId=self._pipette_id,
                    volume=volume,
                    flowRate=flow_rate,
                    pushOut=push_out,
                    correctionVolume=correction_volume,
                )
            )
        else:
            if isinstance(location, (TrashBin, WasteChute)):
                raise ValueError("Trash Bin and Waste Chute have no Wells.")
            well_name = well_core.get_name()
            labware_id = well_core.labware_id

            (
                well_location,
                dynamic_liquid_tracking,
            ) = self._engine_client.state.geometry.get_relative_liquid_handling_well_location(
                labware_id=labware_id,
                well_name=well_name,
                absolute_point=location.point,
                meniscus_tracking=meniscus_tracking,
            )
            pipette_movement_conflict.check_safe_for_pipette_movement(
                engine_state=self._engine_client.state,
                pipette_id=self._pipette_id,
                labware_id=labware_id,
                well_name=well_name,
                well_location=well_location,
            )
            if dynamic_liquid_tracking:
                self._engine_client.execute_command(
                    cmd.DispenseWhileTrackingParams(
                        pipetteId=self._pipette_id,
                        labwareId=labware_id,
                        wellName=well_name,
                        wellLocation=well_location,
                        volume=volume,
                        flowRate=flow_rate,
                        pushOut=push_out,
                        correctionVolume=correction_volume,
                    )
                )
            else:
                self._engine_client.execute_command(
                    cmd.DispenseParams(
                        pipetteId=self._pipette_id,
                        labwareId=labware_id,
                        wellName=well_name,
                        wellLocation=well_location,
                        volume=volume,
                        flowRate=flow_rate,
                        pushOut=push_out,
                        correctionVolume=correction_volume,
                    )
                )

        if isinstance(location, (TrashBin, WasteChute)):
            self._protocol_core.set_last_location(location=None, mount=self.get_mount())
        else:
            self._protocol_core.set_last_location(
                location=location, mount=self.get_mount()
            )

    def blow_out(
        self,
        location: Union[Location, TrashBin, WasteChute],
        well_core: Optional[WellCore],
        in_place: bool,
    ) -> None:
        """Blow liquid out of the tip.

        Args:
            location: The location to blow out into.
            well_core: The well to blow out into.
            in_place: whether this is a in-place command.
        """
        flow_rate = self.get_blow_out_flow_rate(1.0)
        if well_core is None:
            if not in_place:
                if isinstance(location, (TrashBin, WasteChute)):
                    self._move_to_disposal_location(
                        disposal_location=location, force_direct=False, speed=None
                    )
                else:
                    self._engine_client.execute_command(
                        cmd.MoveToCoordinatesParams(
                            pipetteId=self._pipette_id,
                            coordinates=DeckPoint(
                                x=location.point.x,
                                y=location.point.y,
                                z=location.point.z,
                            ),
                            forceDirect=False,
                            minimumZHeight=None,
                            speed=None,
                        )
                    )

            self._engine_client.execute_command(
                cmd.BlowOutInPlaceParams(pipetteId=self._pipette_id, flowRate=flow_rate)
            )
        else:
            if isinstance(location, (TrashBin, WasteChute)):
                raise ValueError("Trash Bin and Waste Chute have no Wells.")
            well_name = well_core.get_name()
            labware_id = well_core.labware_id

            well_location = (
                self._engine_client.state.geometry.get_relative_well_location(
                    labware_id=labware_id,
                    well_name=well_name,
                    absolute_point=location.point,
                )
            )
            pipette_movement_conflict.check_safe_for_pipette_movement(
                engine_state=self._engine_client.state,
                pipette_id=self._pipette_id,
                labware_id=labware_id,
                well_name=well_name,
                well_location=well_location,
            )
            self._engine_client.execute_command(
                cmd.BlowOutParams(
                    pipetteId=self._pipette_id,
                    labwareId=labware_id,
                    wellName=well_name,
                    wellLocation=well_location,
                    # TODO(jbl 2022-11-07) PAPIv2 does not have an argument for rate and
                    #   this also needs to be refactored along with other flow rate related issues
                    flowRate=flow_rate,
                )
            )

        if isinstance(location, (TrashBin, WasteChute)):
            self._protocol_core.set_last_location(location=None, mount=self.get_mount())
        else:
            self._protocol_core.set_last_location(
                location=location, mount=self.get_mount()
            )

    def touch_tip(
        self,
        location: Location,
        well_core: WellCore,
        radius: float,
        z_offset: float,
        speed: float,
        mm_from_edge: Optional[float] = None,
    ) -> None:
        """Touch pipette tip to edges of the well

        Args:
            location: Location moved to, only used for ProtocolCore location cache.
            well_core: The target well for touch tip.
            radius: Percentage modifier for well radius to touch.
            z_offset: Vertical offset for pipette tip during touch tip.
            speed: Speed for the touch tip movements.
            mm_from_edge: Offset from the edge of the well to move to. Requires a radius of 1.
        """
        if mm_from_edge is not None and radius != 1.0:
            raise ValueError("radius must be set to 1.0 if mm_from_edge is provided.")

        well_name = well_core.get_name()
        labware_id = well_core.labware_id

        # Touch tip is always done from the top of the well.
        well_location = WellLocation(
            origin=WellOrigin.TOP, offset=WellOffset(x=0, y=0, z=z_offset)
        )
        pipette_movement_conflict.check_safe_for_pipette_movement(
            engine_state=self._engine_client.state,
            pipette_id=self._pipette_id,
            labware_id=labware_id,
            well_name=well_name,
            well_location=well_location,
        )
        self._engine_client.execute_command(
            cmd.TouchTipParams(
                pipetteId=self._pipette_id,
                labwareId=labware_id,
                wellName=well_name,
                wellLocation=well_location,
                radius=radius,
                mmFromEdge=mm_from_edge,
                speed=speed,
            )
        )

        self._protocol_core.set_last_location(location=location, mount=self.get_mount())

    def pick_up_tip(
        self,
        location: Location,
        well_core: WellCore,
        presses: Optional[int],
        increment: Optional[float],
        prep_after: bool = True,
    ) -> None:
        """Move to and pick up a tip from a given well.

        Args:
            location: The location of the well we're picking up from.
                Used to calculate the relative well offset for the pick up command.
            well_core: The "well" to pick up from.
            presses: Customize the number of presses the pipette does.
            increment: Customize the movement "distance" of the pipette to press harder.
            prep_after: Not used by this core, pipette preparation will always happen.
        """
        assert (
            presses is None and increment is None
        ), "Tip pick-up with custom presses or increment deprecated"

        well_name = well_core.get_name()
        labware_id = well_core.labware_id

        well_location = (
            self._engine_client.state.geometry.get_relative_pick_up_tip_well_location(
                labware_id=labware_id,
                well_name=well_name,
                absolute_point=location.point,
            )
        )
        pipette_movement_conflict.check_safe_for_tip_pickup_and_return(
            engine_state=self._engine_client.state,
            pipette_id=self._pipette_id,
            labware_id=labware_id,
        )
        pipette_movement_conflict.check_safe_for_pipette_movement(
            engine_state=self._engine_client.state,
            pipette_id=self._pipette_id,
            labware_id=labware_id,
            well_name=well_name,
            well_location=well_location,
        )

        self._engine_client.execute_command(
            cmd.PickUpTipParams(
                pipetteId=self._pipette_id,
                labwareId=labware_id,
                wellName=well_name,
                wellLocation=well_location,
            )
        )

        # Set the "last location" unconditionally, even if the command failed
        # and was recovered from and we don't know if the pipette is physically here.
        # This isn't used for path planning, but rather for implicit destination
        # selection like in `pipette.aspirate(location=None)`.
        self._protocol_core.set_last_location(location=location, mount=self.get_mount())

    def drop_tip(
        self,
        location: Optional[Location],
        well_core: WellCore,
        home_after: Optional[bool],
        alternate_drop_location: Optional[bool] = False,
    ) -> None:
        """Move to and drop a tip into a given well.

        Args:
            location: The location of the well we're dropping tip into.
                Used to calculate the relative well offset for the drop command.
            well_core: The well we're dropping into
            home_after: Whether to home the pipette after the tip is dropped.
            alternate_drop_location: Whether to randomize the exact location to drop tip
                within the specified well.
        """
        well_name = well_core.get_name()
        labware_id = well_core.labware_id
        scrape_tips = False

        if location is not None:
            relative_well_location = (
                self._engine_client.state.geometry.get_relative_well_location(
                    labware_id=labware_id,
                    well_name=well_name,
                    absolute_point=location.point,
                )
            )

            well_location = DropTipWellLocation(
                origin=DropTipWellOrigin(relative_well_location.origin.value),
                offset=relative_well_location.offset,
            )
        else:
            well_location = DropTipWellLocation()

        if self._engine_client.state.labware.is_tiprack(labware_id):
            pipette_movement_conflict.check_safe_for_tip_pickup_and_return(
                engine_state=self._engine_client.state,
                pipette_id=self._pipette_id,
                labware_id=labware_id,
            )
            scrape_tips = self.get_channels() <= 8
        pipette_movement_conflict.check_safe_for_pipette_movement(
            engine_state=self._engine_client.state,
            pipette_id=self._pipette_id,
            labware_id=labware_id,
            well_name=well_name,
            well_location=well_location,
        )
        self._engine_client.execute_command(
            cmd.DropTipParams(
                pipetteId=self._pipette_id,
                labwareId=labware_id,
                wellName=well_name,
                wellLocation=well_location,
                homeAfter=home_after,
                alternateDropLocation=alternate_drop_location,
                scrape_tips=scrape_tips,
            )
        )

        self._protocol_core.set_last_location(location=location, mount=self.get_mount())

    def drop_tip_in_disposal_location(
        self,
        disposal_location: Union[TrashBin, WasteChute],
        home_after: Optional[bool],
        alternate_tip_drop: bool = False,
    ) -> None:
        self._move_to_disposal_location(
            disposal_location,
            force_direct=False,
            speed=None,
            alternate_tip_drop=alternate_tip_drop,
        )
        self._drop_tip_in_place(home_after=home_after)
        self._protocol_core.set_last_location(location=None, mount=self.get_mount())

    def _move_to_disposal_location(
        self,
        disposal_location: Union[TrashBin, WasteChute],
        force_direct: bool,
        speed: Optional[float],
        alternate_tip_drop: bool = False,
    ) -> None:
        # TODO (nd, 2023-11-30): give appropriate offset when finalized
        # https://opentrons.atlassian.net/browse/RSS-391

        disposal_offset = disposal_location.offset
        offset = AddressableOffsetVector(
            x=disposal_offset.x, y=disposal_offset.y, z=disposal_offset.z
        )

        if isinstance(disposal_location, TrashBin):
            addressable_area_name = disposal_location.area_name
            self._engine_client.execute_command(
                cmd.MoveToAddressableAreaForDropTipParams(
                    pipetteId=self._pipette_id,
                    addressableAreaName=addressable_area_name,
                    offset=offset,
                    forceDirect=force_direct,
                    speed=speed,
                    minimumZHeight=None,
                    alternateDropLocation=alternate_tip_drop,
                    ignoreTipConfiguration=True,
                )
            )

        if isinstance(disposal_location, WasteChute):
            num_channels = self.get_channels()
            addressable_area_name = {
                1: "1ChannelWasteChute",
                8: "8ChannelWasteChute",
                96: "96ChannelWasteChute",
            }[num_channels]

            self._engine_client.execute_command(
                cmd.MoveToAddressableAreaParams(
                    pipetteId=self._pipette_id,
                    addressableAreaName=addressable_area_name,
                    offset=offset,
                    forceDirect=force_direct,
                    speed=speed,
                    minimumZHeight=None,
                )
            )

    def _drop_tip_in_place(self, home_after: Optional[bool]) -> None:
        self._engine_client.execute_command(
            cmd.DropTipInPlaceParams(
                pipetteId=self._pipette_id,
                homeAfter=home_after,
            )
        )

    def home(self) -> None:
        z_axis = self._engine_client.state.pipettes.get_z_axis(self._pipette_id)
        plunger_axis = self._engine_client.state.pipettes.get_plunger_axis(
            self._pipette_id
        )
        self._engine_client.execute_command(cmd.HomeParams(axes=[z_axis, plunger_axis]))

    def home_plunger(self) -> None:
        plunger_axis = self._engine_client.state.pipettes.get_plunger_axis(
            self._pipette_id
        )
        self._engine_client.execute_command(cmd.HomeParams(axes=[plunger_axis]))

    def move_to(
        self,
        location: Union[Location, TrashBin, WasteChute],
        well_core: Optional[WellCore],
        force_direct: bool,
        minimum_z_height: Optional[float],
        speed: Optional[float],
    ) -> None:
        if well_core is not None:
            if isinstance(location, (TrashBin, WasteChute)):
                raise ValueError("Trash Bin and Waste Chute have no Wells.")
            labware_id = well_core.labware_id
            well_name = well_core.get_name()
            well_location = (
                self._engine_client.state.geometry.get_relative_well_location(
                    labware_id=labware_id,
                    well_name=well_name,
                    absolute_point=location.point,
                )
            )

            self._engine_client.execute_command(
                cmd.MoveToWellParams(
                    pipetteId=self._pipette_id,
                    labwareId=labware_id,
                    wellName=well_name,
                    wellLocation=well_location,
                    minimumZHeight=minimum_z_height,
                    forceDirect=force_direct,
                    speed=speed,
                )
            )
        else:
            if isinstance(location, (TrashBin, WasteChute)):
                self._move_to_disposal_location(
                    disposal_location=location, force_direct=force_direct, speed=speed
                )
            else:
                self._engine_client.execute_command(
                    cmd.MoveToCoordinatesParams(
                        pipetteId=self._pipette_id,
                        coordinates=DeckPoint(
                            x=location.point.x, y=location.point.y, z=location.point.z
                        ),
                        minimumZHeight=minimum_z_height,
                        forceDirect=force_direct,
                        speed=speed,
                    )
                )
        if isinstance(location, (TrashBin, WasteChute)):
            self._protocol_core.set_last_location(location=None, mount=self.get_mount())
        else:
            self._protocol_core.set_last_location(
                location=location, mount=self.get_mount()
            )

    def resin_tip_seal(
        self, location: Location, well_core: WellCore, in_place: Optional[bool] = False
    ) -> None:
        labware_id = well_core.labware_id
        well_name = well_core.get_name()
        well_location = (
            self._engine_client.state.geometry.get_relative_pick_up_tip_well_location(
                labware_id=labware_id,
                well_name=well_name,
                absolute_point=location.point,
            )
        )

        self._engine_client.execute_command(
            cmd.EvotipSealPipetteParams(
                pipetteId=self._pipette_id,
                labwareId=labware_id,
                wellName=well_name,
                wellLocation=well_location,
            )
        )

    def resin_tip_unseal(self, location: Location, well_core: WellCore) -> None:
        well_name = well_core.get_name()
        labware_id = well_core.labware_id

        if location is not None:
            relative_well_location = (
                self._engine_client.state.geometry.get_relative_well_location(
                    labware_id=labware_id,
                    well_name=well_name,
                    absolute_point=location.point,
                )
            )

            well_location = DropTipWellLocation(
                origin=DropTipWellOrigin(relative_well_location.origin.value),
                offset=relative_well_location.offset,
            )
        else:
            well_location = DropTipWellLocation()

        pipette_movement_conflict.check_safe_for_pipette_movement(
            engine_state=self._engine_client.state,
            pipette_id=self._pipette_id,
            labware_id=labware_id,
            well_name=well_name,
            well_location=well_location,
        )
        self._engine_client.execute_command(
            cmd.EvotipUnsealPipetteParams(
                pipetteId=self._pipette_id,
                labwareId=labware_id,
                wellName=well_name,
                wellLocation=well_location,
            )
        )

        self._protocol_core.set_last_location(location=location, mount=self.get_mount())

    def resin_tip_dispense(
        self,
        location: Location,
        well_core: WellCore,
        volume: Optional[float] = None,
        flow_rate: Optional[float] = None,
    ) -> None:
        """
        Args:
            volume: The volume of liquid to dispense, in microliters. Defaults to 400uL.
            location: The exact location to dispense to.
            well_core: The well to dispense to, if applicable.
            flow_rate: The flow rate in µL/s to dispense at. Defaults to 10.0uL/S.
        """
        if isinstance(location, (TrashBin, WasteChute)):
            raise ValueError("Trash Bin and Waste Chute have no Wells.")
        well_name = well_core.get_name()
        labware_id = well_core.labware_id
        if volume is None:
            volume = _RESIN_TIP_DEFAULT_VOLUME
        if flow_rate is None:
            flow_rate = _RESIN_TIP_DEFAULT_FLOW_RATE

        (
            well_location,
            dynamic_tracking,
        ) = self._engine_client.state.geometry.get_relative_liquid_handling_well_location(
            labware_id=labware_id,
            well_name=well_name,
            absolute_point=location.point,
        )
        pipette_movement_conflict.check_safe_for_pipette_movement(
            engine_state=self._engine_client.state,
            pipette_id=self._pipette_id,
            labware_id=labware_id,
            well_name=well_name,
            well_location=well_location,
        )
        self._engine_client.execute_command(
            cmd.EvotipDispenseParams(
                pipetteId=self._pipette_id,
                labwareId=labware_id,
                wellName=well_name,
                wellLocation=well_location,
                volume=volume,
                flowRate=flow_rate,
            )
        )

    def get_mount(self) -> Mount:
        """Get the mount the pipette is attached to."""
        return self._engine_client.state.pipettes.get(
            self._pipette_id
        ).mount.to_hw_mount()

    def get_pipette_name(self) -> str:
        """Get the pipette's name as a string.

        Will match the load name of the actually loaded pipette,
        which may differ from the requested load name.

        From API v2.15 to v2.22, this property returned an internal, engine-specific,
         name for Flex pipettes (eg, "p50_multi_flex" instead of "flex_8channel_50").

        From API v2.23 onwards, this behavior is fixed so that this property returns
        the API-specific names of Flex pipettes.
        """
        # TODO (tz, 11-23-22): revert this change when merging
        # https://opentrons.atlassian.net/browse/RLIQ-251
        pipette = self._engine_client.state.pipettes.get(self._pipette_id)
        if self._protocol_core.api_version < _FLEX_PIPETTE_NAMES_FIXED_IN:
            return pipette.pipetteName.value
        else:
            name = next(
                (
                    pip_api_name
                    for pip_api_name, pip_name in PIPETTE_API_NAMES_MAP.items()
                    if pip_name == pipette.pipetteName
                ),
                None,
            )
            assert name, "Pipette name not found."
            return name

    def get_model(self) -> str:
        return self._engine_client.state.pipettes.get_model_name(self._pipette_id)

    def get_display_name(self) -> str:
        return self._engine_client.state.pipettes.get_display_name(self._pipette_id)

    def get_min_volume(self) -> float:
        return self._engine_client.state.pipettes.get_minimum_volume(self._pipette_id)

    def get_max_volume(self) -> float:
        return self._engine_client.state.pipettes.get_maximum_volume(self._pipette_id)

    def get_working_volume(self) -> float:
        return self._engine_client.state.pipettes.get_working_volume(self._pipette_id)

    def get_current_volume(self) -> float:
        try:
            current_volume = self._engine_client.state.pipettes.get_aspirated_volume(
                self._pipette_id
            )
        except TipNotAttachedError:
            current_volume = None

        return current_volume or 0

    def get_available_volume(self) -> float:
        try:
            available_volume = self._engine_client.state.pipettes.get_available_volume(
                self._pipette_id
            )
        except TipNotAttachedError:
            available_volume = None

        return available_volume or 0

    def get_hardware_state(self) -> PipetteDict:
        """Get the current state of the pipette hardware as a dictionary."""
        return self._sync_hardware_api.get_attached_instrument(self.get_mount())  # type: ignore[no-any-return]

    def get_channels(self) -> int:
        return self._engine_client.state.tips.get_pipette_channels(self._pipette_id)

    def get_active_channels(self) -> int:
        return self._engine_client.state.tips.get_pipette_active_channels(
            self._pipette_id
        )

    def get_nozzle_map(self) -> NozzleMapInterface:
        return self._engine_client.state.tips.get_pipette_nozzle_map(self._pipette_id)

    def has_tip(self) -> bool:
        return (
            self._engine_client.state.pipettes.get_attached_tip(self._pipette_id)
            is not None
        )

    def get_return_height(self) -> float:
        return self._engine_client.state.pipettes.get_return_tip_scale(self._pipette_id)

    def get_flow_rate(self) -> FlowRates:
        return self._flow_rates

    def get_aspirate_flow_rate(self, rate: float = 1.0) -> float:
        return self._aspirate_flow_rate * rate

    def get_dispense_flow_rate(self, rate: float = 1.0) -> float:
        return self._dispense_flow_rate * rate

    def get_blow_out_flow_rate(self, rate: float = 1.0) -> float:
        return self._blow_out_flow_rate * rate

    def get_nozzle_configuration(self) -> NozzleConfigurationType:
        return self._engine_client.state.pipettes.get_nozzle_layout_type(
            self._pipette_id
        )

    def get_liquid_presence_detection(self) -> bool:
        return self._liquid_presence_detection

    def is_tip_tracking_available(self) -> bool:
        if self.get_nozzle_configuration() == NozzleConfigurationType.FULL:
            return True
        else:
            if self.get_channels() == 96:
                return True
            if self.get_channels() == 8:
                return True
        return False

    def set_flow_rate(
        self,
        aspirate: Optional[float] = None,
        dispense: Optional[float] = None,
        blow_out: Optional[float] = None,
    ) -> None:
        if aspirate is not None:
            assert aspirate > 0
            self._aspirate_flow_rate = aspirate
        if dispense is not None:
            assert dispense > 0
            self._dispense_flow_rate = dispense
        if blow_out is not None:
            assert blow_out > 0
            self._blow_out_flow_rate = blow_out

    def set_liquid_presence_detection(self, enable: bool) -> None:
        self._liquid_presence_detection = enable

    def configure_for_volume(self, volume: float) -> None:
        self._engine_client.execute_command(
            cmd.ConfigureForVolumeParams(
                pipetteId=self._pipette_id,
                volume=volume,
                tipOverlapNotAfterVersion=overlap_versions.overlap_for_api_version(
                    self._protocol_core.api_version
                ),
            )
        )

    def prepare_to_aspirate(self) -> None:
        self._engine_client.execute_command(
            cmd.PrepareToAspirateParams(pipetteId=self._pipette_id)
        )

    def configure_nozzle_layout(
        self,
        style: NozzleLayout,
        primary_nozzle: Optional[str],
        front_right_nozzle: Optional[str],
        back_left_nozzle: Optional[str],
    ) -> None:
        if style == NozzleLayout.COLUMN:
            configuration_model: NozzleLayoutConfigurationType = (
                ColumnNozzleLayoutConfiguration(
                    primaryNozzle=cast(PRIMARY_NOZZLE_LITERAL, primary_nozzle)
                )
            )
        elif style == NozzleLayout.ROW:
            configuration_model = RowNozzleLayoutConfiguration(
                primaryNozzle=cast(PRIMARY_NOZZLE_LITERAL, primary_nozzle)
            )
        elif style == NozzleLayout.QUADRANT or style == NozzleLayout.PARTIAL_COLUMN:
            assert (
                # We make sure to set these nozzles in the calling function
                # if using QUADRANT or PARTIAL_COLUMN. Asserting only for type verification here.
                front_right_nozzle is not None
                and back_left_nozzle is not None
            ), f"Both front right and back left nozzles are required for {style} configuration."
            configuration_model = QuadrantNozzleLayoutConfiguration(
                primaryNozzle=cast(PRIMARY_NOZZLE_LITERAL, primary_nozzle),
                frontRightNozzle=front_right_nozzle,
                backLeftNozzle=back_left_nozzle,
            )
        elif style == NozzleLayout.SINGLE:
            configuration_model = SingleNozzleLayoutConfiguration(
                primaryNozzle=cast(PRIMARY_NOZZLE_LITERAL, primary_nozzle)
            )
        else:
            configuration_model = AllNozzleLayoutConfiguration()
        self._engine_client.execute_command(
            cmd.ConfigureNozzleLayoutParams(
                pipetteId=self._pipette_id, configurationParams=configuration_model
            )
        )

    def load_liquid_class(
        self,
        name: str,
        transfer_properties: TransferProperties,
        tiprack_uri: str,
    ) -> str:
        """Load a liquid class into the engine and return its ID.

        Args:
            name: Name of the liquid class
            transfer_properties: Liquid class properties for a specific pipette & tiprack combination
            tiprack_uri: URI of the tiprack whose transfer properties we will be using.

        Returns:
            Liquid class record's ID, as generated by the protocol engine.
        """
        liquid_class_record = LiquidClassRecord(
            liquidClassName=name,
            pipetteModel=self.get_pipette_name(),
            tiprack=tiprack_uri,
            aspirate=transfer_properties.aspirate.as_shared_data_model(),
            singleDispense=transfer_properties.dispense.as_shared_data_model(),
            multiDispense=transfer_properties.multi_dispense.as_shared_data_model()
            if transfer_properties.multi_dispense
            else None,
        )
        result = self._engine_client.execute_command_without_recovery(
            cmd.LoadLiquidClassParams(
                liquidClassRecord=liquid_class_record,
            )
        )
        return result.liquidClassId

    def get_next_tip(
        self, tip_racks: List[LabwareCore], starting_well: Optional[str]
    ) -> Optional[NextTipInfo]:
        """Get the next tip to pick up."""
        result = self._engine_client.execute_command_without_recovery(
            cmd.GetNextTipParams(
                pipetteId=self._pipette_id,
                labwareIds=[tip_rack.labware_id for tip_rack in tip_racks],
                startingTipWell=starting_well,
            )
        )
        return (
            result.nextTipInfo if isinstance(result.nextTipInfo, NextTipInfo) else None
        )

    def transfer_liquid(  # noqa: C901
        self,
        liquid_class: LiquidClass,
        volume: float,
        source: List[Tuple[Location, WellCore]],
        dest: List[Tuple[Location, WellCore]],
        new_tip: TransferTipPolicyV2,
        tip_racks: List[Tuple[Location, LabwareCore]],
        trash_location: Union[Location, TrashBin, WasteChute],
        return_tip: bool,
    ) -> None:
        """Execute transfer using liquid class properties.

        Args:
            liquid_class: The liquid class to use for transfer properties.
            volume: Volume to transfer per well.
            source: List of source wells, with each well represented as a tuple of
                    types.Location and WellCore.
                    types.Location is only necessary for saving the last accessed location.
            dest: List of destination wells, with each well represented as a tuple of
                    types.Location and WellCore.
                    types.Location is only necessary for saving the last accessed location.
            new_tip: Whether the transfer should use a new tip 'once', 'never', 'always',
                     or 'per source'.
            tiprack_uri: The URI of the tiprack that the transfer settings are for.
            tip_drop_location: Location where the tip will be dropped (if appropriate).
        """
        if not tip_racks:
            raise RuntimeError(
                "No tipracks found for pipette in order to perform transfer"
            )
        tiprack_uri_for_transfer_props = tip_racks[0][1].get_uri()
        transfer_props = liquid_class.get_for(
            pipette=self.get_pipette_name(), tip_rack=tiprack_uri_for_transfer_props
        )
        # TODO: use the ID returned by load_liquid_class in command annotations
        self.load_liquid_class(
            name=liquid_class.name,
            transfer_properties=transfer_props,
            tiprack_uri=tiprack_uri_for_transfer_props,
        )

        # TODO: add multi-channel pipette handling here
        source_dest_per_volume_step = (
            tx_commons.expand_for_volume_constraints_for_liquid_classes(
                volumes=[volume for _ in range(len(source))],
                targets=zip(source, dest),
                max_volume=min(
                    self.get_max_volume(),
                    self._engine_client.state.geometry.get_nominal_tip_geometry(
                        pipette_id=self.pipette_id,
                        labware_id=tip_racks[0][1].labware_id,
                        well_name=None,
                    ).volume,
                ),
            )
        )

        last_tip_picked_up_from: Optional[WellCore] = None

        def _drop_tip() -> None:
            if return_tip:
                assert last_tip_picked_up_from is not None
                self.drop_tip(
                    location=None,
                    well_core=last_tip_picked_up_from,
                    home_after=False,
                    alternate_drop_location=False,
                )
            elif isinstance(trash_location, (TrashBin, WasteChute)):
                self.drop_tip_in_disposal_location(
                    disposal_location=trash_location,
                    home_after=False,
                    alternate_tip_drop=True,
                )
            elif isinstance(trash_location, Location):
                self.drop_tip(
                    location=trash_location,
                    well_core=trash_location.labware.as_well()._core,  # type: ignore[arg-type]
                    home_after=False,
                    alternate_drop_location=True,
                )

        def _pick_up_tip() -> WellCore:
            next_tip = self.get_next_tip(
                tip_racks=[core for loc, core in tip_racks],
                starting_well=None,
            )
            if next_tip is None:
                raise RuntimeError(
                    f"No tip available among {tip_racks} for this transfer."
                )
            (
                tiprack_loc,
                tiprack_uri,
                tip_well,
            ) = self._get_location_and_well_core_from_next_tip_info(next_tip, tip_racks)
            if tiprack_uri != tiprack_uri_for_transfer_props:
                raise RuntimeError(
                    f"Tiprack {tiprack_uri} does not match the tiprack designated "
                    f"for this transfer- {tiprack_uri_for_transfer_props}."
                )
            self.pick_up_tip(
                location=tiprack_loc,
                well_core=tip_well,
                presses=None,
                increment=None,
            )
            return tip_well

        if new_tip == TransferTipPolicyV2.ONCE:
            last_tip_picked_up_from = _pick_up_tip()

        prev_src: Optional[Tuple[Location, WellCore]] = None
        post_disp_tip_contents = [
            tx_comps_executor.LiquidAndAirGapPair(
                liquid=0,
                air_gap=0,
            )
        ]
        next_step_volume, next_src_dest_combo = next(source_dest_per_volume_step)
        is_last_step = False
        while not is_last_step:
            step_volume = next_step_volume
            src_dest_combo = next_src_dest_combo
            step_source, step_destination = src_dest_combo
            try:
                next_step_volume, next_src_dest_combo = next(
                    source_dest_per_volume_step
                )
            except StopIteration:
                is_last_step = True

            if new_tip == TransferTipPolicyV2.ALWAYS or (
                new_tip == TransferTipPolicyV2.PER_SOURCE and step_source != prev_src
            ):
                if prev_src is not None:
                    _drop_tip()
                last_tip_picked_up_from = _pick_up_tip()
                post_disp_tip_contents = [
                    tx_comps_executor.LiquidAndAirGapPair(
                        liquid=0,
                        air_gap=0,
                    )
                ]

            post_asp_tip_contents = self.aspirate_liquid_class(
                volume=step_volume,
                source=step_source,
                transfer_properties=transfer_props,
                transfer_type=tx_comps_executor.TransferType.ONE_TO_ONE,
                tip_contents=post_disp_tip_contents,
            )
            post_disp_tip_contents = self.dispense_liquid_class(
                volume=step_volume,
                dest=step_destination,
                source=step_source,
                transfer_properties=transfer_props,
                transfer_type=tx_comps_executor.TransferType.ONE_TO_ONE,
                tip_contents=post_asp_tip_contents,
                add_final_air_gap=False
                if is_last_step and new_tip == TransferTipPolicyV2.NEVER
                else True,
                trash_location=trash_location,
            )
            prev_src = step_source
        if new_tip != TransferTipPolicyV2.NEVER:
            _drop_tip()

    # TODO(spp, 2025-02-25): wire up return tip
    def distribute_liquid(  # noqa: C901
        self,
        liquid_class: LiquidClass,
        volume: float,
        source: Tuple[Location, WellCore],
        dest: List[Tuple[Location, WellCore]],
        new_tip: TransferTipPolicyV2,
        tip_racks: List[Tuple[Location, LabwareCore]],
        trash_location: Union[Location, TrashBin, WasteChute],
        return_tip: bool,
    ) -> None:
        """Execute a distribution using liquid class properties.

        Args:
            liquid_class: The liquid class to use for transfer properties.
            volume: The amount of liquid in uL, to dispense into each destination well.
            source: Source well represented as a tuple of types.Location and WellCore.
                    types.Location is only necessary for saving the last accessed location.
            dest: List of destination wells, with each well represented as a tuple of
                    types.Location and WellCore.
                    types.Location is only necessary for saving the last accessed location.
            new_tip: Whether the transfer should use a new tip 'once', 'never', 'always',
                     or 'per source'.
            tiprack_uri: The URI of the tiprack that the transfer settings are for.
            tip_drop_location: Location where the tip will be dropped (if appropriate).

        This method distributes the liquid in the source well into multiple destinations.
        It can accomplish this by either doing a multi-dispense (aspirate once and then
        dispense multiple times consecutively) or by doing multiple single-dispenses
        (going back to aspirate after each dispense). Whether it does a multi-dispense or
        multiple single dispenses is determined by whether multi-dispense properties
        are available in the liquid class and whether the tip in use can hold multiple
        volumes to be dispensed whithout having to refill.
        """
        if not tip_racks:
            raise RuntimeError(
                "No tipracks found for pipette in order to perform transfer"
            )
        tiprack_uri_for_transfer_props = tip_racks[0][1].get_uri()
        working_volume = min(
            self.get_max_volume(),
            self._engine_client.state.geometry.get_nominal_tip_geometry(
                pipette_id=self.pipette_id,
                labware_id=tip_racks[0][1].labware_id,
                well_name=None,
            ).volume,
        )
        transfer_props = liquid_class.get_for(
            pipette=self.get_pipette_name(),
            tip_rack=tiprack_uri_for_transfer_props,
        )

        # If there are no multi-dispense properties or if the volume to distribute
        # per destination well is so large that the tip cannot hold enough liquid
        # to consecutively distribute to at least two wells, then we resort to using
        # a regular, one-to-one transfer to carry out the distribution.
        min_asp_vol_for_multi_dispense = 2 * volume
        if transfer_props.multi_dispense is None or (
            transfer_props.multi_dispense is not None
            and not self._tip_can_hold_volume_for_multi_dispensing(
                transfer_volume=min_asp_vol_for_multi_dispense,
                multi_dispense_properties=transfer_props.multi_dispense,
                tip_working_volume=working_volume,
            )
        ):
            self.transfer_liquid(
                liquid_class=liquid_class,
                volume=volume,
                source=[source for _ in range(len(dest))],
                dest=dest,
                new_tip=new_tip,
                tip_racks=tip_racks,
                trash_location=trash_location,
                return_tip=return_tip,
            )
            return

        # TODO: use the ID returned by load_liquid_class in command annotations
        self.load_liquid_class(
            name=liquid_class.name,
            transfer_properties=transfer_props,
            tiprack_uri=tiprack_uri_for_transfer_props,
        )

        # This will return a generator that provides pairs of destination well and
        # the volume to dispense into it
        dest_per_volume_step = (
            tx_commons.expand_for_volume_constraints_for_liquid_classes(
                volumes=[volume for _ in range(len(dest))],
                targets=dest,
                max_volume=working_volume,
            )
        )

        def _drop_tip() -> None:
            if isinstance(trash_location, (TrashBin, WasteChute)):
                self.drop_tip_in_disposal_location(
                    disposal_location=trash_location,
                    home_after=False,
                    alternate_tip_drop=True,
                )
            elif isinstance(trash_location, Location):
                self.drop_tip(
                    location=trash_location,
                    well_core=trash_location.labware.as_well()._core,  # type: ignore[arg-type]
                    home_after=False,
                    alternate_drop_location=True,
                )

        def _pick_up_tip() -> None:
            next_tip = self.get_next_tip(
                tip_racks=[core for loc, core in tip_racks],
                starting_well=None,
            )
            if next_tip is None:
                raise RuntimeError(
                    f"No tip available among {tip_racks} for this transfer."
                )
            (
                tiprack_loc,
                tiprack_uri,
                tip_well,
            ) = self._get_location_and_well_core_from_next_tip_info(next_tip, tip_racks)
            if tiprack_uri != tiprack_uri_for_transfer_props:
                raise RuntimeError(
                    f"Tiprack {tiprack_uri} does not match the tiprack designated "
                    f"for this transfer- {tiprack_uri_for_transfer_props}."
                )
            self.pick_up_tip(
                location=tiprack_loc,
                well_core=tip_well,
                presses=None,
                increment=None,
            )

        tip_used = False
        if new_tip != TransferTipPolicyV2.NEVER:
            _pick_up_tip()

        tip_contents = [
            tx_comps_executor.LiquidAndAirGapPair(
                liquid=0,
                air_gap=0,
            )
        ]
        next_step_volume, next_dest = next(dest_per_volume_step)
        is_last_step = False

        # This loop will run until the last step has been executed
        while not is_last_step:
            total_aspirate_volume = 0.0
            vol_dest_combo = []

            # This loop looks at the next volumes to dispense and calculates how many
            # dispense volumes plus their conditioning & disposal volumes can fit into
            # the tip. It then collects these volumes and their destinations in a list.
            while not is_last_step and self._tip_can_hold_volume_for_multi_dispensing(
                transfer_volume=total_aspirate_volume + next_step_volume,
                multi_dispense_properties=transfer_props.multi_dispense,
                tip_working_volume=working_volume,
            ):
                total_aspirate_volume += next_step_volume
                vol_dest_combo.append((next_step_volume, next_dest))
                try:
                    next_step_volume, next_dest = next(dest_per_volume_step)
                except StopIteration:
                    is_last_step = True

            conditioning_vol = (
                transfer_props.multi_dispense.conditioning_by_volume.get_for_volume(
                    total_aspirate_volume
                )
            )
            disposal_vol = (
                transfer_props.multi_dispense.disposal_by_volume.get_for_volume(
                    total_aspirate_volume
                )
            )

            if new_tip == TransferTipPolicyV2.ALWAYS and tip_used:
                _drop_tip()
                _pick_up_tip()
                tip_contents = [
                    tx_comps_executor.LiquidAndAirGapPair(
                        liquid=0,
                        air_gap=0,
                    )
                ]

            use_single_dispense = False
            if total_aspirate_volume == volume and len(vol_dest_combo) == 1:
                # We are only doing a single transfer. Either because this is the last
                # remaining volume to dispense or, once this function accepts a list of
                # volumes, the next pair of volumes is too large to be multi-dispensed.
                # So we won't use conditioning volume or disposal volume
                conditioning_vol = 0
                disposal_vol = 0
                use_single_dispense = True

            if (
                not use_single_dispense
                and disposal_vol > 0
                and not transfer_props.multi_dispense.retract.blowout.enabled
            ):
                raise RuntimeError(
                    "Distribute liquid uses a disposal volume but location for disposing of"
                    " the disposal volume cannot be found when blowout is disabled."
                    " Specify a blowout location and enable blowout when using a disposal volume."
                )

            # Aspirate the total volume determined by the loop above
            tip_contents = self.aspirate_liquid_class(
                volume=total_aspirate_volume + conditioning_vol + disposal_vol,
                source=source,
                transfer_properties=transfer_props,
                transfer_type=tx_comps_executor.TransferType.ONE_TO_MANY,
                tip_contents=tip_contents,
                conditioning_volume=conditioning_vol,
            )

            # If the tip has volumes correspoinding to multiple destinations, then
            # multi-dispense in those destinations.
            # If the tip has a volume corresponding to a single destination, then
            # do a single-dispense into that destination.
            for next_vol, next_dest in vol_dest_combo:
                if use_single_dispense:
                    tip_contents = self.dispense_liquid_class(
                        volume=next_vol,
                        dest=next_dest,
                        source=source,
                        transfer_properties=transfer_props,
                        transfer_type=tx_comps_executor.TransferType.ONE_TO_MANY,
                        tip_contents=tip_contents,
                        add_final_air_gap=False
                        if is_last_step and new_tip == TransferTipPolicyV2.NEVER
                        else True,
                        trash_location=trash_location,
                    )
                else:
                    tip_contents = self.dispense_liquid_class_during_multi_dispense(
                        volume=next_vol,
                        dest=next_dest,
                        source=source,
                        transfer_properties=transfer_props,
                        transfer_type=tx_comps_executor.TransferType.ONE_TO_MANY,
                        tip_contents=tip_contents,
                        add_final_air_gap=False
                        if is_last_step and new_tip == TransferTipPolicyV2.NEVER
                        else True,
                        trash_location=trash_location,
                        conditioning_volume=conditioning_vol,
                        disposal_volume=disposal_vol,
                    )
            tip_used = True

        if new_tip != TransferTipPolicyV2.NEVER:
            _drop_tip()

    def _tip_can_hold_volume_for_multi_dispensing(
        self,
        transfer_volume: float,
        multi_dispense_properties: MultiDispenseProperties,
        tip_working_volume: float,
    ) -> bool:
        """
        Whether the tip can hold the volume plus the conditioning and disposal volumes
        required for multi-dispensing.
        """
        return (
            transfer_volume
            + multi_dispense_properties.conditioning_by_volume.get_for_volume(
                transfer_volume
            )
            + multi_dispense_properties.disposal_by_volume.get_for_volume(
                transfer_volume
            )
            <= tip_working_volume
        )

    def consolidate_liquid(  # noqa: C901
        self,
        liquid_class: LiquidClass,
        volume: float,
        source: List[Tuple[Location, WellCore]],
        dest: Tuple[Location, WellCore],
        new_tip: TransferTipPolicyV2,
        tip_racks: List[Tuple[Location, LabwareCore]],
        trash_location: Union[Location, TrashBin, WasteChute],
        return_tip: bool,
    ) -> None:
        if not tip_racks:
            raise RuntimeError(
                "No tipracks found for pipette in order to perform transfer"
            )
        tiprack_uri_for_transfer_props = tip_racks[0][1].get_uri()
        transfer_props = liquid_class.get_for(
            pipette=self.get_pipette_name(), tip_rack=tiprack_uri_for_transfer_props
        )
        blow_out_properties = transfer_props.dispense.retract.blowout
        if (
            blow_out_properties.enabled
            and blow_out_properties.location == BlowoutLocation.SOURCE
        ):
            raise RuntimeError(
                'Blowout location "source" incompatible with consolidate liquid.'
                ' Please choose "destination" or "trash".'
            )

        # TODO: use the ID returned by load_liquid_class in command annotations
        self.load_liquid_class(
            name=liquid_class.name,
            transfer_properties=transfer_props,
            tiprack_uri=tiprack_uri_for_transfer_props,
        )

        max_volume = min(
            self.get_max_volume(),
            self._engine_client.state.geometry.get_nominal_tip_geometry(
                pipette_id=self.pipette_id,
                labware_id=tip_racks[0][1].labware_id,
                well_name=None,
            ).volume,
        )

        # TODO: add multi-channel pipette handling here
        source_per_volume_step = (
            tx_commons.expand_for_volume_constraints_for_liquid_classes(
                volumes=[volume for _ in range(len(source))],
                targets=source,
                max_volume=max_volume,
            )
        )

        last_tip_picked_up_from: Optional[WellCore] = None

        def _drop_tip() -> None:
            if return_tip:
                assert last_tip_picked_up_from is not None
                self.drop_tip(
                    location=None,
                    well_core=last_tip_picked_up_from,
                    home_after=False,
                    alternate_drop_location=False,
                )
            elif isinstance(trash_location, (TrashBin, WasteChute)):
                self.drop_tip_in_disposal_location(
                    disposal_location=trash_location,
                    home_after=False,
                    alternate_tip_drop=True,
                )
            elif isinstance(trash_location, Location):
                self.drop_tip(
                    location=trash_location,
                    well_core=trash_location.labware.as_well()._core,  # type: ignore[arg-type]
                    home_after=False,
                    alternate_drop_location=True,
                )

        def _pick_up_tip() -> WellCore:
            next_tip = self.get_next_tip(
                tip_racks=[core for loc, core in tip_racks],
                starting_well=None,
            )
            if next_tip is None:
                raise RuntimeError(
                    f"No tip available among {tip_racks} for this transfer."
                )
            (
                tiprack_loc,
                tiprack_uri,
                tip_well,
            ) = self._get_location_and_well_core_from_next_tip_info(next_tip, tip_racks)
            if tiprack_uri != tiprack_uri_for_transfer_props:
                raise RuntimeError(
                    f"Tiprack {tiprack_uri} does not match the tiprack designated "
                    f"for this transfer- {tiprack_uri_for_transfer_props}."
                )
            self.pick_up_tip(
                location=tiprack_loc,
                well_core=tip_well,
                presses=None,
                increment=None,
            )
            return tip_well

        if new_tip == TransferTipPolicyV2.ONCE:
            last_tip_picked_up_from = _pick_up_tip()

        prev_src: Optional[Tuple[Location, WellCore]] = None
        tip_contents = [
            tx_comps_executor.LiquidAndAirGapPair(
                liquid=0,
                air_gap=0,
            )
        ]
        next_step_volume, next_source = next(source_per_volume_step)
        is_last_step = False
        while not is_last_step:
            total_dispense_volume = 0.0
            vol_aspirate_combo = []
            # Take air gap into account because there will be a final air gap before the dispense
            while total_dispense_volume + next_step_volume <= max_volume:
                total_dispense_volume += next_step_volume
                vol_aspirate_combo.append((next_step_volume, next_source))
                try:
                    next_step_volume, next_source = next(source_per_volume_step)
                except StopIteration:
                    is_last_step = True
                    break

            if new_tip == TransferTipPolicyV2.ALWAYS:
                if prev_src is not None:
                    _drop_tip()
                last_tip_picked_up_from = _pick_up_tip()
                tip_contents = [
                    tx_comps_executor.LiquidAndAirGapPair(
                        liquid=0,
                        air_gap=0,
                    )
                ]
            for step_volume, step_source in vol_aspirate_combo:
                tip_contents = self.aspirate_liquid_class(
                    volume=step_volume,
                    source=step_source,
                    transfer_properties=transfer_props,
                    transfer_type=tx_comps_executor.TransferType.MANY_TO_ONE,
                    tip_contents=tip_contents,
                )
            tip_contents = self.dispense_liquid_class(
                volume=total_dispense_volume,
                dest=dest,
                source=None,  # Cannot have source as location for blowout so hardcoded to None
                transfer_properties=transfer_props,
                transfer_type=tx_comps_executor.TransferType.MANY_TO_ONE,
                tip_contents=tip_contents,
                add_final_air_gap=False
                if is_last_step and new_tip == TransferTipPolicyV2.NEVER
                else True,
                trash_location=trash_location,
            )
            prev_src = next_source
        if new_tip != TransferTipPolicyV2.NEVER:
            _drop_tip()

    def _get_location_and_well_core_from_next_tip_info(
        self,
        tip_info: NextTipInfo,
        tip_racks: List[Tuple[Location, LabwareCore]],
    ) -> _TipInfo:
        tiprack_labware_core = self._protocol_core._labware_cores_by_id[
            tip_info.labwareId
        ]
        tip_well = tiprack_labware_core.get_well_core(tip_info.tipStartingWell)

        tiprack_loc = [
            loc for loc, lw_core in tip_racks if lw_core == tiprack_labware_core
        ]

        return _TipInfo(
            Location(tip_well.get_top(0), tiprack_loc[0].labware),
            tiprack_labware_core.get_uri(),
            tip_well,
        )

    def aspirate_liquid_class(
        self,
        volume: float,
        source: Tuple[Location, WellCore],
        transfer_properties: TransferProperties,
        transfer_type: tx_comps_executor.TransferType,
        tip_contents: List[tx_comps_executor.LiquidAndAirGapPair],
        conditioning_volume: Optional[float] = None,
    ) -> List[tx_comps_executor.LiquidAndAirGapPair]:
        """Execute aspiration steps.

        1. Submerge
        2. Mix
        3. pre-wet
        4. Aspirate
        5. Delay- wait inside the liquid
        6. Aspirate retract

        Return: List of liquid and air gap pairs in tip.
        """
        aspirate_props = transfer_properties.aspirate
        tx_commons.check_valid_liquid_class_volume_parameters(
            aspirate_volume=volume,
            air_gap=aspirate_props.retract.air_gap_by_volume.get_for_volume(volume)
            if conditioning_volume is None
            else 0,
            disposal_volume=0,  # Disposal volume is accounted for in aspirate vol
            max_volume=self.get_working_volume(),
        )
        source_loc, source_well = source
        aspirate_point = (
            tx_comps_executor.absolute_point_from_position_reference_and_offset(
                well=source_well,
                position_reference=aspirate_props.position_reference,
                offset=aspirate_props.offset,
            )
        )
        aspirate_location = Location(aspirate_point, labware=source_loc.labware)
        last_liquid_and_airgap_in_tip = (
            tip_contents[-1]
            if tip_contents
            else tx_comps_executor.LiquidAndAirGapPair(
                liquid=0,
                air_gap=0,
            )
        )
        components_executor = tx_comps_executor.TransferComponentsExecutor(
            instrument_core=self,
            transfer_properties=transfer_properties,
            target_location=aspirate_location,
            target_well=source_well,
            transfer_type=transfer_type,
            tip_state=tx_comps_executor.TipState(
                last_liquid_and_air_gap_in_tip=last_liquid_and_airgap_in_tip
            ),
        )
        components_executor.submerge(submerge_properties=aspirate_props.submerge)
        # Do not do a pre-aspirate mix or pre-wet if consolidating
        if transfer_type != tx_comps_executor.TransferType.MANY_TO_ONE:
            components_executor.mix(
                mix_properties=aspirate_props.mix, last_dispense_push_out=False
            )
            components_executor.pre_wet(
                volume=volume,
            )
        components_executor.aspirate_and_wait(volume=volume)
        if (
            transfer_type == tx_comps_executor.TransferType.ONE_TO_MANY
            and conditioning_volume not in [None, 0.0]
            and transfer_properties.multi_dispense is not None
        ):
            # Dispense the conditioning volume
            components_executor.dispense_and_wait(
                dispense_properties=transfer_properties.multi_dispense,
                volume=conditioning_volume or 0.0,
                push_out_override=0,
            )
            components_executor.retract_after_aspiration(
                volume=volume, add_air_gap=False
            )
        else:
            components_executor.retract_after_aspiration(
                volume=volume, add_air_gap=True
            )

        # return copy of tip_contents with last entry replaced by tip state from executor
        last_contents = components_executor.tip_state.last_liquid_and_air_gap_in_tip
        new_tip_contents = tip_contents[0:-1] + [last_contents]
        return new_tip_contents

    def dispense_liquid_class(
        self,
        volume: float,
        dest: Tuple[Location, WellCore],
        source: Optional[Tuple[Location, WellCore]],
        transfer_properties: TransferProperties,
        transfer_type: tx_comps_executor.TransferType,
        tip_contents: List[tx_comps_executor.LiquidAndAirGapPair],
        add_final_air_gap: bool,
        trash_location: Union[Location, TrashBin, WasteChute],
    ) -> List[tx_comps_executor.LiquidAndAirGapPair]:
        """Execute single-dispense steps.
        1. Move pipette to the ‘submerge’ position with normal speed.
            - The pipette will move in an arc- move to max z height of labware
              (if asp & disp are in same labware)
              or max z height of all labware (if asp & disp are in separate labware)
        2. Air gap removal:
            - If dispense location is above the meniscus, DO NOT remove air gap
              (it will be dispensed along with rest of the liquid later).
              All other scenarios, remove the air gap by doing a dispense
            - Flow rate = min(dispenseFlowRate, (airGapByVolume)/sec)
            - Use the post-dispense delay
        4. Move to the dispense position at the specified ‘submerge’ speed
           (even if we might not be moving into the liquid)
           - Do a delay (submerge delay)
        6. Dispense:
            - Dispense at the specified flow rate.
            - Do a push out as specified ONLY IF there is no mix following the dispense AND the tip is empty.
            Volume for push out is the volume being dispensed. So if we are dispensing 50uL, use pushOutByVolume[50] as push out volume.
        7. Delay
        8. Mix using the same flow rate and delays as specified for asp+disp,
           with the volume and the number of repetitions specified. Use the delays in asp & disp.
            - If the dispense position is outside the liquid, then raise error if mix is enabled.
              Can only be checked if using liquid level detection/ meniscus-based positioning.
            - If the user wants to perform a mix then they should specify a dispense position that’s inside the liquid OR do mix() on the wells after transfer.
            - Do push out at the last dispense.
        9. Retract

        Return:
            List of liquid and air gap pairs in tip.
        """
        dispense_props = transfer_properties.dispense
        dest_loc, dest_well = dest
        dispense_point = (
            tx_comps_executor.absolute_point_from_position_reference_and_offset(
                well=dest_well,
                position_reference=dispense_props.position_reference,
                offset=dispense_props.offset,
            )
        )
        dispense_location = Location(dispense_point, labware=dest_loc.labware)
        last_liquid_and_airgap_in_tip = (
            tip_contents[-1]
            if tip_contents
            else tx_comps_executor.LiquidAndAirGapPair(
                liquid=0,
                air_gap=0,
            )
        )
        components_executor = tx_comps_executor.TransferComponentsExecutor(
            instrument_core=self,
            transfer_properties=transfer_properties,
            target_location=dispense_location,
            target_well=dest_well,
            transfer_type=transfer_type,
            tip_state=tx_comps_executor.TipState(
                last_liquid_and_air_gap_in_tip=last_liquid_and_airgap_in_tip
            ),
        )
        components_executor.submerge(submerge_properties=dispense_props.submerge)
        push_out_vol = (
            0.0
            if dispense_props.mix.enabled
            else dispense_props.push_out_by_volume.get_for_volume(volume)
        )
        components_executor.dispense_and_wait(
            dispense_properties=dispense_props,
            volume=volume,
            push_out_override=push_out_vol,
        )
        components_executor.mix(
            mix_properties=dispense_props.mix,
            last_dispense_push_out=True,
        )
        components_executor.retract_after_dispensing(
            trash_location=trash_location,
            source_location=source[0] if source else None,
            source_well=source[1] if source else None,
            add_final_air_gap=add_final_air_gap,
        )
        last_contents = components_executor.tip_state.last_liquid_and_air_gap_in_tip
        new_tip_contents = tip_contents[0:-1] + [last_contents]
        return new_tip_contents

    def dispense_liquid_class_during_multi_dispense(
        self,
        volume: float,
        dest: Tuple[Location, WellCore],
        source: Optional[Tuple[Location, WellCore]],
        transfer_properties: TransferProperties,
        transfer_type: tx_comps_executor.TransferType,
        tip_contents: List[tx_comps_executor.LiquidAndAirGapPair],
        add_final_air_gap: bool,
        trash_location: Union[Location, TrashBin, WasteChute],
        conditioning_volume: float,
        disposal_volume: float,
    ) -> List[tx_comps_executor.LiquidAndAirGapPair]:
        """Execute a dispense step that's part of a multi-dispense.

        This executes a dispense step very similar to a single dispense except that:
        - it uses the multi-dispense properties from the liquid class
        - handles push-out based on disposal volume in addition to the existing conditions
        - delegates the retraction steps to a different, multi-dispense retract function

        Return:
            List of liquid and air gap pairs in tip.
        """
        assert transfer_properties.multi_dispense is not None
        dispense_props = transfer_properties.multi_dispense

        dest_loc, dest_well = dest
        dispense_point = (
            tx_comps_executor.absolute_point_from_position_reference_and_offset(
                well=dest_well,
                position_reference=dispense_props.position_reference,
                offset=dispense_props.offset,
            )
        )
        dispense_location = Location(dispense_point, labware=dest_loc.labware)
        last_liquid_and_airgap_in_tip = (
            tip_contents[-1]
            if tip_contents
            else tx_comps_executor.LiquidAndAirGapPair(
                liquid=0,
                air_gap=0,
            )
        )
        components_executor = tx_comps_executor.TransferComponentsExecutor(
            instrument_core=self,
            transfer_properties=transfer_properties,
            target_location=dispense_location,
            target_well=dest_well,
            transfer_type=transfer_type,
            tip_state=tx_comps_executor.TipState(
                last_liquid_and_air_gap_in_tip=last_liquid_and_airgap_in_tip
            ),
        )
        components_executor.submerge(submerge_properties=dispense_props.submerge)
        tip_starting_volume = self.get_current_volume()
        is_last_dispense_without_disposal_vol = (
            disposal_volume == 0 and tip_starting_volume == volume
        )
        push_out_vol = (
            # TODO (spp): verify if it's okay to use push_out_by_volume of single dispense
            transfer_properties.dispense.push_out_by_volume.get_for_volume(volume)
            if is_last_dispense_without_disposal_vol
            else 0.0
        )

        components_executor.dispense_and_wait(
            dispense_properties=dispense_props,
            volume=volume,
            push_out_override=push_out_vol,
        )
        components_executor.retract_during_multi_dispensing(
            trash_location=trash_location,
            source_location=source[0] if source else None,
            source_well=source[1] if source else None,
            conditioning_volume=conditioning_volume,
            add_final_air_gap=add_final_air_gap,
            is_last_retract=tip_starting_volume - volume == disposal_volume,
        )
        last_contents = components_executor.tip_state.last_liquid_and_air_gap_in_tip
        new_tip_contents = tip_contents[0:-1] + [last_contents]
        return new_tip_contents

    def retract(self) -> None:
        """Retract this instrument to the top of the gantry."""
        z_axis = self._engine_client.state.pipettes.get_z_axis(self._pipette_id)
        self._engine_client.execute_command(cmd.HomeParams(axes=[z_axis]))

    def _pressure_supported_by_pipette(self) -> bool:
        return self._engine_client.state.pipettes.get_pipette_supports_pressure(
            self.pipette_id
        )

    def detect_liquid_presence(self, well_core: WellCore, loc: Location) -> bool:
        labware_id = well_core.labware_id
        well_name = well_core.get_name()
        well_location = WellLocation(
            origin=WellOrigin.TOP, offset=WellOffset(x=0, y=0, z=0)
        )

        # The error handling here is a bit nuanced and also a bit broken:
        #
        # - If the hardware detects liquid, the `tryLiquidProbe` engine command will
        #   succeed and return a height, which we'll convert to a `True` return.
        #   Okay so far.
        #
        # - If the hardware detects no liquid, the `tryLiquidProbe` engine command will
        #   succeed and return `None`, which we'll convert to a `False` return.
        #   Still okay so far.
        #
        # - If there is any other error within the `tryLiquidProbe` command, things get
        #   messy. It may kick the run into recovery mode. At that point, all bets are
        #   off--we lose our guarantee of having a `tryLiquidProbe` command whose
        #   `result` we can inspect. We don't know how to deal with that here, so we
        #   currently propagate the exception up, which will quickly kill the protocol,
        #   after a potential split second of recovery mode. It's unclear what would
        #   be good user-facing behavior here, but it's unfortunate to kill the protocol
        #   for an error that the engine thinks should be recoverable.
        result = self._engine_client.execute_command_without_recovery(
            cmd.TryLiquidProbeParams(
                labwareId=labware_id,
                wellName=well_name,
                wellLocation=well_location,
                pipetteId=self.pipette_id,
            )
        )

        self._protocol_core.set_last_location(location=loc, mount=self.get_mount())

        return result.z_position is not None

    def get_minimum_liquid_sense_height(self) -> float:
        attached_tip = self._engine_client.state.pipettes.get_attached_tip(
            self._pipette_id
        )
        if attached_tip:
            tip_volume = attached_tip.volume
        else:
            raise TipNotAttachedError(
                "Need to have a tip attached for liquid-sense operations."
            )
        lld_settings = self._engine_client.state.pipettes.get_pipette_lld_settings(
            pipette_id=self.pipette_id
        )
        if lld_settings:
            lld_min_height_for_tip_attached = lld_settings[f"t{tip_volume}"][
                "minHeight"
            ]
            return lld_min_height_for_tip_attached
        else:
            raise ValueError("liquid-level detection settings not found.")

    def liquid_probe_with_recovery(self, well_core: WellCore, loc: Location) -> None:
        labware_id = well_core.labware_id
        well_name = well_core.get_name()
        well_location = WellLocation(
            origin=WellOrigin.TOP, offset=WellOffset(x=0, y=0, z=2)
        )
        self._engine_client.execute_command(
            cmd.LiquidProbeParams(
                labwareId=labware_id,
                wellName=well_name,
                wellLocation=well_location,
                pipetteId=self.pipette_id,
            )
        )

        self._protocol_core.set_last_location(location=loc, mount=self.get_mount())

    # TODO(cm, 3.4.25): decide whether to allow users to try and do math on a potential SimulatedProbeResult
    def liquid_probe_without_recovery(
        self, well_core: WellCore, loc: Location
    ) -> LiquidTrackingType:
        labware_id = well_core.labware_id
        well_name = well_core.get_name()
        well_location = WellLocation(
            origin=WellOrigin.TOP, offset=WellOffset(x=0, y=0, z=2)
        )
        result = self._engine_client.execute_command_without_recovery(
            cmd.LiquidProbeParams(
                labwareId=labware_id,
                wellName=well_name,
                wellLocation=well_location,
                pipetteId=self.pipette_id,
            )
        )

        self._protocol_core.set_last_location(location=loc, mount=self.get_mount())
        return result.z_position

    def nozzle_configuration_valid_for_lld(self) -> bool:
        """Check if the nozzle configuration currently supports LLD."""
        return self._engine_client.state.pipettes.get_nozzle_configuration_supports_lld(
            self.pipette_id
        )

    def delay(self, seconds: float) -> None:
        """Call a protocol delay."""
        self._protocol_core.delay(seconds=seconds, msg=None)


class _TipInfo(NamedTuple):
    tiprack_location: Location
    tiprack_uri: str
    tip_well: WellCore
