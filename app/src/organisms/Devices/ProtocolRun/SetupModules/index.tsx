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
import { useToggleGroup } from '../../../../molecules/ToggleGroup/useToggleGroup'
import { Tooltip } from '../../../../atoms/Tooltip'
import { useFeatureFlag } from '../../../../redux/config'
import { useRunHasStarted, useUnmatchedModulesForProtocol } from '../../hooks'
import { SetupModulesMap } from './SetupModulesMap'
import { SetupModulesList } from './SetupModulesList'
import { SetupFixtureList } from './SetupFixtureList'
import type { LoadedFixturesBySlot } from '@opentrons/api-client'

interface SetupModulesProps {
  expandLabwarePositionCheckStep: () => void
  robotName: string
  runId: string
  loadedFixturesBySlot: LoadedFixturesBySlot
  hasModules: boolean
}

export const SetupModules = ({
  expandLabwarePositionCheckStep,
  robotName,
  runId,
  loadedFixturesBySlot,
  hasModules,
}: SetupModulesProps): JSX.Element => {
  const { t } = useTranslation('protocol_setup')
  const [selectedValue, toggleGroup] = useToggleGroup(
    t('list_view'),
    t('map_view')
  )
  const enableDeckConfig = useFeatureFlag('enableDeckConfiguration')

  const { missingModuleIds } = useUnmatchedModulesForProtocol(robotName, runId)
  const runHasStarted = useRunHasStarted(runId)
  const [targetProps, tooltipProps] = useHoverTooltip()
  return (
    <>
      <Flex flexDirection={DIRECTION_COLUMN} marginTop={SPACING.spacing32}>
        {toggleGroup}
        {selectedValue === t('list_view') ? (
          <>
            {hasModules ? (
              <SetupModulesList robotName={robotName} runId={runId} />
            ) : null}
            {Object.keys(loadedFixturesBySlot).length > 0 &&
            enableDeckConfig ? (
              <SetupFixtureList loadedFixturesBySlot={loadedFixturesBySlot} />
            ) : null}
          </>
        ) : (
          <SetupModulesMap robotName={robotName} runId={runId} />
        )}
      </Flex>
      <Flex justifyContent={JUSTIFY_CENTER}>
        <PrimaryButton
          disabled={missingModuleIds.length > 0 || runHasStarted}
          onClick={expandLabwarePositionCheckStep}
          id="ModuleSetup_proceedToLabwarePositionCheck"
          padding={`${SPACING.spacing8} ${SPACING.spacing16}`}
          {...targetProps}
        >
          {t('proceed_to_labware_position_check')}
        </PrimaryButton>
      </Flex>
      {missingModuleIds.length > 0 || runHasStarted ? (
        <Tooltip tooltipProps={tooltipProps}>
          {runHasStarted
            ? t('protocol_run_started')
            : t('plug_in_required_module', { count: missingModuleIds.length })}
        </Tooltip>
      ) : null}
    </>
  )
}
