import type {
  AddressableAreaName,
  CommonCommandRunTimeInfo,
  CommonCommandCreateInfo,
  LabwareDefinition2,
  LabwareOffset,
  PipetteName,
  ModuleModel,
} from '../../js'

export interface LoadPipetteCreateCommand extends CommonCommandCreateInfo {
  commandType: 'loadPipette'
  params: LoadPipetteParams
}
export interface LoadPipetteRunTimeCommand
  extends CommonCommandRunTimeInfo,
    Omit<LoadPipetteCreateCommand, 'params'> {
  params: LoadPipetteParams & {
    pipetteName: PipetteName
  }
  result?: LoadPipetteResult
}
export interface LoadLabwareCreateCommand extends CommonCommandCreateInfo {
  commandType: 'loadLabware'
  params: LoadLabwareParams
}
export interface LoadLabwareRunTimeCommand
  extends CommonCommandRunTimeInfo,
    LoadLabwareCreateCommand {
  result?: LoadLabwareResult
}
export interface LoadLidCreateCommand extends CommonCommandCreateInfo {
  commandType: 'loadLid'
  params: LoadLidParams
}
export interface LoadLidRunTimeCommand
  extends CommonCommandRunTimeInfo,
    LoadLidCreateCommand {
  result?: LoadLidResult
}
export interface LoadLidStackCreateCommand extends CommonCommandCreateInfo {
  commandType: 'loadLidStack'
  params: LoadLidStackParams
}
export interface LoadLidStackRunTimeCommand
  extends CommonCommandRunTimeInfo,
    LoadLidStackCreateCommand {
  result?: LoadLidStackResult
}
export interface StackerRetriveCreateCommand extends CommonCommandCreateInfo {
  commandType: 'flexStacker/retrieve'
  params: StackerRetriveParams
}
export interface StackerRetriveRunTimeCommand
  extends CommonCommandRunTimeInfo,
    StackerRetriveCreateCommand {
  result?: StackerRetriveResult
}
export interface ReloadLabwareCreateCommand extends CommonCommandCreateInfo {
  commandType: 'reloadLabware'
  params: { labwareId: string }
}
export interface ReloadLabwareRunTimeCommand
  extends CommonCommandRunTimeInfo,
    ReloadLabwareCreateCommand {
  result?: ReloadLabwareResult
}
export interface MoveLabwareCreateCommand extends CommonCommandCreateInfo {
  commandType: 'moveLabware'
  params: MoveLabwareParams
}
export interface MoveLabwareRunTimeCommand
  extends CommonCommandRunTimeInfo,
    MoveLabwareCreateCommand {
  result?: MoveLabwareResult
}
export interface LoadModuleCreateCommand extends CommonCommandCreateInfo {
  commandType: 'loadModule'
  params: LoadModuleParams
}
export interface LoadModuleRunTimeCommand
  extends CommonCommandRunTimeInfo,
    Omit<LoadModuleCreateCommand, 'params'> {
  params: LoadModuleParams & {
    model: ModuleModel
  }
  result?: LoadModuleResult
}
export interface LoadLiquidCreateCommand extends CommonCommandCreateInfo {
  commandType: 'loadLiquid'
  params: LoadLiquidParams
}
export interface LoadLiquidRunTimeCommand
  extends CommonCommandRunTimeInfo,
    LoadLiquidCreateCommand {
  result?: LoadLiquidResult
}

export interface ConfigureNozzleLayoutCreateCommand
  extends CommonCommandCreateInfo {
  commandType: 'configureNozzleLayout'
  params: ConfigureNozzleLayoutParams
}

export interface ConfigureNozzleLayoutRunTimeCommand
  extends CommonCommandRunTimeInfo,
    ConfigureNozzleLayoutCreateCommand {
  result?: {}
}

export type SetupRunTimeCommand =
  | ConfigureNozzleLayoutRunTimeCommand
  | LoadPipetteRunTimeCommand
  | LoadLabwareRunTimeCommand
  | ReloadLabwareRunTimeCommand
  | LoadModuleRunTimeCommand
  | LoadLiquidRunTimeCommand
  | MoveLabwareRunTimeCommand
  | LoadLidRunTimeCommand
  | LoadLidStackRunTimeCommand
  | StackerRetriveRunTimeCommand

export type SetupCreateCommand =
  | ConfigureNozzleLayoutCreateCommand
  | LoadPipetteCreateCommand
  | LoadLabwareCreateCommand
  | ReloadLabwareCreateCommand
  | LoadModuleCreateCommand
  | LoadLiquidCreateCommand
  | MoveLabwareCreateCommand
  | LoadLidCreateCommand
  | LoadLidStackCreateCommand
  | StackerRetriveCreateCommand

export type LabwareLocation =
  | 'offDeck'
  | 'systemLocation'
  | { slotName: string }
  | { moduleId: string }
  | { labwareId: string }
  | { addressableAreaName: AddressableAreaName }

export type LoadedLabwareLocation = LabwareLocation | InStackerHopperLocation

