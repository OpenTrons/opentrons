import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import {
  ALIGN_START,
  Banner,
  BORDERS,
  Box,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  Icon,
  LegacyStyledText,
  ModuleIcon,
  OverflowBtn,
  SPACING,
  Tooltip,
  TYPOGRAPHY,
  useHoverTooltip,
  SUCCESS_TOAST,
  useMenuHandleClickOutside,
  useOnClickOutside,
} from '@opentrons/components'
import {
  getModuleDisplayName,
  HEATERSHAKER_MODULE_TYPE,
  MAGNETIC_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  MODULE_MODELS_OT2_ONLY,
  ABSORBANCE_READER_TYPE,
  FLEX_STACKER_MODULE_TYPE,
} from '@opentrons/shared-data'
import { RUN_STATUS_FINISHING, RUN_STATUS_RUNNING } from '@opentrons/api-client'

import {
  getRequestById,
  PENDING,
  FAILURE,
  getErrorResponseMessage,
  dismissRequest,
  SUCCESS,
} from '/app/redux/robot-api'
import { UpdateBanner } from '/app/molecules/UpdateBanner'
import { useChainLiveCommands } from '/app/resources/runs'
import { useCurrentRunStatus } from '/app/organisms/RunTimeControl'
import { useIsFlex } from '/app/redux-resources/robots'
import { getModuleTooHot } from '/app/transformations/modules'
import { useToaster } from '/app/organisms/ToasterOven'
import { MagneticModuleData } from './MagneticModuleData'
import { TemperatureModuleData } from './TemperatureModuleData'
import { ThermocyclerModuleData } from './ThermocyclerModuleData'
import { ModuleOverflowMenu } from './ModuleOverflowMenu'
import { ThermocyclerModuleSlideout } from './ThermocyclerModuleSlideout'
import { MagneticModuleSlideout } from './MagneticModuleSlideout'
import { TemperatureModuleSlideout } from './TemperatureModuleSlideout'
import { AboutModuleSlideout } from './AboutModuleSlideout'
import { HeaterShakerModuleData } from './HeaterShakerModuleData'
import { HeaterShakerSlideout } from './HeaterShakerSlideout'
import { TestShakeSlideout } from './TestShakeSlideout'
import { ModuleWizardFlows } from '/app/organisms/ModuleWizardFlows'
import { getModulePrepCommands } from '/app/local-resources/modules'
import { getModuleCardImage } from './utils'
import { FirmwareUpdateFailedModal } from './FirmwareUpdateFailedModal'
import { ErrorInfo } from './ErrorInfo'
import { ModuleSetupModal } from './ModuleSetupModal'
import { useIsEstopNotDisengaged } from '/app/resources/devices'

import type { IconProps } from '@opentrons/components'
import type {
  AttachedModule,
  HeaterShakerModule,
} from '/app/redux/modules/types'
import type { State, Dispatch } from '/app/redux/types'
import type { RequestState } from '/app/redux/robot-api/types'
import { AbsorbanceReaderData } from './AbsorbanceReaderData'
import { FlexStackerModuleData } from './FlexStackerModuleData'

interface ModuleCardProps {
  module: AttachedModule
  robotName: string
  isLoadedInRun: boolean
  attachPipetteRequired: boolean
  calibratePipetteRequired: boolean
  updatePipetteFWRequired: boolean
  latestRequestId: string | null
  handleModuleApiRequests: (robotName: string, serialNumber: string) => void
  runId?: string
  slotName?: string
}

