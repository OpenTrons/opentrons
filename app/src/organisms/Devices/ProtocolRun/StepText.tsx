import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Flex, ALIGN_CENTER, SPACING, TYPOGRAPHY } from '@opentrons/components'
import { LoadedLabware } from '@opentrons/shared-data'
import { useRunQuery } from '@opentrons/react-api-client'
import { StyledText } from '../../../atoms/text'

import { useProtocolDetailsForRun } from '../hooks'
import { RunLogProtocolSetupInfo } from './RunLogProtocolSetupInfo'

import type { RunTimeCommand } from '@opentrons/shared-data'
import type { RunCommandSummary } from '@opentrons/api-client'

const TEMPORARY_LOCATION_STUB = 'a slot'

interface Props {
  analysisCommand: RunTimeCommand | null
  robotName: string
  runCommand: RunCommandSummary | null
  runId: string
}
export function StepText(props: Props): JSX.Element | null {
  const { analysisCommand, robotName, runCommand, runId } = props
  const { t } = useTranslation('commands_run_log')
  const { data: runRecord } = useRunQuery(runId, { staleTime: Infinity })
  const { protocolData } = useProtocolDetailsForRun(runId)

  let messageNode = null

  const labwareEntities: LoadedLabware[] =
    (runCommand !== null ? runRecord?.data?.labware : protocolData?.labware) ??
    []
  const displayCommand = runCommand !== null ? runCommand : analysisCommand

  if (displayCommand === null) {
    console.warn(
      'display command should never be null, command text could find no source'
    )
    return null
  }
  // protocolData should never be null as we don't render the `RunDetails` unless we have an analysis
  // but we're experiencing a zombie children issue, see https://github.com/Opentrons/opentrons/pull/9091
  if (protocolData == null) {
    console.warn(
      'protocolData never be null, command text could find no protocolData'
    )
    return null
  }
  // params will not exist on command summaries
  switch (displayCommand.commandType) {
    case 'delay': {
      messageNode = (
        <>
          <Flex
            textTransform={TYPOGRAPHY.textTransformUppercase}
            padding={SPACING.spacing2}
            id="RunDetails_CommandList"
          >
            {t('comment')}
          </Flex>
          {displayCommand != null ? displayCommand.result : null}
        </>
      )
      break
    }
    case 'dropTip': {
      const { wellName, labwareId } = displayCommand.params
      const definitionUri =
        labwareEntities.find(l => l.id === labwareId)?.definitionUri ?? ''
      messageNode = t('drop_tip', {
        well_name: wellName,
        labware: definitionUri,
        labware_location: TEMPORARY_LOCATION_STUB,
      })
      break
    }
    case 'pickUpTip': {
      const { wellName, labwareId } = displayCommand.params
      const definitionUri =
        labwareEntities.find(l => l.id === labwareId)?.definitionUri ?? ''
      messageNode = t('pickup_tip', {
        well_name: wellName,
        labware: definitionUri,
        labware_location: TEMPORARY_LOCATION_STUB,
      })
      break
    }
    case 'pause':
    case 'waitForResume': {
      messageNode = displayCommand.params?.message ?? t('wait_for_resume')
      break
    }
    case 'loadLabware':
    case 'loadPipette':
    case 'loadModule':
    case 'loadLiquid': {
      messageNode = (
        <RunLogProtocolSetupInfo
          robotName={robotName}
          runId={runId}
          setupCommand={displayCommand}
        />
      )
      break
    }
    case 'magneticModule/engage': {
      messageNode = t('engaging_magnetic_module')
      break
    }
    case 'magneticModule/disengage': {
      messageNode = t('disengaging_magnetic_module')
      break
    }
    case 'temperatureModule/setTargetTemperature': {
      const { celsius } = displayCommand.params
      messageNode = t('setting_temperature_module_temp', { temp: celsius })
      break
    }
    case 'temperatureModule/deactivate': {
      messageNode = t('deactivate_temperature_module')
      break
    }
    case 'temperatureModule/waitForTemperature': {
      const { celsius } = displayCommand.params
      messageNode = t('waiting_to_reach_temp_module', { temp: celsius })
      break
    }
    case 'thermocycler/setTargetBlockTemperature': {
      const { celsius } = displayCommand.params
      messageNode = t('setting_thermocycler_block_temp', { temp: celsius })
      break
    }
    case 'thermocycler/setTargetLidTemperature': {
      const { celsius } = displayCommand.params
      messageNode = t('setting_thermocycler_lid_temp', { temp: celsius })
      break
    }
    case 'thermocycler/waitForBlockTemperature': {
      messageNode = t('waiting_for_tc_block_to_reach')
      break
    }
    case 'thermocycler/waitForLidTemperature': {
      messageNode = t('waiting_for_tc_lid_to_reach')
      break
    }
    case 'thermocycler/openLid': {
      messageNode = t('opening_tc_lid')
      break
    }
    case 'thermocycler/closeLid': {
      messageNode = t('closing_tc_lid')
      break
    }
    case 'thermocycler/deactivateBlock': {
      messageNode = t('deactivating_tc_block')
      break
    }
    case 'thermocycler/deactivateLid': {
      messageNode = t('deactivating_tc_lid')
      break
    }
    case 'thermocycler/runProfile': {
      const { profile } = displayCommand.params
      const steps = profile.map(
        ({ holdSeconds, celsius }: { holdSeconds: number; celsius: number }) =>
          t('tc_run_profile_steps', { celsius: celsius, seconds: holdSeconds })
      )
      messageNode = (
        <Flex>
          <StyledText>
            {t('tc_starting_profile', {
              repetitions: Object.keys(steps).length,
            })}
          </StyledText>
          <ul>
            {steps.map((step: string, index: number) => (
              <li key={index}> {step}</li>
            ))}
          </ul>
        </Flex>
      )
      break
    }
    case 'thermocycler/awaitProfileComplete': {
      messageNode = t('tc_awaiting_for_duration')
      break
    }
    case 'heaterShaker/setTargetTemperature': {
      const { celsius } = displayCommand.params
      messageNode = t('setting_hs_temp', { temp: celsius })
      break
    }
    case 'heaterShaker/waitForTemperature': {
      messageNode = t('waiting_for_hs_to_reach')
      break
    }
    case 'heaterShaker/setAndWaitForShakeSpeed': {
      const { rpm } = displayCommand.params
      messageNode = t('set_and_await_hs_shake', { rpm: rpm })
      break
    }
    case 'heaterShaker/deactivateHeater': {
      messageNode = t('deactivating_hs_heater')
      break
    }
    case 'heaterShaker/openLabwareLatch': {
      messageNode = t('unlatching_hs_latch')
      break
    }
    case 'heaterShaker/closeLabwareLatch': {
      messageNode = t('latching_hs_latch')
      break
    }
    case 'heaterShaker/deactivateShaker': {
      messageNode = t('deactivate_hs_shake')
      break
    }
    case 'waitForDuration': {
      const { seconds, message } = displayCommand.params
      messageNode = t('wait_for_duration', {
        seconds: seconds,
        message: message,
      })
      break
    }
    case 'aspirate': {
      const { wellName, labwareId, volume, flowRate } = displayCommand.params
      const definitionUri =
        labwareEntities.find(l => l.id === labwareId)?.definitionUri ?? ''
      messageNode = t('aspirate', {
        well_name: wellName,
        labware: definitionUri,
        labware_location: TEMPORARY_LOCATION_STUB,
        volume: volume,
        flow_rate: flowRate,
      })
      break
    }
    case 'dispense': {
      const { wellName, labwareId, volume, flowRate } = displayCommand.params
      const definitionUri =
        labwareEntities.find(l => l.id === labwareId)?.definitionUri ?? ''

      messageNode = t('dispense', {
        well_name: wellName,
        labware: definitionUri,
        labware_location: TEMPORARY_LOCATION_STUB,
        volume: volume,
        flow_rate: flowRate,
      })

      break
    }
    case 'blowout': {
      const { wellName, labwareId, flowRate } = displayCommand.params
      const definitionUri =
        labwareEntities.find(l => l.id === labwareId)?.definitionUri ?? ''

      messageNode = t('blowout', {
        well_name: wellName,
        labware: definitionUri,
        labware_location: TEMPORARY_LOCATION_STUB,
        flow_rate: flowRate,
      })
      break
    }
    case 'touchTip': {
      messageNode = t('touch_tip')
      break
    }
    case 'moveToSlot': {
      const { slotName } = displayCommand.params
      messageNode = t('move_to_slot', {
        slot_name: slotName,
      })
      break
    }
    case 'moveToWell': {
      const { wellName, labwareId } = displayCommand.params
      const definitionUri =
        labwareEntities.find(l => l.id === labwareId)?.definitionUri ?? ''

      messageNode = t('move_to_well', {
        well_name: wellName,
        labware: definitionUri,
        labware_location: TEMPORARY_LOCATION_STUB,
      })
      break
    }
    case 'moveRelative': {
      const { axis, distance } = displayCommand.params
      messageNode = t('move_relative', {
        axis: axis,
        distance: distance,
      })
      break
    }
    case 'moveToCoordinates': {
      const { coordinates } = displayCommand.params
      messageNode = t('move_to_coordinates', {
        x: coordinates.x,
        y: coordinates.y,
        z: coordinates.z,
      })
      break
    }
    case 'home': {
      messageNode = t('home_gantry')
      break
    }
    case 'savePosition': {
      messageNode = t('save_position')
      break
    }
    case 'custom': {
      const { legacyCommandText } = displayCommand.params ?? {}
      const sanitizedCommandText =
        typeof legacyCommandText === 'object'
          ? JSON.stringify(legacyCommandText)
          : String(legacyCommandText)
      messageNode =
        legacyCommandText != null
          ? sanitizedCommandText
          : displayCommand.commandType
      break
    }
    default: {
      messageNode = JSON.stringify(displayCommand)
      break
    }
  }

  return <Flex alignItems={ALIGN_CENTER}>{messageNode}</Flex>
}
