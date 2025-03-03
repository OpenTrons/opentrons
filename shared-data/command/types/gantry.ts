import type { CommonCommandRunTimeInfo, CommonCommandCreateInfo } from '.'
import type { AddressableAreaName } from '../../deck'
import type { WellLocation } from './support'
import type {
  Vector3D,
  MotorAxes,
  MotorAxis,
  GantryMount,
} from '../../js/types'

export interface MoveToSlotCreateCommand extends CommonCommandCreateInfo {
  commandType: 'moveToSlot'
  params: MoveToSlotParams
}
export interface MoveToSlotRunTimeCommand
  extends CommonCommandRunTimeInfo,
    MoveToSlotCreateCommand {
  result?: {}
}
export interface MoveToWellCreateCommand extends CommonCommandCreateInfo {
  commandType: 'moveToWell'
  params: MoveToWellParams
}
export interface MoveToWellRunTimeCommand
  extends CommonCommandRunTimeInfo,
    MoveToWellCreateCommand {
  result?: {}
}
export interface MoveToCoordinatesCreateCommand
  extends CommonCommandCreateInfo {
  commandType: 'moveToCoordinates'
  params: MoveToCoordinatesParams
}
export interface MoveToCoordinatesRunTimeCommand
  extends CommonCommandRunTimeInfo,
    MoveToCoordinatesCreateCommand {
  result?: {}
}
export interface MoveRelativeCreateCommand extends CommonCommandCreateInfo {
  commandType: 'moveRelative'
  params: MoveRelativeParams
}
export interface MoveRelativeRunTimeCommand
  extends CommonCommandRunTimeInfo,
    MoveRelativeCreateCommand {
  result?: {
    position: Vector3D
  }
}
export interface SavePositionCreateCommand extends CommonCommandCreateInfo {
  commandType: 'savePosition'
  params: SavePositionParams
}
export interface SavePositionRunTimeCommand
  extends CommonCommandRunTimeInfo,
    SavePositionCreateCommand {
  result?: {
    positionId: string
    position: Vector3D
  }
}
export interface HomeCreateCommand extends CommonCommandCreateInfo {
  commandType: 'home'
  params: HomeParams
}
export interface HomeRunTimeCommand
  extends CommonCommandRunTimeInfo,
    HomeCreateCommand {
  result?: {}
}

export interface RetractAxisCreateCommand extends CommonCommandCreateInfo {
  commandType: 'retractAxis'
  params: RetractAxisParams
}
export interface RetractAxisRunTimeCommand
  extends CommonCommandRunTimeInfo,
    RetractAxisCreateCommand {
  result?: {}
}

export interface MoveToAddressableAreaCreateCommand
  extends CommonCommandCreateInfo {
  commandType: 'moveToAddressableArea'
  params: MoveToAddressableAreaParams
}
export interface MoveToAddressableAreaRunTimeCommand
  extends CommonCommandRunTimeInfo,
    MoveToAddressableAreaCreateCommand {
  //  TODO(jr, 11/6/23): add to result type
  result?: {}
}

export type GantryRunTimeCommand =
  | HomeRunTimeCommand
  | MoveRelativeRunTimeCommand
  | MoveToAddressableAreaRunTimeCommand
  | MoveToCoordinatesRunTimeCommand
  | MoveToSlotRunTimeCommand
  | MoveToWellRunTimeCommand
  | RetractAxisRunTimeCommand
  | SavePositionRunTimeCommand

export type GantryCreateCommand =
  | HomeCreateCommand
  | MoveRelativeCreateCommand
  | MoveToAddressableAreaCreateCommand
  | MoveToCoordinatesCreateCommand
  | MoveToSlotCreateCommand
  | MoveToWellCreateCommand
  | RetractAxisCreateCommand
  | SavePositionCreateCommand
interface MoveToSlotParams {
  pipetteId: string
  slotName: string
  offset?: {
    x: number
    y: number
    z: number
  }
  minimumZHeight?: number
  forceDirect?: boolean
}

export interface MoveToWellParams {
  pipetteId: string
  labwareId: string
  wellName: string
  wellLocation?: WellLocation
  minimumZHeight?: number
  forceDirect?: boolean
}

interface MoveToCoordinatesParams {
  pipetteId: string
  coordinates: {
    x: number
    y: number
    z: number
  }
  minimumZHeight?: number
  forceDirect?: boolean
}

interface MoveRelativeParams {
  pipetteId: string
  axis: 'x' | 'y' | 'z'
  distance: number
}

interface SavePositionParams {
  pipetteId: string // pipette to use in measurement
  positionId?: string // position ID, auto-assigned if left blank
  failOnNotHomed?: boolean // Defaults to true if blank. Require every possible axis to be homed to save.
}

interface HomeParams {
  axes?: MotorAxes
  skipIfMountPositionOk?: GantryMount // If specified, only home if position invalid
}

interface RetractAxisParams {
  axis: MotorAxis
}

export interface AddressableOffsetVector {
  x: number
  y: number
  z: number
}
export interface MoveToAddressableAreaParams {
  pipetteId: string
  addressableAreaName: AddressableAreaName
  offset: AddressableOffsetVector
  speed?: number
  minimumZHeight?: number
  forceDirect?: boolean
  stayAtHighestPossibleZ?: boolean
}
