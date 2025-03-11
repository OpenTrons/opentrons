import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import {
  BeforeBeginning,
  HandleLabware,
  AttachProbe,
  DetachProbe,
  LPCComplete,
} from '/app/organisms/LabwarePositionCheck/steps'
import { LPCRobotInMotion } from './LPCRobotInMotion'
import { LPCErrorModal } from './LPCErrorModal'
import { LPCProbeNotAttached } from './LPCProbeNotAttached'
import {
  useLPCCommands,
  useLPCInitialState,
} from '/app/organisms/LabwarePositionCheck/hooks'
import {
  closeLPC,
  proceedStep as proceedStepDispatch,
  goBackLastStep as goBackStepDispatch,
  LPC_STEP,
  selectCurrentStep,
} from '/app/redux/protocol-runs'
import { useLPCHeaderCommands } from '/app/organisms/LabwarePositionCheck/hooks/useLPCCommands/useLPCHeaderCommands'

import type { LPCFlowsProps } from '/app/organisms/LabwarePositionCheck/LPCFlows'
import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'
import type { LPCStep } from '/app/redux/protocol-runs'

export interface LPCWizardFlexProps extends Omit<LPCFlowsProps, 'robotType'> {}

export function LPCWizardFlex(props: LPCWizardFlexProps): JSX.Element {
  const { onCloseClick, ...rest } = props

  const proceedStep = (toStep?: LPCStep): void => {
    dispatch(proceedStepDispatch(props.runId, toStep))
  }
  const goBackLastStep = (): void => {
    dispatch(goBackStepDispatch(props.runId))
  }

  const dispatch = useDispatch()
  const LPCHandlerUtils = useLPCCommands({
    ...props,
    onCloseClick,
  })

  useLPCInitialState({ ...rest })

  // Clean up state on LPC close.
  useEffect(() => {
    return () => {
      dispatch(closeLPC(props.runId))
    }
  }, [])

  const headerCommands = useLPCHeaderCommands({
    ...props,
    LPCHandlerUtils,
    proceedStep,
    goBackLastStep,
  })

  return (
    <LPCWizardContent
      {...props}
      proceedStep={proceedStep}
      goBackLastStep={goBackLastStep}
      commandUtils={{ ...LPCHandlerUtils, headerCommands }}
    />
  )
}

function LPCWizardContent(props: LPCWizardContentProps): JSX.Element {
  const { t } = useTranslation('shared')
  const currentStep = useSelector(selectCurrentStep(props.runId))
  const { isRobotMoving, errorMessage, unableToDetect } = props.commandUtils

  // Handle special cases that are shared by multiple steps first.
  if (isRobotMoving) {
    return (
      <LPCRobotInMotion
        header={t('stand_back_robot_is_in_motion')}
        {...props}
      />
    )
  }
  if (errorMessage != null) {
    return <LPCErrorModal {...props} />
  }
  if (unableToDetect) {
    return <LPCProbeNotAttached {...props} />
  }
  if (currentStep == null) {
    console.error('LPC store not properly initialized.')
    return <></>
  }

  // Handle step-based routing.
  switch (currentStep) {
    case LPC_STEP.BEFORE_BEGINNING:
      return <BeforeBeginning {...props} />

    case LPC_STEP.ATTACH_PROBE:
      return <AttachProbe {...props} />

    case LPC_STEP.HANDLE_LABWARE:
      return <HandleLabware {...props} />

    case LPC_STEP.DETACH_PROBE:
      return <DetachProbe {...props} />

    case LPC_STEP.LPC_COMPLETE:
      return <LPCComplete {...props} />

    default:
      console.error('Unhandled LPC step.')
      return <BeforeBeginning {...props} />
  }
}
