import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

import { useAddLabwareOffsetToRunMutation } from '@opentrons/react-api-client'
import {
  Flex,
  JUSTIFY_CENTER,
  PrimaryButton,
  SecondaryButton,
  SPACING,
  Tooltip,
  TOOLTIP_BOTTOM,
  useHoverTooltip,
} from '@opentrons/components'

import { useToaster } from '/app/organisms/ToasterOven'
import { useLPCDisabledReason } from '/app/resources/runs'
import {
  selectAreOffsetsApplied,
  selectIsAnyNecessaryDefaultOffsetMissing,
  selectLabwareOffsetsToAddToRun,
  selectTotalCountNonHardCodedLSOffsets,
} from '/app/redux/protocol-runs'

import type { SetupLabwarePositionCheckProps } from '/app/organisms/Desktop/Devices/ProtocolRun/SetupLabwarePositionCheck'

export interface LPCSetupFlexBtnsProps extends SetupLabwarePositionCheckProps {
  launchLPC: () => void
}

export function LPCSetupFlexBtns({
  setOffsetsConfirmed,
  launchLPC,
  runId,
  robotName,
}: LPCSetupFlexBtnsProps): JSX.Element {
  const { t } = useTranslation('protocol_setup')
  const { makeSnackbar } = useToaster()
  const lpcDisabledReason = useLPCDisabledReason({ robotName, runId })
  const isNecessaryDefaultOffsetMissing = useSelector(
    selectIsAnyNecessaryDefaultOffsetMissing(runId)
  )
  const offsetsConfirmed = useSelector(selectAreOffsetsApplied(runId))
  const [runLPCTargetProps, runLPCTooltipProps] = useHoverTooltip({
    placement: TOOLTIP_BOTTOM,
  })
  const [
    confirmOffsetsTargetProps,
    confirmOffsetsTooltipProps,
  ] = useHoverTooltip({
    placement: TOOLTIP_BOTTOM,
  })

  const anyOffsetsToLpc =
    useSelector(selectTotalCountNonHardCodedLSOffsets(runId)) === 0
  const lwOffsetsForRun = useSelector(selectLabwareOffsetsToAddToRun(runId))
  const { createLabwareOffset } = useAddLabwareOffsetToRunMutation()

  const [isApplyOffsets, setIsApplyingOffsets] = useState(false)

  const isApplyOffsetsBtnDisabled =
    offsetsConfirmed ||
    isNecessaryDefaultOffsetMissing ||
    lpcDisabledReason !== null
  const applyOffsetsDisabledTooltipText = (): string | null => {
    if (lpcDisabledReason != null) {
      return lpcDisabledReason
    } else if (isNecessaryDefaultOffsetMissing) {
      return t('add_missing_labware_offsets')
    } else if (offsetsConfirmed) {
      return t('offsets_already_applied')
    } else if (!anyOffsetsToLpc) {
      return t('no_offsets_found')
    } else {
      return null
    }
  }

  const onApplyOffsets = (): void => {
    if (!isApplyOffsets && lwOffsetsForRun != null) {
      setIsApplyingOffsets(true)
      Promise.all(
        lwOffsetsForRun.map(data => createLabwareOffset({ runId, data }))
      )
        .then(() => {
          setOffsetsConfirmed(true)
        })
        .catch(() => {
          makeSnackbar(t('failed_to_apply_offsets') as string)
        })
        .finally(() => {
          setIsApplyingOffsets(false)
        })
    }
  }

  return (
    <Flex justifyContent={JUSTIFY_CENTER} gridGap={SPACING.spacing8}>
      <SecondaryButton
        onClick={launchLPC}
        id="LabwareSetup_checkLabwarePositionsButton"
        {...runLPCTargetProps}
        disabled={lpcDisabledReason !== null}
      >
        {t('run_labware_position_check')}
      </SecondaryButton>
      {lpcDisabledReason !== null ? (
        <Tooltip tooltipProps={runLPCTooltipProps}>{lpcDisabledReason}</Tooltip>
      ) : null}
      <PrimaryButton
        onClick={onApplyOffsets}
        id="LPC_setOffsetsConfirmed"
        padding={`${SPACING.spacing8} ${SPACING.spacing16}`}
        {...confirmOffsetsTargetProps}
        disabled={isApplyOffsetsBtnDisabled}
      >
        {t('apply_offsets')}
      </PrimaryButton>
      {isApplyOffsetsBtnDisabled ? (
        <Tooltip tooltipProps={confirmOffsetsTooltipProps}>
          {applyOffsetsDisabledTooltipText()}
        </Tooltip>
      ) : null}
    </Flex>
  )
}
