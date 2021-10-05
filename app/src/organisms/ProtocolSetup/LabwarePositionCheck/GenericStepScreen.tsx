import * as React from 'react'
import { LabwarePositionCheckStepDetail } from './LabwarePositionCheckStepDetail'
import type { LabwarePositionCheckStep } from './types'

interface GenericStepScreenProps {
  selectedStep: LabwarePositionCheckStep
  setCurrentLabwareCheckStep: (stepNumber: number) => void
}
export const GenericStepScreen = (
  props: GenericStepScreenProps
): JSX.Element | null => {
  return <LabwarePositionCheckStepDetail selectedStep={props.selectedStep} />
}
