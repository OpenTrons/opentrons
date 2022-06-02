import * as React from 'react'
import { useTranslation } from 'react-i18next'

import {
  Flex,
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  SPACING,
} from '@opentrons/components'
import { protocolHasModules } from '@opentrons/shared-data'
import { useFeatureFlag } from '../../../redux/config'
import { Line } from '../../../atoms/structure'
import { StyledText } from '../../../atoms/text'
import { InfoMessage } from '../../../molecules/InfoMessage'
import {
  useDeckCalibrationData,
  useProtocolDetailsForRun,
  useRobot,
  useRunCalibrationStatus,
  useRunHasStarted,
} from '../hooks'
import { SetupLabware } from './SetupLabware'
import { SetupRobotCalibration } from './SetupRobotCalibration'
import { SetupModules } from './SetupModules'
import { SetupStep } from './SetupStep'
import { SetupLiquids } from './SetupLiquids'
const ROBOT_CALIBRATION_STEP_KEY = 'robot_calibration_step' as const
const MODULE_SETUP_KEY = 'module_setup_step' as const
const LABWARE_SETUP_KEY = 'labware_setup_step' as const
const LIQUID_SETUP_KEY = 'liquid_setup_step' as const

export type StepKey =
  | typeof ROBOT_CALIBRATION_STEP_KEY
  | typeof MODULE_SETUP_KEY
  | typeof LABWARE_SETUP_KEY
  | typeof LIQUID_SETUP_KEY

interface ProtocolRunSetupProps {
  protocolRunHeaderRef: React.RefObject<HTMLDivElement> | null
  robotName: string
  runId: string
}

export function ProtocolRunSetup({
  protocolRunHeaderRef,
  robotName,
  runId,
}: ProtocolRunSetupProps): JSX.Element | null {
  const { t } = useTranslation('protocol_setup')
  const { protocolData } = useProtocolDetailsForRun(runId)
  const robot = useRobot(robotName)
  const calibrationStatus = useRunCalibrationStatus(robotName, runId)
  const { isDeckCalibrated } = useDeckCalibrationData(robotName)
  const runHasStarted = useRunHasStarted(runId)
  const liquidSetupEnabled = useFeatureFlag('enableLiquidSetup')
  const [expandedStepKey, setExpandedStepKey] = React.useState<StepKey | null>(
    null
  )
  const [stepsKeysInOrder, setStepKeysInOrder] = React.useState<StepKey[]>([
    ROBOT_CALIBRATION_STEP_KEY,
    LABWARE_SETUP_KEY,
  ])

  React.useEffect(() => {
    let nextStepKeysInOrder = stepsKeysInOrder
    const showModuleSetup =
      protocolData != null && protocolHasModules(protocolData)
    const showLiquidSetup = liquidSetupEnabled
    // uncomment this once we start getting liquids back from protocol data
    // &&
    // protocolData != null &&
    // protocolHasLiquids(protocolData)
    if (showModuleSetup && showLiquidSetup) {
      nextStepKeysInOrder = [
        ROBOT_CALIBRATION_STEP_KEY,
        MODULE_SETUP_KEY,
        LABWARE_SETUP_KEY,
        LIQUID_SETUP_KEY,
      ]
    } else if (showModuleSetup) {
      nextStepKeysInOrder = [
        ROBOT_CALIBRATION_STEP_KEY,
        MODULE_SETUP_KEY,
        LABWARE_SETUP_KEY,
      ]
    } else if (showLiquidSetup) {
      nextStepKeysInOrder = [
        ROBOT_CALIBRATION_STEP_KEY,
        LABWARE_SETUP_KEY,
        LIQUID_SETUP_KEY,
      ]
    }
    setStepKeysInOrder(nextStepKeysInOrder)
  }, [Boolean(protocolData), protocolData?.commands])

  if (robot == null) return null

  const StepDetailMap: Record<
    StepKey,
    { stepInternals: JSX.Element; description: string }
  > = {
    [ROBOT_CALIBRATION_STEP_KEY]: {
      stepInternals: (
        <SetupRobotCalibration
          robotName={robotName}
          runId={runId}
          nextStep={
            stepsKeysInOrder[
              stepsKeysInOrder.findIndex(
                v => v === ROBOT_CALIBRATION_STEP_KEY
              ) + 1
            ]
          }
          expandStep={nextStep => setExpandedStepKey(nextStep)}
          calibrationStatus={calibrationStatus}
        />
      ),
      description: t(`${ROBOT_CALIBRATION_STEP_KEY}_description`),
    },
    [MODULE_SETUP_KEY]: {
      stepInternals: (
        <SetupModules
          expandLabwareSetupStep={() => setExpandedStepKey(LABWARE_SETUP_KEY)}
          robotName={robotName}
          runId={runId}
        />
      ),
      description: t(`${MODULE_SETUP_KEY}_description`, {
        count:
          protocolData != null && 'modules' in protocolData
            ? Object.keys(protocolData.modules).length
            : 0,
      }),
    },
    [LABWARE_SETUP_KEY]: {
      stepInternals: (
        <SetupLabware
          protocolRunHeaderRef={protocolRunHeaderRef}
          robotName={robotName}
          runId={runId}
          nextStep={
            stepsKeysInOrder.findIndex(v => v === LABWARE_SETUP_KEY) ===
            stepsKeysInOrder.length - 1
              ? null
              : LIQUID_SETUP_KEY
          }
          expandStep={nextStep => setExpandedStepKey(nextStep)}
        />
      ),
      description: t(`${LABWARE_SETUP_KEY}_description`),
    },
    [LIQUID_SETUP_KEY]: {
      stepInternals: (
        <SetupLiquids
          protocolRunHeaderRef={protocolRunHeaderRef}
          robotName={robotName}
          runId={runId}
        />
      ),
      description: t(`${LIQUID_SETUP_KEY}_description`),
    },
  }

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing4}
      margin={SPACING.spacing4}
    >
      {protocolData != null ? (
        <>
          {runHasStarted ? (
            <InfoMessage title={t('setup_is_view_only')} />
          ) : null}
          {stepsKeysInOrder.map((stepKey, index) => (
            <Flex flexDirection={DIRECTION_COLUMN} key={stepKey}>
              <SetupStep
                expanded={stepKey === expandedStepKey}
                label={t('step', { index: index + 1 })}
                title={t(`${stepKey}_title`)}
                description={StepDetailMap[stepKey].description}
                toggleExpanded={() =>
                  stepKey === expandedStepKey
                    ? setExpandedStepKey(null)
                    : setExpandedStepKey(stepKey)
                }
                calibrationStatusComplete={
                  stepKey === ROBOT_CALIBRATION_STEP_KEY && !runHasStarted
                    ? calibrationStatus.complete && isDeckCalibrated
                    : null
                }
              >
                {StepDetailMap[stepKey].stepInternals}
              </SetupStep>
              {index !== stepsKeysInOrder.length - 1 ? (
                <Line marginTop={SPACING.spacing5} />
              ) : null}
            </Flex>
          ))}
        </>
      ) : (
        <StyledText alignSelf={ALIGN_CENTER} color={COLORS.darkGreyEnabled}>
          {t('loading_data')}
        </StyledText>
      )}
    </Flex>
  )
}
