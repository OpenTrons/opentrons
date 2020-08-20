from __future__ import annotations

import contextlib
from abc import ABC, abstractmethod
from typing import (Dict, List, Optional, Union, TYPE_CHECKING)

from opentrons import types
from opentrons.hardware_control import API
from opentrons.protocols.types import APIVersion
from opentrons.protocol_api.labware import Labware
from opentrons.protocol_api.module_geometry import ModuleGeometry
from opentrons.protocol_api.geometry import Deck
from opentrons.protocol_api.instrument_context import InstrumentContext
from opentrons.protocol_api.protocol_context import ModuleTypes
from opentrons.protocol_api.module_contexts import ModuleContext
from opentrons.protocol_api.util import AxisMaxSpeeds


if TYPE_CHECKING:
    from opentrons_shared_data.labware.dev_types import LabwareDefinition


class AbstractProtocolContext(ABC):

    @abstractmethod
    def get_api_version(self) -> APIVersion:
        """Get the api version by the protocol"""
        ...

    @abstractmethod
    def get_bundled_data(self) -> Dict[str, bytes]:
        """Get a mapping of name to contents"""
        ...

    @abstractmethod
    def cleanup(self):
        ...

    @abstractmethod
    def get_max_speeds(self) -> AxisMaxSpeeds:
        ...

    @abstractmethod
    def get_commands(self):
        ...

    @abstractmethod
    def clear_commands(self):
        ...

    @contextlib.contextmanager
    @abstractmethod
    def temp_connect(self, hardware: API):
        ...

    @abstractmethod
    def connect(self, hardware: API):
        ...

    @abstractmethod
    def disconnect(self):
        ...

    @abstractmethod
    def is_simulating(self) -> bool:
        ...

    @abstractmethod
    def load_labware_from_definition(
            self,
            labware_def: 'LabwareDefinition',
            location: types.DeckLocation,
            label: str = None,
    ) -> Labware:
        ...

    @abstractmethod
    def load_labware(
            self,
            load_name: str,
            location: types.DeckLocation,
            label: str = None,
            namespace: str = None,
            version: int = None,
    ) -> Labware:
        ...

    @abstractmethod
    def load_labware_by_name(
            self,
            load_name: str,
            location: types.DeckLocation,
            label: str = None,
            namespace: str = None,
            version: int = 1
    ) -> Labware:
        ...

    @abstractmethod
    def get_loaded_labwares(self) -> Dict[int, Union[Labware, ModuleGeometry]]:
        ...

    @abstractmethod
    def load_module(
            self,
            module_name: str,
            location: Optional[types.DeckLocation] = None,
            configuration: str = None) -> ModuleTypes:
        ...

    @abstractmethod
    def get_loaded_modules(self) -> Dict[int, 'ModuleContext']:
        ...

    @abstractmethod
    def load_instrument(
            self,
            instrument_name: str,
            mount: Union[types.Mount, str],
            tip_racks: List[Labware] = None,
            replace: bool = False) -> 'InstrumentContext':
        ...

    @abstractmethod
    def get_loaded_instruments(self) \
            -> Dict[str, Optional['InstrumentContext']]:
        ...

    @abstractmethod
    def pause(self, msg=None):
        ...

    @abstractmethod
    def resume(self):
        ...

    @abstractmethod
    def comment(self, msg):
        ...

    @abstractmethod
    def delay(self, seconds=0, minutes=0, msg=None):
        ...

    @abstractmethod
    def home(self):
        ...

    @abstractmethod
    def get_deck(self) -> Deck:
        ...

    @abstractmethod
    def get_fixed_trash(self) -> Labware:
        ...

    @abstractmethod
    def set_rail_lights(self, on: bool):
        ...

    @abstractmethod
    def get_rail_lights_on(self) -> bool:
        ...

    @abstractmethod
    def door_closed(self) -> bool:
        ...
