"""The interface that implements ProtocolContext."""

from __future__ import annotations

from abc import abstractmethod, ABC
from typing import Generic, List, Optional, Union, Tuple, TYPE_CHECKING

from opentrons_shared_data.deck.dev_types import DeckDefinitionV4, SlotDefV3
from opentrons_shared_data.pipette.dev_types import PipetteNameType
from opentrons_shared_data.labware.dev_types import LabwareDefinition
from opentrons_shared_data.robot.dev_types import RobotType

from opentrons.types import DeckSlotName, Location, Mount, Point
from opentrons.hardware_control import SyncHardwareAPI
from opentrons.hardware_control.modules.types import ModuleModel
from opentrons.protocols.api_support.util import AxisMaxSpeeds

from .instrument import InstrumentCoreType
from .labware import LabwareCoreType, LabwareLoadParams
from .module import ModuleCoreType
from .._liquid import Liquid
from ..trash_bin import TrashBin
from ..waste_chute import WasteChute
from .._types import OffDeckType, StagingSlotName

if TYPE_CHECKING:
    from ..labware import Labware


class AbstractProtocol(
    ABC, Generic[InstrumentCoreType, LabwareCoreType, ModuleCoreType]
):
    @property
    @abstractmethod
    def fixed_trash(self) -> Optional[LabwareCoreType]:
        """Get the fixed trash labware core."""
        ...

    @property
    @abstractmethod
    def robot_type(self) -> RobotType:
        ...

    @abstractmethod
    def get_max_speeds(self) -> AxisMaxSpeeds:
        ...

    @abstractmethod
    def get_hardware(self) -> SyncHardwareAPI:
        ...

    @abstractmethod
    def is_simulating(self) -> bool:
        ...

    @abstractmethod
    def add_labware_definition(
        self,
        definition: LabwareDefinition,
    ) -> LabwareLoadParams:
        """Add a labware definition to the set of loadable definitions."""
        ...

    @abstractmethod
    def append_disposal_location(
        self, disposal_location: Union[TrashBin, WasteChute]
    ) -> None:
        """Append a disposal location object to the core"""
        ...

    @abstractmethod
    def load_labware(
        self,
        load_name: str,
        location: Union[
            DeckSlotName, StagingSlotName, LabwareCoreType, ModuleCoreType, OffDeckType
        ],
        label: Optional[str],
        namespace: Optional[str],
        version: Optional[int],
    ) -> LabwareCoreType:
        """Load a labware using its identifying parameters."""
        ...

    @abstractmethod
    def load_adapter(
        self,
        load_name: str,
        location: Union[DeckSlotName, StagingSlotName, ModuleCoreType, OffDeckType],
        namespace: Optional[str],
        version: Optional[int],
    ) -> LabwareCoreType:
        """Load an adapter using its identifying parameters"""
        ...

    # TODO (spp, 2022-12-14): https://opentrons.atlassian.net/browse/RLAB-237
    @abstractmethod
    def move_labware(
        self,
        labware_core: LabwareCoreType,
        new_location: Union[
            DeckSlotName,
            StagingSlotName,
            LabwareCoreType,
            ModuleCoreType,
            OffDeckType,
            WasteChute,
        ],
        use_gripper: bool,
        pause_for_manual_move: bool,
        pick_up_offset: Optional[Tuple[float, float, float]],
        drop_offset: Optional[Tuple[float, float, float]],
    ) -> None:
        ...

    @abstractmethod
    def load_module(
        self,
        model: ModuleModel,
        deck_slot: Optional[DeckSlotName],
        configuration: Optional[str],
    ) -> ModuleCoreType:
        ...

    @abstractmethod
    def load_instrument(
        self, instrument_name: PipetteNameType, mount: Mount
    ) -> InstrumentCoreType:
        ...

    @abstractmethod
    def pause(self, msg: Optional[str]) -> None:
        ...

    @abstractmethod
    def comment(self, msg: str) -> None:
        ...

    @abstractmethod
    def delay(self, seconds: float, msg: Optional[str]) -> None:
        ...

    @abstractmethod
    def home(self) -> None:
        ...

    @abstractmethod
    def set_rail_lights(self, on: bool) -> None:
        ...

    @abstractmethod
    def get_disposal_locations(self) -> List[Union[Labware, TrashBin, WasteChute]]:
        ...

    @abstractmethod
    def get_rail_lights_on(self) -> bool:
        ...

    @abstractmethod
    def door_closed(self) -> bool:
        ...

    @abstractmethod
    def get_last_location(
        self,
        mount: Optional[Mount] = None,
    ) -> Optional[Location]:
        ...

    @abstractmethod
    def set_last_location(
        self,
        location: Optional[Location],
        mount: Optional[Mount] = None,
    ) -> None:
        ...

    @abstractmethod
    def get_deck_definition(self) -> DeckDefinitionV4:
        """Get the geometry definition of the robot's deck."""

    # TODO(jbl 10-30-2023) this method may no longer need to exist post deck config work being completed
    @abstractmethod
    def get_slot_definition(self, slot: DeckSlotName) -> SlotDefV3:
        """Get the slot definition from the robot's deck."""

    @abstractmethod
    def get_slot_item(
        self, slot_name: DeckSlotName
    ) -> Union[LabwareCoreType, ModuleCoreType, None]:
        """Get the contents of a given slot, if any."""

    @abstractmethod
    def get_labware_on_module(
        self, module_core: ModuleCoreType
    ) -> Optional[LabwareCoreType]:
        """Get the labware on a given module, if any."""

    @abstractmethod
    def get_labware_on_labware(
        self, labware_core: LabwareCoreType
    ) -> Optional[LabwareCoreType]:
        """Get the labware on a given labware, if any."""

    @abstractmethod
    def get_slot_center(self, slot_name: DeckSlotName) -> Point:
        """Get the absolute coordinate of a slot's center."""

    @abstractmethod
    def get_highest_z(self) -> float:
        """Get the highest Z point of all deck items."""

    @abstractmethod
    def get_labware_cores(self) -> List[LabwareCoreType]:
        """Get all loaded labware cores."""

    @abstractmethod
    def get_module_cores(self) -> List[ModuleCoreType]:
        """Get all loaded module cores."""

    @abstractmethod
    def define_liquid(
        self, name: str, description: Optional[str], display_color: Optional[str]
    ) -> Liquid:
        """Define a liquid to load into a well."""

    @abstractmethod
    def get_labware_location(
        self, labware_core: LabwareCoreType
    ) -> Union[str, LabwareCoreType, ModuleCoreType, OffDeckType]:
        """Get labware parent location."""
