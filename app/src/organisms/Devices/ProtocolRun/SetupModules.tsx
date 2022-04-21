import * as React from 'react'
import { useTranslation } from 'react-i18next'
import map from 'lodash/map'

import {
  Flex,
  Link,
  Module,
  RobotWorkSpace,
  ALIGN_FLEX_END,
  DIRECTION_COLUMN,
  Tooltip,
  useHoverTooltip,
  ALIGN_CENTER,
  COLORS,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'
import { inferModuleOrientationFromXCoordinate } from '@opentrons/shared-data'
import standardDeckDef from '@opentrons/shared-data/deck/definitions/2/ot2_standard.json'

import { PrimaryButton } from '../../../atoms/Buttons'
import { HeaterShakerBanner } from '../../../organisms/ProtocolSetup/RunSetupCard/ModuleSetup/HeaterShakerSetupWizard/HeaterShakerBanner'
import { ModuleInfo } from '../../../organisms/ProtocolSetup/RunSetupCard/ModuleSetup/ModuleInfo'
import { UnMatchedModuleWarning } from '../../../organisms/ProtocolSetup/RunSetupCard/ModuleSetup/UnMatchedModuleWarning'
import { MultipleModulesModal } from '../../../organisms/ProtocolSetup/RunSetupCard/ModuleSetup/MultipleModulesModal'
import {
  useModuleRenderInfoForProtocolById,
  useUnmatchedModulesForProtocol,
} from '../hooks'

const DECK_LAYER_BLOCKLIST = [
  'calibrationMarkings',
  'fixedBase',
  'doorStops',
  'metalFrame',
  'removalHandle',
  'removableDeckOutline',
  'screwHoles',
]
const DECK_VIEW_BOX = '-80 -40 550 510'

interface SetupModulesProps {
  expandLabwareSetupStep: () => void
  robotName: string
  runId: string
}

export const SetupModules = ({
  expandLabwareSetupStep,
  robotName,
  runId,
}: SetupModulesProps): JSX.Element => {
  const { t } = useTranslation('protocol_setup')
  const [targetProps, tooltipProps] = useHoverTooltip()
  const moduleRenderInfoForProtocolById = useModuleRenderInfoForProtocolById(
    robotName,
    runId
  )
  const {
    missingModuleIds,
    remainingAttachedModules,
  } = useUnmatchedModulesForProtocol(robotName, runId)

  const [
    showMultipleModulesModal,
    setShowMultipleModulesModal,
  ] = React.useState<boolean>(false)

  const heaterShakerModules = Object.values(
    moduleRenderInfoForProtocolById
  ).filter(module => module.moduleDef.model === 'heaterShakerModuleV1')

  const moduleModels = map(
    moduleRenderInfoForProtocolById,
    ({ moduleDef }) => moduleDef.model
  )

  const hasADuplicateModule = new Set(moduleModels).size !== moduleModels.length

  return (
    <Flex
      flex="1"
      maxHeight="180vh"
      marginTop={SPACING.spacing4}
      flexDirection={DIRECTION_COLUMN}
    >
      {heaterShakerModules.length !== 0 ? (
        <HeaterShakerBanner
          displayName={heaterShakerModules[0]?.moduleDef.displayName}
          modules={heaterShakerModules}
        />
      ) : null}
      {showMultipleModulesModal ? (
        <MultipleModulesModal
          onCloseClick={() => setShowMultipleModulesModal(false)}
        />
      ) : null}
      {hasADuplicateModule ? (
        <Link
          role="link"
          alignSelf={ALIGN_FLEX_END}
          css={TYPOGRAPHY.labelSemiBold}
          color={COLORS.darkBlack}
          onClick={() => setShowMultipleModulesModal(true)}
          data-test={'ModuleSetup_helpLink'}
        >
          {t('multiple_modules_help_link_title')}
        </Link>
      ) : null}
      <UnMatchedModuleWarning
        isAnyModuleUnnecessary={
          remainingAttachedModules.length !== 0 && missingModuleIds.length !== 0
        }
      />
      <RobotWorkSpace
        deckDef={standardDeckDef as any}
        viewBox={DECK_VIEW_BOX}
        deckLayerBlocklist={DECK_LAYER_BLOCKLIST}
        id={'ModuleSetup_deckMap'}
      >
        {() => (
          <>
            {map(
              moduleRenderInfoForProtocolById,
              ({ x, y, moduleDef, attachedModuleMatch }) => {
                const { model } = moduleDef
                return (
                  <React.Fragment key={`ModuleSetup_Module_${model}_${x}${y}`}>
                    <Module
                      x={x}
                      y={y}
                      orientation={inferModuleOrientationFromXCoordinate(x)}
                      def={moduleDef}
                    >
                      <ModuleInfo
                        moduleModel={model}
                        isAttached={attachedModuleMatch != null}
                        usbPort={attachedModuleMatch?.usbPort.port ?? null}
                        hubPort={attachedModuleMatch?.usbPort.hub ?? null}
                      />
                    </Module>
                  </React.Fragment>
                )
              }
            )}
          </>
        )}
      </RobotWorkSpace>
      <PrimaryButton
        title={t('proceed_to_labware_setup_step')}
        disabled={missingModuleIds.length > 0}
        onClick={expandLabwareSetupStep}
        id={'ModuleSetup_proceedToLabwareSetup'}
        alignSelf={ALIGN_CENTER}
        padding={`${SPACING.spacing3} ${SPACING.spacing4}`}
        {...targetProps}
      >
        {t('proceed_to_labware_setup_step')}
      </PrimaryButton>
      {missingModuleIds.length > 0 ? (
        <Tooltip {...tooltipProps}>
          {t('plug_in_required_module', { count: missingModuleIds.length })}
        </Tooltip>
      ) : null}
    </Flex>
  )
}
