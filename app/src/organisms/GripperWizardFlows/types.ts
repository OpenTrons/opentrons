import type { useCreateCommandMutation } from '@opentrons/react-api-client'
import type { Vector3D, CreateCommand } from '@opentrons/shared-data'
import type {
  SECTIONS,
  GRIPPER_FLOW_TYPES,
  MOVE_PIN_FROM_FRONT_JAW_TO_REAR_JAW,
  MOVE_PIN_TO_FRONT_JAW,
  REMOVE_PIN_FROM_REAR_JAW,
  SUCCESSFULLY_ATTACHED,
  SUCCESSFULLY_ATTACHED_AND_CALIBRATED,
  SUCCESSFULLY_DETACHED,
  SUCCESSFULLY_CALIBRATED,
} from './constants'

export type GripperWizardStep =
  | BeforeBeginningStep
  | MovePinStep
  | MountGripperStep
  | FirmwareUpdateStep
  | UnmountGripperStep
  | SuccessStep

export type GripperWizardFlowType =
  | typeof GRIPPER_FLOW_TYPES.ATTACH
  | typeof GRIPPER_FLOW_TYPES.DETACH
  | typeof GRIPPER_FLOW_TYPES.RECALIBRATE

export interface BeforeBeginningStep {
  section: typeof SECTIONS.BEFORE_BEGINNING
}
export interface MovePinStep {
  section: typeof SECTIONS.MOVE_PIN
  movement:
    | typeof MOVE_PIN_TO_FRONT_JAW
    | typeof MOVE_PIN_FROM_FRONT_JAW_TO_REAR_JAW
    | typeof REMOVE_PIN_FROM_REAR_JAW
}
export interface MountGripperStep {
  section: typeof SECTIONS.MOUNT_GRIPPER
}
export interface UnmountGripperStep {
  section: typeof SECTIONS.UNMOUNT_GRIPPER
}
export interface FirmwareUpdateStep {
  section: typeof SECTIONS.FIRMWARE_UPDATE
}
export interface SuccessStep {
  section: typeof SECTIONS.SUCCESS
  successfulAction:
    | typeof SUCCESSFULLY_ATTACHED
    | typeof SUCCESSFULLY_ATTACHED_AND_CALIBRATED
    | typeof SUCCESSFULLY_DETACHED
    | typeof SUCCESSFULLY_CALIBRATED
}

export interface RegisterJawOffsetAction {
  jaw: 'front' | 'rear'
  offset: Vector3D | null
}

type CreateCommandMutate = ReturnType<
  typeof useCreateCommandMutation
>['createCommand']
export type CreateRunCommand = (
  params: Parameters<CreateCommandMutate>,
  options?: Parameters<CreateCommandMutate>[1]
) => ReturnType<CreateCommandMutate>

export interface GripperWizardStepProps {
  flowType: GripperWizardFlowType
  proceed: () => void
  goBack: () => void
  chainRunCommands?: (
    commands: CreateCommand[],
    continuePastCommandFailure: boolean
  ) => Promise<unknown>
  isRobotMoving: boolean
  maintenanceRunId?: string
  attachedGripper: {} | null
  errorMessage: string | null
  setErrorMessage: (message: string | null) => void
}
