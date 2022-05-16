import * as React from 'react'
import {
  useCreateCommandMutation,
  useCreateLiveCommandMutation,
} from '@opentrons/react-api-client'
import { useTranslation } from 'react-i18next'
import { useHoverTooltip } from '@opentrons/components'
import {
  CreateCommand,
  HEATERSHAKER_MODULE_TYPE,
  MAGNETIC_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
} from '@opentrons/shared-data'
import standardDeckDef from '@opentrons/shared-data/deck/definitions/2/ot2_standard.json'
import { getProtocolModulesInfo } from '../../Devices/ProtocolRun/utils/getProtocolModulesInfo'
import { MenuItem } from '../../../atoms/MenuList/MenuItem'
import { Tooltip } from '../../../atoms/Tooltip'
import { useCurrentRunId } from '../../ProtocolUpload/hooks'
import { useProtocolDetailsForRun } from '../hooks'

import type {
  HeaterShakerCloseLatchCreateCommand,
  HeaterShakerDeactivateHeaterCreateCommand,
  HeaterShakerOpenLatchCreateCommand,
  HeaterShakerStopShakeCreateCommand,
  MagneticModuleDisengageMagnetCreateCommand,
  TCDeactivateBlockCreateCommand,
  TCDeactivateLidCreateCommand,
  TemperatureModuleDeactivateCreateCommand,
} from '@opentrons/shared-data/protocol/types/schemaV6/command/module'

import type { AttachedModule } from '../../../redux/modules/types'

export function useIsHeaterShakerInProtocol(): boolean {
  const currentRunId = useCurrentRunId()
  const { protocolData } = useProtocolDetailsForRun(currentRunId)
  if (protocolData == null) return false
  const protocolModulesInfo = getProtocolModulesInfo(
    protocolData,
    standardDeckDef as any
  )
  return protocolModulesInfo.some(
    module => module.moduleDef.model === 'heaterShakerModuleV1'
  )
}
interface LatchControls {
  toggleLatch: () => void
  isLatchClosed: boolean
}

export function useLatchControls(
  module: AttachedModule,
  runId?: string | null
): LatchControls {
  const { createLiveCommand } = useCreateLiveCommandMutation()
  const { createCommand } = useCreateCommandMutation()

  const isLatchClosed =
    module.moduleType === 'heaterShakerModuleType' &&
    (module.data.labwareLatchStatus === 'idle_closed' ||
      module.data.labwareLatchStatus === 'closing')

  const latchCommand:
    | HeaterShakerOpenLatchCreateCommand
    | HeaterShakerCloseLatchCreateCommand = {
    commandType: isLatchClosed
      ? 'heaterShakerModule/openLatch'
      : 'heaterShakerModule/closeLatch',
    params: { moduleId: module.id },
  }

  const toggleLatch = (): void => {
    if (runId != null) {
      createCommand({
        runId: runId,
        command: latchCommand,
      }).catch((e: Error) => {
        console.error(
          `error setting module status with command type ${latchCommand.commandType} and run id ${runId}: ${e.message}`
        )
      })
    } else {
      createLiveCommand({
        command: latchCommand,
      }).catch((e: Error) => {
        console.error(
          `error setting module status with command type ${latchCommand.commandType}: ${e.message}`
        )
      })
    }
  }
  return { toggleLatch, isLatchClosed }
}
export type MenuItemsByModuleType = {
  [moduleType in AttachedModule['moduleType']]: Array<{
    setSetting: string
    isSecondary: boolean
    disabledReason: boolean
    menuButtons: JSX.Element[] | null
    onClick: (isSecondary: boolean) => void
  }>
}
interface ModuleOverflowMenu {
  menuOverflowItemsByModuleType: MenuItemsByModuleType
}

