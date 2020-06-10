// @flow
import * as React from 'react'
import cx from 'classnames'
import sum from 'lodash/sum'
import { Icon } from '@opentrons/components'
import {
  MAGNETIC_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
} from '@opentrons/shared-data'
import { THERMOCYCLER_PROFILE, THERMOCYCLER_STATE } from '../../constants'
import { stepIconsByType, PROFILE_CYCLE } from '../../form-types'
import { i18n } from '../../localization'
import { makeTemperatureText } from '../../utils'
import { PDListItem, PDTitledList } from '../lists'
import { StepDescription } from '../StepDescription'
import { AspirateDispenseHeader } from './AspirateDispenseHeader'
import { MixHeader } from './MixHeader'
import { ModuleStepItems, ModuleStepItemRow } from './ModuleStepItems'
import { PauseStepItems } from './PauseStepItems'
import { SourceDestSubstep } from './SourceDestSubstep'
import styles from './StepItem.css'

import type {
  FormData,
  StepType,
  ProfileCycleItem,
  ProfileStepItem,
} from '../../form-types'
import type {
  SubstepIdentifier,
  SubstepItemData,
  WellIngredientNames,
} from '../../steplist/types'

export type StepItemProps = {|
  description?: ?string,
  rawForm: ?FormData,
  stepNumber: number,
  stepType: StepType,
  title?: string,

  collapsed?: boolean,
  error?: ?boolean,
  warning?: ?boolean,
  selected?: boolean,
  hovered?: boolean,

  highlightStep: () => mixed,
  onStepContextMenu?: (event?: SyntheticEvent<>) => mixed,
  selectStep?: () => mixed,
  toggleStepCollapsed: () => mixed,
  unhighlightStep: (event?: SyntheticEvent<>) => mixed,
  children?: React.Node,
|}

export const StepItem = (props: StepItemProps): React.Node => {
  const {
    stepType,
    stepNumber,

    collapsed,
    error,
    warning,
    selected,
    hovered,

    unhighlightStep,
    selectStep,
    onStepContextMenu,
    toggleStepCollapsed,
    highlightStep,
  } = props

  const iconName = stepIconsByType[stepType]
  let iconClassName = ''
  if (error) {
    iconClassName = styles.error_icon
  } else if (warning) {
    iconClassName = styles.warning_icon
  }
  const Description = props.description ? (
    <StepDescription description={props.description} />
  ) : null

  return (
    <PDTitledList
      description={Description}
      iconName={error || warning ? 'alert-circle' : iconName}
      iconProps={{ className: iconClassName }}
      title={`${stepNumber}. ${props.title ||
        i18n.t(`application.stepType.${stepType}`)}`}
      onClick={selectStep}
      onContextMenu={onStepContextMenu}
      onMouseEnter={highlightStep}
      onMouseLeave={unhighlightStep}
      onCollapseToggle={toggleStepCollapsed}
      {...{ selected, collapsed, hovered }}
    >
      {props.children}
    </PDTitledList>
  )
}

export type StepItemContentsProps = {|
  rawForm: ?FormData,
  stepType: StepType,
  substeps: ?SubstepItemData,

  ingredNames: WellIngredientNames,
  labwareDefDisplayNamesById: { [labwareId: string]: ?string },
  labwareNicknamesById: { [labwareId: string]: string },

  highlightSubstep: SubstepIdentifier => mixed,
  hoveredSubstep: ?SubstepIdentifier,
|}

const makeDurationText = (
  durationMinutes: string,
  durationSeconds: string
): string => {
  const minutesText = Number(durationMinutes) > 0 ? `${durationMinutes}m ` : ''
  return `${minutesText}${durationSeconds || 0}s`
}

type ProfileStepSubstepRowProps = {|
  step: ProfileStepItem,
  repetitionsDisplay: ?string,
|}
export const ProfileStepSubstepRow = (
  props: ProfileStepSubstepRowProps
): React.Node => {
  const { repetitionsDisplay } = props
  const { temperature, durationMinutes, durationSeconds } = props.step
  return (
    // TODO IMMEDIATELY: rename .step_subitem_channel_row class to more generic name
    <PDListItem
      className={cx(
        styles.step_subitem_channel_row,
        styles.profile_step_substep_row
      )}
    >
      <span
        className={styles.profile_step_substep_column}
      >{`${temperature} ${i18n.t('application.units.degrees')}`}</span>
      <span
        className={cx(
          styles.profile_step_substep_column,
          styles.profile_center_column
        )}
      >
        {makeDurationText(durationMinutes, durationSeconds)}
      </span>
      <span className={styles.profile_step_substep_column}>
        {repetitionsDisplay ? `${repetitionsDisplay}x` : null}
      </span>
    </PDListItem>
  )
}

