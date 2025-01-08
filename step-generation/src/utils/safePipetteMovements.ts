import {
  FLEX_ROBOT_TYPE,
  SINGLE,
  THERMOCYCLER_MODULE_TYPE,
  getAddressableAreaFromSlotId,
  getDeckDefFromRobotType,
  getFlexSurroundingSlots,
  getPositionFromSlotId,
} from '@opentrons/shared-data'
import type {
  AddressableArea,
  CoordinateTuple,
  ModuleModel,
  NozzleConfigurationStyle,
} from '@opentrons/shared-data'
import type {
  RobotState,
  InvariantContext,
  PipetteEntity,
  ModuleEntities,
  LabwareEntity,
} from '../types'

const A12_column_front_left_bound = { x: -11.03, y: 2 }
const A12_column_back_right_bound = { x: 526.77, y: 506.2 }
export const PRIMARY_NOZZLE = 'A12'
const FLEX_TC_LID_COLLISION_ZONE = {
  back_left: { x: -43.25, y: 454.9, z: 211.91 },
  front_right: { x: 128.75, y: 402, z: 211.91 },
}
const FLEX_TC_LID_BACK_LEFT_PT = {
  x: FLEX_TC_LID_COLLISION_ZONE.back_left.x,
  y: FLEX_TC_LID_COLLISION_ZONE.back_left.y,
  z: FLEX_TC_LID_COLLISION_ZONE.back_left.z,
}

const FLEX_TC_LID_FRONT_RIGHT_PT = {
  x: FLEX_TC_LID_COLLISION_ZONE.front_right.x,
  y: FLEX_TC_LID_COLLISION_ZONE.front_right.y,
  z: FLEX_TC_LID_COLLISION_ZONE.front_right.z,
}

interface SlotInfo {
  addressableArea: AddressableArea | null
  position: CoordinateTuple | null
}
export interface Point {
  x: number
  y: number
  z?: number
}

//  check if nozzle(s) are inbounds
const getIsWithinPipetteExtents = (
  location: Point,
  nozzleConfiguration: NozzleConfigurationStyle,
  primaryNozzle: string
): boolean => {
  if (nozzleConfiguration === 'COLUMN' && primaryNozzle === 'A12') {
    const isWithinBounds =
      A12_column_front_left_bound.x <= location.x &&
      location.x <= A12_column_back_right_bound.x &&
      A12_column_front_left_bound.y <= location.y &&
      location.y <= A12_column_back_right_bound.y

    return isWithinBounds
  } else {
    // TODO: Handle other configurations such as 8-channel partial tip, and eventually all pipettes.
    return true
  }
}

// return pipette bounds at a sepcific position
// note that this calculation is pessimistic to mirror behavior on protocol engine
// the returned plane is defined by the z-height of the empty nozzles (lowest case scenario)
// and the x-y bounds defined by the outer-most bounds of the pipette
const getPipetteBoundsAtSpecifiedMoveToPosition = (
  pipetteEntity: PipetteEntity,
  tipLength: number,
  wellTargetPoint: Point,
  primaryNozzle: string // hardcoding A12 becasue only column pick up supported currently
): Point[] => {
  const {
    nozzleMap,
    nozzleOffset,
    pipetteBoundingBoxOffsets,
  } = pipetteEntity.spec
  const primaryNozzlePoint =
    nozzleMap == null || primaryNozzle == null
      ? nozzleOffset
      : nozzleMap[primaryNozzle]
  const pipetteBoundingBoxLeftXOffset =
    pipetteBoundingBoxOffsets.backLeftCorner[0]
  const pipetteBoundingBoxRightXOffset =
    pipetteBoundingBoxOffsets.frontRightCorner[0]
  const pipetteBoundingBoxBackYOffset =
    pipetteBoundingBoxOffsets.backLeftCorner[1]
  const pipetteBoundingBoxFrontYOffset =
    pipetteBoundingBoxOffsets.frontRightCorner[1]
  const leftX =
    wellTargetPoint.x - (primaryNozzlePoint[0] - pipetteBoundingBoxLeftXOffset)
  const rightX =
    wellTargetPoint.x + (pipetteBoundingBoxRightXOffset - primaryNozzlePoint[0])
  const backY =
    wellTargetPoint.y + (pipetteBoundingBoxBackYOffset - primaryNozzlePoint[1])
  const frontY =
    wellTargetPoint.y - (primaryNozzlePoint[1] - pipetteBoundingBoxFrontYOffset)

  const tipOverlapOnNozzle = 0
  const zNozzles = (wellTargetPoint.z ?? 0) + tipLength - tipOverlapOnNozzle

  const backLeftBound = { x: leftX, y: backY, z: zNozzles }
  const frontRightBound = { x: rightX, y: frontY, z: zNozzles }
  const backRightBound = { x: rightX, y: backY, z: zNozzles }
  const frontLeftBound = { x: leftX, y: frontY, z: zNozzles }
  return [backLeftBound, frontRightBound, backRightBound, frontLeftBound]
}

