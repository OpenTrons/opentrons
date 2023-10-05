import * as React from 'react'
import map from 'lodash/map'
import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'
import {
  BORDERS,
  Box,
  Btn,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  TYPOGRAPHY,
  useHoverTooltip,
  TOOLTIP_LEFT,
} from '@opentrons/components'
import {
  getModuleType,
  HEATERSHAKER_MODULE_TYPE,
  HEATERSHAKER_MODULE_V1,
  MAGNETIC_BLOCK_V1,
  TC_MODULE_LOCATION_OT2,
  TC_MODULE_LOCATION_OT3,
} from '@opentrons/shared-data'
import { Banner } from '../../../../atoms/Banner'
import { StyledText } from '../../../../atoms/text'
import { useChainLiveCommands } from '../../../../resources/runs/hooks'
import { StatusLabel } from '../../../../atoms/StatusLabel'
import { TertiaryButton } from '../../../../atoms/buttons'
import { Tooltip } from '../../../../atoms/Tooltip'
import { getModulePrepCommands } from '../../getModulePrepCommands'
import { getModuleTooHot } from '../../getModuleTooHot'
import { UnMatchedModuleWarning } from './UnMatchedModuleWarning'
import { MultipleModulesModal } from './MultipleModulesModal'
import {
  ModuleRenderInfoForProtocol,
  useIsOT3,
  useModuleRenderInfoForProtocolById,
  useUnmatchedModulesForProtocol,
  useRunCalibrationStatus,
} from '../../hooks'
import { ModuleSetupModal } from '../../../ModuleCard/ModuleSetupModal'
import { ModuleWizardFlows } from '../../../ModuleWizardFlows'
import { getModuleImage } from './utils'

import type { ModuleModel } from '@opentrons/shared-data'
import type { AttachedModule } from '../../../../redux/modules/types'
import type { ProtocolCalibrationStatus } from '../../hooks'

interface SetupModulesListProps {
  robotName: string
  runId: string
}

export const SetupModulesList = (props: SetupModulesListProps): JSX.Element => {
  const { robotName, runId } = props
  const { t } = useTranslation('protocol_setup')
  const moduleRenderInfoForProtocolById = useModuleRenderInfoForProtocolById(
    robotName,
    runId
  )
  const {
    missingModuleIds,
    remainingAttachedModules,
  } = useUnmatchedModulesForProtocol(robotName, runId)

  const isOT3 = useIsOT3(robotName)

  const calibrationStatus = useRunCalibrationStatus(robotName, runId)

  const [
    showMultipleModulesModal,
    setShowMultipleModulesModal,
  ] = React.useState<boolean>(false)

  const moduleModels = map(
    moduleRenderInfoForProtocolById,
    ({ moduleDef }) => moduleDef.model
  )

  const hasADuplicateModule = new Set(moduleModels).size !== moduleModels.length

  return (
    <>
      {showMultipleModulesModal ? (
        <MultipleModulesModal
          onCloseClick={() => setShowMultipleModulesModal(false)}
        />
      ) : null}
      {hasADuplicateModule ? (
        <Box marginTop={SPACING.spacing8}>
          <Banner
            iconMarginRight={SPACING.spacing16}
            iconMarginLeft={SPACING.spacing8}
            size={SPACING.spacing20}
            type="informing"
            onCloseClick={() => setShowMultipleModulesModal(true)}
            closeButton={
              <StyledText
                as="p"
                textDecoration={TYPOGRAPHY.textDecorationUnderline}
                marginRight={SPACING.spacing8}
              >
                {t('learn_more')}
              </StyledText>
            }
          >
            <Flex flexDirection={DIRECTION_COLUMN}>
              <StyledText css={TYPOGRAPHY.pSemiBold}>
                {t('multiple_modules')}
              </StyledText>
              <StyledText as="p">{t('view_moam')}</StyledText>
            </Flex>
          </Banner>
        </Box>
      ) : null}
      {remainingAttachedModules.length !== 0 &&
      missingModuleIds.length !== 0 ? (
        <UnMatchedModuleWarning />
      ) : null}
      <Flex
        flexDirection={DIRECTION_ROW}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        marginTop={SPACING.spacing16}
        marginLeft={SPACING.spacing20}
        marginBottom={SPACING.spacing4}
      >
        <StyledText
          css={TYPOGRAPHY.labelSemiBold}
          marginBottom={SPACING.spacing8}
          width="45%"
        >
          {t('module_name')}
        </StyledText>
        <StyledText
          css={TYPOGRAPHY.labelSemiBold}
          marginRight={SPACING.spacing16}
          width="15%"
        >
          {t('location')}
        </StyledText>
        <StyledText
          css={TYPOGRAPHY.labelSemiBold}
          marginRight={SPACING.spacing16}
          width="15%"
        >
          {t('status')}
        </StyledText>
      </Flex>
      <Flex
        flexDirection={DIRECTION_COLUMN}
        width="100%"
        overflowY="auto"
        gridGap={SPACING.spacing4}
        marginBottom={SPACING.spacing24}
      >
        {map(
          moduleRenderInfoForProtocolById,
          ({ moduleDef, attachedModuleMatch, slotName, moduleId }) => {
            return (
              <ModulesListItem
                key={`SetupModulesList_${String(
                  moduleDef.model
                )}_slot_${slotName}`}
                moduleModel={moduleDef.model}
                displayName={moduleDef.displayName}
                slotName={slotName}
                attachedModuleMatch={attachedModuleMatch}
                heaterShakerModuleFromProtocol={
                  moduleRenderInfoForProtocolById[moduleId].moduleDef
                    .moduleType === HEATERSHAKER_MODULE_TYPE
                    ? moduleRenderInfoForProtocolById[moduleId]
                    : null
                }
                isOT3={isOT3}
                calibrationStatus={calibrationStatus}
              />
            )
          }
        )}
      </Flex>
    </>
  )
}

