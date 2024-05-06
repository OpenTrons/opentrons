import * as React from 'react'
import { createPortal } from 'react-dom'
import { useSelector } from 'react-redux'

import {
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  POSITION_ABSOLUTE,
} from '@opentrons/components'

import { getIsOnDevice } from '../../redux/config'
import { getTopPortalEl } from '../../App/portal'
import { BeforeBeginning } from './BeforeBeginning'
import { SelectRecoveryOption, ResumeRun } from './RecoveryOptions'
import { ErrorRecoveryHeader } from './ErrorRecoveryHeader'
import { RecoveryInProgress } from './RecoveryInProgress'
import { getErrorKind, useRouteUpdateActions } from './utils'
import { RECOVERY_MAP } from './constants'

import type { IRecoveryMap, RecoveryContentProps } from './types'

interface ErrorRecoveryProps {
  onComplete: () => void
  errorType?: string
}
export function ErrorRecoveryFlows({
  onComplete,
  errorType,
}: ErrorRecoveryProps): JSX.Element {
  /**
   * Recovery Route: A logically-related collection of recovery steps or a single step if unrelated to any existing recovery route.
   * Recovery Step: Analogous to a "step" in other wizard flows.
   */
  const [recoveryMap, setRecoveryMap] = React.useState<IRecoveryMap>({
    route: RECOVERY_MAP.BEFORE_BEGINNING.ROUTE,
    step: RECOVERY_MAP.BEFORE_BEGINNING.STEPS.RECOVERY_DESCRIPTION,
  })

  const errorKind = getErrorKind(errorType)
  const isOnDevice = useSelector(getIsOnDevice)

  const routeUpdateActions = useRouteUpdateActions({
    recoveryMap,
    setRecoveryMap,
  })

  return (
    <ErrorRecoveryComponent
      errorKind={errorKind}
      onComplete={onComplete}
      isOnDevice={isOnDevice}
      recoveryMap={recoveryMap}
      routeUpdateActions={routeUpdateActions}
    />
  )
}

function ErrorRecoveryComponent(props: RecoveryContentProps): JSX.Element {
  return createPortal(
    <Flex
      flexDirection={DIRECTION_COLUMN}
      width="992px"
      height="568px"
      left="14.5px"
      top="16px"
      borderRadius={BORDERS.borderRadius12}
      position={POSITION_ABSOLUTE}
      backgroundColor={COLORS.white}
    >
      <ErrorRecoveryHeader errorKind={props.errorKind} />
      <ErrorRecoveryContent {...props} />
    </Flex>,
    getTopPortalEl()
  )
}

export function ErrorRecoveryContent(props: RecoveryContentProps): JSX.Element {
  const buildBeforeBeginning = (): JSX.Element => {
    return <BeforeBeginning {...props} />
  }

  const buildSelectRecoveryOption = (): JSX.Element => {
    return <SelectRecoveryOption {...props} />
  }

  const buildRecoveryInProgress = (): JSX.Element => {
    return <RecoveryInProgress {...props} />
  }

  const buildResumeRun = (): JSX.Element => {
    return <ResumeRun {...props} />
  }

  switch (props.recoveryMap.route) {
    case RECOVERY_MAP.BEFORE_BEGINNING.ROUTE:
      return buildBeforeBeginning()
    case RECOVERY_MAP.OPTION_SELECTION.ROUTE:
      return buildSelectRecoveryOption()
    case RECOVERY_MAP.RESUME.ROUTE:
      return buildResumeRun()
    case RECOVERY_MAP.ROBOT_IN_MOTION.ROUTE:
    case RECOVERY_MAP.ROBOT_RESUMING.ROUTE:
      return buildRecoveryInProgress()
    default:
      return buildSelectRecoveryOption()
  }
}