// this is a row under a cycle under a substep
type ProfileCycleRowProps = {| step: ProfileStepItem |}
const ProfileCycleRow = (props: ProfileCycleRowProps): React.Node => {
  const { step } = props
  return (
    <div className={styles.cycle_step_row}>
      <span>{`${step.temperature} ${i18n.t(
        'application.units.degrees'
      )}`}</span>
      <span>
        {makeDurationText(step.durationMinutes, step.durationSeconds)}
      </span>
    </div>
  )
}

type ProfileCycleSubstepGroupProps = {| cycle: ProfileCycleItem |}
export const ProfileCycleSubstepGroup = (
  props: ProfileCycleSubstepGroupProps
): React.Node => {
  const { steps, repetitions } = props.cycle
  return (
    <div className={styles.profile_substep_cycle}>
      <div className={styles.cycle_group}>
        {steps.map((step, index) => (
          <ProfileCycleRow key={index} step={step} />
        ))}
      </div>
      <div className={styles.cycle_repetitions}>{`${repetitions}x`}</div>
    </div>
  )
}

type CollapsibleSubstepProps = {|
  children: React.Node,
  headerContent: React.Node,
|}
const CollapsibleSubstep = (props: CollapsibleSubstepProps) => {
  const [contentCollapsed, setContentCollapsed] = React.useState<boolean>(true)
  return (
    <>
      <PDListItem border className={styles.step_subitem}>
        {props.headerContent}
        <span
          className={styles.inner_carat}
          onClick={() => setContentCollapsed(!contentCollapsed)}
        >
          <Icon name={contentCollapsed ? 'chevron-up' : 'chevron-down'} />
        </span>
      </PDListItem>
      {!contentCollapsed && props.children}
    </>
  )
}

