import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'

import {
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'

import { StyledText } from '../../atoms/text'
import { Navigation } from '../../organisms/Navigation'
import { onDeviceDisplayRoutes } from '../../App/OnDeviceDisplayApp'
import {
  EmptyRecentRun,
  RecentRunProtocolCarousel,
} from '../../organisms/OnDeviceDisplay/RobotDashboard'
import { getOnDeviceDisplaySettings } from '../../redux/config'
import {
  getAnalyticsOptInSeen,
  getAnalyticsOptedIn,
} from '../../redux/analytics'
import { WelcomeModal } from './WelcomeModal'
import { RunData } from '@opentrons/api-client'
import { ServerInitializing } from '../../organisms/OnDeviceDisplay/RobotDashboard/ServerInitializing'
import { useNotifyAllRunsQuery } from '../../resources/runs/useNotifyAllRunsQuery'

export const MAXIMUM_RECENT_RUN_PROTOCOLS = 8

export function RobotDashboard(): JSX.Element {
  const { t } = useTranslation('device_details')
  const {
    data: allRunsQueryData,
    error: allRunsQueryError,
  } = useNotifyAllRunsQuery()

  const { unfinishedUnboxingFlowRoute } = useSelector(
    getOnDeviceDisplaySettings
  )
  const [showWelcomeModal, setShowWelcomeModal] = React.useState<boolean>(
    unfinishedUnboxingFlowRoute !== null
  )

  const seen = useSelector(getAnalyticsOptInSeen)
  const hasOptedIn = useSelector(getAnalyticsOptedIn)
  const history = useHistory()

  if (!seen || !hasOptedIn) {
    history.push('/privacy-policy')
  }

  const recentRunsOfUniqueProtocols = (allRunsQueryData?.data ?? [])
    .reverse() // newest runs first
    .reduce<RunData[]>((acc, run) => {
      if (
        acc.some(collectedRun => collectedRun.protocolId === run.protocolId)
      ) {
        return acc
      } else {
        return [...acc, run]
      }
    }, [])
    .slice(0, MAXIMUM_RECENT_RUN_PROTOCOLS)

  let contents: JSX.Element = <EmptyRecentRun />
  // GET runs query will error with 503 if database is initializing
  // this should be momentary, and the type of error to come from this endpoint
  // so, all errors will be mapped to an initializing spinner
  if (allRunsQueryError?.code === '503') {
    contents = <ServerInitializing />
  } else if (recentRunsOfUniqueProtocols.length > 0) {
    contents = (
      <>
        <StyledText
          as="p"
          fontWeight={TYPOGRAPHY.fontWeightSemiBold}
          color={COLORS.grey60}
        >
          {t('run_again')}
        </StyledText>
        <RecentRunProtocolCarousel
          recentRunsOfUniqueProtocols={recentRunsOfUniqueProtocols}
        />
      </>
    )
  }

  return (
    <Flex flexDirection={DIRECTION_COLUMN}>
      <Navigation routes={onDeviceDisplayRoutes} />
      <Flex
        paddingX={SPACING.spacing40}
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing16}
      >
        {showWelcomeModal ? (
          <WelcomeModal setShowWelcomeModal={setShowWelcomeModal} />
        ) : null}
        {contents}
      </Flex>
    </Flex>
  )
}
