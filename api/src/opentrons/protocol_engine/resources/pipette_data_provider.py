"""Pipette config data providers."""
from dataclasses import dataclass

from opentrons_shared_data.pipette import dummy_model_for_name
from opentrons_shared_data.pipette.dev_types import PipetteName, PipetteModel

from opentrons.config.pipette_config import load as load_pipette_config, PipetteConfig

from ..types import FlowRates


@dataclass(frozen=True)
class LoadedStaticPipetteData:
    """Static pipette config data for load pipette."""

    model: str
    display_name: str
    min_volume: float
    max_volume: float
    channels: int
    flow_rates: FlowRates


def _return_static_pipette_data(config: PipetteConfig) -> LoadedStaticPipetteData:
    """Get the needed info from PipetteConfig and return it as a LoadedStaticPipetteData object."""
    return LoadedStaticPipetteData(
        model=config.model,
        display_name=config.display_name,
        min_volume=config.min_volume,
        max_volume=config.max_volume,
        channels=int(config.channels),
        flow_rates=FlowRates(
            default_blow_out=config.default_blow_out_flow_rates,
            default_aspirate=config.default_aspirate_flow_rates,
            default_dispense=config.default_dispense_flow_rates,
        ),
    )


def get_virtual_pipette_static_config(
    pipette_name: PipetteName,
) -> LoadedStaticPipetteData:
    """Get the config for a virtual pipette, given only the pipette name."""
    pipette_model = dummy_model_for_name(pipette_name)
    config = load_pipette_config(pipette_model)
    return _return_static_pipette_data(config)


def get_pipette_static_config(
    pipette_model: PipetteModel, pipette_serial: str
) -> LoadedStaticPipetteData:
    """Get the config for a pipette, given the actual model and pipette id."""
    config = load_pipette_config(pipette_model, pipette_serial)
    return _return_static_pipette_data(config)
