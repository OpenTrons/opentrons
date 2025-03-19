import { createPortal } from 'react-dom'
import { Trans, useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { css } from 'styled-components'

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
  SecondaryButton,
  ALIGN_CENTER,
} from '@opentrons/components'

import {
  selectLastFreshOffsetRunTimestamp,
  sourceOffsetsFromDatabase,
  sourceOffsetsFromRun,
} from '/app/redux/protocol-runs'
import { SmallButton } from '/app/atoms/buttons'
import { getModalPortalEl, getTopPortalEl } from '/app/App/portal'
import { OddModal } from '/app/molecules/OddModal'
import { formatTimestamp } from '/app/transformations/runs'

import type { IconProps } from '@opentrons/components'
import type { Run } from '@opentrons/api-client'
import type { OddModalHeaderBaseProps } from '/app/molecules/OddModal/types'

export interface OffsetsConflictModalProps {
  runId: string
  runRecord: Run | undefined
  isOnDevice: boolean
}

export function LabwareOffsetsConflictModal({
  runId,
  runRecord,
  isOnDevice,
}: OffsetsConflictModalProps): JSX.Element {
  const dispatch = useDispatch()
  const clonedRunOffsets = runRecord?.data.labwareOffsets ?? []
  const ts = useSelector(selectLastFreshOffsetRunTimestamp(runId))
  const tsFormatted = formatTimestamp(ts ?? '')

  const onRunRecordOffsets = (): void => {
    dispatch(sourceOffsetsFromRun(runId, clonedRunOffsets))
  }

  const onDatabaseOffsets = (): void => {
    dispatch(sourceOffsetsFromDatabase(runId))
  }

  return createPortal(
    isOnDevice ? (
      <OffsetsConflictODD
        onDatabaseOffsets={onDatabaseOffsets}
        onRunRecordOffsets={onRunRecordOffsets}
        lastFreshRunTs={tsFormatted}
      />
    ) : (
      <OffsetsConflictDesktop
        onDatabaseOffsets={onDatabaseOffsets}
        onRunRecordOffsets={onRunRecordOffsets}
        lastFreshRunTs={tsFormatted}
      />
    ),
    isOnDevice ? getTopPortalEl() : getModalPortalEl()
  )
}

interface OffsetsConflictContentProps {
  lastFreshRunTs: string | null
  onRunRecordOffsets: () => void
  onDatabaseOffsets: () => void
}

function OffsetsConflictODD({
  lastFreshRunTs,
  onDatabaseOffsets,
  onRunRecordOffsets,
}: OffsetsConflictContentProps): JSX.Element {
  const { t } = useTranslation(['protocol_setup', 'branded'])

  const header: OddModalHeaderBaseProps = {
    title: t('labware_offsets_conflict'),
    iconName: 'ot-alert',
    iconColor: COLORS.yellow50,
  }

  return (
    <OddModal header={header}>
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing32}>
        <StyledText oddStyle="bodyTextRegular">
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
        <Flex gridGap={SPACING.spacing8}>
          <SmallButton
            flex="1"
            buttonType="secondary"
            buttonText={t('use_previous_run_offsets')}
            onClick={onRunRecordOffsets}
          />
          <SmallButton
            flex="1"
            buttonText={t('use_updated_offsets')}
            onClick={onDatabaseOffsets}
          />
        </Flex>
      </Flex>
    </OddModal>
  )
}

function OffsetsConflictDesktop({
  lastFreshRunTs,
  onDatabaseOffsets,
  onRunRecordOffsets,
}: OffsetsConflictContentProps): JSX.Element {
  const { t } = useTranslation(['protocol_setup', 'branded'])

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

  return (
    <ModalShell header={buildHeader()} css={DESKTOP_MODAL_STYLE}>
      <Flex css={DESKTOP_MODAL_CONTENT_CONTAINER_STYLE}>
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
        <Flex css={DESKTOP_BUTTON_CONTAINER_STYLE}>
          <SecondaryButton onClick={onRunRecordOffsets}>
            <StyledText desktopStyle="bodyDefaultSemiBold">
              {t('use_previous_run_offsets')}
            </StyledText>
          </SecondaryButton>
          <PrimaryButton onClick={onDatabaseOffsets}>
            <StyledText desktopStyle="bodyDefaultSemiBold">
              {t('use_updated_offsets')}
            </StyledText>
          </PrimaryButton>
        </Flex>
      </Flex>
    </ModalShell>
  )
}

const DESKTOP_MODAL_STYLE = css`
  width: 500px;
  gap: ${SPACING.spacing16};
`

const DESKTOP_MODAL_CONTENT_CONTAINER_STYLE = css`
  padding: ${SPACING.spacing24};
  grid-gap: ${SPACING.spacing24};
  flex-direction: ${DIRECTION_COLUMN};
  align-items: ${ALIGN_CENTER};
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
`

const DESKTOP_BUTTON_CONTAINER_STYLE = css`
  width: 100%;
  grid-gap: ${SPACING.spacing8};
  justify-content: ${JUSTIFY_END};
`
