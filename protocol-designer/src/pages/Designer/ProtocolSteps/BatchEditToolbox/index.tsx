import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import {
  Icon,
  POSITION_RELATIVE,
  PrimaryButton,
  StyledText,
  Toolbox,
} from '@opentrons/components'
import {
  getBatchEditSelectedStepTypes,
  getMultiSelectDisabledFields,
  getMultiSelectFieldValues,
  getMultiSelectItemIds,
} from '../../../../ui/steps/selectors'
import { useKitchen } from '../../../../components/organisms/Kitchen/hooks'
import { deselectAllSteps } from '../../../../ui/steps/actions/actions'
import {
  changeBatchEditField,
  resetBatchEditFieldChanges,
  saveStepFormsMulti,
} from '../../../../step-forms/actions'
import { maskField } from '../../../../steplist/fieldLevel'
import { getBatchEditFormHasUnsavedChanges } from '../../../../step-forms/selectors'
import { makeBatchEditFieldProps } from './utils'
import { BatchEditMoveLiquidTools } from './BatchEditMoveLiquidTools'
import { BatchEditMixTools } from './BatchEditMixTools'

import type { ThunkDispatch } from 'redux-thunk'
import type { StepFieldName } from '../../../../steplist/fieldLevel'
import type { BaseState } from '../../../../types'

export const BatchEditToolbox = (): JSX.Element | null => {
  const { t } = useTranslation(['tooltip', 'protocol_steps', 'shared'])
  const { makeSnackbar } = useKitchen()
  const dispatch = useDispatch<ThunkDispatch<BaseState, any, any>>()
  const fieldValues = useSelector(getMultiSelectFieldValues)
  const stepTypes = useSelector(getBatchEditSelectedStepTypes)
  const disabledFields = useSelector(getMultiSelectDisabledFields)
  const selectedStepIds = useSelector(getMultiSelectItemIds)
  const batchEditFormHasChanges = useSelector(getBatchEditFormHasUnsavedChanges)

  const handleChangeFormInput = (name: StepFieldName, value: unknown): void => {
    const maskedValue = maskField(name, value)
    dispatch(changeBatchEditField({ [name]: maskedValue }))
  }

  const handleSave = (): void => {
    dispatch(saveStepFormsMulti(selectedStepIds))
    makeSnackbar(t('protocol_steps:batch_edits_saved') as string)
    dispatch(deselectAllSteps('EXIT_BATCH_EDIT_MODE_BUTTON_PRESS'))
  }

  const handleCancel = (): void => {
    dispatch(resetBatchEditFieldChanges())
    dispatch(deselectAllSteps('EXIT_BATCH_EDIT_MODE_BUTTON_PRESS'))
  }

  const stepType = stepTypes.length === 1 ? stepTypes[0] : null

  if (stepType !== null && fieldValues !== null && disabledFields !== null) {
    const propsForFields = makeBatchEditFieldProps(
      fieldValues,
      disabledFields,
      handleChangeFormInput,
      t
    )
    if (stepType === 'moveLiquid' || stepType === 'mix') {
      return (
        <Toolbox
          position={POSITION_RELATIVE}
          title={
            <StyledText desktopStyle="bodyLargeSemiBold">
              {t('protocol_steps:batch_edit')}
            </StyledText>
          }
          childrenPadding="0"
          onCloseClick={handleCancel}
          closeButton={<Icon size="2rem" name="close" />}
          confirmButton={
            <PrimaryButton
              onClick={handleSave}
              disabled={!batchEditFormHasChanges}
              width="100%"
            >
              {t('shared:save')}
            </PrimaryButton>
          }
        >
          {stepType === 'moveLiquid' ? (
            <BatchEditMoveLiquidTools propsForFields={propsForFields} />
          ) : (
            <BatchEditMixTools propsForFields={propsForFields} />
          )}
        </Toolbox>
      )
    } else {
      return null
    }
  } else {
    return null
  }
}
