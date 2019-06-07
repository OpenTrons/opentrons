// @flow
import * as React from 'react'
import cx from 'classnames'
import { Link } from 'react-router-dom'

import {
  selectors as robotSelectors,
  actions as robotActions,
  type Labware,
  type SessionModule,
} from '../../robot'
import { getLatestLabwareDef } from '../../util'

import {
  LabwareNameOverlay,
  // ModuleNameOverlay,
  LabwareWrapper,
  LabwareRender,
  Labware as LabwareComponent,
  humanizeLabwareType,
  type LabwareComponentProps,
} from '@opentrons/components'

import LabwareSpinner from './LabwareSpinner'
import styles from './styles.css'

export type LabwareItemProps = {
  ...$Exact<LabwareComponentProps>,
  labware: {
    ...$Exact<Labware>,
    highlighted?: boolean,
    disabled?: boolean,
    showSpinner?: boolean,
    onClick?: () => void,
    url?: string,
  },
  module: ?SessionModule,
}

export default function LabwareItem(props: LabwareItemProps) {
  const { labware, highlighted, areTipracksConfirmed, handleClick } = props

  const { isTiprack, confirmed, name, type, slot } = labware

  const showSpinner = highlighted && labware.calibration === 'moving-to-slot'
  const disabled =
    (isTiprack && confirmed) || (!isTiprack && !areTipracksConfirmed)

  const labwareClass = cx({ [styles.disabled]: disabled })
  const title = humanizeLabwareType(type)

  let item

  if (labware.isLegacy) {
    item = (
      <LabwareWrapper highlighted={highlighted}>
        <g className={labwareClass}>
          <LabwareComponent labwareType={type} />

          {showSpinner ? (
            <LabwareSpinner />
          ) : (
            <LabwareNameOverlay title={title} subtitle={name} />
          )
          // module && <ModuleNameOverlay name={module.name} />
          }
        </g>
      </LabwareWrapper>
    )
  } else {
    item = <LabwareRender definition={getLatestLabwareDef(type)} />
  }
  // const v2LabwareDef = getLabwareDefinition(loadName, namespace, version)
  if (!showSpinner && !disabled) {
    return (
      <Link to={`/calibrate/labware/${slot}`} onClick={handleClick}>
        {item}
      </Link>
    )
  }

  return item
}

function mapStateToProps(state: State, ownProps: OP): SP {
  return {
    _calibrator:
      ownProps.labware.calibratorMount ||
      robotSelectors.getCalibratorMount(state),
  }
}

function mergeProps(stateProps: SP, dispatchProps: DP, ownProps: OP): Props {
  const { labware } = ownProps
  const { dispatch } = dispatchProps
  const { _calibrator } = stateProps
  return {
    ...ownProps,
    handleClick: () => {
      if (_calibrator && (!labware.isTiprack || !labware.confirmed)) {
        dispatch(robotActions.moveTo(_calibrator, labware.slot))
      }
    },
  }
}
