import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Trans, useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import {
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  StyledText,
} from '@opentrons/components'

import { SmallButton } from '/app/atoms/buttons'
import { OddModal } from '/app/molecules/OddModal'
import {
  selectLastFreshOffsetRunTimestamp,
  sourceOffsetsFromDatabase,
  sourceOffsetsFromRun,
} from '/app/redux/protocol-runs'

import type { OddModalHeaderBaseProps } from '/app/molecules/OddModal/types'
import type { Run } from '@opentrons/api-client'

export interface OffsetsConflictModalODDProps {
  runId: string
  runRecord: Run | undefined
}

export const handleOffsetsConflictModalODD = (
  props: OffsetsConflictModalODDProps
): Promise<unknown> => {
  return NiceModal.show(OffsetsConflictModalODD, { ...props })
}

const OffsetsConflictModalODD = NiceModal.create(
  ({ runId, runRecord }: OffsetsConflictModalODDProps): JSX.Element => {
    const { t } = useTranslation(['protocol_setup', 'branded'])
    const dispatch = useDispatch()
    const clonedRunOffsets = runRecord?.data.labwareOffsets ?? []
    const lastFreshRunTs = useSelector(selectLastFreshOffsetRunTimestamp(runId))

    const modal = useModal()

    const header: OddModalHeaderBaseProps = {
      title: t('labware_offsets_conflict'),
      iconName: 'ot-alert',
      iconColor: COLORS.yellow50,
    }

    const onRunRecordOffsets = (): void => {
      dispatch(sourceOffsetsFromRun(runId, clonedRunOffsets))
      modal.remove()
    }

    const onDatabaseOffsets = (): void => {
      dispatch(sourceOffsetsFromDatabase(runId))
      modal.remove()
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
)
