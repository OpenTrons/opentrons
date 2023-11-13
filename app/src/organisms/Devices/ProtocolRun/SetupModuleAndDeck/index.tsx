import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_CENTER,
  SPACING,
  useHoverTooltip,
  PrimaryButton,
} from '@opentrons/components'
import { SINGLE_SLOT_FIXTURES } from '@opentrons/shared-data'

import { useToggleGroup } from '../../../../molecules/ToggleGroup/useToggleGroup'
import { useDeckConfigurationCompatibility } from '../../../../resources/deck_configuration/hooks'
import { Tooltip } from '../../../../atoms/Tooltip'
import {
  useRunHasStarted,
  useUnmatchedModulesForProtocol,
  useModuleCalibrationStatus,
  useRobotType,
} from '../../hooks'
import { SetupModulesMap } from './SetupModulesMap'
import { SetupModulesList } from './SetupModulesList'
import { SetupFixtureList } from './SetupFixtureList'

import type { RunTimeCommand } from '@opentrons/shared-data'
import type { CutoutConfig } from '../../../../resources/deck_configuration/types'

interface SetupModuleAndDeckProps {
  expandLabwarePositionCheckStep: () => void
  robotName: string
  runId: string
  protocolDeckConfig: CutoutConfig[]
  hasModules: boolean
  commands: RunTimeCommand[]
}

export const SetupModuleAndDeck = ({
  expandLabwarePositionCheckStep,
  robotName,
  runId,
  protocolDeckConfig,
  hasModules,
  commands,
}: SetupModuleAndDeckProps): JSX.Element => {
  const { t } = useTranslation('protocol_setup')
  const [selectedValue, toggleGroup] = useToggleGroup(
    t('list_view'),
    t('map_view')
  )

  const robotType = useRobotType(robotName)
  const { missingModuleIds } = useUnmatchedModulesForProtocol(robotName, runId)
  const runHasStarted = useRunHasStarted(runId)
  const [targetProps, tooltipProps] = useHoverTooltip()

  const moduleCalibrationStatus = useModuleCalibrationStatus(robotName, runId)
  const deckConfigCompatibility = useDeckConfigurationCompatibility(
    robotType,
    commands
  )

  const nonSingleSlotFixtureList = deckConfigCompatibility.filter(
    fixture =>
      !SINGLE_SLOT_FIXTURES.includes(fixture.cutoutFixtureId)
  )

  return (
    <>
      <Flex flexDirection={DIRECTION_COLUMN} marginTop={SPACING.spacing32}>
        {toggleGroup}
        {selectedValue === t('list_view') ? (
          <>
            {hasModules ? (
              <SetupModulesList robotName={robotName} runId={runId} />
            ) : null}
            <SetupFixtureList deckConfigCompatibility={nonSingleSlotFixtureList} />
          </>
        ) : (
          <SetupModulesMap runId={runId} />
        )}
      </Flex>
      <Flex justifyContent={JUSTIFY_CENTER}>
        <PrimaryButton
          disabled={
            missingModuleIds.length > 0 ||
            runHasStarted ||
            !moduleCalibrationStatus.complete
          }
          onClick={expandLabwarePositionCheckStep}
          id="ModuleSetup_proceedToLabwarePositionCheck"
          padding={`${SPACING.spacing8} ${SPACING.spacing16}`}
          {...targetProps}
        >
          {t('proceed_to_labware_position_check')}
        </PrimaryButton>
      </Flex>
      {missingModuleIds.length > 0 ||
        runHasStarted ||
        !moduleCalibrationStatus.complete ? (
        <Tooltip tooltipProps={tooltipProps}>
          {runHasStarted
            ? t('protocol_run_started')
            : missingModuleIds.length > 0
              ? t('plug_in_required_module', { count: missingModuleIds.length })
              : t('calibrate_module_failure_reason')}
        </Tooltip>
      ) : null}
    </>
  )
}
