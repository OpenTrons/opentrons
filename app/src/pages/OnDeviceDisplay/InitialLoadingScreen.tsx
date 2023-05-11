import * as React from 'react'
import { Redirect } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  Flex,
  COLORS,
  SPACING,
  DIRECTION_COLUMN,
  ALIGN_CENTER,
  JUSTIFY_CENTER,
  Icon,
} from '@opentrons/components'
import { getOnDeviceDisplaySettings } from '../../redux/config'
import { getIsShellReady } from '../../redux/shell'

const getTargetPath = (
  isShellReady: boolean,
  unfinishedUnboxingFlowRoute: string | null
): string | null => {
  if (!isShellReady) {
    return null
  }
  if (unfinishedUnboxingFlowRoute != null) {
    return unfinishedUnboxingFlowRoute
  }

  return '/dashboard'
}
export function InitialLoadingScreen(): JSX.Element {
  const { unfinishedUnboxingFlowRoute } = useSelector(
    getOnDeviceDisplaySettings
  )
  const isShellReady = useSelector(getIsShellReady)
  const targetPath = getTargetPath(isShellReady, unfinishedUnboxingFlowRoute)

  return (
    <Flex
      backgroundColor={COLORS.darkBlack20}
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing40}
      alignItems={ALIGN_CENTER}
      justifyContent={JUSTIFY_CENTER}
      width="100%"
      height="100%"
    >
      <Icon name="ot-spinner" size="160px" spin color={COLORS.darkBlack70} />
      {targetPath != null && <Redirect exact from="/" to={targetPath} />}
    </Flex>
  )
}
