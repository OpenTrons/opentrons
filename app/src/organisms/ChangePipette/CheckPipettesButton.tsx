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
  const [dispatch] = useDispatchApiRequests(dispatchedAction => {
    if (
      dispatchedAction.type === FETCH_PIPETTES &&
      // @ts-expect-error(sa, 2021-05-27): avoiding src code change, need to type narrow
      dispatchedAction.meta.requestId
    ) {
      // @ts-expect-error(sa, 2021-05-27): avoiding src code change, need to type narrow
      fetchPipettesRequestId.current = dispatchedAction.meta.requestId
    }
  })

  const handleClick = (): void => dispatch(fetchPipettes(robotName, true))
  const requestStatus = useSelector<State, RequestState | null>(state =>
    fetchPipettesRequestId.current != null
      ? getRequestById(state, fetchPipettesRequestId.current)
      : null
  )?.status
  const isPending = requestStatus === PENDING

  React.useEffect(() => {
    if (requestStatus === SUCCESS && onDone) onDone()
  }, [onDone, requestStatus])

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