//  return whether the two provided rectangles are overlapping in the 2d space.
const getHasOverlappingRectangles = (
  rectangle1: Point[],
  rectangle2: Point[]
): boolean => {
  const oneLeftOfTwo = rectangle1[1].x < rectangle2[0].x
  const oneRightOfTwo = rectangle1[0].x > rectangle2[1].x
  const oneUnderTwo = rectangle1[0].y < rectangle2[1].y
  const oneOverTwo = rectangle1[1].y > rectangle2[0].y

  return !(oneLeftOfTwo || oneRightOfTwo || oneUnderTwo || oneOverTwo)
}

const getModuleHeightFromDeckDefinition = (
  moduleModel: ModuleModel
): number => {
  const deckDef = getDeckDefFromRobotType(FLEX_ROBOT_TYPE)
  const { addressableAreas } = deckDef.locations
  const moduleAddressableArea = addressableAreas.find(addressableArea =>
    addressableArea.id.includes(moduleModel)
  )
  return moduleAddressableArea?.offsetFromCutoutFixture[2] ?? 0
}

//  check the highest Z-point of all items stacked given a deck slot (including modules,
//  adapters, and modules on adapters)
const getHighestZInSlot = (
  robotState: RobotState,
  invariantContext: InvariantContext,
  slotId: string
): number => {
  const { modules, labware } = robotState
  const { moduleEntities, labwareEntities } = invariantContext

  let totalHeight: number = 0
  const moduleInSlot = Object.keys(modules).find(
    moduleId => modules[moduleId].slot === slotId
  )
  // module in slot
  if (moduleInSlot != null) {
    totalHeight += getModuleHeightFromDeckDefinition(
      moduleEntities[moduleInSlot].model
    )
    const moduleDirectChildId = Object.keys(labware).find(
      lwId => labware[lwId].slot === moduleInSlot
    )
    if (moduleDirectChildId != null) {
      const moduleChildHeight =
        labwareEntities[moduleDirectChildId].def.dimensions.zDimension
      totalHeight += moduleChildHeight

      // check if adapter is on module and has child
      const moduleGrandchildId = Object.keys(labware).find(
        lwId => labware[lwId].slot === moduleDirectChildId
      )
      if (moduleGrandchildId != null) {
        const moduleGrandchildHeight =
          labwareEntities[moduleGrandchildId].def.dimensions.zDimension
        totalHeight += moduleGrandchildHeight
      }
    }
  } else {
    const labwareInSlotId = Object.keys(labware).find(
      lwId => labware[lwId].slot === slotId
    )
    if (labwareInSlotId != null) {
      const slotDirectChild = labwareEntities[labwareInSlotId]
      const slotDirectChildHeight = slotDirectChild.def.dimensions.zDimension
      totalHeight += slotDirectChildHeight

      // check if adapter and has child
      const slotGrandchildId = Object.keys(labware).find(
        lwId => labware[lwId].slot === labwareInSlotId
      )
      if (slotGrandchildId != null) {
        const slotGrandchildHeight =
          labwareEntities[slotGrandchildId].def.dimensions.zDimension
        totalHeight += slotGrandchildHeight
      }
    }
  }
  return totalHeight
}

//  check if the slot overlaps with the pipette position
const getSlotHasPotentialCollidingObject = (
  pipetteBounds: Point[],
  slotInfo: SlotInfo[],
  robotState: RobotState,
  invariantContext: InvariantContext,
  labwareId: string
): boolean => {
  for (const slot of slotInfo) {
    const slotBounds = slot.addressableArea?.boundingBox
    const slotPosition = slot.position

    // If slotPosition or slotBounds is null, continue to the next iteration
    if (slotPosition == null || slotBounds == null) {
      continue
    }

    const backLeftCoords = {
      x: slotPosition[0],
      y: slotBounds.yDimension + slotPosition[1],
      z: slotPosition[2],
    }
    const frontRightCoords = {
      x: slotPosition[0] + slotBounds.xDimension,
      y: slotPosition[1],
      z: slotPosition[2],
    }
    // Check for overlapping rectangles and pipette z-coordinate if slot overlaps with pipette bounds
    if (
      getHasOverlappingRectangles(
        [pipetteBounds[0], pipetteBounds[1]],
        [backLeftCoords, frontRightCoords]
      ) &&
      pipetteBounds[0].z != null
    ) {
      const highestZInSurroundingSlot =
        slot.addressableArea?.id != null
          ? getHighestZInSlot(
              robotState,
              invariantContext,
              slot.addressableArea.id
            )
          : 0
      return highestZInSurroundingSlot >= pipetteBounds[0]?.z
    }
  }
  return false
}

