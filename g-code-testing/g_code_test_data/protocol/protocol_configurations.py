from typing_extensions import Final

from opentrons.hardware_control.emulation.settings import Settings, SmoothieSettings

from g_code_test_data.g_code_configuration import ProtocolGCodeConfirmConfig
import pytest


###################
# Shared Settings #
###################

SWIFT_SMOOTHIE_SETTINGS = Settings(
    smoothie=SmoothieSettings(
        left={"model": "p20_single_v2.0", "id": "P20SV202020070101"},
        right={"model": "p300_multi_v2.1", "id": "P20SV202020070101"},
    )
)


S3_BASE: Final = "protocol"
"""Base path of files in s3."""

##################
# Configurations #
##################


BASIC_SMOOTHIE = ProtocolGCodeConfirmConfig(
    name='basic_smoothie',
    path="protocol/protocols/smoothie_protocol.py",
    s3_path=f"{S3_BASE}/basic_smoothie.txt",
    settings=Settings(
        smoothie=SmoothieSettings(
            left={"model": "p20_single_v2.0", "id": "P20SV202020070101"},
            right={"model": "p20_single_v2.0", "id": "P20SV202020070101"},
        )
    )
)

TWO_SINGLE_CHANNEL = ProtocolGCodeConfirmConfig(
    name='2_single_channel',
    path="protocol/protocols/2_single_channel_v2.py",
    s3_path=f"{S3_BASE}/2_single_channel.txt",
    settings=Settings(
        smoothie=SmoothieSettings(
            left={"model": "p20_single_v2.0", "id": "P20SV202020070101"},
            right={"model": "p300_single_v2.1", "id": "P20SV202020070101"},
        )
    )
)

TWO_MODULES = ProtocolGCodeConfirmConfig(
    name='2_modules',
    path="protocol/protocols/2_modules_1s_1m_v2.py",
    s3_path=f"{S3_BASE}/2_modules.txt",
    settings=Settings(
        smoothie=SmoothieSettings(
            left={"model": "p300_single_v2.1", "id": "P20SV202020070101"},
            right={"model": "p20_multi_v2.1", "id": "P20SV202020070101"},
        )
    )
)

SWIFT_SMOKE = ProtocolGCodeConfirmConfig(
    name='swift_smoke',
    path="protocol/protocols/swift_smoke.py",
    s3_path=f"{S3_BASE}/swift_smoke.txt",
    settings=SWIFT_SMOOTHIE_SETTINGS
)

SWIFT_TURBO = ProtocolGCodeConfirmConfig(
    name='swift_turbo',
    path="protocol/protocols/swift_turbo.py",
    s3_path=f"{S3_BASE}/swift_turbo.txt",
    settings=SWIFT_SMOOTHIE_SETTINGS
)

[
    configuration.add_mark(user_mark=pytest.mark.slow)
    for configuration
    in [TWO_MODULES, SWIFT_SMOKE, SWIFT_TURBO]
]

PROTOCOL_CONFIGURATIONS = [
    BASIC_SMOOTHIE,
    TWO_SINGLE_CHANNEL,
    TWO_MODULES,
    SWIFT_SMOKE,
    SWIFT_TURBO,
]

