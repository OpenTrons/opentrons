from typing_extensions import Final

from opentrons.hardware_control.emulation.settings import (
    Settings, SmoothieSettings, PipetteSettings
)
from g_code_test_data.g_code_configuration import ProtocolGCodeConfirmConfig
import pytest


###################
# Shared Settings #
###################

SWIFT_SMOOTHIE_SETTINGS = Settings(
    smoothie=SmoothieSettings(
        left=PipetteSettings(model="p20_single_v2.0", id="P20SV202020070101"),
        right=PipetteSettings(model="p300_multi_v2.1", id="P20SV202020070101"),
    ),
)

# Set up the temperature ramp.
SWIFT_SMOOTHIE_SETTINGS.thermocycler.lid_temperature.degrees_per_tick = 50
SWIFT_SMOOTHIE_SETTINGS.thermocycler.plate_temperature.degrees_per_tick = 50
SWIFT_SMOOTHIE_SETTINGS.tempdeck.temperature.degrees_per_tick = 50


DIRECTORY: Final = "protocols"
"""Base path of files in s3."""

##################
# Configurations #
##################

BASIC_SMOOTHIE = ProtocolGCodeConfirmConfig(
    name='basic_smoothie',
    path="protocol/protocols/fast/smoothie_protocol.py",
    results_path=f"{DIRECTORY}/basic_smoothie.txt",
    settings=Settings(
        smoothie=SmoothieSettings(
            left=PipetteSettings(model="p20_single_v2.0", id="P20SV202020070101"),
            right=PipetteSettings(model="p20_single_v2.0", id="P20SV202020070101"),
        )
    )
)

BECKMAN = ProtocolGCodeConfirmConfig(
    name="beckman_coulter_rna_advance_viral_rna_isolation",
    path="protocol/protocols/fast/beckman_coulter_rna_advance_viral_rna_isolation.py",
    results_path=f"{DIRECTORY}/beckman_coulter_rna_advance_viral_rna_isolation.txt",
    settings=Settings(
        smoothie=SmoothieSettings(
            left=PipetteSettings(model="p300_multi_v2.1", id="P20SV202020070101"),
            right=PipetteSettings(model="p20_multi_v2.1", id="P20SV202020070101")
        )
    )
)

CHERRY_PICKING = ProtocolGCodeConfirmConfig(
    name='cherrypicking',
    path="protocol/protocols/fast/cherrypicking.py",
    results_path=f"{DIRECTORY}/cherrypicking.txt",
    settings=Settings(
        smoothie=SmoothieSettings(
            left=PipetteSettings(model="p300_single_v2.1", id="P20SV202020070101"),
            right=PipetteSettings(model="p20_single_v2.0", id="P20SV202020070101"),
        )
    )
)

CUSTOMIZABLE_SERIAL_DILUTION = ProtocolGCodeConfirmConfig(
    name="customizable_serial_dilution_ot2",
    path="protocol/protocols/fast/customizable_serial_dilution_ot2.py",
    results_path=f"{DIRECTORY}/customizable_serial_dilution_ot2.txt",
    settings=Settings(
        smoothie=SmoothieSettings(
            left=PipetteSettings(model="p300_single_v2.1", id="P20SV202020070101"),
            right=PipetteSettings(model="p20_multi_v2.1", id="P20SV202020070101"),
        ),
    )
)

TWO_SINGLE_CHANNEL = ProtocolGCodeConfirmConfig(
    name='2_single_channel',
    path="protocol/protocols/fast/2_single_channel_v2.py",
    results_path=f"{DIRECTORY}/2_single_channel.txt",
    settings=Settings(
        smoothie=SmoothieSettings(
            left=PipetteSettings(model="p20_single_v2.0", id="P20SV202020070101"),
            right=PipetteSettings(model="p300_single_v2.1", id="P20SV202020070101"),
        )
    )
)

SET_MAX_SPEED = ProtocolGCodeConfirmConfig(
    name="set_max_speed",
    path="protocol/protocols/fast/set_max_speed.py",
    results_path=f"{DIRECTORY}/set_max_speed.txt",
    settings=SWIFT_SMOOTHIE_SETTINGS
)

TWO_MODULES = ProtocolGCodeConfirmConfig(
    name='2_modules',
    path="protocol/protocols/slow/2_modules_1s_1m_v2.py",
    results_path=f"{DIRECTORY}/2_modules.txt",
    settings=Settings(
        smoothie=SmoothieSettings(
            left=PipetteSettings(model="p300_single_v2.1", id="P20SV202020070101"),
            right=PipetteSettings(model="p20_multi_v2.1", id="P20SV202020070101"),
        ),
    )
)


