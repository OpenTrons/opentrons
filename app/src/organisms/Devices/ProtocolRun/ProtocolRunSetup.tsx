import * as React from 'react'
import { useTranslation } from 'react-i18next'

import { parseAllRequiredModuleModels } from '@opentrons/api-client'
import {
  Flex,
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  SPACING,
  Icon,
  SIZE_1,
  DIRECTION_ROW,
  TYPOGRAPHY,
  Link,
} from '@opentrons/components'

import { Line } from '../../../atoms/structure'
import { StyledText } from '../../../atoms/text'
import { InfoMessage } from '../../../molecules/InfoMessage'
import {
  useIsOT3,
  useRobot,
  useRunCalibrationStatus,
  useRunHasStarted,
  useProtocolAnalysisErrors,
  useStoredProtocolAnalysis,
  ProtocolCalibrationStatus,
} from '../hooks'
import { useMostRecentCompletedAnalysis } from '../../LabwarePositionCheck/useMostRecentCompletedAnalysis'
import { SetupLabware } from './SetupLabware'
import { SetupLabwarePositionCheck } from './SetupLabwarePositionCheck'
import { SetupRobotCalibration } from './SetupRobotCalibration'
import { SetupModules } from './SetupModules'
import { SetupStep } from './SetupStep'
import { SetupLiquids } from './SetupLiquids'
import { EmptySetupStep } from './EmptySetupStep'
import { HowLPCWorksModal } from './SetupLabwarePositionCheck/HowLPCWorksModal'

const ROBOT_CALIBRATION_STEP_KEY = 'robot_calibration_step' as const
const MODULE_SETUP_KEY = 'module_setup_step' as const
const LPC_KEY = 'labware_position_check_step' as const
const LABWARE_SETUP_KEY = 'labware_setup_step' as const
const LIQUID_SETUP_KEY = 'liquid_setup_step' as const

export type StepKey =
  | typeof ROBOT_CALIBRATION_STEP_KEY
  | typeof MODULE_SETUP_KEY
  | typeof LPC_KEY
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
  const { t, i18n } = useTranslation('protocol_setup')
  const robotProtocolAnalysis = useMostRecentCompletedAnalysis(runId)
  const storedProtocolAnalysis = useStoredProtocolAnalysis(runId)
  const protocolData = robotProtocolAnalysis ?? storedProtocolAnalysis
  const modules = parseAllRequiredModuleModels(protocolData?.commands ?? [])
  const robot = useRobot(robotName)
  const calibrationStatus = useRunCalibrationStatus(robotName, runId)
  const isOT3 = useIsOT3(robotName)
  const runHasStarted = useRunHasStarted(runId)
  const { analysisErrors } = useProtocolAnalysisErrors(runId)
  const [expandedStepKey, setExpandedStepKey] = React.useState<StepKey | null>(
    null
  )

  const stepsKeysInOrder =
    protocolData != null
      ? [
          ROBOT_CALIBRATION_STEP_KEY,
          MODULE_SETUP_KEY,
          LPC_KEY,
          LABWARE_SETUP_KEY,
          LIQUID_SETUP_KEY,
        ]
      : [ROBOT_CALIBRATION_STEP_KEY, LPC_KEY, LABWARE_SETUP_KEY]

  const targetStepKeyInOrder = stepsKeysInOrder.filter((stepKey: StepKey) => {
    if (protocolData == null) {
      return stepKey !== MODULE_SETUP_KEY && stepKey !== LIQUID_SETUP_KEY
    }

    if (
      protocolData.modules.length === 0 &&
      protocolData.liquids.length === 0
    ) {
      return stepKey !== MODULE_SETUP_KEY && stepKey !== LIQUID_SETUP_KEY
    }

    if (protocolData.modules.length === 0) {
      return stepKey !== MODULE_SETUP_KEY
    }

    if (protocolData.liquids.length === 0) {
      return stepKey !== LIQUID_SETUP_KEY
    }
    return true
  })

  if (robot == null) return null
  const hasLiquids = protocolData != null && protocolData.liquids?.length > 0
  const hasModules = protocolData != null && modules.length > 0

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
            targetStepKeyInOrder[
              targetStepKeyInOrder.findIndex(
                v => v === ROBOT_CALIBRATION_STEP_KEY
              ) + 1
            ]
          }
          expandStep={setExpandedStepKey}
          calibrationStatus={calibrationStatus}
        />
      ),
      // change description for OT-3
      description: isOT3
        ? t(`${ROBOT_CALIBRATION_STEP_KEY}_description_pipettes_only`)
        : t(`${ROBOT_CALIBRATION_STEP_KEY}_description`),
    },
    [MODULE_SETUP_KEY]: {
      stepInternals: (
        <SetupModules
          expandLabwarePositionCheckStep={() => setExpandedStepKey(LPC_KEY)}
          robotName={robotName}
          runId={runId}
        />
      ),
      description: !hasModules
        ? i18n.format(t('no_modules_specified'), 'capitalize')
        : t(`${MODULE_SETUP_KEY}_description`, {
            count: modules.length,
          }),
    },
    [LPC_KEY]: {
      stepInternals: (
        <SetupLabwarePositionCheck
          {...{ runId, robotName }}
          expandLabwareStep={() => setExpandedStepKey(LABWARE_SETUP_KEY)}
        />
      ),
      description: t('labware_position_check_step_description'),
    },
    [LABWARE_SETUP_KEY]: {
      stepInternals: (
        <SetupLabware
          protocolRunHeaderRef={protocolRunHeaderRef}
          robotName={robotName}
          runId={runId}
          nextStep={
            targetStepKeyInOrder.findIndex(v => v === LABWARE_SETUP_KEY) ===
            targetStepKeyInOrder.length - 1
              ? null
              : LIQUID_SETUP_KEY
          }
          expandStep={setExpandedStepKey}
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
      description: hasLiquids
        ? t(`${LIQUID_SETUP_KEY}_description`)
        : i18n.format(t('liquids_not_in_the_protocol'), 'capitalize'),
    },
  }

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing16}
      margin={SPACING.spacing16}
    >
      {protocolData != null ? (
        <>
          {runHasStarted ? (
            <InfoMessage title={t('setup_is_view_only')} />
          ) : null}
          {analysisErrors != null && analysisErrors?.length > 0 ? (
            <StyledText alignSelf={ALIGN_CENTER} color={COLORS.darkGreyEnabled}>
              {t('protocol_analysis_failed')}
            </StyledText>
          ) : (
            stepsKeysInOrder.map((stepKey, index) => (
              <Flex flexDirection={DIRECTION_COLUMN} key={stepKey}>
                {(stepKey === 'liquid_setup_step' && !hasLiquids) ||
                (stepKey === 'module_setup_step' && !hasModules) ? (
                  <EmptySetupStep
                    title={t(`${stepKey}_title`)}
                    description={StepDetailMap[stepKey].description}
                    label={t('step', { index: index + 1 })}
                  />
                ) : (
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
                    rightElement={
                      <StepRightElement
                        {...{ stepKey, runHasStarted, calibrationStatus }}
                      />
                    }
                  >
                    {StepDetailMap[stepKey].stepInternals}
                  </SetupStep>
                )}
                {index !== stepsKeysInOrder.length - 1 ? (
                  <Line marginTop={SPACING.spacing24} />
                ) : null}
              </Flex>
            ))
          )}
        </>
      ) : (
        <StyledText alignSelf={ALIGN_CENTER} color={COLORS.darkGreyEnabled}>
          {t('loading_data')}
        </StyledText>
      )}
    </Flex>
  )
}

