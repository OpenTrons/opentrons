// @flow
import * as React from 'react'
import { useSelector } from 'react-redux'
import cx from 'classnames'
import { RobotCoordsForeignDiv } from '@opentrons/components'
import {
  MAGNETIC_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  type ModuleRealType,
} from '@opentrons/shared-data'
import { i18n } from '../../localization'
import { timelineFrameBeforeActiveItem } from '../../top-selectors/timelineFrames'
import { selectors as stepFormSelectors } from '../../step-forms'
import {
  STD_SLOT_X_DIM,
  STD_SLOT_Y_DIM,
  TEMPERATURE_AT_TARGET,
  TEMPERATURE_APPROACHING_TARGET,
  TEMPERATURE_DEACTIVATED,
} from '../../constants'
import * as uiSelectors from '../../ui/steps'
import { getLabwareOnModule } from '../../ui/modules/utils'
import { getModuleVizDims } from './getModuleVizDims'
import styles from './ModuleTag.css'
import type { ModuleOrientation } from '../../types'
import type {
  ModuleTemporalProperties,
  TemperatureModuleState,
} from '../../step-forms'

type Props = {|
  x: number,
  y: number,
  orientation: ModuleOrientation,
  id: string,
|}

// eyeballed width/height to match designs
const STANDARD_TAG_HEIGHT = 50
const STANDARD_TAG_WIDTH = 65
// thermocycler has its slot farther right = more width, and it has more lines of content = more height
const THERMOCYCLER_TAG_HEIGHT = 70
const THERMOCYCLER_TAG_WIDTH = 75

function getTempStatus(temperatureModuleState: TemperatureModuleState): string {
  const { targetTemperature, status } = temperatureModuleState

  if (status === TEMPERATURE_DEACTIVATED || targetTemperature === null) {
    return i18n.t(`modules.status.deactivated`)
  }

  if (status === TEMPERATURE_AT_TARGET) {
    return `${targetTemperature} ${i18n.t('application.units.degrees')}`
  }

  if (status === TEMPERATURE_APPROACHING_TARGET) {
    return `Going to ${targetTemperature} ${i18n.t(
      'application.units.degrees'
    )}`
  }

  console.warn(`Temperature status ${status} is not implemented`)
  return ''
}

export const ModuleStatus = ({
  moduleState,
}: {|
  moduleState: $PropertyType<ModuleTemporalProperties, 'moduleState'>,
|}) => {
  switch (moduleState.type) {
    case MAGNETIC_MODULE_TYPE:
      return (
        <div className={styles.module_status_line}>
          {i18n.t(
            `modules.status.${moduleState.engaged ? 'engaged' : 'disengaged'}`
          )}
        </div>
      )

    case TEMPERATURE_MODULE_TYPE:
      const tempStatus = getTempStatus(moduleState)
      return <div className={styles.module_status_line}>{tempStatus}</div>

    case THERMOCYCLER_MODULE_TYPE:
      // TODO IMMEDIATELY use i18n added in substeps PR
      // and temperature test function
      const makeTemperatureText = (temperature: number | null): string =>
        temperature === null
          ? 'Deactivated'
          : `${temperature} ${i18n.t('application.units.degrees')}`

      return (
        <>
          {/* <div className={styles.module_status_line}>Block,</div>
          <div className={styles.module_status_line}>
            {'  - ' + makeTemperatureText(moduleState.blockTargetTemp)}
          </div>
          <div className={styles.module_status_line}>
            Lid ({moduleState.lidOpen ? 'open' : 'closed'}),
          </div>
          <div className={styles.module_status_line}>
            {'  - ' + makeTemperatureText(moduleState.lidTargetTemp)}
          </div> */}

          <div className={styles.module_status_line}>
            Block, {makeTemperatureText(moduleState.blockTargetTemp)}
          </div>
          <div />
          <div
            className={cx(
              styles.module_status_line,
              styles.new_module_status_line
            )}
          >
            Lid ({moduleState.lidOpen ? 'open' : 'closed'}),{' '}
            {makeTemperatureText(moduleState.lidTargetTemp)}
          </div>
        </>
      )

    default:
      console.warn(
        `ModuleStatus doesn't support module type ${moduleState.type}`
      )
      return null
  }
}

const ModuleTagComponent = (props: Props) => {
  const timelineFrame = useSelector(timelineFrameBeforeActiveItem)
  const moduleEntity = useSelector(stepFormSelectors.getModuleEntities)[
    props.id
  ]
  const moduleState: ?$PropertyType<ModuleTemporalProperties, 'moduleState'> =
    timelineFrame.robotState.modules[props.id]?.moduleState
  const moduleType: ?ModuleRealType = moduleEntity?.type

  const hoveredLabwares = useSelector(uiSelectors.getHoveredStepLabware)
  const initialDeck = useSelector(stepFormSelectors.getInitialDeckSetup)
  const moduleLabware = getLabwareOnModule(initialDeck, props.id)

  const isHoveredModuleStep =
    moduleLabware && hoveredLabwares.length
      ? hoveredLabwares[0] === moduleLabware.id
      : false

  if (moduleType == null || moduleState == null) {
    // this should never happen, but better to have an empty tag than to whitescreen
    console.error(
      `nullsy moduleType or moduleState for module "${props.id}" in the selected timeline frame`
    )
    return null
  }

  let tagHeight = STANDARD_TAG_HEIGHT
  let tagWidth = STANDARD_TAG_WIDTH

  if (moduleType === THERMOCYCLER_MODULE_TYPE) {
    tagHeight = THERMOCYCLER_TAG_HEIGHT
    tagWidth = THERMOCYCLER_TAG_WIDTH
  }

  const { childXOffset, childYOffset } = getModuleVizDims(
    props.orientation,
    moduleType
  )
  return (
    <RobotCoordsForeignDiv
      x={
        props.x +
        (props.orientation === 'left'
          ? childXOffset - tagWidth
          : STD_SLOT_X_DIM + childXOffset)
      }
      y={props.y + childYOffset + (STD_SLOT_Y_DIM - tagHeight) / 2}
      height={tagHeight}
      width={tagWidth}
      innerDivProps={{
        'data-test': `ModuleTag_${moduleType}`,
        className: cx(styles.module_info_tag, {
          [styles.highlighted_border_right_none]:
            isHoveredModuleStep && props.orientation === 'left',
          [styles.highlighted_border_left_none]:
            isHoveredModuleStep && props.orientation === 'right',
        }),
      }}
    >
      <div className={cx(styles.module_info_type, styles.module_info_line)}>
        {i18n.t(`modules.module_display_names.${moduleType}`)}
      </div>
      <div className={styles.module_info_line}>
        <ModuleStatus moduleState={moduleState} />
      </div>
    </RobotCoordsForeignDiv>
  )
}

export const ModuleTag = React.memo<Props>(ModuleTagComponent)
