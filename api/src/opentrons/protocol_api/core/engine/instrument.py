"""ProtocolEngine-based InstrumentContext core implementation."""
from typing import Optional

from opentrons.types import Location, Mount
from opentrons.hardware_control.dev_types import PipetteDict
from opentrons.protocols.api_support.util import Clearances, PlungerSpeeds, FlowRates
from opentrons.protocol_engine.clients import SyncClient as EngineClient

from ..instrument import AbstractInstrument
from .well import WellCore


class InstrumentCore(AbstractInstrument[WellCore]):
    """Instrument API core using a ProtocolEngine.

    Args:
        pipette_id: ProtocolEngine ID of the loaded instrument.
    """

    def __init__(self, pipette_id: str, engine_client: EngineClient) -> None:
        self._id = pipette_id
        self._engine_client = engine_client

    @property
    def pipette_id(self) -> str:
        """The instrument's unique ProtocolEngine ID."""
        return self._id

    def get_default_speed(self) -> float:
        raise NotImplementedError("InstrumentCore.get_default_speed not implemented")

    def set_default_speed(self, speed: float) -> None:
        raise NotImplementedError("InstrumentCore.set_default_speed not implemented")

    def aspirate(self, volume: float, rate: float) -> None:
        raise NotImplementedError("InstrumentCore.aspirate not implemented")

    def dispense(self, volume: float, rate: float) -> None:
        raise NotImplementedError("InstrumentCore.dispense not implemented")

    def blow_out(self) -> None:
        raise NotImplementedError("InstrumentCore.blow_out not implemented")

    def touch_tip(
        self,
        location: WellCore,
        radius: float,
        v_offset: float,
        speed: float,
    ) -> None:
        raise NotImplementedError("InstrumentCore.touch_tip not implemented")

    def pick_up_tip(
        self,
        well: WellCore,
        tip_length: float,
        presses: Optional[int],
        increment: Optional[float],
        prep_after: bool,
    ) -> None:
        raise NotImplementedError("InstrumentCore.pick_up_tip not implemented")

    def drop_tip(self, home_after: bool) -> None:
        raise NotImplementedError("InstrumentCore.drop_tip not implemented")

    def home(self) -> None:
        raise NotImplementedError("InstrumentCore.home not implemented")

    def home_plunger(self) -> None:
        raise NotImplementedError("InstrumentCore.home_plunger not implemented")

    def move_to(
        self,
        location: Location,
        force_direct: bool,
        minimum_z_height: Optional[float],
        speed: Optional[float],
    ) -> None:
        raise NotImplementedError("InstrumentCore.move_to not implemented")

    def get_mount(self) -> Mount:
        raise NotImplementedError("InstrumentCore.get_mount not implemented")

    def get_pipette_load_name(self) -> str:
        """Get the pipette's load name as a string.

        Will match the load name of the actually loaded pipette,
        which may differ from the requested load name.
        """
        return self._engine_client.state.pipettes.get(self._id).pipetteName.value

    def get_model(self) -> str:
        raise NotImplementedError("InstrumentCore.get_model not implemented")

    def get_min_volume(self) -> float:
        raise NotImplementedError("InstrumentCore.get_min_volume not implemented")

    def get_max_volume(self) -> float:
        raise NotImplementedError("InstrumentCore.get_max_volume not implemented")

    def get_current_volume(self) -> float:
        raise NotImplementedError("InstrumentCore.get_current_volume not implemented")

    def get_available_volume(self) -> float:
        raise NotImplementedError("InstrumentCore.get_available_volume not implemented")

    def get_pipette(self) -> PipetteDict:
        raise NotImplementedError("InstrumentCore.get_pipette not implemented")

    def get_channels(self) -> int:
        raise NotImplementedError("InstrumentCore.get_channels not implemented")

    def has_tip(self) -> bool:
        raise NotImplementedError("InstrumentCore.has_tip not implemented")

    def is_ready_to_aspirate(self) -> bool:
        raise NotImplementedError("InstrumentCore.is_ready_to_aspirate not implemented")

    def prepare_for_aspirate(self) -> None:
        raise NotImplementedError("InstrumentCore.prepare_for_aspirate not implemented")

    def get_return_height(self) -> float:
        raise NotImplementedError("InstrumentCore.get_return_height not implemented")

    def get_well_bottom_clearance(self) -> Clearances:
        raise NotImplementedError(
            "InstrumentCore.get_well_bottom_clearance not implemented"
        )

    def get_speed(self) -> PlungerSpeeds:
        raise NotImplementedError("InstrumentCore.get_speed not implemented")

    def get_flow_rate(self) -> FlowRates:
        raise NotImplementedError("InstrumentCore.get_flow_rate not implemented")

    def set_flow_rate(
        self,
        aspirate: Optional[float] = None,
        dispense: Optional[float] = None,
        blow_out: Optional[float] = None,
    ) -> None:
        raise NotImplementedError("InstrumentCore.set_flow_rate not implemented")

    def set_pipette_speed(
        self,
        aspirate: Optional[float] = None,
        dispense: Optional[float] = None,
        blow_out: Optional[float] = None,
    ) -> None:
        raise NotImplementedError("InstrumentCore.set_pipette_speed not implemented")
