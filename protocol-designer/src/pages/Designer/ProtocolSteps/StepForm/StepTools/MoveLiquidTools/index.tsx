import { useSelector } from 'react-redux'
import { getEnableLiquidClasses } from '../../../../../../feature-flags/selectors'
import { FirstStepMoveLiquidTools } from './FirstStepMoveLiquidTools'
import { SecondStepsMoveLiquidTools } from './SecondStepsMoveLiquidTools'
import { LiquidClassesStepTools } from './LiquidClassesStepTools'

import type { StepFormProps } from '../../types'

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
  const enableLiquidClasses = useSelector(getEnableLiquidClasses)

  // Object mapping step numbers to functions returning the correct JSX
  const stepComponents: Record<number, () => JSX.Element> = {
    0: () => (
      <FirstStepMoveLiquidTools
        propsForFields={propsForFields}
        formData={formData}
        visibleFormErrors={visibleFormErrors}
      />
    ),
    1: () => (
      <>
        {enableLiquidClasses ? (
          <LiquidClassesStepTools
            propsForFields={propsForFields}
            setShowFormErrors={setShowFormErrors}
          />
        ) : (
          <SecondStepsMoveLiquidTools
            propsForFields={propsForFields}
            formData={formData}
            tab={tab}
            setTab={setTab}
            setShowFormErrors={setShowFormErrors}
            visibleFormErrors={visibleFormErrors}
          />
        )}
      </>
    ),
    2: () => (
      <SecondStepsMoveLiquidTools
        propsForFields={propsForFields}
        formData={formData}
        tab={tab}
        setTab={setTab}
        setShowFormErrors={setShowFormErrors}
        visibleFormErrors={visibleFormErrors}
      />
    ),
  }

  const StepComponent = stepComponents[toolboxStep] ?? stepComponents[0]
  return StepComponent()
}
