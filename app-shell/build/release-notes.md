# Opentrons App Changes from 3.13.2 to 3.14.0

For more details about this release, please see the full [technical change log][changelog]

**Note for macOS users**: The Opentrons App is no longer compatible with macOS 10.9 Mavericks. If you are using 10.9, please upgrade to a later version of macOS (available for free from Apple) to continue to receive Opentrons updates.

## Changes

- Our new generation of pipettes, labeled GEN2 Pipettes, now appear in the change pipettes dialog box. These pipettes will be coming soon.
- You can control your Temperature Module and Thermocycler from the Pipettes and Modules page outside of a protocol
- Changing certain advanced settings will prompt you to restart your robot


## Bug Fixes

- The Opentrons App will now disable the Run Start Button if your protocol is missing required modules or pipetttes.

[electron-6]: https://electronjs.org/releases/stable?version=6

## Known Issues

- The app's run log sometimes displays the wrong current run step ([#2047][2047])
- The app should prevent you from starting a pipette swap while a protocol is executing, but it does not ([#2020][2020])
- The app should warn you if you try to simulate a protocol without any valid steps, but it does not ([#3121][3121])
- When disconnecting and reconnecting to a running OT-2 that doesn't know what time it is, the app's displayed run time will be subtly wrong ([#3872][3872])


[changelog]: https://github.com/Opentrons/opentrons/blob/edge/CHANGELOG.md

[2047]: https://github.com/Opentrons/opentrons/issues/2047
[2020]: https://github.com/Opentrons/opentrons/issues/2020
[2676]: https://github.com/Opentrons/opentrons/issues/2676
[3121]: https://github.com/Opentrons/opentrons/issues/3121
[3872]: https://github.com/Opentrons/opentrons/issues/3872
[4202]: https://github.com/Opentrons/opentrons/issues/4202
