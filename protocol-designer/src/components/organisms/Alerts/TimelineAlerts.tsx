import { memo } from 'react'

import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import {
  Banner,
  DIRECTION_COLUMN,
  Flex,
  StyledText,
} from '@opentrons/components'
import { getRobotStateTimeline } from '../../../file-data/selectors'
import { ErrorContents } from './ErrorContents'

import type { StyleProps } from '@opentrons/components'
import type { CommandCreatorError } from '@opentrons/step-generation'
import type { MakeAlert } from './types'

function TimelineAlertsComponent(props: StyleProps): JSX.Element | null {
  const { t } = useTranslation('alert')

  const timeline = useSelector(getRobotStateTimeline)

  const timelineErrors = (timeline.errors || ([] as CommandCreatorError[])).map(
    (error: CommandCreatorError) => ({
      title: t(`timeline.error.${error.type}.title`, error.message),
      description: <ErrorContents level="timeline" errorType={error.type} />,
    })
  )

  if (timelineErrors.length === 0) {
    return null
  }

  const makeAlert: MakeAlert = (alertType, data, key) => (
    <Banner
      type={alertType === 'error' ? 'error' : 'warning'}
      key={`${alertType}:${key}`}
      width="100%"
    >
      <Flex flexDirection={DIRECTION_COLUMN}>
        <StyledText desktopStyle="bodyDefaultSemiBold">{data.title}</StyledText>
        <StyledText desktopStyle="bodyDefaultRegular">
          {data.description}
        </StyledText>
      </Flex>
    </Banner>
  )

  return (
    <Flex {...props}>
      {timelineErrors.map((error, key) => makeAlert('error', error, key))}
    </Flex>
  )
}

export const TimelineAlerts = memo(TimelineAlertsComponent)