interface ModulesListItemProps {
  moduleModel: ModuleModel
  displayName: string
  slotName: string
  attachedModuleMatch: AttachedModule | null
  heaterShakerModuleFromProtocol: ModuleRenderInfoForProtocol | null
  isOT3: boolean
  calibrationStatus: ProtocolCalibrationStatus
}

export function ModulesListItem({
  moduleModel,
  displayName,
  slotName,
  attachedModuleMatch,
  heaterShakerModuleFromProtocol,
  isOT3,
  calibrationStatus,
}: ModulesListItemProps): JSX.Element {
  const { t } = useTranslation(['protocol_setup', 'module_wizard_flows'])
  const moduleConnectionStatus =
    attachedModuleMatch != null
      ? t('module_connected')
      : t('module_not_connected')
  const [
    showModuleSetupModal,
    setShowModuleSetupModal,
  ] = React.useState<Boolean>(false)
  const [showModuleWizard, setShowModuleWizard] = React.useState<boolean>(false)
  const { chainLiveCommands, isCommandMutationLoading } = useChainLiveCommands()
  const [
    prepCommandErrorMessage,
    setPrepCommandErrorMessage,
  ] = React.useState<string>('')

  const handleCalibrateClick = (): void => {
    if (attachedModuleMatch != null) {
      chainLiveCommands(
        getModulePrepCommands(attachedModuleMatch),
        false
      ).catch((e: Error) => {
        setPrepCommandErrorMessage(e.message)
      })
    }
    setShowModuleWizard(true)
  }

  const [targetProps, tooltipProps] = useHoverTooltip({
    placement: TOOLTIP_LEFT,
  })

  let subText: JSX.Element | null = null
  if (moduleModel === HEATERSHAKER_MODULE_V1) {
    subText = (
      <Btn
        marginLeft={SPACING.spacing20}
        css={css`
          color: ${COLORS.blueEnabled};

          &:hover {
            color: ${COLORS.blueHover};
          }
        `}
        marginTop={SPACING.spacing4}
        onClick={() => setShowModuleSetupModal(true)}
      >
        <Flex flexDirection={DIRECTION_ROW}>
          <Icon
            name="information"
            size="0.75rem"
            marginTop={SPACING.spacing4}
          />
          <StyledText marginLeft={SPACING.spacing4} as="p">
            {t('view_setup_instructions')}
          </StyledText>
        </Flex>
      </Btn>
    )
  } else if (moduleModel === MAGNETIC_BLOCK_V1) {
    subText = (
      <StyledText
        as="p"
        marginLeft={SPACING.spacing20}
        color={COLORS.darkGreyEnabled}
      >
        {t('no_usb_connection_required')}
      </StyledText>
    )
  }

  const isModuleTooHot =
    attachedModuleMatch != null ? getModuleTooHot(attachedModuleMatch) : false

  let calibrateDisabledReason = t('calibrate_pipette_before_module_calibration')
  if (calibrationStatus.reason === 'attach_pipette_failure_reason') {
    calibrateDisabledReason = t('attach_pipette_before_module_calibration')
  } else if (isModuleTooHot) {
    calibrateDisabledReason = t('module_wizard_flows:module_too_hot')
  }

  let renderModuleStatus: JSX.Element = (
    <StatusLabel
      status={moduleConnectionStatus}
      backgroundColor={COLORS.successBackgroundLight}
      iconColor={COLORS.successEnabled}
      textColor={COLORS.successText}
    />
  )

  if (
    isOT3 &&
    attachedModuleMatch != null &&
    attachedModuleMatch.moduleOffset?.last_modified == null
  ) {
    renderModuleStatus = (
      <>
        <TertiaryButton
          {...targetProps}
          onClick={handleCalibrateClick}
          disabled={!calibrationStatus?.complete || isModuleTooHot}
        >
          {t('calibrate_now')}
        </TertiaryButton>
        {(!calibrationStatus?.complete && calibrationStatus?.reason != null) ||
        isModuleTooHot ? (
          <Tooltip tooltipProps={tooltipProps}>
            {calibrateDisabledReason}
          </Tooltip>
        ) : null}
      </>
    )
  } else if (attachedModuleMatch == null) {
    renderModuleStatus = (
      <StatusLabel
        status={moduleConnectionStatus}
        backgroundColor={COLORS.warningBackgroundLight}
        iconColor={COLORS.warningEnabled}
        textColor={COLORS.warningText}
      />
    )
  }

  return (
    <>
      {showModuleWizard && attachedModuleMatch != null ? (
        <ModuleWizardFlows
          attachedModule={attachedModuleMatch}
          closeFlow={() => setShowModuleWizard(false)}
          initialSlotName={slotName}
          isPrepCommandLoading={isCommandMutationLoading}
          prepCommandErrorMessage={
            prepCommandErrorMessage === '' ? undefined : prepCommandErrorMessage
          }
        />
      ) : null}
      <Box
        border={BORDERS.styleSolid}
        borderColor={COLORS.medGreyEnabled}
        borderWidth="1px"
        borderRadius={BORDERS.radiusSoftCorners}
        padding={SPACING.spacing16}
        backgroundColor={COLORS.white}
      >
        {showModuleSetupModal && heaterShakerModuleFromProtocol != null ? (
          <ModuleSetupModal
            close={() => setShowModuleSetupModal(false)}
            moduleDisplayName={
              heaterShakerModuleFromProtocol.moduleDef.displayName
            }
          />
        ) : null}
        <Flex
          flexDirection={DIRECTION_ROW}
          alignItems={JUSTIFY_CENTER}
          justifyContent={JUSTIFY_SPACE_BETWEEN}
        >
          <Flex alignItems={JUSTIFY_CENTER} width="45%">
            <img width="60px" height="54px" src={getModuleImage(moduleModel)} />
            <Flex flexDirection={DIRECTION_COLUMN}>
              <StyledText
                css={TYPOGRAPHY.pSemiBold}
                marginLeft={SPACING.spacing20}
              >
                {displayName}
              </StyledText>
              {subText}
            </Flex>
          </Flex>
          <StyledText as="p" width="15%">
            {getModuleType(moduleModel) === 'thermocyclerModuleType'
              ? isOT3
                ? TC_MODULE_LOCATION_OT3
                : TC_MODULE_LOCATION_OT2
              : slotName}
          </StyledText>
          <Flex width="15%">
            {moduleModel === MAGNETIC_BLOCK_V1 ? (
              <StyledText as="p"> {t('n_a')}</StyledText>
            ) : (
              renderModuleStatus
            )}
          </Flex>
        </Flex>
      </Box>
    </>
  )
}