export function useModuleOverflowMenu(
  module: AttachedModule,
  runId: string | null = null,
  handleAboutClick: () => void,
  handleTestShakeClick: () => void,
  handleWizardClick: () => void,
  handleSlideoutClick: (isSecondary: boolean) => void
): ModuleOverflowMenu {
  const { t } = useTranslation(['device_details', 'heater_shaker'])
  const { createLiveCommand } = useCreateLiveCommandMutation()
  const { createCommand } = useCreateCommandMutation()
  const { toggleLatch, isLatchClosed } = useLatchControls(module, runId)
  const [targetProps, tooltipProps] = useHoverTooltip()

  let deactivateModuleCommandType: CreateCommand['commandType']
  switch (module.moduleType) {
    case 'temperatureModuleType': {
      deactivateModuleCommandType = 'temperatureModule/deactivate'
      break
    }
    case 'magneticModuleType': {
      deactivateModuleCommandType = 'magneticModule/disengageMagnet'
      break
    }
    case 'thermocyclerModuleType': {
      deactivateModuleCommandType =
        module.data.lidTargetTemperature !== null &&
        module.data.status !== 'idle'
          ? 'thermocycler/deactivateLid'
          : 'thermocycler/deactivateBlock'
      break
    }
    case 'heaterShakerModuleType': {
      deactivateModuleCommandType =
        module.data.speedStatus !== 'idle'
          ? 'heaterShakerModule/stopShake'
          : 'heaterShakerModule/deactivateHeater'
      break
    }
  }

  const deactivateCommand:
    | TemperatureModuleDeactivateCreateCommand
    | MagneticModuleDisengageMagnetCreateCommand
    | HeaterShakerDeactivateHeaterCreateCommand
    | TCDeactivateLidCreateCommand
    | TCDeactivateBlockCreateCommand
    | HeaterShakerStopShakeCreateCommand = {
    commandType: deactivateModuleCommandType,
    params: { moduleId: module.id },
  }

  const isLatchDisabled =
    module.moduleType === HEATERSHAKER_MODULE_TYPE &&
    module.data.speedStatus !== 'idle'

  const labwareLatchBtn = (
    <>
      <MenuItem
        minWidth="10.6rem"
        key={`hs_labware_latch_${module.moduleModel}`}
        data-testid={`hs_labware_latch_${module.moduleModel}`}
        onClick={toggleLatch}
        disabled={isLatchDisabled}
        {...targetProps}
      >
        {t(isLatchClosed ? 'open_labware_latch' : 'close_labware_latch', {
          ns: 'heater_shaker',
        })}
      </MenuItem>
      {isLatchDisabled ? (
        <Tooltip tooltipProps={tooltipProps}>
          {t('cannot_open_latch', { ns: 'heater_shaker' })}
        </Tooltip>
      ) : null}
    </>
  )

  const aboutModuleBtn = (
    <MenuItem
      minWidth="10.6rem"
      key={`about_module_${module.moduleModel}`}
      id={`about_module_${module.moduleModel}`}
      data-testid={`about_module_${module.moduleModel}`}
      onClick={() => handleAboutClick()}
    >
      {t('overflow_menu_about')}
    </MenuItem>
  )

  const attachToDeckBtn = (
    <MenuItem
      minWidth="10.6rem"
      key={`hs_attach_to_deck_${module.moduleModel}`}
      data-testid={`hs_attach_to_deck_${module.moduleModel}`}
      onClick={() => handleWizardClick()}
    >
      {t('how_to_attach_to_deck', { ns: 'heater_shaker' })}
    </MenuItem>
  )
  const testShakeBtn = (
    <MenuItem
      minWidth="10.6rem"
      onClick={() => handleTestShakeClick()}
      key={`hs_test_shake_btn_${module.moduleModel}`}
    >
      {t('test_shake', { ns: 'heater_shaker' })}
    </MenuItem>
  )

  const handleDeactivationCommand = (): void => {
    if (runId != null) {
      createCommand({
        runId: runId,
        command: deactivateCommand,
      }).catch((e: Error) => {
        console.error(
          `error setting module status with command type ${deactivateCommand.commandType} and run id ${runId}: ${e.message}`
        )
      })
    } else {
      createLiveCommand({
        command: deactivateCommand,
      }).catch((e: Error) => {
        console.error(
          `error setting module status with command type ${deactivateCommand.commandType}: ${e.message}`
        )
      })
    }
  }

  const onClick =
    module.data.status !== 'idle'
      ? () => handleDeactivationCommand()
      : () => handleSlideoutClick(false)

  const menuOverflowItemsByModuleType = {
    thermocyclerModuleType: [
      {
        setSetting:
          module.moduleType === THERMOCYCLER_MODULE_TYPE &&
          module.data.lidTargetTemperature !== null
            ? t('overflow_menu_deactivate_lid')
            : t('overflow_menu_lid_temp'),
        isSecondary: true,
        disabledReason: false,
        menuButtons: null,
        onClick:
          module.moduleType === THERMOCYCLER_MODULE_TYPE &&
          module.data.lidTargetTemperature !== null
            ? () => handleDeactivationCommand()
            : () => handleSlideoutClick(true),
      },
      {
        setSetting:
          module.moduleType === THERMOCYCLER_MODULE_TYPE &&
          module.data.status !== 'idle'
            ? t('overflow_menu_deactivate_block')
            : t('overflow_menu_set_block_temp'),
        isSecondary: false,
        disabledReason: false,
        menuButtons: [aboutModuleBtn],
        onClick: onClick,
      },
    ],
    temperatureModuleType: [
      {
        setSetting:
          module.moduleType === TEMPERATURE_MODULE_TYPE &&
          module.data.status !== 'idle'
            ? t('overflow_menu_deactivate_temp')
            : t('overflow_menu_mod_temp'),
        isSecondary: false,
        disabledReason: false,
        menuButtons: [aboutModuleBtn],
        onClick: onClick,
      },
    ],
    magneticModuleType: [
      {
        setSetting:
          module.moduleType === MAGNETIC_MODULE_TYPE &&
          module.data.status !== 'disengaged'
            ? t('overflow_menu_disengage')
            : t('overflow_menu_engage'),

        isSecondary: false,
        disabledReason: false,
        menuButtons: [aboutModuleBtn],
        onClick:
          module.data.status !== 'disengaged'
            ? () => handleDeactivationCommand()
            : () => handleSlideoutClick(false),
      },
    ],
    heaterShakerModuleType: [
      {
        setSetting:
          module.moduleType === HEATERSHAKER_MODULE_TYPE &&
          module.data.status !== 'idle'
            ? t('deactivate', { ns: 'heater_shaker' })
            : t('set_temperature', { ns: 'heater_shaker' }),
        isSecondary: false,
        disabledReason: false,
        menuButtons: null,
        onClick: onClick,
      },
      {
        setSetting:
          module.moduleType === HEATERSHAKER_MODULE_TYPE &&
          module.data.status === 'idle'
            ? t('set_shake_speed', { ns: 'heater_shaker' })
            : t('stop_shaking', { ns: 'heater_shaker' }),
        isSecondary: true,
        disabledReason:
          module.moduleType === HEATERSHAKER_MODULE_TYPE &&
          (module.data.labwareLatchStatus === 'idle_open' ||
            module.data.labwareLatchStatus === 'opening'),
        menuButtons: [
          labwareLatchBtn,
          aboutModuleBtn,
          attachToDeckBtn,
          testShakeBtn,
        ],
        onClick:
          module.moduleType === HEATERSHAKER_MODULE_TYPE &&
          module.data.speedStatus !== 'idle'
            ? () => handleDeactivationCommand()
            : () => handleSlideoutClick(true),
      },
    ],
  }

  return {
    menuOverflowItemsByModuleType,
  }
}
