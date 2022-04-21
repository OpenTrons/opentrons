import * as React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import {
  Box,
  Flex,
  Text,
  DIRECTION_ROW,
  ALIGN_START,
  DIRECTION_COLUMN,
  TEXT_TRANSFORM_UPPERCASE,
  SPACING,
  FONT_WEIGHT_REGULAR,
  FONT_SIZE_CAPTION,
  TYPOGRAPHY,
  useOnClickOutside,
  Btn,
  TEXT_DECORATION_UNDERLINE,
  IconProps,
  Tooltip,
  useHoverTooltip,
  COLORS,
  ModuleIcon,
} from '@opentrons/components'
import {
  getModuleDisplayName,
  HS_TOO_HOT_TEMP,
  MAGNETIC_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
} from '@opentrons/shared-data'
import { RUN_STATUS_FINISHING, RUN_STATUS_RUNNING } from '@opentrons/api-client'
import { useHistory } from 'react-router-dom'
import { OverflowBtn } from '../../../atoms/MenuList/OverflowBtn'
import { Banner } from '../../../atoms/Banner'
import { useCurrentRunStatus } from '../../RunTimeControl/hooks'
import { HeaterShakerWizard } from '../HeaterShakerWizard'
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

import magneticModule from '../../../assets/images/magnetic_module_gen_2_transparent.svg'
import temperatureModule from '../../../assets/images/temp_deck_gen_2_transparent.svg'
import thermoModule from '../../../assets/images/thermocycler_closed.svg'
import heaterShakerModule from '../../../assets/images/heatershaker_module_transparent.svg'

import type {
  AttachedModule,
  HeaterShakerModule,
} from '../../../redux/modules/types'

interface ModuleCardProps {
  module: AttachedModule
}