export const ModuleCard = (props: ModuleCardProps): JSX.Element | null => {
  const { t } = useTranslation('device_details')
  const {
    module,
    robotName,
    isLoadedInRun,
    runId,
    slotName,
    attachPipetteRequired,
    calibratePipetteRequired,
    updatePipetteFWRequired,
    latestRequestId,
    handleModuleApiRequests,
  } = props
  const dispatch = useDispatch<Dispatch>()
  const {
    menuOverlay,
    handleOverflowClick,
    showOverflowMenu,
    setShowOverflowMenu,
  } = useMenuHandleClickOutside()
  const moduleOverflowWrapperRef = useOnClickOutside<HTMLDivElement>({
    onClickOutside: () => {
      setShowOverflowMenu(false)
    },
  })
  const [showSlideout, setShowSlideout] = useState(false)
  const [hasSecondary, setHasSecondary] = useState(false)
  const [showAboutModule, setShowAboutModule] = useState(false)
  const [showTestShake, setShowTestShake] = useState(false)
  const [showHSWizard, setShowHSWizard] = useState(false)
  const [showFWBanner, setShowFWBanner] = useState(true)
  const [showCalModal, setShowCalModal] = useState(false)

  const [targetProps, tooltipProps] = useHoverTooltip()

  const runStatus = useCurrentRunStatus()
  const isFlex = useIsFlex(robotName)
  const requireModuleCalibration =
    isFlex &&
    !MODULE_MODELS_OT2_ONLY.some(modModel => modModel === module.moduleModel) &&
    module.moduleType !== ABSORBANCE_READER_TYPE &&
    module.moduleType !== FLEX_STACKER_MODULE_TYPE &&
    module.moduleOffset?.last_modified == null
  const isPipetteReady =
    !Boolean(attachPipetteRequired) &&
    !Boolean(calibratePipetteRequired) &&
    !Boolean(updatePipetteFWRequired)

  const latestRequest = useSelector<State, RequestState | null>(state =>
    latestRequestId != null ? getRequestById(state, latestRequestId) : null
  )

  const hasUpdated =
    !module.hasAvailableUpdate && latestRequest?.status === SUCCESS
  const [showFirmwareToast, setShowFirmwareToast] = useState(hasUpdated)
  const { makeToast } = useToaster()
  if (showFirmwareToast) {
    makeToast(t('firmware_updated_successfully') as string, SUCCESS_TOAST)
    setShowFirmwareToast(false)
  }

  const handleFirmwareUpdateClick = (): void => {
    robotName != null && handleModuleApiRequests(robotName, module.serialNumber)
  }

  const isEstopNotDisengaged = useIsEstopNotDisengaged(robotName)

  const handleCloseErrorModal = (): void => {
    if (latestRequestId != null) {
      dispatch(dismissRequest(latestRequestId))
    }
  }

  const isPending = latestRequest?.status === PENDING
  const hotToTouch: IconProps = { name: 'ot-hot-to-touch' }

  const isOverflowBtnDisabled =
    runStatus === RUN_STATUS_RUNNING || runStatus === RUN_STATUS_FINISHING

  const isTooHot = getModuleTooHot(module)

  let moduleData: JSX.Element = <div></div>
  switch (module.moduleType) {
    case MAGNETIC_MODULE_TYPE: {
      moduleData = (
        <MagneticModuleData
          moduleStatus={module.data.status}
          moduleHeight={module.data.height}
          moduleModel={module.moduleModel}
        />
      )
      break
    }

    case TEMPERATURE_MODULE_TYPE: {
      moduleData = (
        <TemperatureModuleData
          moduleStatus={module.data.status}
          targetTemp={module.data.targetTemperature}
          currentTemp={module.data.currentTemperature}
        />
      )
      break
    }

    case THERMOCYCLER_MODULE_TYPE: {
      moduleData = <ThermocyclerModuleData data={module.data} />
      break
    }

    case HEATERSHAKER_MODULE_TYPE: {
      moduleData = (
        <HeaterShakerModuleData
          moduleData={module.data}
          showTemperatureData={true}
        />
      )
      break
    }

    case ABSORBANCE_READER_TYPE: {
      moduleData = <AbsorbanceReaderData moduleData={module.data} />
      break
    }

    case FLEX_STACKER_MODULE_TYPE: {
      moduleData = <FlexStackerModuleData moduleData={module.data} />
      break
    }
  }

  const handleMenuItemClick = (isSecondary: boolean = false): void => {
    if (isSecondary) {
      setHasSecondary(true)
    } else {
      setHasSecondary(false)
    }
    setShowSlideout(true)
  }

  const handleAboutClick = (): void => {
    setShowAboutModule(true)
  }

  const handleTestShakeClick = (): void => {
    setShowTestShake(true)
  }

  const handleInstructionsClick = (): void => {
    setShowHSWizard(true)
  }

  const { chainLiveCommands, isCommandMutationLoading } = useChainLiveCommands()
  const [
    prepCommandErrorMessage,
    setPrepCommandErrorMessage,
  ] = useState<string>('')
  const handleCalibrateClick = (): void => {
    if (getModulePrepCommands(module).length > 0) {
      chainLiveCommands(getModulePrepCommands(module), false).catch(
        (e: Error) => {
          setPrepCommandErrorMessage(e.message)
        }
      )
    }
    setShowCalModal(true)
  }

  return (
    <Flex
      backgroundColor={COLORS.grey10}
      borderRadius={BORDERS.borderRadius8}
      width="100%"
      data-testid={`ModuleCard_${module.serialNumber}`}
    >
      {showCalModal ? (
        <ModuleWizardFlows
          attachedModule={module}
          closeFlow={() => {
            setShowCalModal(false)
          }}
          isLoadedInRun={isLoadedInRun}
          isPrepCommandLoading={isCommandMutationLoading}
          prepCommandErrorMessage={
            prepCommandErrorMessage === '' ? undefined : prepCommandErrorMessage
          }
        />
      ) : null}
      {showHSWizard && module.moduleType === HEATERSHAKER_MODULE_TYPE && (
        <ModuleSetupModal
          close={() => {
            setShowHSWizard(false)
          }}
          moduleDisplayName={getModuleDisplayName(module.moduleModel)}
        />
      )}
      {showSlideout && (
        <ModuleSlideout
          module={module}
          isSecondary={hasSecondary}
          showSlideout={showSlideout}
          onCloseClick={() => {
            setShowSlideout(false)
          }}
        />
      )}
      {showAboutModule && (
        <AboutModuleSlideout
          module={module}
          isExpanded={showAboutModule}
          onCloseClick={() => {
            setShowAboutModule(false)
          }}
          firmwareUpdateClick={handleFirmwareUpdateClick}
        />
      )}
      {showTestShake && (
        <TestShakeSlideout
          module={module as HeaterShakerModule}
          isExpanded={showTestShake}
          onCloseClick={() => {
            setShowTestShake(false)
          }}
        />
      )}
      <Box padding={SPACING.spacing16} width="100%">
        <Flex flexDirection={DIRECTION_ROW} paddingRight={SPACING.spacing8}>
          <Flex alignItems={ALIGN_START} opacity={isPending ? '50%' : '100%'}>
            <img
              width="60px"
              height="54px"
              src={getModuleCardImage(module)}
              alt={module.moduleModel}
            />
          </Flex>
          <Flex
            flexDirection={DIRECTION_COLUMN}
            flex="100%"
            paddingLeft={SPACING.spacing8}
          >
            <ErrorInfo attachedModule={module} />
            {latestRequest != null && latestRequest.status === FAILURE && (
              <FirmwareUpdateFailedModal
                module={module}
                onCloseClick={handleCloseErrorModal}
                errorMessage={getErrorResponseMessage(latestRequest.error)}
              />
            )}
            {attachPipetteRequired != null &&
            calibratePipetteRequired != null &&
            updatePipetteFWRequired != null &&
            requireModuleCalibration &&
            !isPending ? (
              <UpdateBanner
                robotName={robotName}
                updateType="calibration"
                serialNumber={module.serialNumber}
                setShowBanner={() => null}
                handleUpdateClick={handleCalibrateClick}
                attachPipetteRequired={attachPipetteRequired}
                calibratePipetteRequired={calibratePipetteRequired}
                updatePipetteFWRequired={updatePipetteFWRequired}
                isTooHot={isTooHot}
              />
            ) : null}
            {/* Calibration performs firmware updates, so only show calibration if both true. */}
            {!requireModuleCalibration &&
            module.hasAvailableUpdate &&
            showFWBanner &&
            !isPending ? (
              <UpdateBanner
                robotName={robotName}
                updateType="firmware"
                serialNumber={module.serialNumber}
                setShowBanner={setShowFWBanner}
                handleUpdateClick={handleFirmwareUpdateClick}
              />
            ) : null}
            {isTooHot ? (
              <Flex
                width="100%"
                flexDirection={DIRECTION_COLUMN}
                paddingRight={SPACING.spacing20}
                paddingBottom={SPACING.spacing8}
                data-testid={`ModuleCard_too_hot_banner_${module.serialNumber}`}
              >
                <Banner type="warning" icon={hotToTouch}>
                  <Trans
                    t={t}
                    i18nKey="hot_to_the_touch"
                    components={{
                      bold: <strong />,
                      block: (
                        <LegacyStyledText fontSize={TYPOGRAPHY.fontSizeP} />
                      ),
                    }}
                  />
                </Banner>
              </Flex>
            ) : null}
            {isPending ? (
              <Flex
                flexDirection={DIRECTION_ROW}
                fontSize={TYPOGRAPHY.fontSizeP}
                data-testid={`ModuleCard_update_pending_${module.serialNumber}`}
              >
                <Icon
                  width="10px"
                  name="ot-spinner"
                  spin
                  aria-label="ot-spinner"
                  color={COLORS.grey60}
                />
                <LegacyStyledText marginLeft={SPACING.spacing8}>
                  {t('updating_firmware')}
                </LegacyStyledText>
              </Flex>
            ) : (
              <>
                <LegacyStyledText
                  textTransform={TYPOGRAPHY.textTransformUppercase}
                  color={COLORS.grey60}
                  fontWeight={TYPOGRAPHY.fontWeightSemiBold}
                  fontSize={TYPOGRAPHY.fontSizeH6}
                  paddingBottom={SPACING.spacing4}
                  data-testid={`module_card_usb_port_${module.serialNumber}`}
                >
                  {module.moduleType !== THERMOCYCLER_MODULE_TYPE &&
                  slotName != null
                    ? t('deck_slot', { slot: slotName }) + ' - '
                    : null}
                  {module?.usbPort !== null
                    ? t('usb_port', {
                        port: module?.usbPort?.port,
                        hubPort:
                          module?.usbPort?.hubPort != null
                            ? `.${module.usbPort.hubPort}`
                            : '',
                      })
                    : t('usb_port_not_connected')}
                </LegacyStyledText>
                <Flex
                  paddingBottom={SPACING.spacing4}
                  data-testid={`ModuleCard_display_name_${module.serialNumber}`}
                  fontSize={TYPOGRAPHY.fontSizeP}
                >
                  <ModuleIcon
                    moduleType={module.moduleType}
                    size="1rem"
                    marginRight={SPACING.spacing2}
                    color={COLORS.grey60}
                  />
                  <LegacyStyledText>
                    {getModuleDisplayName(module.moduleModel)}
                  </LegacyStyledText>
                </Flex>
              </>
            )}
            <Flex
              opacity={isPending ? '50%' : '100%'}
              flexDirection={DIRECTION_COLUMN}
            >
              {moduleData}
            </Flex>
          </Flex>
        </Flex>
      </Box>

      <Box
        alignSelf={ALIGN_START}
        padding={SPACING.spacing4}
        data-testid={`ModuleCard_overflow_btn_${module.serialNumber}`}
        opacity={isPending ? '50%' : '100%'}
      >
        <OverflowBtn
          aria-label="overflow"
          disabled={isOverflowBtnDisabled || isEstopNotDisengaged}
          {...targetProps}
          onClick={handleOverflowClick}
        />
        {isOverflowBtnDisabled && (
          <Tooltip tooltipProps={tooltipProps}>
            {t('module_actions_unavailable')}
          </Tooltip>
        )}
      </Box>
      {showOverflowMenu && (
        <>
          <Box
            ref={moduleOverflowWrapperRef}
            data-testid={`ModuleCard_overflow_menu_${module.serialNumber}`}
            onClick={() => {
              setShowOverflowMenu(false)
            }}
          >
            <ModuleOverflowMenu
              handleAboutClick={handleAboutClick}
              module={module}
              robotName={robotName}
              runId={runId}
              isLoadedInRun={isLoadedInRun}
              isPipetteReady={isPipetteReady}
              isTooHot={isTooHot}
              handleSlideoutClick={handleMenuItemClick}
              handleTestShakeClick={handleTestShakeClick}
              handleInstructionsClick={handleInstructionsClick}
              handleCalibrateClick={handleCalibrateClick}
            />
          </Box>
          {menuOverlay}
        </>
      )}
    </Flex>
  )
}

