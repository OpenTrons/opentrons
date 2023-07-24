import * as React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import isEmpty from 'lodash/isEmpty'

import {
  FormGroup,
  PipetteSelect,
  OutlineButton,
  Mount,
  Flex,
} from '@opentrons/components'
import {
  getIncompatiblePipetteNames,
  OT2_PIPETTES,
  OT2_ROBOT_TYPE,
  OT3_PIPETTES,
  RobotType,
} from '@opentrons/shared-data'
import { i18n } from '../../../localization'
import { createCustomTiprackDef } from '../../../labware-defs/actions'
import { getLabwareDefsByURI } from '../../../labware-defs/selectors'
import { FormPipettesByMount } from '../../../step-forms'
import { getAllowAllTipracks } from '../../../feature-flags/selectors'
import { getTiprackOptions } from '../utils'
import { PipetteDiagram } from './PipetteDiagram'
import { TiprackSelect } from './TiprackSelect'

import formStyles from '../../forms/forms.css'
import styles from './FilePipettesModal.css'

import type { PipetteName } from '@opentrons/shared-data'

export interface Props {
  initialTabIndex?: number
  values: FormPipettesByMount
  onSetFieldValue: (field: string, value: any) => void
  onSetFieldTouched: (field: string, touched: boolean) => void
  robotType: RobotType
}
interface PipetteSelectProps {
  mount: Mount
  tabIndex: number
  nameBlocklist?: string[]
}

interface TiprackSelectProps {
  mount: Mount
  robotType: RobotType
}

export function PipetteFields(props: Props): JSX.Element {
  const { values, onSetFieldValue, onSetFieldTouched, robotType } = props

  const allowAllTipracks = useSelector(getAllowAllTipracks)
  const dispatch = useDispatch()
  const allLabware = useSelector(getLabwareDefsByURI)

  const initialTabIndex = props.initialTabIndex || 1

  const renderTiprackSelect = (
    props: TiprackSelectProps
  ): JSX.Element | null => {
    const { mount } = props
    const selectedPipetteName = values[mount].pipetteName
    const tiprackOptions = getTiprackOptions({
      allLabware: allLabware,
      allowAllTipracks: allowAllTipracks,
      selectedPipetteName: selectedPipetteName,
    })

    return (
      <TiprackSelect
        mount={mount}
        tiprackOptions={tiprackOptions}
        values={values}
        onSetFieldValue={onSetFieldValue}
      />
    )
  }

  const renderPipetteSelect = (props: PipetteSelectProps): JSX.Element => {
    const { tabIndex, mount } = props
    const pipetteName = values[mount].pipetteName
    return (
      <Flex width="15rem">
        <PipetteSelect
          nameBlocklist={
            //  filtering out 96-channel for Flex for now
            robotType === OT2_ROBOT_TYPE
              ? OT3_PIPETTES
              : [...OT2_PIPETTES, 'p1000_96']
          }
          enableNoneOption
          tabIndex={tabIndex}
          pipetteName={pipetteName != null ? pipetteName : null}
          onPipetteChange={pipetteName => {
            const nameAccessor = `pipettesByMount.${mount}.pipetteName`
            const value = pipetteName
            const targetToClear = `pipettesByMount.${mount}.tiprackDefURI`
            // this select does not return an event so we have to manually set the field val
            onSetFieldValue(nameAccessor, value)
            onSetFieldValue(targetToClear, null)
            onSetFieldTouched(targetToClear, false)
          }}
          id={`PipetteSelect_${mount}`}
          className={styles.pipette_select}
        />
      </Flex>
    )
  }

  return (
    <>
      <div className={styles.mount_fields_row}>
        <div className={styles.mount_column}>
          <FormGroup
            key="leftPipetteModel"
            label={i18n.t('modal.pipette_fields.left_pipette')}
            className={formStyles.stacked_row}
          >
            {renderPipetteSelect({
              mount: 'left',
              tabIndex: initialTabIndex + 1,
              nameBlocklist: getIncompatiblePipetteNames(
                values.right.pipetteName as PipetteName
              ),
            })}
          </FormGroup>
          <FormGroup
            disabled={isEmpty(values.left.pipetteName)}
            key={'leftTiprackModel'}
            label={i18n.t('modal.pipette_fields.left_tiprack')}
            className={formStyles.stacked_row}
          >
            {renderTiprackSelect({ mount: 'left', robotType })}{' '}
          </FormGroup>
        </div>
        <PipetteDiagram
          leftPipette={values.left.pipetteName}
          rightPipette={values.right.pipetteName}
        />
        <div className={styles.mount_column}>
          <FormGroup
            key="rightPipetteModel"
            label={i18n.t('modal.pipette_fields.right_pipette')}
            className={formStyles.stacked_row}
          >
            {renderPipetteSelect({
              mount: 'right',
              tabIndex: initialTabIndex + 3,
              nameBlocklist: getIncompatiblePipetteNames(
                values.left.pipetteName as PipetteName
              ),
            })}
          </FormGroup>
          <FormGroup
            disabled={isEmpty(values.right.pipetteName)}
            key={'rightTiprackModel'}
            label={i18n.t('modal.pipette_fields.right_tiprack')}
            className={formStyles.stacked_row}
          >
            {renderTiprackSelect({ mount: 'right', robotType })}
          </FormGroup>
        </div>
      </div>
      <div>
        <OutlineButton Component="label" className={styles.upload_button}>
          {i18n.t('button.upload_custom_tip_rack')}
          <input
            type="file"
            onChange={e => dispatch(createCustomTiprackDef(e))}
          />
        </OutlineButton>
      </div>
    </>
  )
}
