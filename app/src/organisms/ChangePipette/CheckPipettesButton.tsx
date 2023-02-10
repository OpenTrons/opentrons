import * as React from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  useDispatchApiRequests,
  getRequestById,
  PENDING,
  SUCCESS,
} from '../../redux/robot-api'
import { fetchPipettes, FETCH_PIPETTES } from '../../redux/pipettes'
import { StyledText } from '../../atoms/text'
import {
  Icon,
  DIRECTION_ROW,
  Flex,
  COLORS,
  ALIGN_CENTER,
  SPACING,
  SIZE_1,
} from '@opentrons/components'
import { PrimaryButton } from '../../atoms/buttons'

import type { State } from '../../redux/types'
import type { RequestState } from '../../redux/robot-api/types'
import type { PipetteModelSpecs } from '@opentrons/shared-data'
import { usePipettesQuery } from '@opentrons/react-api-client'

export interface CheckPipetteButtonProps {
  robotName: string
  children?: React.ReactNode
  actualPipette?: PipetteModelSpecs
  onDone?: () => void
}

export function CheckPipettesButton(
  props: CheckPipetteButtonProps
): JSX.Element | null {
  const { robotName, onDone, children, actualPipette } = props
  const { t } = useTranslation('change_pipette')
  const fetchPipettesRequestId = React.useRef<string | null>(null)
  
  const {status: pipetteQueryStatus, refetch: refetchPipettes} = usePipettesQuery()

  const handleClick = (): void => { refetchPipettes() }
  const isPending = pipetteQueryStatus === 'loading'

  React.useEffect(() => {
    if (pipetteQueryStatus === 'success' && onDone) onDone()
  }, [onDone, pipetteQueryStatus])

  const icon = (
    <Icon name="ot-spinner" height="1rem" spin marginRight={SPACING.spacing3} />
  )

  let body
  if (children != null && !isPending) {
    body = children
  } else if (children != null && isPending) {
    body = (
      <>
        {icon}
        {children}
      </>
    )
  } else if (children == null && isPending) {
    body = (
      <>
        <Icon
          name="ot-spinner"
          height={SIZE_1}
          spin
          marginRight={SPACING.spacing3}
        />
        <StyledText>
          {actualPipette != null
            ? t('confirming_detachment')
            : t('confirming_attachment')}
        </StyledText>
      </>
    )
  } else if (children == null && !isPending) {
    body =
      actualPipette != null ? t('confirm_detachment') : t('confirm_attachment')
  }

  return (
    <PrimaryButton onClick={handleClick} aria-label="Confirm">
      <Flex
        flexDirection={DIRECTION_ROW}
        color={COLORS.white}
        alignItems={ALIGN_CENTER}
      >
        {body}
      </Flex>
    </PrimaryButton>
  )
}
