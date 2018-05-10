// @flow
import type {PauseFormData} from '../step-generation'
import type {StepIdType, StepType, TransferLikeStepType} from '../form-types'

// sections of the form that are expandable/collapsible
export type FormSectionState = {aspirate: boolean, dispense: boolean}
export type FormSectionNames = 'aspirate' | 'dispense'

export const END_STEP: '__end__' = '__end__' // Special ID of "End" pseudo-step.
// NOTE: explicit type annotation so that typeof END_STEP is `'__end__'` and not `string`

export type SubstepIdentifier = {|
  stepId: StepIdType,
  substepId: number
|} | null

export type NamedIngred = {|
  id: number,
  name: string
|}

export type NamedIngredsByLabware = {[labwareId: string]: {[well: string]: Array<NamedIngred>}}
export type NamedIngredsByLabwareAllSteps = Array<NamedIngredsByLabware>

export type StepItemSourceDestRow = {|
  substepId: number, // TODO should this be a string or is this ID properly a number?
  sourceIngredients?: Array<NamedIngred>,
  destIngredients?: Array<NamedIngred>,
  sourceWell?: ?string,
  destWell?: ?string
|}

export type StepItemSourceDestRowMulti = {|
  ...StepItemSourceDestRow,
  channelId: number
|}

export type TransferLikeSubstepItemSingleChannel = {|
  multichannel: false,
  stepType: TransferLikeStepType,
  parentStepId: StepIdType,
  rows: Array<{|
    ...StepItemSourceDestRow,
    substepId: number,
    volume?: number
  |}>
|}

export type TransferLikeSubstepItemMultiChannel = {|
  multichannel: true,
  stepType: 'transfer' | 'consolidate' | 'distribute',
  parentStepId: StepIdType,
  volume?: number, // uniform volume for all steps
  multiRows: Array<Array<StepItemSourceDestRowMulti>> // Array of arrays.
  // NOTE: "Row" means a tabular row on the steplist, NOT a "row" of wells on the deck
|}

export type TransferLikeSubstepItem = TransferLikeSubstepItemSingleChannel | TransferLikeSubstepItemMultiChannel

export type StepSubItemData =
  | TransferLikeSubstepItem
  | PauseFormData // Pause substep uses same data as processed form

export type StepItemData = {
  id: StepIdType,
  title: string,
  stepType: StepType,
  description?: ?string,
  sourceLabwareName?: ?string,
  destLabwareName?: ?string
}

export type StepItemsWithSubsteps = StepItemData & {
  substeps: StepSubItemData | null
}

export type SubSteps = {[StepIdType]: StepSubItemData | null}
