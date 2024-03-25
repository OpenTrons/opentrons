import * as React from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { useSelector, useDispatch } from 'react-redux'
import { NavLink } from 'react-router-dom'
import { css } from 'styled-components'

import {
  ALIGN_CENTER,
  ALIGN_FLEX_END,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  DISPLAY_INLINE_BLOCK,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  JUSTIFY_END,
  JUSTIFY_FLEX_START,
  Link,
  OVERFLOW_WRAP_ANYWHERE,
  SIZE_1,
  SIZE_4,
  SPACING,
  StyledText,
  TYPOGRAPHY,
  useHoverTooltip,
} from '@opentrons/components'

import { FLEX_ROBOT_TYPE, OT2_ROBOT_TYPE } from '@opentrons/shared-data'
import {
  getConnectableRobots,
  getReachableRobots,
  getUnreachableRobots,
  getScanning,
  startDiscovery,
  RE_ROBOT_MODEL_OT2,
  RE_ROBOT_MODEL_OT3,
} from '../../redux/discovery'
import { Banner } from '../../atoms/Banner'
import { Slideout } from '../../atoms/Slideout'
import { MultiSlideout } from '../../atoms/Slideout/MultiSlideout'
import { ToggleButton } from '../../atoms/buttons'
import { AvailableRobotOption } from './AvailableRobotOption'
import { InputField } from '../../atoms/InputField'
import { DropdownMenu } from '../../atoms/MenuList/DropdownMenu'
import { Tooltip } from '../../atoms/Tooltip'

import type { RobotType, RunTimeParameter } from '@opentrons/shared-data'
import type { SlideoutProps } from '../../atoms/Slideout'
import type { UseCreateRun } from '../../organisms/ChooseRobotToRunProtocolSlideout/useCreateRunFromProtocol'
import type { State, Dispatch } from '../../redux/types'
import type { Robot } from '../../redux/discovery/types'
import { useFeatureFlag } from '../../redux/config'
import type { DropdownOption } from '../../atoms/MenuList/DropdownMenu'

export const CARD_OUTLINE_BORDER_STYLE = css`
  border-style: ${BORDERS.styleSolid};
  border-width: 1px;
  border-color: ${COLORS.grey30};
  border-radius: ${BORDERS.borderRadius8};
  &:hover {
    border-color: ${COLORS.grey55};
  }
`

interface RobotIsBusyAction {
  type: 'robotIsBusy'
  robotName: string
}

interface RobotIsIdleAction {
  type: 'robotIsIdle'
  robotName: string
}

interface RobotBusyStatusByName {
  [robotName: string]: boolean
}

export type RobotBusyStatusAction = RobotIsBusyAction | RobotIsIdleAction

function robotBusyStatusByNameReducer(
  state: RobotBusyStatusByName,
  action: RobotBusyStatusAction
): RobotBusyStatusByName {
  switch (action.type) {
    case 'robotIsBusy': {
      return {
        ...state,
        [action.robotName]: true,
      }
    }
    case 'robotIsIdle': {
      return {
        ...state,
        [action.robotName]: false,
      }
    }
  }
}

interface ChooseRobotSlideoutProps
  extends Omit<SlideoutProps, 'children'>,
    Partial<UseCreateRun> {
  isSelectedRobotOnDifferentSoftwareVersion: boolean
  robotType: RobotType | null
  selectedRobot: Robot | null
  setSelectedRobot: (robot: Robot | null) => void
  runTimeParametersOverrides?: RunTimeParameter[]
  setRunTimeParametersOverrides?: (parameters: RunTimeParameter[]) => void
  isAnalysisError?: boolean
  isAnalysisStale?: boolean
  showIdleOnly?: boolean
  multiSlideout?: { currentPage: number }
}

