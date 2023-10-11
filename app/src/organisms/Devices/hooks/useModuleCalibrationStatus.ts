import { useIsOT3 } from './useIsOT3'
import { useModuleRenderInfoForProtocolById } from './useModuleRenderInfoForProtocolById'
import { ProtocolCalibrationStatus } from './useRunCalibrationStatus'

export function useModuleCalibrationStatus(
  robotName: string,
  runId: string
): ProtocolCalibrationStatus {
  const isFlex = useIsOT3(robotName)
  const moduleRenderInfoForProtocolById = useModuleRenderInfoForProtocolById(
    robotName,
    runId
  )
  // only check module calibration for Flex
  if (!isFlex) {
    return { complete: true }
  }

  const moduleInfoKeys = Object.keys(moduleRenderInfoForProtocolById)
  if (moduleInfoKeys.length === 0) {
    return { complete: true }
  }
  const moduleData = moduleInfoKeys.map(
    key => moduleRenderInfoForProtocolById[key]
  )
  if (moduleData.some(m => m.attachedModuleMatch?.moduleOffset == null)) {
    return { complete: false, reason: 'calibrate_module_failure_reason' }
  } else {
    return { complete: true }
  }
}
