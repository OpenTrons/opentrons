// @flow
import React, { useState } from 'react'
import {
  OutlineButton,
  AlertModal,
  InputField,
  CheckboxField,
  HoverTooltip,
} from '@opentrons/components'
import { getModuleDisplayName } from '@opentrons/shared-data'
import type {
  ThermocyclerModule,
  TempDeckModule,
  ModuleCommandRequest,
} from '../../robot-api'
import { Portal } from '../portal'
import styles from './styles.css'

const CONNECT_FOR_CONTROL = 'Connect to robot to control modules'
type Props = {|
  module: ThermocyclerModule | TempDeckModule,
  sendModuleCommand: (serial: string, request: ModuleCommandRequest) => mixed,
  disabled?: boolean,
|}
const TemperatureControl = ({ module, sendModuleCommand, disabled }: Props) => {
  const [primaryTempValue, setPrimaryTempValue] = useState(null)
  const [secondaryTempValue, setSecondaryTempValue] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSecondaryTempEnabled, enableSecondaryTemp] = useState(false)

  const hasTarget = module.status !== 'idle' || Boolean(module.data.lidTarget)
  const handleClick = () => {
    if (hasTarget) {
      sendModuleCommand(module.serial, { command_type: 'deactivate' })
    } else {
      setIsModalOpen(true)
    }
  }

  const handleSubmitTemp = () => {
    if (primaryTempValue != null) {
      sendModuleCommand(module.serial, {
        command_type: 'set_temperature',
        args: [Number(primaryTempValue)],
      })
    }
    if (secondaryTempValue != null) {
      sendModuleCommand(module.serial, {
        command_type: 'set_lid_temperature',
        args: [Number(secondaryTempValue)],
      })
    }
    setIsModalOpen(false)
    setPrimaryTempValue(null)
    setSecondaryTempValue(null)
  }
  const isThermocycler = module.name === 'thermocycler'
  const displayName = getModuleDisplayName(module.name)
  const alertHeading = `Set ${displayName} Temp`
  const alertBody = `Pre heat or cool ${displayName}.`
  const primaryFieldLabel = `Set ${isThermocycler ? 'Base' : ''} Temp:`
  return (
    <>
      {!hasTarget && isModalOpen && (
        <Portal>
          <AlertModal
            heading={alertHeading}
            iconName={null}
            buttons={[
              {
                children: 'Cancel',
                onClick: () => setIsModalOpen(false),
              },
              {
                children: 'Save',
                disabled: primaryTempValue == null,
                onClick: handleSubmitTemp,
              },
            ]}
            alertOverlay
          >
            <p>{alertBody}</p>
            <div className={styles.input_wrapper}>
              <div className={styles.set_temp_field}>
                <label className={styles.set_temp_label}>
                  {primaryFieldLabel}
                </label>
                <InputField
                  units="°C"
                  value={primaryTempValue}
                  onChange={e => setPrimaryTempValue(e.target.value)}
                />
              </div>
              {isThermocycler && (
                <div className={styles.lid_temp_field}>
                  <CheckboxField
                    value={isSecondaryTempEnabled}
                    onChange={() =>
                      enableSecondaryTemp(!isSecondaryTempEnabled)
                    }
                  />
                  <p className={styles.lid_temp_label}>Lid Temp</p>
                  {isSecondaryTempEnabled && (
                    <InputField
                      units="°C"
                      value={secondaryTempValue}
                      onChange={e => setSecondaryTempValue(e.target.value)}
                    />
                  )}
                </div>
              )}
            </div>
          </AlertModal>
        </Portal>
      )}
      <HoverTooltip tooltipComponent={disabled ? CONNECT_FOR_CONTROL : null}>
        {hoverTooltipHandlers => (
          <div {...hoverTooltipHandlers}>
            <OutlineButton
              onClick={handleClick}
              disabled={disabled}
              className={styles.temp_control_button}
            >
              {hasTarget === true ? 'Deactivate' : 'Set Temp'}
            </OutlineButton>
          </div>
        )}
      </HoverTooltip>
    </>
  )
}

export default TemperatureControl
