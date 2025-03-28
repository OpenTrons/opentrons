import { useCreateLiveCommandMutation } from '@opentrons/react-api-client'
import { useTranslation } from 'react-i18next'
import {
  MenuItem,
  NO_WRAP,
  Tooltip,
  useHoverTooltip,
} from '@opentrons/components'
import {
  HEATERSHAKER_MODULE_TYPE,
  MAGNETIC_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
} from '@opentrons/shared-data'

import {
  useCurrentRunId,
  useMostRecentCompletedAnalysis,
} from '/app/resources/runs'

import type {
  HeaterShakerCloseLatchCreateCommand,
  HeaterShakerDeactivateHeaterCreateCommand,
  HeaterShakerDeactivateShakerCreateCommand,
  HeaterShakerOpenLatchCreateCommand,
  MagneticModuleDisengageCreateCommand,
  TCCloseLidCreateCommand,
  TCDeactivateBlockCreateCommand,
  TCDeactivateLidCreateCommand,
  TCOpenLidCreateCommand,
  TemperatureModuleDeactivateCreateCommand,
} from '@opentrons/shared-data'

import type { AttachedModule } from '/app/redux/modules/types'

export function useIsHeaterShakerInProtocol(): boolean {
  const currentRunId = useCurrentRunId()
  const robotProtocolAnalysis = useMostRecentCompletedAnalysis(currentRunId)
  if (robotProtocolAnalysis == null) return false

  return robotProtocolAnalysis.modules.some(
    module => module.model === 'heaterShakerModuleV1'
  )
}
interface LatchControls {
  toggleLatch: () => void
  isLatchClosed: boolean
}

export function useLatchControls(module: AttachedModule): LatchControls {
  const { createLiveCommand } = useCreateLiveCommandMutation()
  const isLatchClosed =
    module.moduleType === 'heaterShakerModuleType' &&
    (module.data.labwareLatchStatus === 'idle_closed' ||
      module.data.labwareLatchStatus === 'closing')

  const latchCommand:
    | HeaterShakerOpenLatchCreateCommand
    | HeaterShakerCloseLatchCreateCommand = {
    commandType: isLatchClosed
      ? 'heaterShaker/openLabwareLatch'
      : 'heaterShaker/closeLabwareLatch',
    params: {
      moduleId: module.id,
    },
  }

  const toggleLatch = (): void => {
    createLiveCommand({
      command: latchCommand,
    }).catch((e: Error) => {
      console.error(
        `error setting module status with command type ${latchCommand.commandType}: ${e.message}`
      )
    })
  }

  return { toggleLatch, isLatchClosed }
}
export type MenuItemsByModuleType = {
  [moduleType in AttachedModule['moduleType']]: Array<{
    setSetting: string
    isSettingDisabled: boolean
    isSecondary: boolean
    menuButtons: JSX.Element[] | null
    onClick: (isSecondary: boolean) => void
  }>
}
interface ModuleOverflowMenu {
  menuOverflowItemsByModuleType: MenuItemsByModuleType
}

type deactivateCommandTypes =
  | 'thermocycler/deactivateLid'
  | 'thermocycler/deactivateBlock'
  | 'temperatureModule/deactivate'
  | 'magneticModule/disengage'
  | 'heaterShaker/deactivateShaker'
  | 'heaterShaker/deactivateHeater'

