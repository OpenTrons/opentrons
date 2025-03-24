import { useSelector } from 'react-redux'

import {
  getLabwareEntities,
  getPipetteEntities,
} from '../../../../../../step-forms/selectors'
import {
  getEnablePartialTipSupport,
  getEnableReturnTip,
} from '../../../../../../feature-flags/selectors'
import { getFormErrorsMappedToField } from '../../utils'
import { MixToolsFirstStep } from './MixToolsFirstStep'
import { MixToolsSecondStep } from './MixToolsSecondStep'

import type { StepFormProps } from '../../types'

export function MixTools(
  props: Omit<
    StepFormProps,
    'focusHandlers' | 'showFormErrors' | 'setShowFormErrors' | 'focusedField'
  >
): JSX.Element {
  const {
    propsForFields,
    formData,
    toolboxStep,
    visibleFormErrors,
    tab,
    setTab,
  } = props
  const pipettes = useSelector(getPipetteEntities)
  const enableReturnTip = useSelector(getEnableReturnTip)
  const enablePartialTip = useSelector(getEnablePartialTipSupport)
  const labwares = useSelector(getLabwareEntities)

  const pickUpTipLocationValue = propsForFields.pickUpTip_location?.value
  const userSelectedPickUpTipLocation =
    pickUpTipLocationValue != null &&
    labwares[String(pickUpTipLocationValue)] != null

  const dropTipLocationValue = propsForFields.dropTip_location?.value
  const userSelectedDropTipLocation =
    dropTipLocationValue != null &&
    labwares[String(dropTipLocationValue)] != null

  const mappedErrorsToField = getFormErrorsMappedToField(visibleFormErrors)

  return toolboxStep === 0 ? (
    <MixToolsFirstStep
      propsForFields={propsForFields}
      formData={formData}
      enablePartialTip={enablePartialTip}
      pipettes={pipettes}
      mappedErrorsToField={mappedErrorsToField}
      visibleFormErrors={visibleFormErrors}
      enableReturnTip={enableReturnTip}
      userSelectedPickUpTipLocation={userSelectedPickUpTipLocation}
      userSelectedDropTipLocation={userSelectedDropTipLocation}
    />
  ) : (
    <MixToolsSecondStep
      propsForFields={propsForFields}
      formData={formData}
      mappedErrorsToField={mappedErrorsToField}
      tab={tab}
      setTab={setTab}
    />
  )
}
