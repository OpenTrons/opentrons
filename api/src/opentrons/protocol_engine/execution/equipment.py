"""Equipment command side-effect logic."""
from dataclasses import dataclass
from typing import Optional

from opentrons.calibration_storage.helpers import uri_from_details
from opentrons.protocols.models import LabwareDefinition
from opentrons.protocols.geometry.module_geometry import (
    resolve_module_type,
    module_model_from_string,
)
from opentrons.types import MountType
from opentrons.hardware_control.api import API as HardwareAPI
from opentrons.hardware_control.modules.mod_abc import AbstractModule

from ..errors import (
    FailedToLoadPipetteError,
    LabwareDefinitionDoesNotExistError,
    ModuleNotAttachedError,
    ModuleDefinitionDoesNotExistError,
)
from ..resources import LabwareDataProvider, ModuleDataProvider, ModelUtils
from ..state import StateStore
from ..types import (
    LabwareLocation,
    PipetteName,
    DeckSlotLocation,
    LabwareOffsetLocation,
    ModuleModels,
    ModuleDefinition,
)


@dataclass(frozen=True)
class LoadedLabwareData:
    """The result of a load labware procedure."""

    labware_id: str
    definition: LabwareDefinition
    offsetId: Optional[str]


@dataclass(frozen=True)
class LoadedPipetteData:
    """The result of a load pipette procedure."""

    pipette_id: str


@dataclass(frozen=True)
class LoadedModuleData:
    """The result of a load module procedure."""

    module_id: str
    module_serial: Optional[str]
    definition: ModuleDefinition


class EquipmentHandler:
    """Implementation logic for labware, pipette, and module loading."""

    _hardware_api: HardwareAPI
    _state_store: StateStore
    _labware_data_provider: LabwareDataProvider
    _module_data_provider: ModuleDataProvider
    _model_utils: ModelUtils

    def __init__(
        self,
        hardware_api: HardwareAPI,
        state_store: StateStore,
        labware_data_provider: Optional[LabwareDataProvider] = None,
        module_data_provider: Optional[ModuleDataProvider] = None,
        model_utils: Optional[ModelUtils] = None,
    ) -> None:
        """Initialize an EquipmentHandler instance."""
        self._hardware_api = hardware_api
        self._state_store = state_store
        self._labware_data_provider = labware_data_provider or LabwareDataProvider()
        self._module_data_provider = module_data_provider or ModuleDataProvider()
        self._model_utils = model_utils or ModelUtils()

    async def load_labware(
        self,
        load_name: str,
        namespace: str,
        version: int,
        location: LabwareLocation,
        labware_id: Optional[str],
    ) -> LoadedLabwareData:
        """Load labware by assigning an identifier and pulling required data.

        Args:
            load_name: The labware's load name.
            namespace: The namespace.
            version: Version
            location: The deck location at which labware is placed.
            labware_id: An optional identifier to assign the labware. If None, an
                identifier will be generated.

        Returns:
            A LoadedLabwareData object.
        """
        labware_id = (
            labware_id if labware_id is not None else self._model_utils.generate_id()
        )

        definition_uri = uri_from_details(
            load_name=load_name,
            namespace=namespace,
            version=version,
        )

        try:
            # Try to use existing definition in state.
            definition = self._state_store.labware.get_definition_by_uri(definition_uri)
        except LabwareDefinitionDoesNotExistError:
            definition = await self._labware_data_provider.get_labware_definition(
                load_name=load_name,
                namespace=namespace,
                version=version,
            )

        if isinstance(location, DeckSlotLocation):
            slot_name = location.slotName
            module_model = None
        else:
            module = self._state_store.modules.get(location.moduleId)
            slot_name = module.location.slotName
            module_model = module.model

        offset = self._state_store.labware.find_applicable_labware_offset(
            definition_uri=definition_uri,
            location=LabwareOffsetLocation(
                slotName=slot_name,
                moduleModel=module_model,
            ),
        )

        return LoadedLabwareData(
            labware_id=labware_id,
            definition=definition,
            offsetId=(None if offset is None else offset.id),
        )

    async def load_pipette(
        self,
        pipette_name: PipetteName,
        mount: MountType,
        pipette_id: Optional[str],
    ) -> LoadedPipetteData:
        """Ensure the requested pipette is attached.

        Args:
            pipette_name: The pipette name.
            mount: The mount on which pipette must be attached.
            pipette_id: An optional identifier to assign the pipette. If None, an
                identifier will be generated.

        Returns:
            A LoadedPipetteData object.
        """
        other_mount = mount.other_mount()
        other_pipette = self._state_store.pipettes.get_by_mount(other_mount)

        cache_request = {mount.to_hw_mount(): pipette_name}
        if other_pipette is not None:
            cache_request[other_mount.to_hw_mount()] = other_pipette.pipetteName

        # TODO(mc, 2020-10-18): calling `cache_instruments` mirrors the
        # behavior of protocol_context.load_instrument, and is used here as a
        # pipette existence check
        # TODO(mc, 2021-04-16): reconcile PipetteName enum with PipetteName union
        try:
            await self._hardware_api.cache_instruments(cache_request)  # type: ignore[arg-type]  # noqa: E501
        except RuntimeError as e:
            raise FailedToLoadPipetteError(str(e)) from e

        pipette_id = pipette_id or self._model_utils.generate_id()

        return LoadedPipetteData(pipette_id=pipette_id)

    async def load_module(
        self, model: ModuleModels, location: DeckSlotLocation, module_id: Optional[str]
    ) -> LoadedModuleData:
        """Ensure the required module is attached.

        Args:
            model: The model name of the module.
            location: The deck location of the module
            module_id: Optional ID assigned to the module.
                       If None, an ID will be generated.

        Returns:
            A LoadedModuleData object
        """
        definition: ModuleDefinition
        try:
            # Try to use existing definition in state.
            definition = self._state_store.modules.get_definition_by_model(model)
        except ModuleDefinitionDoesNotExistError:
            definition = self._module_data_provider.get_module_definition(model)

        module_id = module_id or self._model_utils.generate_id()

        attached_mod_instance = await self._get_hardware_module(model)

        return LoadedModuleData(
            module_id=module_id,
            module_serial=attached_mod_instance.device_info.get("serial"),
            definition=definition,
        )

    async def _get_hardware_module(self, model: ModuleModels) -> AbstractModule:
        hw_model = module_model_from_string(model.value)
        model_type = resolve_module_type(hw_model)

        try:
            available, simulating = await self._hardware_api.find_modules(
                by_model=hw_model, resolved_type=model_type
            )
        except TypeError as e:
            raise ModuleNotAttachedError("Could not fetch modules attached") from e

        for mod in available:
            # TODO (spp, 2021-11-22: make this accept compatible module models)
            if mod.model() == model.value:
                if not self._state_store.modules.get_by_serial(
                    mod.device_info["serial"]
                ):
                    return mod

        if simulating:
            return simulating
        else:
            raise ModuleNotAttachedError("Requested module not found.")