interface StepRightElementProps {
  stepKey: StepKey
  calibrationStatus: ProtocolCalibrationStatus
  runHasStarted: boolean
}
function StepRightElement(props: StepRightElementProps): JSX.Element | null {
  const { stepKey, calibrationStatus, runHasStarted } = props
  const { t } = useTranslation('protocol_setup')

  if (stepKey === ROBOT_CALIBRATION_STEP_KEY && !runHasStarted) {
    return (
      <Flex flexDirection={DIRECTION_ROW} alignItems={ALIGN_CENTER}>
        <Icon
          size={SIZE_1}
          color={
            calibrationStatus.complete
              ? COLORS.successEnabled
              : COLORS.warningEnabled
          }
          marginRight={SPACING.spacing8}
          name={calibrationStatus.complete ? 'ot-check' : 'alert-circle'}
          id="RunSetupCard_calibrationIcon"
        />
        <StyledText
          color={COLORS.black}
          css={TYPOGRAPHY.pSemiBold}
          marginRight={SPACING.spacing16}
          textTransform={TYPOGRAPHY.textTransformCapitalize}
          id="RunSetupCard_calibrationText"
        >
          {calibrationStatus.complete
            ? t('calibration_ready')
            : t('calibration_needed')}
        </StyledText>
      </Flex>
    )
  } else if (stepKey === LPC_KEY) {
    return <LearnAboutLPC />
  } else {
    return null
  }
}

function LearnAboutLPC(): JSX.Element {
  const { t } = useTranslation('protocol_setup')
  const [showLPCHelpModal, setShowLPCHelpModal] = React.useState(false)
  return (
    <>
      <Link
        css={TYPOGRAPHY.linkPSemiBold}
        marginRight={SPACING.spacing16}
        onClick={e => {
          // clicking link shouldn't toggle step expanded state
          e.preventDefault()
          e.stopPropagation()
          setShowLPCHelpModal(true)
        }}
      >
        {t('learn_how_it_works')}
      </Link>
      {showLPCHelpModal ? (
        <HowLPCWorksModal onCloseClick={() => setShowLPCHelpModal(false)} />
      ) : null}
    </>
  )
}
