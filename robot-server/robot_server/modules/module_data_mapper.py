"""Module identification and response data mapping."""
from typing import Annotated, List, Type, cast, Optional
from fastapi import Depends

from opentrons_shared_data.module import load_definition

from opentrons.hardware_control.modules import (
    LiveData,
    ModuleDataValidator,
    ModuleType,
    MagneticStatus,
    TemperatureStatus,
    HeaterShakerStatus,
    SpeedStatus,
    AbsorbanceReaderStatus,
    PlatformState,
    StackerAxisState,
    FlexStackerStatus,
)
from opentrons.hardware_control.modules.magdeck import OFFSET_TO_LABWARE_BOTTOM
from opentrons.drivers.types import (
    ThermocyclerLidStatus,
    HeaterShakerLabwareLatchStatus,
    AbsorbanceReaderLidStatus,
    AbsorbanceReaderPlatePresence,
)
from opentrons.drivers.rpi_drivers.types import USBPort as HardwareUSBPort

from opentrons.hardware_control.modules.types import HopperDoorState, LatchState
from opentrons.protocol_engine import ModuleModel, DeckType

from .module_identifier import ModuleIdentity
from .module_models import (
    AttachedModule,
    AttachedModuleData,
    FlexStackerModule,
    FlexStackerModuleData,
    MagneticModule,
    MagneticModuleData,
    ModuleCalibrationData,
    TemperatureModule,
    TemperatureModuleData,
    ThermocyclerModule,
    ThermocyclerModuleData,
    HeaterShakerModule,
    HeaterShakerModuleData,
    AbsorbanceReaderModule,
    AbsorbanceReaderModuleData,
    UsbPort,
)

from robot_server.hardware import get_deck_type