const getWillCollideWithThermocyclerLid = (
  pipetteBounds: Point[],
  moduleEntities: ModuleEntities
): boolean => {
  if (
    Object.values(moduleEntities).find(
      module => module.type === THERMOCYCLER_MODULE_TYPE
    )
  ) {
    return (
      getHasOverlappingRectangles(
        [FLEX_TC_LID_BACK_LEFT_PT, FLEX_TC_LID_FRONT_RIGHT_PT],
        [pipetteBounds[0], pipetteBounds[1]]
      ) && pipetteBounds[0].x <= FLEX_TC_LID_BACK_LEFT_PT.z
    )
  } else {
    return false
  }
}

const getWellPosition = (
  labwareEntity: LabwareEntity,
  wellName: string,
  wellLocationOffset: Point,
  addressableAreaOffset: CoordinateTuple | null,
  hasTip: boolean
): Point => {
  const { wells } = labwareEntity.def
  //  getting location from the bottom of the well since PD only supports aspirate/dispense from bottom
  //  note: api includes calibration data here which PD does not have knowledge of at the moment
  const wellDef = wells[wellName]
  return {
    x: wellDef.x + wellLocationOffset.x + (addressableAreaOffset?.[0] ?? 0),
    y: wellDef.y + wellLocationOffset.y + (addressableAreaOffset?.[1] ?? 0),
    z: hasTip
      ? wellDef.z +
        (wellLocationOffset.z ?? 0) +
        (addressableAreaOffset?.[2] ?? 0)
      : labwareEntity.def.dimensions.zDimension,
  }
}

//  util to use in step-generation for if the pipette movement is safe
export const getIsSafePipetteMovement = (
  nozzleConfiguation: NozzleConfigurationStyle | null,
  robotState: RobotState,
  invariantContext: InvariantContext,
  pipetteId: string,
  labwareId: string,
  tipRackDefURI: string,
  wellLocationOffset: Point,
  wellTargetName?: string
): boolean => {
  const deckDefinition = getDeckDefFromRobotType(FLEX_ROBOT_TYPE)
  const {
    pipetteEntities,
    labwareEntities,
    additionalEquipmentEntities,
    moduleEntities,
  } = invariantContext
  const { labware: labwareState, tipState } = robotState

  //  early exit if labwareId is a trashBin or wasteChute or if no nozzle is provided
  if (
    labwareEntities[labwareId] == null ||
    wellTargetName == null ||
    nozzleConfiguation == null
  ) {
    return true
  }

  const tiprackEntityId = Object.keys(labwareEntities).find(lwKey =>
    lwKey.includes(tipRackDefURI)
  )
  const tiprackTipLength =
    tiprackEntityId != null
      ? labwareEntities[tiprackEntityId].def.parameters.tipLength
      : 0
  const stagingAreaSlots = Object.values(additionalEquipmentEntities)
    .filter(ae => ae.name === 'stagingArea')
    .map(stagingArea => stagingArea.location as string)
  const pipetteEntity = pipetteEntities[pipetteId]
  const pipetteHasTip = tipState.pipettes[pipetteId]
  // account for tip length if picking up tip
  const tipLength = pipetteHasTip ? tiprackTipLength ?? 0 : 0
  const labwareSlot = labwareState[labwareId].slot
  const addressableAreaOffset = getPositionFromSlotId(
    labwareSlot,
    deckDefinition
  )
  const wellTargetPoint = getWellPosition(
    labwareEntities[labwareId],
    wellTargetName,
    wellLocationOffset,
    addressableAreaOffset,
    pipetteHasTip
  )
  let primaryNozzle = 'A12'
  if (nozzleConfiguation === SINGLE && pipetteEntity.spec.channels === 96) {
    primaryNozzle = 'H12'
  } else if (
    nozzleConfiguation === SINGLE &&
    pipetteEntity.spec.channels === 8
  ) {
    primaryNozzle = 'H1'
  }

  const isWithinPipetteExtents = getIsWithinPipetteExtents(
    wellTargetPoint,
    nozzleConfiguation,
    primaryNozzle
  )
  if (!isWithinPipetteExtents) {
    return false
  } else {
    const pipetteBoundsAtWellLocation = getPipetteBoundsAtSpecifiedMoveToPosition(
      pipetteEntity,
      tipLength,
      wellTargetPoint,
      primaryNozzle
    )
    const surroundingSlots = getFlexSurroundingSlots(
      labwareSlot,
      stagingAreaSlots
    )
    const slotInfos: SlotInfo[] = surroundingSlots.map(slot => {
      const addressableArea = getAddressableAreaFromSlotId(slot, deckDefinition)
      const position = getPositionFromSlotId(slot, deckDefinition)
      return {
        addressableArea,
        position,
      }
    })
    return (
      !getWillCollideWithThermocyclerLid(
        pipetteBoundsAtWellLocation,
        moduleEntities
      ) &&
      !getSlotHasPotentialCollidingObject(
        pipetteBoundsAtWellLocation,
        slotInfos,
        robotState,
        invariantContext,
        labwareId
      )
    )
  }
}