interface ModuleSlideoutProps {
  module: AttachedModule
  isSecondary: boolean
  showSlideout: boolean
  onCloseClick: () => unknown
}

const ModuleSlideout = (props: ModuleSlideoutProps): JSX.Element => {
  const { module, isSecondary, showSlideout, onCloseClick } = props

  if (module.moduleType === THERMOCYCLER_MODULE_TYPE) {
    return (
      <ThermocyclerModuleSlideout
        module={module}
        onCloseClick={onCloseClick}
        isExpanded={showSlideout}
        isSecondaryTemp={isSecondary}
      />
    )
  } else if (module.moduleType === MAGNETIC_MODULE_TYPE) {
    return (
      <MagneticModuleSlideout
        module={module}
        onCloseClick={onCloseClick}
        isExpanded={showSlideout}
      />
    )
  } else if (module.moduleType === TEMPERATURE_MODULE_TYPE) {
    return (
      <TemperatureModuleSlideout
        module={module}
        onCloseClick={onCloseClick}
        isExpanded={showSlideout}
      />
    )
  } else if (module.moduleType === HEATERSHAKER_MODULE_TYPE) {
    return (
      <HeaterShakerSlideout
        module={module}
        onCloseClick={onCloseClick}
        isExpanded={showSlideout}
      />
    )
  } else {
    return <></>
  }
}
