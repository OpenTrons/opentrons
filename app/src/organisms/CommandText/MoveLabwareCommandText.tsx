import { useTranslation } from 'react-i18next'
import type {
  CompletedProtocolAnalysis,
  MoveLabwareRunTimeCommand,
} from '@opentrons/shared-data/'
import { getLabwareName } from './utils'
import { getLoadedLabware } from './utils/accessors'
import { getLabwareDisplayLocation } from './utils/getLabwareDisplayLocation'

interface MoveLabwareCommandTextProps {
  command: MoveLabwareRunTimeCommand
  robotSideAnalysis: CompletedProtocolAnalysis
}
export function MoveLabwareCommandText(
  props: MoveLabwareCommandTextProps
): JSX.Element {
  const { t } = useTranslation('protocol_command_text')
  const { command, robotSideAnalysis } = props
  const { labwareId, newLocation, strategy } = command.params
  const oldLocation = getLoadedLabware(robotSideAnalysis, labwareId)?.location
  const newDisplayLocation = getLabwareDisplayLocation(
    robotSideAnalysis,
    newLocation,
    t
  )

  return strategy === 'usingGripper'
    ? t('move_labware_using_gripper', {
        labware: getLabwareName(robotSideAnalysis, labwareId),
        old_location:
          oldLocation != null
            ? getLabwareDisplayLocation(robotSideAnalysis, oldLocation, t)
            : '',
        new_location: newDisplayLocation,
      })
    : t('move_labware_manually', {
        labware: getLabwareName(robotSideAnalysis, labwareId),
        old_location:
          oldLocation != null
            ? getLabwareDisplayLocation(robotSideAnalysis, oldLocation, t)
            : '',
        new_location: newDisplayLocation,
      })
}
