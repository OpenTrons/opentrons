import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { useTranslation } from 'react-i18next'
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
  clearSelectedLabwareWorkingOffsets,
  goBackEditOffsetSubstep,
  selectSelectedLwOverview,
} from '/app/redux/protocol-runs'

import type { OddModalHeaderBaseProps } from '/app/molecules/OddModal/types'
import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'

export const handleUnsavedOffsetsModalODD = (
  props: LPCWizardContentProps
): Promise<unknown> => {
  return NiceModal.show(UnsavedOffsetsModalODD, {
    ...props,
  })
}

const UnsavedOffsetsModalODD = NiceModal.create(
  (props: LPCWizardContentProps): JSX.Element => {
    const { runId } = props
    const { t } = useTranslation('labware_position_check')
    const dispatch = useDispatch()
    const uri = useSelector(selectSelectedLwOverview(runId))?.uri ?? ''

    const modal = useModal()

    const header: OddModalHeaderBaseProps = {
      title: t('unsaved_changes_will_be_lost'),
      iconName: 'ot-alert',
      iconColor: COLORS.yellow50,
    }

    const onCancel = (): void => {
      modal.remove()
    }

    const onConfirm = (): void => {
      dispatch(clearSelectedLabwareWorkingOffsets(runId, uri))
      dispatch(goBackEditOffsetSubstep(runId))
      modal.remove()
    }

    return (
      <OddModal header={header}>
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing32}>
          <StyledText oddStyle="bodyTextRegular">
            {t('confirm_go_back_without_saving')}
          </StyledText>
          <Flex gridGap={SPACING.spacing8}>
            <SmallButton flex="1" buttonText={t('cancel')} onClick={onCancel} />
            <SmallButton
              flex="1"
              buttonType="alert"
              buttonText={t('confirm')}
              onClick={onConfirm}
            />
          </Flex>
        </Flex>
      </OddModal>
    )
  }
)