export function ChooseRobotSlideout(
  props: ChooseRobotSlideoutProps
): JSX.Element {
  const { t } = useTranslation(['protocol_details', 'shared', 'app_settings'])
  const {
    isExpanded,
    onCloseClick,
    title,
    footer,
    isAnalysisError = false,
    isAnalysisStale = false,
    isCreatingRun = false,
    isSelectedRobotOnDifferentSoftwareVersion,
    reset: resetCreateRun,
    runCreationError,
    runCreationErrorCode,
    selectedRobot,
    setSelectedRobot,
    robotType,
    showIdleOnly = false,
    multiSlideout,
    runTimeParametersOverrides,
    setRunTimeParametersOverrides,
  } = props

  const enableRunTimeParametersFF = useFeatureFlag('enableRunTimeParameters')
  const dispatch = useDispatch<Dispatch>()
  const isScanning = useSelector((state: State) => getScanning(state))
  const [targetProps, tooltipProps] = useHoverTooltip()

  const unhealthyReachableRobots = useSelector((state: State) =>
    getReachableRobots(state)
  ).filter(robot => {
    if (robotType === FLEX_ROBOT_TYPE) {
      return RE_ROBOT_MODEL_OT3.test(robot.robotModel)
    } else if (robotType === OT2_ROBOT_TYPE) {
      return RE_ROBOT_MODEL_OT2.test(robot.robotModel)
    } else {
      return true
    }
  })
  const unreachableRobots = useSelector((state: State) =>
    getUnreachableRobots(state)
  ).filter(robot => {
    if (robotType === FLEX_ROBOT_TYPE) {
      return RE_ROBOT_MODEL_OT3.test(robot.robotModel)
    } else if (robotType === OT2_ROBOT_TYPE) {
      return RE_ROBOT_MODEL_OT2.test(robot.robotModel)
    } else {
      return true
    }
  })
  const healthyReachableRobots = useSelector((state: State) =>
    getConnectableRobots(state)
  ).filter(robot => {
    if (robotType === FLEX_ROBOT_TYPE) {
      return robot.robotModel === FLEX_ROBOT_TYPE
    } else if (robotType === OT2_ROBOT_TYPE) {
      return robot.robotModel === OT2_ROBOT_TYPE
    } else {
      return true
    }
  })

  const [robotBusyStatusByName, registerRobotBusyStatus] = React.useReducer(
    robotBusyStatusByNameReducer,
    {}
  )

  const reducerBusyCount = healthyReachableRobots.filter(
    robot => robotBusyStatusByName[robot.name]
  ).length

  // this useEffect sets the default selection to the first robot in the list. state is managed by the caller
  React.useEffect(() => {
    if (selectedRobot == null && healthyReachableRobots.length > 0) {
      setSelectedRobot(healthyReachableRobots[0])
    } else if (healthyReachableRobots.length === 0) {
      setSelectedRobot(null)
    }
  }, [healthyReachableRobots, selectedRobot, setSelectedRobot])

  const unavailableCount =
    unhealthyReachableRobots.length + unreachableRobots.length

  const pageOneBody = (
    <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
      {isAnalysisError ? (
        <Banner type="warning">{t('protocol_failed_app_analysis')}</Banner>
      ) : null}
      {isAnalysisStale ? (
        <Banner type="warning">{t('protocol_outdated_app_analysis')}</Banner>
      ) : null}
      <Flex alignSelf={ALIGN_FLEX_END} marginY={SPACING.spacing4}>
        {isScanning ? (
          <Flex flexDirection={DIRECTION_ROW} alignItems={ALIGN_CENTER}>
            <StyledText
              as="p"
              color={COLORS.grey60}
              marginRight={SPACING.spacing12}
            >
              {t('app_settings:searching')}
            </StyledText>
            <Icon name="ot-spinner" spin size="1.25rem" color={COLORS.grey60} />
          </Flex>
        ) : (
          <Link
            onClick={() => dispatch(startDiscovery())}
            textTransform={TYPOGRAPHY.textTransformCapitalize}
            role="button"
            css={TYPOGRAPHY.linkPSemiBold}
          >
            {t('shared:refresh')}
          </Link>
        )}
      </Flex>
      {!isScanning && healthyReachableRobots.length === 0 ? (
        <Flex
          css={css`
            ${CARD_OUTLINE_BORDER_STYLE}
            &:hover {
              border-color: ${COLORS.grey30};
            }
          `}
          flexDirection={DIRECTION_COLUMN}
          justifyContent={JUSTIFY_CENTER}
          alignItems={ALIGN_CENTER}
          height={SIZE_4}
          gridGap={SPACING.spacing8}
        >
          <Icon name="alert-circle" size={SIZE_1} />
          <StyledText as="p" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
            {t('no_available_robots_found')}
          </StyledText>
        </Flex>
      ) : (
        healthyReachableRobots.map(robot => {
          const isSelected =
            selectedRobot != null && selectedRobot.ip === robot.ip
          return (
            <React.Fragment key={robot.ip}>
              <AvailableRobotOption
                robot={robot}
                onClick={() => {
                  if (!isCreatingRun) {
                    resetCreateRun?.()
                    setSelectedRobot(robot)
                  }
                }}
                isError={runCreationError != null}
                isSelected={isSelected}
                isSelectedRobotOnDifferentSoftwareVersion={
                  isSelectedRobotOnDifferentSoftwareVersion
                }
                showIdleOnly={showIdleOnly}
                registerRobotBusyStatus={registerRobotBusyStatus}
              />
              {runCreationError != null && isSelected && (
                <StyledText
                  as="label"
                  color={COLORS.red60}
                  overflowWrap={OVERFLOW_WRAP_ANYWHERE}
                  display={DISPLAY_INLINE_BLOCK}
                  marginTop={`-${SPACING.spacing8}`}
                  marginBottom={SPACING.spacing8}
                >
                  {runCreationErrorCode === 409 ? (
                    <Trans
                      t={t}
                      i18nKey="shared:robot_is_busy_no_protocol_run_allowed"
                      components={{
                        robotLink: (
                          <NavLink
                            css={css`
                              color: ${COLORS.red60};
                              text-decoration: ${TYPOGRAPHY.textDecorationUnderline};
                            `}
                            to={`/devices/${robot.name}`}
                          />
                        ),
                      }}
                    />
                  ) : (
                    runCreationError
                  )}
                </StyledText>
              )}
            </React.Fragment>
          )
        })
      )}
      {!isScanning && unavailableCount > 0 ? (
        <Flex
          flexDirection={DIRECTION_COLUMN}
          alignItems={ALIGN_CENTER}
          textAlign={TYPOGRAPHY.textAlignCenter}
          marginTop={SPACING.spacing24}
        >
          <StyledText as="p" color={COLORS.grey50}>
            {showIdleOnly
              ? t('unavailable_or_busy_robot_not_listed', {
                  count: unavailableCount + reducerBusyCount,
                })
              : t('unavailable_robot_not_listed', {
                  count: unavailableCount,
                })}
          </StyledText>
          <NavLink to="/devices" css={TYPOGRAPHY.linkPSemiBold}>
            {t('view_unavailable_robots')}
          </NavLink>
        </Flex>
      ) : null}
    </Flex>
  )

  const runTimeParameters =
    runTimeParametersOverrides?.map((runtimeParam, index) => {
      if ('choices' in runtimeParam) {
        const dropdownOptions = runtimeParam.choices.map(choice => {
          return { name: choice.displayName, value: choice.value }
        }) as DropdownOption[]
        return (
          <DropdownMenu
            key={runtimeParam.variableName}
            filterOptions={dropdownOptions}
            currentOption={
              dropdownOptions.find(choice => {
                return choice.value === runtimeParam.value
              }) ?? dropdownOptions[0]
            }
            onClick={choice => {
              const clone = runTimeParametersOverrides.map((parameter, i) => {
                if (i === index) {
                  return {
                    ...parameter,
                    value:
                      dropdownOptions.find(option => option.value === choice)
                        ?.value ?? parameter.default,
                  }
                }
                return parameter
              })
              if (setRunTimeParametersOverrides != null) {
                setRunTimeParametersOverrides(clone)
              }
            }}
            title={runtimeParam.displayName}
            caption={runtimeParam.description}
            width="100%"
            dropdownType="neutral"
          />
        )
      } else if (runtimeParam.type === 'int' || runtimeParam.type === 'float') {
        const value = runtimeParam.value as number
        const id = `InputField_${runtimeParam.variableName}_${index.toString()}`
        return (
          <InputField
            key={runtimeParam.variableName}
            type="number"
            units={runtimeParam.suffix}
            placeholder={value.toString()}
            value={value}
            title={runtimeParam.displayName}
            caption={runtimeParam.description}
            id={id}
            onChange={e => {
              const clone = runTimeParametersOverrides.map((parameter, i) => {
                if (i === index) {
                  return {
                    ...parameter,
                    value:
                      runtimeParam.type === 'int'
                        ? Math.round(e.target.valueAsNumber)
                        : e.target.valueAsNumber,
                  }
                }
                return parameter
              })
              if (setRunTimeParametersOverrides != null) {
                setRunTimeParametersOverrides(clone)
              }
            }}
          />
        )
      } else if (runtimeParam.type === 'boolean') {
        return (
          <Flex
            flexDirection={DIRECTION_COLUMN}
            key={runtimeParam.variableName}
          >
            <StyledText
              as="label"
              fontWeight={TYPOGRAPHY.fontWeightSemiBold}
              paddingBottom={SPACING.spacing8}
            >
              {runtimeParam.displayName}
            </StyledText>
            <Flex
              gridGap={SPACING.spacing8}
              justifyContent={JUSTIFY_FLEX_START}
              width="max-content"
            >
              <ToggleButton
                toggledOn={runtimeParam.value as boolean}
                onClick={() => {
                  const clone = runTimeParametersOverrides.map(
                    (parameter, i) => {
                      if (i === index) {
                        return {
                          ...parameter,
                          value: !parameter.value,
                        }
                      }
                      return parameter
                    }
                  )
                  if (setRunTimeParametersOverrides != null) {
                    setRunTimeParametersOverrides(clone)
                  }
                }}
                height="0.813rem"
                label={runtimeParam.value ? t('on') : t('off')}
                paddingTop={SPACING.spacing2} // manual alignment of SVG with value label
              />
              <StyledText as="p">
                {runtimeParam.value ? t('on') : t('off')}
              </StyledText>
            </Flex>
            <StyledText as="label" paddingTop={SPACING.spacing8}>
              {runtimeParam.description}
            </StyledText>
          </Flex>
        )
      }
    }) ?? null

  const isRestoreDefaultsLinkEnabled =
    runTimeParametersOverrides?.some(
      parameter => parameter.value !== parameter.default
    ) ?? false

  const pageTwoBody =
    runTimeParametersOverrides != null ? (
      <Flex flexDirection={DIRECTION_COLUMN}>
        <Flex justifyContent={JUSTIFY_END}>
          <Link
            textAlign={TYPOGRAPHY.textAlignRight}
            css={
              isRestoreDefaultsLinkEnabled
                ? ENABLED_LINK_CSS
                : DISABLED_LINK_CSS
            }
            onClick={() => {
              const clone = runTimeParametersOverrides.map(parameter => ({
                ...parameter,
                value: parameter.default,
              }))
              if (setRunTimeParametersOverrides != null) {
                setRunTimeParametersOverrides(clone)
              }
            }}
            paddingBottom={SPACING.spacing10}
            {...targetProps}
          >
            {t('restore_defaults')}
          </Link>
          {!isRestoreDefaultsLinkEnabled && (
            <Tooltip tooltipProps={tooltipProps}>
              {t('no_custom_values')}
            </Tooltip>
          )}
        </Flex>
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing16}>
          {runTimeParameters}
        </Flex>
      </Flex>
    ) : null

  return multiSlideout != null && enableRunTimeParametersFF ? (
    <MultiSlideout
      isExpanded={isExpanded}
      onCloseClick={onCloseClick}
      title={title}
      footer={footer}
      currentStep={multiSlideout.currentPage}
      maxSteps={2}
    >
      {multiSlideout.currentPage === 1 ? pageOneBody : pageTwoBody}
    </MultiSlideout>
  ) : (
    <Slideout
      isExpanded={isExpanded}
      onCloseClick={onCloseClick}
      title={title}
      footer={footer}
    >
      {pageOneBody}
    </Slideout>
  )
}

const ENABLED_LINK_CSS = css`
  ${TYPOGRAPHY.linkPSemiBold}
  cursor: pointer;
`

const DISABLED_LINK_CSS = css`
  ${TYPOGRAPHY.linkPSemiBold}
  color: ${COLORS.grey50};
  cursor: default;

  &:hover {
    color: ${COLORS.grey50};
  }
`
