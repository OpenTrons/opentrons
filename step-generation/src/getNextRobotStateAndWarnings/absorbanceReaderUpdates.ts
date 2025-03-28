import { ABSORBANCE_READER_TYPE } from '@opentrons/shared-data'
import { getModuleState } from '../robotStateSelectors'
import type {
  AbsorbanceReaderInitializeParams,
  ModuleOnlyParams,
} from '@opentrons/shared-data'
import type {
  AbsorbanceReaderState,
  InvariantContext,
  RobotState,
  RobotStateAndWarnings,
} from '../types'

const _getAbsorbanceReaderState = (
  robotState: RobotState,
  module: string
): AbsorbanceReaderState | null => {
  const moduleState = getModuleState(robotState, module)

  if (moduleState.type === ABSORBANCE_READER_TYPE) {
    return moduleState
  } else {
    console.error(
      `Absorbance reader state updater expected ${module} moduleState to be absorbanceReader, but it was ${moduleState.type}`
    )
    return null
  }
}

export const forAbsorbanceReaderOpenLid = (
  params: ModuleOnlyParams,
  invariantContext: InvariantContext,
  robotStateAndWarnings: RobotStateAndWarnings
): void => {
  const { robotState } = robotStateAndWarnings
  const { moduleId } = params
  const moduleState = _getAbsorbanceReaderState(robotState, moduleId)

  if (moduleState != null) {
    moduleState.lidOpen = true
  }
}

export const forAbsorbanceReaderCloseLid = (
  params: ModuleOnlyParams,
  invariantContext: InvariantContext,
  robotStateAndWarnings: RobotStateAndWarnings
): void => {
  const { robotState } = robotStateAndWarnings
  const { moduleId } = params
  const moduleState = _getAbsorbanceReaderState(robotState, moduleId)

  if (moduleState != null) {
    moduleState.lidOpen = false
  }
}

export const forAbsorbanceReaderInitialize = (
  params: AbsorbanceReaderInitializeParams,
  invariantContext: InvariantContext,
  robotStateAndWarnings: RobotStateAndWarnings
): void => {
  const { robotState } = robotStateAndWarnings
  const {
    moduleId,
    measureMode,
    sampleWavelengths,
    referenceWavelength,
  } = params

  const moduleState = _getAbsorbanceReaderState(robotState, moduleId)
  if (moduleState != null) {
    moduleState.initialization = {
      mode: measureMode,
      wavelengths: sampleWavelengths,
      referenceWavelength,
    }
    moduleState.lidOpen = false
  }
}
