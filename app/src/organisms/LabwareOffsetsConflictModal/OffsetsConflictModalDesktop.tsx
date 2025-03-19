import { Trans, useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import {
  selectLastFreshOffsetRunTimestamp,
  sourceOffsetsFromDatabase,
  sourceOffsetsFromRun,
} from '/app/redux/protocol-runs'
import {
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  StyledText,
  ModalShell,
  ModalHeader,
  PrimaryButton,
  JUSTIFY_SPACE_BETWEEN,
  JUSTIFY_END,
} from '@opentrons/components'
import type { OffsetsConflictModalProps } from './types'
import { css } from 'styled-components'
import { TextOnlyButton } from '/app/atoms/buttons'
import type { IconProps } from '@opentrons/components'
import { createPortal } from 'react-dom'
import { getModalPortalEl } from '/app/App/portal'

export function OffsetsConflictModalDesktop({
  runId,
  runRecord,
}: OffsetsConflictModalProps): JSX.Element {
  const { t } = useTranslation(['protocol_setup', 'branded'])
  const dispatch = useDispatch()
  const clonedRunOffsets = runRecord?.data.labwareOffsets ?? []
  const lastFreshRunTs = useSelector(selectLastFreshOffsetRunTimestamp(runId))

  const buildIcon = (): IconProps => {
    return {
      name: 'information',
      color: COLORS.yellow50,
      size: SPACING.spacing20,
    }
  }

  const buildHeader = (): JSX.Element => {
    return (
      <ModalHeader
        title={t('labware_offsets_conflict')}
        icon={buildIcon()}
        color={COLORS.black90}
        backgroundColor={COLORS.white}
      />
    )
  }

  const onRunRecordOffsets = (): void => {
    dispatch(sourceOffsetsFromRun(runId, clonedRunOffsets))
  }

  const onDatabaseOffsets = (): void => {
    dispatch(sourceOffsetsFromDatabase(runId))
  }

  return createPortal(
    <ModalShell header={buildHeader()} css={MODAL_STYLE}>
      <Flex css={MODAL_CONTENT_CONTAINER_STYLE}>
        <StyledText desktopStyle="bodyDefaultRegular">
          <Trans
            t={t}
            i18nKey="branded:labware_offsets_conflict_description"
            values={{
              timestamp: lastFreshRunTs,
            }}
            components={{
              timestamp: <strong />,
            }}
          />
        </StyledText>
        <Flex css={BUTTON_CONTAINER_STYLE}>
          <TextOnlyButton
            onClick={onRunRecordOffsets}
            buttonText={t('use_previous_run_offsets')}
          />
          <PrimaryButton onClick={onDatabaseOffsets}>
            {t('use_updated_offsets')}
          </PrimaryButton>
        </Flex>
      </Flex>
    </ModalShell>,
    getModalPortalEl()
  )
}

const MODAL_STYLE = css`
  width: 500px;
`

const MODAL_CONTENT_CONTAINER_STYLE = css`
  padding: ${SPACING.spacing24};
  grid-gap: ${SPACING.spacing24};
  flex-direction: ${DIRECTION_COLUMN};
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
`

const BUTTON_CONTAINER_STYLE = css`
  grid-gap: ${SPACING.spacing24};
  justify-content: ${JUSTIFY_END};
`
