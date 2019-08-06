// @flow
import React, { useState } from 'react'
import { OutlineButton, AlertModal, InputField } from '@opentrons/components'
import { getModuleDisplayName } from '@opentrons/shared-data'
import type { ThermocyclerModule, ModuleCommandRequest } from '../../robot-api'
import { Portal } from '../portal'
import styles from './styles.css'

type Props = {
  module: ThermocyclerModule,
  sendModuleCommand: (serial: string, request: ModuleCommandRequest) => mixed,
}
const TemperatureControl = ({ module, sendModuleCommand }: Props) => {
  const [temperatureInput, setTemperatureInput] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const hasTarget = module.status !== 'idle'
  const handleClick = () => {
    if (hasTarget) {
      sendModuleCommand(module.serial, { command_type: 'deactivate' })
    } else {
      setIsModalOpen(true)
    }
  }

  const handleSubmitTemp = () => {
    sendModuleCommand(module.serial, {
      command_type: 'set_temperature',
      args: [Number(temperatureInput)],
    })
    setIsModalOpen(false)
  }
  const alertBody = `Pre heat or cool ${getModuleDisplayName(
    module.name
  )} base temperature.`
  return (
    <>
      {!hasTarget && isModalOpen && (
        <Portal>
          <AlertModal
            heading="Set Thermocycler Module Base Temp"
            iconName="None"
            buttons={[
              {
                children: 'Cancel',
                onClick: () => setIsModalOpen(false),
              },
              {
                children: 'Save',
                onClick: handleSubmitTemp,
              },
            ]}
            alertOverlay
          >
            <p>{alertBody}</p>
            <div className={styles.set_temp_field}>
              <label className={styles.set_temp_label}>Set Target Temp:</label>
              <InputField
                className={styles.set_temp_input}
                units="°C"
                value={temperatureInput}
                onChange={e => setTemperatureInput(e.target.value)}
              />
            </div>
          </AlertModal>
        </Portal>
      )}
      <OutlineButton
        onClick={handleClick}
        className={styles.temp_control_button}
      >
        {hasTarget ? 'Deactivate' : 'Set Temp'}
      </OutlineButton>
    </>
  )
}

export default TemperatureControl
