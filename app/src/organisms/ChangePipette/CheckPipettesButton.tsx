import * as React from 'react'
import { usePipettesQuery } from '@opentrons/react-api-client'
import { useTranslation } from 'react-i18next'
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
  const { onDone, children, actualPipette } = props
  const { t } = useTranslation('change_pipette')
  const [refresh, setRefresh] = React.useState(true)
  const [isPending, setPending] = React.useState(false)
  const { refetch: refetchPipettes } = usePipettesQuery(
    { refresh: refresh },
    {
      enabled: false,
      onSuccess: () => {
        onDone?.()
      },
      onSettled: () => {
        setRefresh(false)
        setPending(false)
      },
    }
  )

  const handleClick = (): void => {
    setPending(true)
    refetchPipettes()
      .then(() => {})
      .catch(() => {})
  }

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
    <PrimaryButton
      onClick={handleClick}
      aria-label="Confirm"
      disabled={isPending}
    >
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
