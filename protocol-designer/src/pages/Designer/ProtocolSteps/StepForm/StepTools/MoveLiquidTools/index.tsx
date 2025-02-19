import { SingleStepMoveLiquidTools } from './SingleStepMoveLiquidTools'
import { MultipleStepsMoveLiquidTools } from './MultipleStepsMoveLiquidTools'

import type { StepFormProps } from '/protocol-designer/pages/Designer/ProtocolSteps/StepForm/types'

export function MoveLiquidTools(props: StepFormProps): JSX.Element {
  const {
    toolboxStep,
    propsForFields,
    formData,
    visibleFormErrors,
    setShowFormErrors,
    tab,
    setTab,
  } = props

  return toolboxStep === 0 ? (
    <SingleStepMoveLiquidTools
      propsForFields={propsForFields}
      formData={formData}
      visibleFormErrors={visibleFormErrors}
    />
  ) : (
    <MultipleStepsMoveLiquidTools
      propsForFields={propsForFields}
      formData={formData}
      tab={tab}
      setTab={setTab}
      setShowFormErrors={setShowFormErrors}
      visibleFormErrors={visibleFormErrors}
    />
  )
}
