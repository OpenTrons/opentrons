import { LEFT, RIGHT } from '@opentrons/shared-data'
import { FLOWS, SECTIONS } from './constants'
import type { LoadedPipette } from '@opentrons/shared-data'
import type { Mount } from '/app/redux/pipettes/types'
import type { AttachedPipettesFromInstrumentsQuery } from '/app/resources/instruments'
import type { PipetteWizardStep } from './types'

const calibrateAlreadyAttachedPipetteOn = (
  mount: Mount
): PipetteWizardStep[] => [
  {
    section: SECTIONS.BEFORE_BEGINNING,
    mount,
    flowType: FLOWS.CALIBRATE,
  },
  {
    section: SECTIONS.ATTACH_PROBE,
    mount,
    flowType: FLOWS.CALIBRATE,
  },
  {
    section: SECTIONS.DETACH_PROBE,
    mount,
    flowType: FLOWS.CALIBRATE,
  },
  { section: SECTIONS.RESULTS, mount, flowType: FLOWS.CALIBRATE },
]

const detachNinetySixAndAttachSingleMountOn = (
  mount: Mount
): PipetteWizardStep[] => [
  {
    section: SECTIONS.BEFORE_BEGINNING,
    mount: LEFT,
    flowType: FLOWS.DETACH,
  },
  {
    section: SECTIONS.DETACH_PIPETTE,
    mount: LEFT,
    flowType: FLOWS.DETACH,
  },
  {
    section: SECTIONS.MOUNTING_PLATE,
    mount: LEFT,
    flowType: FLOWS.DETACH,
  },
  {
    section: SECTIONS.CARRIAGE,
    mount: LEFT,
    flowType: FLOWS.DETACH,
  },
  {
    section: SECTIONS.RESULTS,
    mount: LEFT,
    flowType: FLOWS.DETACH,
    nextMount: mount,
  },
  {
    section: SECTIONS.MOUNT_PIPETTE,
    mount,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.FIRMWARE_UPDATE,
    mount,
    flowType: FLOWS.ATTACH,
  },
  { section: SECTIONS.RESULTS, mount, flowType: FLOWS.ATTACH },
  {
    section: SECTIONS.ATTACH_PROBE,
    mount,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.DETACH_PROBE,
    mount,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.RESULTS,
    mount,
    flowType: FLOWS.CALIBRATE,
  },
]

const detachSingleMountAndAttachSingleMountOn = (
  mount: Mount
): PipetteWizardStep[] => [
  {
    section: SECTIONS.BEFORE_BEGINNING,
    mount,
    flowType: FLOWS.DETACH,
  },
  {
    section: SECTIONS.DETACH_PIPETTE,
    mount,
    flowType: FLOWS.DETACH,
  },
  { section: SECTIONS.RESULTS, mount, flowType: FLOWS.DETACH },
  {
    section: SECTIONS.MOUNT_PIPETTE,
    mount,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.FIRMWARE_UPDATE,
    mount,
    flowType: FLOWS.ATTACH,
  },
  { section: SECTIONS.RESULTS, mount, flowType: FLOWS.ATTACH },
  {
    section: SECTIONS.ATTACH_PROBE,
    mount,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.DETACH_PROBE,
    mount,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.RESULTS,
    mount,
    flowType: FLOWS.CALIBRATE,
  },
]

const detachTwoSingleMountsAndAttachNinetySix = (): PipetteWizardStep[] => [
  {
    section: SECTIONS.BEFORE_BEGINNING,
    mount: LEFT,
    flowType: FLOWS.DETACH,
  },
  {
    section: SECTIONS.DETACH_PIPETTE,
    mount: LEFT,
    flowType: FLOWS.DETACH,
  },
  {
    section: SECTIONS.RESULTS,
    mount: LEFT,
    flowType: FLOWS.DETACH,
    nextMount: RIGHT,
  },
  {
    section: SECTIONS.DETACH_PIPETTE,
    mount: RIGHT,
    flowType: FLOWS.DETACH,
  },
  {
    section: SECTIONS.RESULTS,
    mount: RIGHT,
    flowType: FLOWS.DETACH,
    nextMount: 'both',
  },
  {
    section: SECTIONS.CARRIAGE,
    mount: LEFT,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.MOUNTING_PLATE,
    mount: LEFT,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.MOUNT_PIPETTE,
    mount: LEFT,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.FIRMWARE_UPDATE,
    mount: LEFT,
    flowType: FLOWS.ATTACH,
  },
  { section: SECTIONS.RESULTS, mount: LEFT, flowType: FLOWS.ATTACH },
  {
    section: SECTIONS.ATTACH_PROBE,
    mount: LEFT,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.DETACH_PROBE,
    mount: LEFT,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.RESULTS,
    mount: LEFT,
    flowType: FLOWS.CALIBRATE,
  },
]