OPENTRONS_LOGO = ProtocolGCodeConfirmConfig(
    name="opentrons_logo",
    path="protocol/protocols/fast/opentrons_logo.py",
    results_path=f"{DIRECTORY}/opentrons_logo.txt",
    settings=Settings(
        smoothie=SmoothieSettings(
            left=PipetteSettings(model="p20_multi_v2.1", id="P20SV202020070101"),
            right=PipetteSettings(model="p300_single_v2.1", id="P20SV202020070101"),
        ),
    )
)

OMEGA = ProtocolGCodeConfirmConfig(
    name="omega_biotek_magbind_totalpure_ngs",
    path="protocol/protocols/slow/omega_biotek_magbind_totalpure_ngs.py",
    results_path=f"{DIRECTORY}/omega_biotek_magbind_totalpure_ngs.txt",
    settings=Settings(
        smoothie=SmoothieSettings(
            left=PipetteSettings(model="p1000_single_v2.1", id="P20SV202020070101"),
            right=PipetteSettings(model="p300_single_v2.1", id="P20SV202020070101"),
        ),
    )
)

ILLUMINA = ProtocolGCodeConfirmConfig(
    name="illumina_nextera_xt_library_prep_part1",
    path="protocol/protocols/fast/illumina_nextera_xt_library_prep_part1.py",
    results_path=f"{DIRECTORY}/illumina_nextera_xt_library_prep_part1.txt",
    settings=Settings(
        smoothie=SmoothieSettings(
            left=PipetteSettings(model="p20_multi_v2.1", id="P20SV202020070101"),
            right=PipetteSettings(model="p20_single_v2.0", id="P20SV202020070101")
        )
    )
)

PCR_PREP_PART_1 = ProtocolGCodeConfirmConfig(
    name="pcr_prep_part_1",
    path="protocol/protocols/fast/pcr_prep_part_1.py",
    results_path=f"{DIRECTORY}/pcr_prep_part_1.txt",
    settings=Settings(
        smoothie=SmoothieSettings(
            left=PipetteSettings(model="p1000_single_v2.1", id="P20SV202020070101"),
            right=PipetteSettings(model="p1000_single_v2.1", id="P20SV202020070101")
        )
    )
)

PCR_PREP_PART_2 = ProtocolGCodeConfirmConfig(
    name="pcr_prep_part_2",
    path="protocol/protocols/fast/pcr_prep_part_2.py",
    results_path=f"{DIRECTORY}/pcr_prep_part_2.txt",
    settings=Settings(
        smoothie=SmoothieSettings(
            left=PipetteSettings(model="p300_multi_v2.1", id="P20SV202020070101"),
            right=PipetteSettings(model="p300_multi_v2.1", id="P20SV202020070101")
        )
    )
)

SWIFT_SMOKE = ProtocolGCodeConfirmConfig(
    name='swift_smoke',
    path="protocol/protocols/slow/swift_smoke.py",
    results_path=f"{DIRECTORY}/swift_smoke.txt",
    settings=SWIFT_SMOOTHIE_SETTINGS
)

SWIFT_TURBO = ProtocolGCodeConfirmConfig(
    name='swift_turbo',
    path="protocol/protocols/slow/swift_turbo.py",
    results_path=f"{DIRECTORY}/swift_turbo.txt",
    settings=SWIFT_SMOOTHIE_SETTINGS
)

SLOW_PROTOCOLS = [
    OMEGA,
    SWIFT_SMOKE,
    SWIFT_TURBO,
    TWO_MODULES,
]


for configuration in SLOW_PROTOCOLS:
    configuration.add_mark(user_mark=pytest.mark.slow)


FAST_PROTOCOLS = [
    BASIC_SMOOTHIE,
    BECKMAN,
    CHERRY_PICKING,
    CUSTOMIZABLE_SERIAL_DILUTION,
    ILLUMINA,
    OPENTRONS_LOGO,
    PCR_PREP_PART_1,
    PCR_PREP_PART_2,
    SET_MAX_SPEED,
    TWO_SINGLE_CHANNEL,
]

PROTOCOL_CONFIGURATIONS = SLOW_PROTOCOLS + FAST_PROTOCOLS