class ModuleDataMapper:
    """Map hardware control modules to module response."""

    def __init__(self, deck_type: Annotated[DeckType, Depends(get_deck_type)]) -> None:
        self.deck_type = deck_type

    def map_data(
        self,
        model: str,
        module_identity: ModuleIdentity,
        has_available_update: bool,
        live_data: LiveData,
        usb_port: HardwareUSBPort,
        module_offset: Optional[ModuleCalibrationData],
    ) -> AttachedModule:
        """Map hardware control data to an attached module response."""
        module_model = ModuleModel(model)
        module_type = module_model.as_type()

        module_cls: Type[AttachedModule]
        module_data: AttachedModuleData
        module_definition = load_definition(model_or_loadname=model, version="3")

        # rely on Pydantic to check/coerce data fields from dicts at run time
        if module_type == ModuleType.MAGNETIC:
            module_cls = MagneticModule
            assert ModuleDataValidator.is_magnetic_module_data(live_data["data"])
            live_data_height = live_data["data"].get("height")
            assert isinstance(
                live_data_height, (int, float)
            ), f"Expected magnetic module height, got {live_data_height}"

            # Origin of height reported by hardware API is the magnet home
            # Origin we report to the user should be labware bottom
            # Also, magnetic module v1 reports height in half millimeters
            height_from_base = live_data_height - OFFSET_TO_LABWARE_BOTTOM[model]
            if module_model == ModuleModel.MAGNETIC_MODULE_V1:
                height_from_base /= 2

            module_data = MagneticModuleData(
                status=MagneticStatus(live_data["status"]),
                engaged=cast(bool, live_data["data"].get("engaged")),
                height=height_from_base,
            )

        elif module_type == ModuleType.TEMPERATURE:
            module_cls = TemperatureModule
            assert ModuleDataValidator.is_temperature_module_data(live_data["data"])
            module_data = TemperatureModuleData(
                status=TemperatureStatus(live_data["status"]),
                targetTemperature=cast(float, live_data["data"].get("targetTemp")),
                currentTemperature=cast(float, live_data["data"].get("currentTemp")),
            )

        elif module_type == ModuleType.THERMOCYCLER:
            module_cls = ThermocyclerModule
            assert ModuleDataValidator.is_thermocycler_data(live_data["data"])
            module_data = ThermocyclerModuleData(
                status=TemperatureStatus(live_data["status"]),
                targetTemperature=cast(float, live_data["data"].get("targetTemp")),
                currentTemperature=cast(float, live_data["data"].get("currentTemp")),
                lidStatus=cast(ThermocyclerLidStatus, live_data["data"].get("lid")),
                lidTemperatureStatus=cast(
                    TemperatureStatus, live_data["data"].get("lidTempStatus")
                ),
                lidTemperature=cast(float, live_data["data"].get("lidTemp")),
                lidTargetTemperature=cast(float, live_data["data"].get("lidTarget")),
                holdTime=cast(float, live_data["data"].get("holdTime")),
                rampRate=cast(float, live_data["data"].get("rampRate")),
                currentCycleIndex=cast(int, live_data["data"].get("currentCycleIndex")),
                totalCycleCount=cast(int, live_data["data"].get("totalCycleCount")),
                currentStepIndex=cast(int, live_data["data"].get("currentStepIndex")),
                totalStepCount=cast(int, live_data["data"].get("totalStepCount")),
            )

        elif module_type == ModuleType.HEATER_SHAKER:
            module_cls = HeaterShakerModule
            assert ModuleDataValidator.is_heater_shaker_data(live_data["data"])
            module_data = HeaterShakerModuleData(
                status=HeaterShakerStatus(live_data["status"]),
                labwareLatchStatus=cast(
                    HeaterShakerLabwareLatchStatus,
                    live_data["data"].get("labwareLatchStatus"),
                ),
                speedStatus=cast(SpeedStatus, live_data["data"].get("speedStatus")),
                currentSpeed=cast(int, live_data["data"].get("currentSpeed")),
                targetSpeed=cast(int, live_data["data"].get("targetSpeed")),
                temperatureStatus=cast(
                    TemperatureStatus, live_data["data"].get("temperatureStatus")
                ),
                currentTemperature=cast(float, live_data["data"].get("currentTemp")),
                targetTemperature=cast(float, live_data["data"].get("targetTemp")),
                errorDetails=cast(str, live_data["data"].get("errorDetails")),
            )
        elif module_type == ModuleType.ABSORBANCE_READER:
            assert ModuleDataValidator.is_absorbance_reader_data(live_data["data"])
            module_cls = AbsorbanceReaderModule
            module_data = AbsorbanceReaderModuleData(
                status=AbsorbanceReaderStatus(live_data["status"]),
                lidStatus=cast(
                    AbsorbanceReaderLidStatus, live_data["data"].get("lidStatus")
                ),
                platePresence=cast(
                    AbsorbanceReaderPlatePresence,
                    live_data["data"].get("platePresence"),
                ),
                measureMode=cast(str, live_data["data"].get("measureMode")),
                sampleWavelengths=cast(
                    List[int], live_data["data"].get("sampleWavelengths")
                ),
                referenceWavelength=cast(
                    int, live_data["data"].get("referenceWavelength")
                ),
            )
        elif module_type == ModuleType.FLEX_STACKER:
            module_cls = FlexStackerModule
            assert ModuleDataValidator.is_flex_stacker_data(live_data["data"])
            module_data = FlexStackerModuleData(
                status=FlexStackerStatus(live_data["status"]),
                latchState=cast(LatchState, live_data["data"].get("latchState")),
                platformState=cast(
                    PlatformState, live_data["data"].get("platformState")
                ),
                hopperDoorState=cast(
                    HopperDoorState, live_data["data"].get("hopperDoorState")
                ),
                axisStateX=cast(StackerAxisState, live_data["data"].get("axisStateX")),
                axisStateZ=cast(StackerAxisState, live_data["data"].get("axisStateZ")),
            )
        else:
            assert False, f"Invalid module type {module_type}"

        return module_cls(
            id=module_identity.module_id,
            serialNumber=module_identity.serial_number,
            firmwareVersion=module_identity.firmware_version,
            hardwareRevision=module_identity.hardware_revision,
            hasAvailableUpdate=has_available_update,
            compatibleWithRobot=(
                not (self.deck_type.value in module_definition["incompatibleWithDecks"])
            ),
            usbPort=UsbPort(
                port=usb_port.port_number,
                portGroup=usb_port.port_group,
                hub=usb_port.hub,
                hubPort=usb_port.hub_port,
                path=usb_port.device_path,
            ),
            # types of below fields are already checked at runtime
            moduleType=module_type,  # type: ignore[arg-type]
            moduleModel=module_model,  # type: ignore[arg-type]
            data=module_data,  # type: ignore[arg-type]
            moduleOffset=module_offset,
        )