const detachSingleMountOnLeftAndAttachNinetySix = (): PipetteWizardStep[] => [
  {
    section: SECTIONS.BEFORE_BEGINNING,
    mount: LEFT,
    flowType: FLOWS.DETACH,
  },
  {
    section: SECTIONS.DETACH_PIPETTE,
    mount: LEFT,
    flowType: FLOWS.DETACH,
  },
  {
    section: SECTIONS.RESULTS,
    mount: LEFT,
    flowType: FLOWS.DETACH,
    nextMount: 'both',
  },
  {
    section: SECTIONS.CARRIAGE,
    mount: LEFT,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.MOUNTING_PLATE,
    mount: LEFT,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.MOUNT_PIPETTE,
    mount: LEFT,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.FIRMWARE_UPDATE,
    mount: LEFT,
    flowType: FLOWS.ATTACH,
  },
  { section: SECTIONS.RESULTS, mount: LEFT, flowType: FLOWS.ATTACH },
  {
    section: SECTIONS.ATTACH_PROBE,
    mount: LEFT,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.DETACH_PROBE,
    mount: LEFT,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.RESULTS,
    mount: LEFT,
    flowType: FLOWS.CALIBRATE,
  },
]

const detachSingleMountOnRightAndAttachNinetySix = (): PipetteWizardStep[] => [
  {
    section: SECTIONS.BEFORE_BEGINNING,
    mount: RIGHT,
    flowType: FLOWS.DETACH,
  },
  {
    section: SECTIONS.DETACH_PIPETTE,
    mount: RIGHT,
    flowType: FLOWS.DETACH,
  },
  {
    section: SECTIONS.RESULTS,
    mount: RIGHT,
    flowType: FLOWS.DETACH,
    nextMount: 'both',
  },
  {
    section: SECTIONS.CARRIAGE,
    mount: LEFT,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.MOUNTING_PLATE,
    mount: LEFT,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.MOUNT_PIPETTE,
    mount: LEFT,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.FIRMWARE_UPDATE,
    mount: LEFT,
    flowType: FLOWS.ATTACH,
  },
  { section: SECTIONS.RESULTS, mount: LEFT, flowType: FLOWS.ATTACH },
  {
    section: SECTIONS.ATTACH_PROBE,
    mount: LEFT,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.DETACH_PROBE,
    mount: LEFT,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.RESULTS,
    mount: LEFT,
    flowType: FLOWS.CALIBRATE,
  },
]

const fromEmptyGantryAttachNinetySix = (): PipetteWizardStep[] => [
  {
    section: SECTIONS.BEFORE_BEGINNING,
    mount: LEFT,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.CARRIAGE,
    mount: LEFT,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.MOUNTING_PLATE,
    mount: LEFT,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.MOUNT_PIPETTE,
    mount: LEFT,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.FIRMWARE_UPDATE,
    mount: LEFT,
    flowType: FLOWS.ATTACH,
  },
  { section: SECTIONS.RESULTS, mount: LEFT, flowType: FLOWS.ATTACH },
  {
    section: SECTIONS.ATTACH_PROBE,
    mount: LEFT,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.DETACH_PROBE,
    mount: LEFT,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.RESULTS,
    mount: LEFT,
    flowType: FLOWS.CALIBRATE,
  },
]

