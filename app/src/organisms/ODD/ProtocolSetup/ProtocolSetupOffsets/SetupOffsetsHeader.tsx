import {
  Chip,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
} from '@opentrons/components'
import { ODDBackButton } from '/app/molecules/ODDBackButton'
import { SmallButton } from '/app/atoms/buttons'
import { useTranslation } from 'react-i18next'
import type { ProtocolSetupOffsetsProps } from '/app/organisms/ODD/ProtocolSetup'
import { css } from 'styled-components'
import { useToaster } from '/app/organisms/ToasterOven'
import { useDispatch, useSelector } from 'react-redux'
import {
  appliedOffsetsToRun,
  selectIsAnyNecessaryDefaultOffsetMissing,
  selectLabwareOffsetsToAddToRun,
} from '/app/redux/protocol-runs'
import { useAddLabwareOffsetToRunMutation } from '@opentrons/react-api-client'
import { useState } from 'react'

// TOME TODO: Test that you can't launch LPC if you have steps that need to be complete first?

export function SetupOffsetsHeader({
  runId,
  setSetupScreen,
  isConfirmed,
}: ProtocolSetupOffsetsProps): JSX.Element {
  const { t } = useTranslation('protocol_setup')
  const dispatch = useDispatch()
  const { makeSnackbar } = useToaster()
  const { createLabwareOffset } = useAddLabwareOffsetToRunMutation()
  const isNecessaryDefaultOffsetMissing = useSelector(
    selectIsAnyNecessaryDefaultOffsetMissing(runId)
  )
  const lwOffsetsForRun = useSelector(selectLabwareOffsetsToAddToRun(runId))

  const [isApplyOffsets, setIsApplyingOffsets] = useState(false)

  const onApplyOffsets = (): void => {
    if (!isApplyOffsets) {
      if (isNecessaryDefaultOffsetMissing) {
        makeSnackbar(t('add_missing_labware_offsets'))
      } else if (lwOffsetsForRun == null) {
        makeSnackbar(t('no_offsets_found'))
      } else {
        setIsApplyingOffsets(true)
        Promise.all(
          lwOffsetsForRun.map(data => createLabwareOffset({ runId, data }))
        )
          .then(() => {
            dispatch(appliedOffsetsToRun(runId))
            setSetupScreen('prepare to run')
          })
          .catch(() => {
            makeSnackbar(t('failed_to_apply_offsets'))
          })
          .finally(() => {
            setIsApplyingOffsets(false)
          })
      }
    }
  }

  return (
    <Flex css={CONTAINER_STYLE}>
      <ODDBackButton
        label={t('labware_offsets')}
        onClick={() => {
          setSetupScreen('prepare to run')
        }}
      />
      {isConfirmed ? (
        <Chip
          background
          iconName="ot-check"
          text={t('offsets_applied')}
          type="success"
        />
      ) : (
        <SmallButton
          buttonText={t('apply_offsets')}
          ariaDisabled={isNecessaryDefaultOffsetMissing}
          onClick={onApplyOffsets}
          buttonCategory="rounded"
          iconPlacement="startIcon"
          iconName={isApplyOffsets ? 'ot-spinner' : null}
        />
      )}
    </Flex>
  )
}

const CONTAINER_STYLE = css`
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
  padding: ${SPACING.spacing32} ${SPACING.spacing40};
`