export type OnDeckLabwareLocation =
  | { slotName: string }
  | { moduleId: string }
  | { labwareId: string }
  | { addressableAreaName: AddressableAreaName }

export type NonStackedLocation =
  | 'offDeck'
  | { slotName: string }
  | { moduleId: string }
  | { addressableAreaName: AddressableAreaName }

export interface ModuleLocation {
  slotName: string
}

export interface InStackerHopperLocation {
  kind: 'inStackerHopper'
  moduleId: string
}

export interface OnLabwareLocationSequenceComponent {
  kind: 'onLabware'
  labwareId: string
  lidId: string | null
}

export interface OnModuleLocationSequenceComponent {
  kind: 'onModule'
  moduleId: string
}

export interface OnAddressableAreaLocationSequenceComponent {
  kind: 'onAddressableArea'
  addressableAreaName: string
}

export interface NotOnDeckLocationSequenceComponent {
  kind: 'notOnDeck'
  logicalLocationName: 'offDeck' | 'systemLocation'
}

export interface OnCutoutFixtureLocationSequenceComponent {
  kind: 'onCutoutFixture'
  cutoutId: string
  possibleCutoutFixtureIds: string[]
}

export type LocationSequenceComponent =
  | OnLabwareLocationSequenceComponent
  | OnModuleLocationSequenceComponent
  | OnAddressableAreaLocationSequenceComponent
  | NotOnDeckLocationSequenceComponent
  | OnCutoutFixtureLocationSequenceComponent
  | InStackerHopperLocation

export type LabwareLocationSequence = LocationSequenceComponent[]

export interface LoadPipetteParams {
  pipetteName: string
  pipetteId: string
  mount: 'left' | 'right'
}
interface LoadPipetteResult {
  pipetteId: string
}
interface LoadLabwareParams {
  location: LabwareLocation
  version: number
  namespace: string
  loadName: string
  displayName?: string
  labwareId?: string
}
interface LoadLabwareResult {
  labwareId: string
  definition: LabwareDefinition2
  // todo(mm, 2024-08-19): This does not match the server-returned offsetId field.
  // Confirm nothing client-side is trying to use this, then replace it with offsetId.
  offset: LabwareOffset
  locationSequence?: LabwareLocationSequence
}
interface ReloadLabwareResult {
  labwareId: string
  offsetId?: string | null
  locationSequence?: LabwareLocationSequence
}

export type LabwareMovementStrategy =
  | 'usingGripper'
  | 'manualMoveWithPause'
  | 'manualMoveWithoutPause'

export interface MoveLabwareParams {
  labwareId: string
  newLocation: LabwareLocation
  strategy: LabwareMovementStrategy
}
interface MoveLabwareResult {
  offsetId: string
  eventualDestinationLocationSequence?: LabwareLocationSequence
  immediateDestinationLocationSequence?: LabwareLocationSequence
  originLocationSequence?: LabwareLocationSequence
}
interface LoadModuleParams {
  moduleId?: string
  location: ModuleLocation
  model: ModuleModel
}
interface LoadModuleResult {
  moduleId: string
}
interface LoadLiquidParams {
  liquidId: string
  labwareId: string
  volumeByWell: { [wellName: string]: number }
}
interface LoadLiquidResult {
  liquidId: string
}

export const COLUMN = 'COLUMN'
export const SINGLE = 'SINGLE'
export const ROW = 'ROW'
export const QUADRANT = 'QUADRANT'
export const ALL = 'ALL'

export type NozzleConfigurationStyle =
  | typeof COLUMN
  | typeof SINGLE
  | typeof ROW
  | typeof QUADRANT
  | typeof ALL

interface NozzleConfigurationParams {
  primaryNozzle?: string
  style: NozzleConfigurationStyle
}

export interface ConfigureNozzleLayoutParams {
  pipetteId: string
  configurationParams: NozzleConfigurationParams
}

interface LoadLidStackParams {
  location: LabwareLocation
  loadName: string
  namespace: string
  version: number
  quantity: number
}

interface StackerRetriveParams {
  moduleId: string
  labwareId?: string
  displayName?: string
  adapterId?: string
  lidId?: string
}

interface LoadLidStackResult {
  stackLabwareId: string
  labwareIds: string[]
  definition: LabwareDefinition2
  lidStackDefinition: LabwareDefinition2
  location: LabwareLocation
  stackLocationSequence?: LabwareLocationSequence
  locationSequences?: LabwareLocationSequence[]
}

interface StackerRetriveResult {
  stackLabwareId: string
  labwareIds: string[]
  definition: LabwareDefinition2
  location: LabwareLocation
  stackLocationSequence?: LabwareLocationSequence
  locationSequences?: LabwareLocationSequence[]
}

interface LoadLidParams {
  location: LabwareLocation
  loadName: string
  namespace: string
  version: number
}

interface LoadLidResult {
  labwareId: string
  definition: LabwareDefinition2
  locationSequence?: LabwareLocationSequence
}