export function useModuleOverflowMenu(
  module: AttachedModule,
  handleAboutClick: () => void,
  handleTestShakeClick: () => void,
  handleInstructionsClick: () => void,
  handleSlideoutClick: (isSecondary: boolean) => void,
  isDisabled: boolean,
  isIncompatibleWithOT3: boolean
): ModuleOverflowMenu {
  const { t } = useTranslation(['device_details', 'heater_shaker'])
  const { createLiveCommand } = useCreateLiveCommandMutation()
  const { toggleLatch, isLatchClosed } = useLatchControls(module)
  const [targetProps, tooltipProps] = useHoverTooltip()

  const isLatchDisabled =
    module.moduleType === HEATERSHAKER_MODULE_TYPE &&
    module.data.speedStatus !== 'idle'

  const labwareLatchBtn = (
    <>
      <MenuItem
        key={`hs_labware_latch_${String(module.moduleModel)}`}
        data-testid={`hs_labware_latch_${String(module.moduleModel)}`}
        onClick={toggleLatch}
        disabled={isLatchDisabled || isDisabled}
        {...targetProps}
      >
        {t(
          isLatchClosed
            ? 'heater_shaker:open_labware_latch'
            : 'heater_shaker:close_labware_latch',
          {}
        )}
      </MenuItem>
      {isLatchDisabled ? (
        <Tooltip tooltipProps={tooltipProps}>
          {t('heater_shaker:cannot_open_latch')}
        </Tooltip>
      ) : null}
    </>
  )

  const aboutModuleBtn = (
    <MenuItem
      key={`about_module_${String(module.moduleModel)}`}
      id={`about_module_${String(module.moduleModel)}`}
      data-testid={`about_module_${String(module.moduleModel)}`}
      disabled={isIncompatibleWithOT3}
      onClick={() => {
        handleAboutClick()
      }}
    >
      {t('overflow_menu_about')}
    </MenuItem>
  )

  const attachToDeckBtn = (
    <MenuItem
      key={`hs_attach_to_deck_${String(module.moduleModel)}`}
      data-testid={`hs_attach_to_deck_${String(module.moduleModel)}`}
      onClick={() => {
        handleInstructionsClick()
      }}
      whiteSpace={NO_WRAP}
    >
      {t('heater_shaker:show_attachment_instructions')}
    </MenuItem>
  )
  const testShakeBtn =
    module.moduleType === HEATERSHAKER_MODULE_TYPE &&
    module.data.speedStatus !== 'idle' ? (
      <MenuItem
        key={`test_shake_${String(module.moduleModel)}`}
        id={`test_shake_${String(module.moduleModel)}`}
        data-testid={`test_shake_${String(module.moduleModel)}`}
        disabled={isDisabled}
        onClick={() => {
          handleDeactivationCommand('heaterShaker/deactivateShaker')
        }}
      >
        {t('heater_shaker:deactivate_shaker')}
      </MenuItem>
    ) : (
      <MenuItem
        onClick={() => {
          handleTestShakeClick()
        }}
        key={`hs_test_shake_btn_${String(module.moduleModel)}`}
        disabled={isDisabled}
      >
        {t('heater_shaker:test_shake')}
      </MenuItem>
    )

  const handleDeactivationCommand = (
    deactivateModuleCommandType: deactivateCommandTypes
  ): void => {
    const deactivateCommand:
      | TemperatureModuleDeactivateCreateCommand
      | MagneticModuleDisengageCreateCommand
      | HeaterShakerDeactivateHeaterCreateCommand
      | TCDeactivateLidCreateCommand
      | TCDeactivateBlockCreateCommand
      | HeaterShakerDeactivateShakerCreateCommand = {
      commandType: deactivateModuleCommandType,
      params: {
        moduleId: module.id,
      },
    }
    createLiveCommand({
      command: deactivateCommand,
    }).catch((e: Error) => {
      console.error(
        `error setting module status with command type ${deactivateCommand.commandType}: ${e.message}`
      )
    })
  }

  const lidCommand: TCOpenLidCreateCommand | TCCloseLidCreateCommand = {
    commandType:
      module.moduleType === THERMOCYCLER_MODULE_TYPE &&
      module.data.lidStatus === 'open'
        ? 'thermocycler/closeLid'
        : 'thermocycler/openLid',
    params: {
      moduleId: module.id,
    },
  }

  const controlTCLid = (): void => {
    createLiveCommand({
      command: lidCommand,
    }).catch((e: Error) => {
      console.error(
        `error setting thermocycler module status with command type ${lidCommand.commandType}: ${e.message}`
      )
    })
  }

  const sendBlockTempCommand =
    module.moduleType === THERMOCYCLER_MODULE_TYPE &&
    module.data.targetTemperature != null
      ? () => {
          handleDeactivationCommand('thermocycler/deactivateBlock')
        }
      : () => {
          handleSlideoutClick(false)
        }

  const thermoSetBlockTempBtn = (
    <MenuItem
      key={`thermocycler_block_temp_command_btn_${String(module.moduleModel)}`}
      onClick={sendBlockTempCommand}
      disabled={isDisabled}
      whiteSpace={NO_WRAP}
    >
      {module.data.status !== 'idle'
        ? t('overflow_menu_deactivate_block')
        : t('overflow_menu_set_block_temp')}
    </MenuItem>
  )

  const menuOverflowItemsByModuleType = {
    thermocyclerModuleType: [
      {
        setSetting:
          module.moduleType === THERMOCYCLER_MODULE_TYPE &&
          module.data.lidTargetTemperature != null
            ? t('overflow_menu_deactivate_lid')
            : t('overflow_menu_lid_temp'),
        isSettingDisabled: isDisabled,
        isSecondary: true,
        menuButtons: null,
        onClick:
          module.moduleType === THERMOCYCLER_MODULE_TYPE &&
          module.data.lidTargetTemperature != null
            ? () => {
                handleDeactivationCommand('thermocycler/deactivateLid')
              }
            : () => {
                handleSlideoutClick(true)
              },
      },
      {
        setSetting:
          module.moduleType === THERMOCYCLER_MODULE_TYPE &&
          module.data.lidStatus === 'open'
            ? t('close_lid')
            : t('open_lid'),
        isSettingDisabled: isDisabled,
        isSecondary: false,
        menuButtons: [thermoSetBlockTempBtn, aboutModuleBtn],
        onClick: controlTCLid,
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
        isSettingDisabled: isDisabled,
        menuButtons: [aboutModuleBtn],
        onClick:
          module.data.status !== 'idle'
            ? () => {
                handleDeactivationCommand('temperatureModule/deactivate')
              }
            : () => {
                handleSlideoutClick(false)
              },
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
        isSettingDisabled: isDisabled,
        menuButtons: [aboutModuleBtn],
        onClick:
          module.data.status !== 'disengaged'
            ? () => {
                handleDeactivationCommand('magneticModule/disengage')
              }
            : () => {
                handleSlideoutClick(false)
              },
      },
    ],
    heaterShakerModuleType: [
      {
        setSetting:
          module.moduleType === HEATERSHAKER_MODULE_TYPE &&
          module.data.temperatureStatus !== 'idle'
            ? t('heater_shaker:deactivate_heater')
            : t('heater_shaker:set_temperature'),
        isSecondary: false,
        isSettingDisabled: isDisabled,
        menuButtons: [
          labwareLatchBtn,
          aboutModuleBtn,
          attachToDeckBtn,
          testShakeBtn,
        ],
        onClick:
          module.moduleType === HEATERSHAKER_MODULE_TYPE &&
          module.data.temperatureStatus !== 'idle' &&
          module.data.status !== 'idle'
            ? () => {
                handleDeactivationCommand('heaterShaker/deactivateHeater')
              }
            : () => {
                handleSlideoutClick(false)
              },
      },
    ],
    absorbanceReaderType: [
      {
        setSetting: t('overflow_menu_about'),
        isSecondary: false,
        isSettingDisabled: false,
        menuButtons: [],
        onClick: handleAboutClick,
      },
    ],
    flexStackerModuleType: [
      {
        setSetting: t('overflow_menu_about'),
        isSecondary: false,
        isSettingDisabled: false,
        menuButtons: [],
        onClick: handleAboutClick,
      },
    ],
  }

  return {
    menuOverflowItemsByModuleType,
  }
}
