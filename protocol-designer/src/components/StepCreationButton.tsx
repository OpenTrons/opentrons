// @flow
import * as React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import cx from 'classnames'
import {
  Tooltip,
  PrimaryButton,
  useHoverTooltip,
  TOOLTIP_RIGHT,
  TOOLTIP_TOP,
  TOOLTIP_FIXED,
} from '@opentrons/components'
import {
  MAGNETIC_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
} from '@opentrons/shared-data'
import { i18n } from '../localization'
import { actions as stepsActions, getIsMultiSelectMode } from '../ui/steps'
import {
  selectors as stepFormSelectors,
  getIsModuleOnDeck,
} from '../step-forms'
import {
  ConfirmDeleteModal,
  CLOSE_UNSAVED_STEP_FORM,
} from './modals/ConfirmDeleteModal'
import { Portal } from './portals/MainPageModalPortal'
import { stepIconsByType, type StepType } from '../form-types'
import styles from './listButtons.css'

type StepButtonComponentProps = {|
  children: React.Node,
  expanded: boolean,
  disabled: boolean,
  setExpanded: boolean => mixed,
|}

// TODO: Ian 2019-01-17 move out to centralized step info file - see #2926
const getSupportedSteps = () => [
  'moveLiquid',
  'mix',
  'pause',
  'magnet',
  'temperature',
  'thermocycler',
]

export const StepCreationButtonComponent = (
  props: StepButtonComponentProps
): React.Node => {
  const { children, expanded, setExpanded, disabled } = props
  const [targetProps, tooltipProps] = useHoverTooltip({
    placement: TOOLTIP_TOP,
    strategy: TOOLTIP_FIXED,
  })
  return (
    <div
      className={styles.list_item_button}
      onMouseLeave={() => setExpanded(false)}
      {...targetProps}
    >
      {disabled && (
        <Tooltip {...tooltipProps}>
          {i18n.t(`tooltip.disabled_step_creation`)}
        </Tooltip>
      )}
      <PrimaryButton
        id="StepCreationButton"
        onClick={() => setExpanded(!expanded)}
        disabled={disabled}
      >
        {i18n.t('button.add_step')}
      </PrimaryButton>

      <div className={styles.buttons_popover}>{expanded && children}</div>
    </div>
  )
}

export type StepButtonItemProps = {|
  onClick: () => mixed,
  disabled: boolean,
  stepType: StepType,
|}

export function StepButtonItem(props: StepButtonItemProps): React.Node {
  const { onClick, disabled, stepType } = props
  const [targetProps, tooltipProps] = useHoverTooltip({
    placement: TOOLTIP_RIGHT,
    strategy: TOOLTIP_FIXED,
  })
  const tooltipMessage = disabled
    ? i18n.t(`tooltip.disabled_module_step`)
    : i18n.t(`tooltip.step_description.${stepType}`)
  return (
    <>
      <PrimaryButton
        hoverTooltipHandlers={targetProps}
        onClick={onClick}
        iconName={stepIconsByType[stepType]}
        className={cx({
          [styles.step_button_disabled]: disabled,
        })}
      >
        {i18n.t(`application.stepType.${stepType}`, stepType)}
      </PrimaryButton>
      <Tooltip {...tooltipProps}>{tooltipMessage}</Tooltip>
    </>
  )
}

export const StepCreationButton = (): React.Node => {
  const currentFormIsPresaved = useSelector(
    stepFormSelectors.getCurrentFormIsPresaved
  )
  const formHasChanges = useSelector(
    stepFormSelectors.getCurrentFormHasUnsavedChanges
  )
  const isStepCreationDisabled = useSelector(getIsMultiSelectMode)
  const modules = useSelector(stepFormSelectors.getInitialDeckSetup).modules
  const isStepTypeEnabled = {
    moveLiquid: true,
    mix: true,
    pause: true,
    magnet: getIsModuleOnDeck(modules, MAGNETIC_MODULE_TYPE),
    temperature: getIsModuleOnDeck(modules, TEMPERATURE_MODULE_TYPE),
    thermocycler: getIsModuleOnDeck(modules, THERMOCYCLER_MODULE_TYPE),
  }

  const [expanded, setExpanded] = React.useState<boolean>(false)
  const [
    enqueuedStepType,
    setEnqueuedStepType,
  ] = React.useState<StepType | null>(null)
  const dispatch = useDispatch()

  const addStep = (stepType: StepType) =>
    dispatch(stepsActions.addAndSelectStepWithHints({ stepType }))

  const items = getSupportedSteps().map(stepType => (
    <StepButtonItem
      key={stepType}
      stepType={stepType}
      disabled={!isStepTypeEnabled[stepType]}
      onClick={() => {
        setExpanded(false)

        if (currentFormIsPresaved || formHasChanges) {
          setEnqueuedStepType(stepType)
        } else {
          addStep(stepType)
        }
      }}
    />
  ))

  return (
    <>
      {enqueuedStepType !== null && (
        <Portal>
          <ConfirmDeleteModal
            modalType={CLOSE_UNSAVED_STEP_FORM}
            onCancelClick={() => setEnqueuedStepType(null)}
            onContinueClick={() => {
              if (enqueuedStepType !== null) {
                addStep(enqueuedStepType)
                setEnqueuedStepType(null)
              }
            }}
          ></ConfirmDeleteModal>
        </Portal>
      )}
      <StepCreationButtonComponent
        expanded={expanded}
        setExpanded={setExpanded}
        disabled={isStepCreationDisabled}
      >
        {items}
      </StepCreationButtonComponent>
    </>
  )
}