const fromEmptyMountAttachSingleMountOn = (
  mount: Mount
): PipetteWizardStep[] => [
  {
    section: SECTIONS.BEFORE_BEGINNING,
    mount,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.MOUNT_PIPETTE,
    mount,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.FIRMWARE_UPDATE,
    mount,
    flowType: FLOWS.ATTACH,
  },
  { section: SECTIONS.RESULTS, mount, flowType: FLOWS.ATTACH },
  {
    section: SECTIONS.ATTACH_PROBE,
    mount,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.DETACH_PROBE,
    mount,
    flowType: FLOWS.ATTACH,
  },
  {
    section: SECTIONS.RESULTS,
    mount,
    flowType: FLOWS.CALIBRATE,
  },
]
/**
+-------------+-----------------------------------------------+----------------------------------------------+-----------------------------------------------+
| requested > |96                                             |left                                          |right                                          |
|             |                                               |                                              |                                               |
| v attached  |                                               |                                              |                                               |
+-------------+-----------------------------------------------+----------------------------------------------+-----------------------------------------------+
| 96          | calibrateAlreadyAttachedPipetteOn(left)       | detachNinetySixAndAttachSingleMountOn(left)  | detachNinetySixAndAttachSingleMountOn(right)  |
+-------------+-----------------------------------------------+----------------------------------------------+-----------------------------------------------+
|             |                                               | calibrateAlreadyAttachedPipetteOn(left) or   | fromEmptyMountAttachSingleMountOn(right)      |
| left only   | detachSingleMountOnLeftAndAttachNinetySix()   | detachSingleMountAndAttachSingleMountOn(left)|                                               |
|             |                                               |                                              |                                               |
+-------------+-----------------------------------------------+----------------------------------------------+-----------------------------------------------+
|             |                                               |                                              | calibrateAlreadyAttachedPipetteOn(right) or   |
| right only  | detachSingleMountOnRightAndAttachNinetySix()  |fromEmptyMountAttachSingleMountOn(left)       | detachSingleMountAndAttachSingleMountOn(right)|
|             |                                               |                                              |                                               |
+-------------+-----------------------------------------------+----------------------------------------------+-----------------------------------------------+
| left and    |                                               | calibrateAlreadyAttachedPipetteOn(left) or   | calibrateAlreadyAttachedPipetteOn(right) or   |
| right       | detachTwoSingleMountsAndAttachNinetySix()     | detachSingleMountAndAttachSingleMountOn(left)| detachSingleMountAndAttachSingleMountOn(right)|
|             |                                               |                                              |                                               |
+-------------+-----------------------------------------------+----------------------------------------------+-----------------------------------------------+
|             |                                               |                                              |                                               |
| nothing     | fromEmptyGantryAttachNinetySix()              | fromEmptyMountAttachSingleMountOn(left)      | fromEmptyMountAttachSingleMountOn(right)      |
|             |                                               |                                              |                                               |
+-------------+-----------------------------------------------+----------------------------------------------+-----------------------------------------------+
 **/

export const getPipetteWizardStepsForProtocol = (
  attachedPipettes: AttachedPipettesFromInstrumentsQuery,
  pipetteInfo: LoadedPipette[],
  mount: Mount
): PipetteWizardStep[] | null => {
  const requiredPipette = pipetteInfo.find(pipette => pipette.mount === mount)
  const ninetySixChannelAttached =
    attachedPipettes[LEFT]?.instrumentName === 'p1000_96' ||
    attachedPipettes[LEFT]?.instrumentName === 'p200_96'
  const ninetySixChannelRequested =
    requiredPipette?.pipetteName === 'p1000_96' ||
    requiredPipette?.pipetteName === 'p200_96'

  if (requiredPipette == null) {
    //  return empty array if no pipette is required in the protocol
    return null
  } else if (
    requiredPipette?.pipetteName === attachedPipettes[mount]?.instrumentName
  ) {
    // return calibration flow if correct pipette is attached
    return calibrateAlreadyAttachedPipetteOn(mount)
  } else if (!ninetySixChannelRequested && ninetySixChannelAttached) {
    // 96-channel pipette attached and need to attach single mount pipette
    return detachNinetySixAndAttachSingleMountOn(mount)
  } else if (!ninetySixChannelRequested && attachedPipettes[mount] != null) {
    // Single mount pipette attached and need to attach new single mount pipette
    return detachSingleMountAndAttachSingleMountOn(mount)
  } else if (
    ninetySixChannelRequested &&
    attachedPipettes[LEFT] != null &&
    attachedPipettes[RIGHT] != null
  ) {
    // Single mount pipette attached to both mounts and need to attach 96-channel pipette
    return detachTwoSingleMountsAndAttachNinetySix()
  } else if (
    ninetySixChannelRequested &&
    attachedPipettes[LEFT] != null &&
    attachedPipettes[RIGHT] == null
  ) {
    // Single mount pipette attached to left mount and need to attach 96-channel pipette
    return detachSingleMountOnLeftAndAttachNinetySix()
  } else if (
    ninetySixChannelRequested &&
    attachedPipettes[LEFT] == null &&
    attachedPipettes[RIGHT] != null
  ) {
    // Single mount pipette attached to right mount and need to attach 96-channel pipette
    return detachSingleMountOnRightAndAttachNinetySix()
  } else {
    // if no pipette is attached to gantry

    if (ninetySixChannelRequested) {
      // Gantry empty and need to attach 96-channel pipette
      return fromEmptyGantryAttachNinetySix()
    } else {
      // Gantry empty and need to attach single mount pipette
      return fromEmptyMountAttachSingleMountOn(mount)
    }
  }
}