export const StepItemContents = (props: StepItemContentsProps): React.Node => {
  const {
    rawForm,
    stepType,
    substeps,
    ingredNames,
    labwareDefDisplayNamesById,
    labwareNicknamesById,
    highlightSubstep,
    hoveredSubstep,
  } = props

  if (!rawForm) {
    return null
  }

  // pause substep component uses the delay args directly
  if (substeps && substeps.substepType === 'pause') {
    return <PauseStepItems pauseArgs={substeps.pauseStepArgs} />
  }

  if (substeps && substeps.substepType === 'magnet') {
    return (
      <ModuleStepItems
        labwareDisplayName={substeps.labwareDisplayName}
        labwareNickname={substeps.labwareNickname}
        message={substeps.message}
        action={i18n.t(`modules.actions.action`)}
        actionText={i18n.t(
          `modules.actions.${substeps.engage ? 'engage' : 'disengage'}`
        )}
        moduleType={MAGNETIC_MODULE_TYPE}
      />
    )
  }

  if (substeps && substeps.substepType === 'temperature') {
    const temperature = makeTemperatureText(substeps.temperature)

    return (
      <ModuleStepItems
        labwareDisplayName={substeps.labwareDisplayName}
        labwareNickname={substeps.labwareNickname}
        message={substeps.message}
        action={i18n.t(`modules.actions.go_to`)}
        actionText={temperature}
        moduleType={TEMPERATURE_MODULE_TYPE}
      />
    )
  }

  if (substeps && substeps.substepType === THERMOCYCLER_PROFILE) {
    const lidTemperature = makeTemperatureText(substeps.profileTargetLidTemp)
    const lidLabelText = i18n.t(`modules.lid_label`, {
      lidStatus: i18n.t(
        substeps.lidOpenHold ? 'modules.lid_open' : 'modules.lid_closed'
      ),
    })

    return (
      <ModuleStepItems
        labwareDisplayName={substeps.labwareDisplayName}
        labwareNickname={substeps.labwareNickname}
        message={substeps.message}
        action={i18n.t(`modules.actions.profile`)}
        actionText={i18n.t(`modules.actions.cycling`)}
        moduleType={THERMOCYCLER_MODULE_TYPE}
      >
        <ModuleStepItemRow label={lidLabelText} value={lidTemperature} />
        <CollapsibleSubstep
          headerContent={
            <span>{`Profile steps (${Math.floor(
              sum(
                substeps.profileSteps.map(atomicStep => atomicStep.holdTime)
              ) / 60
            )}+ min)`}</span>
          }
        >
          <li className={cx(styles.profile_substep_header, styles.uppercase)}>
            <span className={styles.profile_step_substep_column}>
              block temp
            </span>
            <span
              className={cx(
                styles.profile_center_column,
                styles.profile_step_substep_column
              )}
            >
              duration{' '}
            </span>
            <span className={styles.profile_step_substep_column}>cycles</span>
          </li>
          {substeps.meta?.rawProfileItems.map((item, index) => {
            if (item.type === PROFILE_CYCLE) {
              return <ProfileCycleSubstepGroup cycle={item} key={index} />
            }
            return (
              <ProfileStepSubstepRow
                step={item}
                key={index}
                repetitionsDisplay="1"
              />
            )
          })}
        </CollapsibleSubstep>
      </ModuleStepItems>
    )
  }

  if (substeps && substeps.substepType === THERMOCYCLER_STATE) {
    const blockTemperature = makeTemperatureText(substeps.blockTargetTemp)
    const lidTemperature = makeTemperatureText(substeps.lidTargetTemp)
    const lidLabelText = i18n.t(`modules.lid_label`, {
      lidStatus: i18n.t(
        substeps.lidOpen ? 'modules.lid_open' : 'modules.lid_closed'
      ),
    })

    return (
      <ModuleStepItems
        labwareDisplayName={substeps.labwareDisplayName}
        labwareNickname={substeps.labwareNickname}
        message={substeps.message}
        action={i18n.t(`modules.actions.hold`)}
        actionText={blockTemperature}
        moduleType={THERMOCYCLER_MODULE_TYPE}
      >
        <ModuleStepItemRow label={lidLabelText} value={lidTemperature} />
      </ModuleStepItems>
    )
  }

  if (substeps && substeps.substepType === 'awaitTemperature') {
    const temperature = `${substeps.temperature} ${i18n.t(
      'application.units.degrees'
    )}`

    return (
      <ModuleStepItems
        labwareDisplayName={substeps.labwareDisplayName}
        labwareNickname={substeps.labwareNickname}
        message={substeps.message}
        action={i18n.t('modules.actions.await_temperature')}
        actionText={temperature}
        moduleType={TEMPERATURE_MODULE_TYPE}
      />
    )
  }

  const result = []

  // headers
  if (stepType === 'moveLiquid') {
    const sourceLabwareId = rawForm['aspirate_labware']
    const destLabwareId = rawForm['dispense_labware']

    result.push(
      <AspirateDispenseHeader
        key="moveLiquid-header"
        sourceLabwareNickname={labwareNicknamesById[sourceLabwareId]}
        sourceLabwareDefDisplayName={
          labwareDefDisplayNamesById[sourceLabwareId]
        }
        destLabwareNickname={labwareNicknamesById[destLabwareId]}
        destLabwareDefDisplayName={labwareDefDisplayNamesById[destLabwareId]}
      />
    )
  }

  if (stepType === 'mix') {
    const mixLabwareId = rawForm['labware']
    result.push(
      <MixHeader
        key="mix-header"
        volume={rawForm.volume}
        times={rawForm.times}
        labwareNickname={labwareNicknamesById[mixLabwareId]}
        labwareDefDisplayName={labwareDefDisplayNamesById[mixLabwareId]}
      />
    )
  }

  // non-header substeps
  if (
    substeps &&
    (substeps.commandCreatorFnName === 'transfer' ||
      substeps.commandCreatorFnName === 'consolidate' ||
      substeps.commandCreatorFnName === 'distribute' ||
      substeps.commandCreatorFnName === 'mix')
  ) {
    result.push(
      <SourceDestSubstep
        key="substeps"
        ingredNames={ingredNames}
        substeps={substeps}
        hoveredSubstep={hoveredSubstep}
        selectSubstep={highlightSubstep}
      />
    )
  }

  return result
}