export const ModuleCard = (props: ModuleCardProps): JSX.Element | null => {
  const { t } = useTranslation('device_details')
  const { module } = props
  const [showOverflowMenu, setShowOverflowMenu] = React.useState(false)
  const [showSlideout, setShowSlideout] = React.useState(false)
  const [hasSecondary, setHasSecondary] = React.useState(false)
  const [showAboutModule, setShowAboutModule] = React.useState(false)
  const [showTestShake, setShowTestShake] = React.useState(false)
  const [showBanner, setShowBanner] = React.useState<boolean>(true)
  const [showWizard, setShowWizard] = React.useState<boolean>(false)
  const [targetProps, tooltipProps] = useHoverTooltip()
  const history = useHistory()
  const runStatus = useCurrentRunStatus({
    onSettled: data => {
      if (data == null) {
        history.push('/upload')
      }
    },
  })
  const hotToTouch: IconProps = { name: 'ot-hot-to-touch' }

  const isOverflowBtnDisabled =
    runStatus === RUN_STATUS_RUNNING || runStatus === RUN_STATUS_FINISHING

  const moduleOverflowWrapperRef = useOnClickOutside({
    onClickOutside: () => setShowOverflowMenu(false),
  }) as React.RefObject<HTMLDivElement>

  const isTooHot =
    module.model === 'heaterShakerModuleV1' &&
    module.data.currentTemp != null &&
    module.data.currentTemp > HS_TOO_HOT_TEMP

  let image = ''
  let moduleData: JSX.Element = <div></div>
  switch (module.type) {
    case 'magneticModuleType': {
      image = magneticModule
      moduleData = (
        <MagneticModuleData
          moduleStatus={module.status}
          moduleHeight={module.data.height}
          moduleModel={module.model}
        />
      )
      break
    }

    case 'temperatureModuleType': {
      image = temperatureModule
      moduleData = (
        <TemperatureModuleData
          moduleStatus={module.status}
          targetTemp={module.data.targetTemp}
          currentTemp={module.data.currentTemp}
        />
      )
      break
    }

    case 'thermocyclerModuleType': {
      image = thermoModule
      moduleData = (
        <ThermocyclerModuleData
          status={module.status}
          currentTemp={module.data.currentTemp}
          targetTemp={module.data.targetTemp}
          lidTarget={module.data.lidTarget}
          lidTemp={module.data.lidTemp}
        />
      )
      break
    }

    case 'heaterShakerModuleType': {
      image = heaterShakerModule
      moduleData = (
        <HeaterShakerModuleData
          heaterStatus={module.data.temperatureStatus}
          shakerStatus={module.data.speedStatus}
          latchStatus={module.data.labwareLatchStatus}
          targetTemp={module.data.targetTemp}
          currentTemp={module.data.currentTemp}
          targetSpeed={module.data.targetSpeed}
          currentSpeed={module.data.currentSpeed}
          showTemperatureData={true}
        />
      )
    }
  }

  const handleMenuItemClick = (isSecondary: boolean = false): void => {
    if (isSecondary) {
      setHasSecondary(true)
    } else {
      setHasSecondary(false)
    }
    setShowSlideout(true)
    setShowOverflowMenu(false)
    setShowAboutModule(false)
  }

  const handleAboutClick = (): void => {
    setShowAboutModule(true)
    setShowOverflowMenu(false)
    setShowSlideout(false)
  }

  const handleTestShakeClick = (): void => {
    setShowTestShake(true)
    setShowOverflowMenu(false)
    setShowSlideout(false)
  }

  const handleWizardClick = (): void => {
    setShowWizard(true)
    setShowTestShake(false)
    setShowOverflowMenu(false)
    setShowSlideout(false)
  }

  return (
    <React.Fragment>
      <Flex
        backgroundColor={COLORS.background}
        borderRadius={SPACING.spacing2}
        marginBottom={SPACING.spacing3}
        marginLeft={SPACING.spacing2}
        marginRight={SPACING.spacing2}
        width={'100%'}
        data-testid={`module_card_${module.serial}`}
      >
        {showWizard && (
          <HeaterShakerWizard onCloseClick={() => setShowWizard(false)} />
        )}
        {showSlideout && (
          <ModuleSlideout
            module={module}
            isSecondary={hasSecondary}
            showSlideout={showSlideout}
            onCloseClick={() => setShowSlideout(false)}
          />
        )}
        {showAboutModule && (
          <AboutModuleSlideout
            module={module}
            isExpanded={showAboutModule}
            onCloseClick={() => setShowAboutModule(false)}
          />
        )}
        {showTestShake && (
          <TestShakeSlideout
            module={module as HeaterShakerModule}
            isExpanded={showTestShake}
            onCloseClick={() => setShowTestShake(false)}
          />
        )}
        <Box
          padding={`${SPACING.spacing4} ${SPACING.spacing3} ${SPACING.spacing4} ${SPACING.spacing3}`}
          width="100%"
        >
          <Flex flexDirection={DIRECTION_ROW} paddingRight={SPACING.spacing3}>
            <Flex alignItems={ALIGN_START}>
              <img width="60px" height="54px" src={image} alt={module.model} />
            </Flex>
            <Flex
              flexDirection={DIRECTION_COLUMN}
              paddingLeft={SPACING.spacing3}
            >
              {module.hasAvailableUpdate && showBanner ? (
                <Flex paddingBottom={SPACING.spacing2} width="12.4rem">
                  <Banner
                    type="warning"
                    onCloseClick={() => setShowBanner(false)}
                  >
                    <Flex flexDirection={DIRECTION_COLUMN}>
                      {t('firmware_update_available')}
                      <Btn
                        textAlign={ALIGN_START}
                        fontSize={TYPOGRAPHY.fontSizeP}
                        textDecoration={TEXT_DECORATION_UNDERLINE}
                        // TODO(jr, 3/21/22) wire up button when we know where this should link to
                        onClick={() => console.log('firmware update!')}
                      >
                        {t('view_update')}
                      </Btn>
                    </Flex>
                  </Banner>
                </Flex>
              ) : null}
              {isTooHot ? (
                <Flex
                  width="12.4rem"
                  paddingRight={SPACING.spacingM}
                  paddingBottom={SPACING.spacing3}
                >
                  <Banner type="warning" icon={hotToTouch}>
                    <Trans
                      t={t}
                      i18nKey="hot_to_the_touch"
                      components={{
                        bold: <strong />,
                        block: <Text fontSize={TYPOGRAPHY.fontSizeP} />,
                      }}
                    />
                  </Banner>
                </Flex>
              ) : null}
              <Text
                textTransform={TEXT_TRANSFORM_UPPERCASE}
                color={COLORS.darkGrey}
                fontWeight={FONT_WEIGHT_REGULAR}
                fontSize={FONT_SIZE_CAPTION}
                paddingBottom={SPACING.spacing2}
                data-testid={`module_card_usb_port_${module.serial}`}
              >
                {t(module.usbPort.port === null ? 'usb_hub' : 'usb_port', {
                  port: module.usbPort.hub ?? module.usbPort.port,
                })}
              </Text>
              <Flex
                paddingBottom={SPACING.spacing2}
                data-testid={`module_card_display_name_${module.serial}`}
              >
                <ModuleIcon
                  moduleType={module.type}
                  size="1rem"
                  marginRight={SPACING.spacing1}
                  color={COLORS.darkGreyEnabled}
                />
                <Text fontSize={TYPOGRAPHY.fontSizeP}>
                  {getModuleDisplayName(module.model)}
                </Text>
              </Flex>
              {moduleData}
            </Flex>
          </Flex>
        </Box>

        <Box
          alignSelf={ALIGN_START}
          padding={SPACING.spacing2}
          data-testid={`module_card_overflow_btn_${module.serial}`}
        >
          <OverflowBtn
            aria-label="overflow"
            disabled={isOverflowBtnDisabled}
            {...targetProps}
            onClick={() => {
              setShowOverflowMenu(prevShowOverflowMenu => !prevShowOverflowMenu)
            }}
          />
          {isOverflowBtnDisabled && (
            <Tooltip {...tooltipProps} key={`tooltip_${module.serial}`}>
              {t('module_actions_unavailable')}
            </Tooltip>
          )}
        </Box>
        {showOverflowMenu && (
          <div
            ref={moduleOverflowWrapperRef}
            data-testid={`module_card_overflow_menu_${module.serial}`}
          >
            <ModuleOverflowMenu
              handleAboutClick={handleAboutClick}
              module={module}
              handleSlideoutClick={handleMenuItemClick}
              handleTestShakeClick={handleTestShakeClick}
              handleWizardClick={handleWizardClick}
            />
          </div>
        )}
      </Flex>
    </React.Fragment>
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

  if (module.type === THERMOCYCLER_MODULE_TYPE) {
    return (
      <ThermocyclerModuleSlideout
        module={module}
        onCloseClick={onCloseClick}
        isExpanded={showSlideout}
        isSecondaryTemp={isSecondary}
      />
    )
  } else if (module.type === MAGNETIC_MODULE_TYPE) {
    return (
      <MagneticModuleSlideout
        module={module}
        onCloseClick={onCloseClick}
        isExpanded={showSlideout}
      />
    )
  } else if (module.type === TEMPERATURE_MODULE_TYPE) {
    return (
      <TemperatureModuleSlideout
        module={module}
        onCloseClick={onCloseClick}
        isExpanded={showSlideout}
      />
    )
  } else {
    return (
      <HeaterShakerSlideout
        module={module}
        onCloseClick={onCloseClick}
        isExpanded={showSlideout}
        isSetShake={isSecondary}
      />
    )
  }
}
