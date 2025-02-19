import type { UseFormReturn } from 'react-hook-form'
import type { FLEX_ROBOT_TYPE, OT2_ROBOT_TYPE } from '@opentrons/shared-data'
import type { NewProtocolFields } from '/protocol-designer/load-file'
import type {
  FormModules,
  FormPipettesByMount,
} from '/protocol-designer/step-forms'

export type AdditionalEquipment =
  | 'gripper'
  | 'wasteChute'
  | 'trashBin'
  | 'stagingArea'

export interface WizardFormState {
  fields: NewProtocolFields
  pipettesByMount: FormPipettesByMount
  modules: FormModules | null
  additionalEquipment: AdditionalEquipment[]
}

export interface WizardTileProps extends UseFormReturn<WizardFormState> {
  proceed: (stepsForward?: number) => void
  goBack: (stepsBack?: number) => void
}

export type PipetteType = 'single' | 'multi' | '96'
export type Gen = 'GEN1' | 'GEN2'

export interface PipetteInfo {
  label: string
  value: string
}

export type PipetteInfoByType = Record<PipetteType, PipetteInfo[]>
export type PipetteInfoByGen = Record<Gen, PipetteInfoByType[]>

export type PipetteVolumes = {
  [key in typeof FLEX_ROBOT_TYPE]?: PipetteInfoByType[]
} &
  { [key in typeof OT2_ROBOT_TYPE]?: PipetteInfoByGen[] }
