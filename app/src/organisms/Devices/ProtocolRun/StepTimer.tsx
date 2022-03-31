import * as React from 'react'
import { useTranslation } from 'react-i18next'

import { Flex, DIRECTION_COLUMN, SPACING } from '@opentrons/components'

import { StyledText } from '../../../atoms/text'
import { formatInterval } from '../../../organisms/RunTimeControl/utils'

const EMPTY_TIMESTAMP = '--:--:--'

interface TimerProps {
  commandStartedAt: string | null
  commandCompletedAt: string | null
  runStartedAt: string | null
}

export function StepTimer(props: TimerProps): JSX.Element {
  const { commandStartedAt, commandCompletedAt, runStartedAt } = props
  const { t } = useTranslation('run_details')

  const startTime =
    commandStartedAt != null && runStartedAt != null
      ? formatInterval(runStartedAt, commandStartedAt)
      : EMPTY_TIMESTAMP

  const endTime =
    commandCompletedAt != null && runStartedAt != null
      ? formatInterval(runStartedAt, commandCompletedAt)
      : EMPTY_TIMESTAMP

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing2}
      marginRight={SPACING.spacing3}
    >
      <StyledText as="label" width="5rem">{`${t(
        'start_step_time'
      )}: ${startTime}`}</StyledText>
      <StyledText as="label" width="5rem">{`${t(
        'end_step_time'
      )}: ${endTime}`}</StyledText>
    </Flex>
  )
}
