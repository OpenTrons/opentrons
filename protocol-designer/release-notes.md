For more details about this release, please see the full [technical change
log][]. For a list of currently known issues, please see the [Opentrons issue tracker][].

[technical change log]: https://github.com/Opentrons/opentrons/releases
[opentrons issue tracker]: https://github.com/Opentrons/opentrons/issues?q=is%3Aopen+is%3Aissue+label%3Abug

By using Opentrons Protocol Designer, you agree to the Opentrons End-User License Agreement (EULA). You can view the EULA at [opentrons.com/eula](https://opentrons.com/eula).

---

## Opentrons Protocol Designer Changes in 8.4.3

**Welcome to Protocol Designer 8.4.3!**

This release adds support for drag and drop labware in Protocol Designer, and includes feature improvements and bug fixes.

When editing your protocol starting deck, click and drag to move any individual piece of labware to a new slot.

### Improvements

- To avoid deck conflicts with fixtures like the trash bin, add only one of each module in protocol setup. Click **Edit protocol** and **Protocol starting deck** to add and edit multiple modules as needed.
- See your protocol starting deck edits more easily with module highlighting when moving labware or editing a module step.

### Bug Fixes

- Protocol Designer always redirects to the protocol overview when you import an existing protocol from the home or settings page.
- When tip racks, labware, or modules aren't assigned to a transfer or module step, improved error recovery in Protocol Designer avoids a crash or unknown error.
- Protocol Designer displays an error for transfer or Flex gripper move steps with off-deck labware, and when a transfer volume exceeds the well limit.
- Touch tip is no longer available during a dispense into the trash bin.

Running a protocol created in Protocol Designer now requires Opentrons App version 8.3.0 or newer.

## Opentrons Protocol Designer Changes in 8.4.0

**Welcome to Protocol Designer 8.4.0!**

This release adds support for the Absorbance Plate Reader Module and includes feature improvements and bug fixes.

### Bug Fixes

- Move steps added to a Flex protocol now use the gripper by default.
- Use matching X and Y offset values to aspirate and dispense during a Mix step.

All protocols created in Protocol Designer now require version 8.2.0 or higher of the Opentrons App to run.

### New Features

**Absorbance Plate Reader Module GEN1**

You can add an Absorbance Plate Reader Module GEN1 to deck slots A3-D3 on the Flex. You'll also need to use a gripper to safely move the lid on and off the module.

To use the Absorbance Plate Reader Module in your Protocol Designer protocol, add the following steps:

- an Absorbance Plate Reader step to close the lid using the gripper
- an Absorbance Plate Reader step to initialize the module without labware inside. Choose from a single or multiple wavelengths.
- an Absorbance Plate Reader step to open the lid using the gripper
- a Move step to place a plate in the module. Using the gripper is optional.
- an Absorbance Plate Reader step to read the plate using the same wavelength choices.

Data from the Absorbance Plate Reader Module is exported as a .CSV file and can be found on your Flex's detail page in the Opentrons Desktop App. Repeat the steps shown above to open the lid and remove the plate.

---

## Opentrons Protocol Designer Changes in 8.3.0

Welcome to the v8.3.0 release of Opentrons Protocol Designer!

### New Features

- During step creation, labware and modules used are highlighted on the deck.

### Bug Fixes

- Custom labware can be added and moved onto its supported labware.

### Improved Features

- Touch tip and blow out copy is more precise.

---

## Opentrons Protocol Designer Changes in 8.2.2

Welcome to the v8.2.2 release of Opentrons Protocol Designer!

### Bug Fixes

- Fixed an error with the heater-shaker timer field where it would not save from an imported protocol.

### Improved Features

- The analytics modal is dismissible via the settings page for both previous and new users.

---

## Opentrons Protocol Designer Changes in 8.2.1

Welcome to the v8.2.1 release of Opentrons Protocol Designer!

### Bug Fixes

- Fixed blow out not saving when checking it in the form.

---

## Opentrons Protocol Designer Changes in 8.2.0

We’re excited to release the new Opentrons Protocol Designer, now with a fresh redesign! All protocols now require Opentrons App version 8.2.0+ to run. Enjoy the same functionality with the added ability to:

### New Features

- Add multiple Heater-Shaker Modules and Magnetic Blocks to the deck (Flex only).
