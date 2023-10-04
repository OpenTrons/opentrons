import * as React from 'react'
import { useTranslation } from 'react-i18next'

import {
  LoadedFixturesBySlot,
  parseAllRequiredModuleModels,
  parseInitialLoadedFixturesByCutout,
} from '@opentrons/api-client'
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
import { useFeatureFlag } from '../../../redux/config'
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
import {
  STAGING_AREA_LOAD_NAME,
  WASTE_CHUTE_LOAD_NAME,
} from '@opentrons/shared-data'

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
  const enableDeckConfig = useFeatureFlag('enableDeckConfiguration')
  //  TODO(Jr, 10/4/23): stubbed in the fixtures for now - delete IMMEDIATELY
  // const loadedFixturesBySlot = parseInitialLoadedFixturesByCutout(
  //   protocolData?.commands ?? []
  // )

  const STUBBED_LOAD_FIXTURE_BY_SLOT: LoadedFixturesBySlot = {
    D3: {
      id: 'stubbed_load_fixture',
      commandType: 'loadFixture',
      params: {
        fixtureId: 'stubbedFixtureId',
        loadName: WASTE_CHUTE_LOAD_NAME,
        location: { cutout: 'D3' },
      },
      createdAt: 'fakeTimestamp',
      startedAt: 'fakeTimestamp',
      completedAt: 'fakeTimestamp',
      status: 'succeeded',
    },
    B3: {
      id: 'stubbed_load_fixture_2',
      commandType: 'loadFixture',
      params: {
        fixtureId: 'stubbedFixtureId_2',
        loadName: STAGING_AREA_LOAD_NAME,
        location: { cutout: 'B3' },
      },
      createdAt: 'fakeTimestamp',
      startedAt: 'fakeTimestamp',
      completedAt: 'fakeTimestamp',
      status: 'succeeded',
    },
  }

  const robot = useRobot(robotName)
  const calibrationStatus = useRunCalibrationStatus(robotName, runId)
  const isOT3 = useIsOT3(robotName)
  const runHasStarted = useRunHasStarted(runId)
  const { analysisErrors } = useProtocolAnalysisErrors(runId)
  const [expandedStepKey, setExpandedStepKey] = React.useState<StepKey | null>(
    null
  )
  const [stepsKeysInOrder, setStepKeysInOrder] = React.useState<StepKey[]>([
    ROBOT_CALIBRATION_STEP_KEY,
    LPC_KEY,
    LABWARE_SETUP_KEY,
  ])

  React.useEffect(() => {
    let nextStepKeysInOrder = stepsKeysInOrder

    if (protocolData != null) {
      nextStepKeysInOrder = [
        ROBOT_CALIBRATION_STEP_KEY,
        MODULE_SETUP_KEY,
        LPC_KEY,
        LABWARE_SETUP_KEY,
        LIQUID_SETUP_KEY,
      ]
    }
    setStepKeysInOrder(nextStepKeysInOrder)
  }, [Boolean(protocolData), protocolData?.commands])

  if (robot == null) return null
  const hasLiquids = protocolData != null && protocolData.liquids?.length > 0
  const hasModules = protocolData != null && modules.length > 0
  const hasFixtures =
    protocolData != null && Object.keys(STUBBED_LOAD_FIXTURE_BY_SLOT).length > 0

  let moduleDescription: string = t(`${MODULE_SETUP_KEY}_description`, {
    count: modules.length,
  })
  if (!hasModules) {
    moduleDescription = i18n.format(t('no_modules_specified'), 'capitalize')
  } else if (isOT3 && enableDeckConfig && (hasModules || hasFixtures)) {
    moduleDescription = t('install_modules_and_fixtures')
  } else if (isOT3 && enableDeckConfig && !hasModules && !hasFixtures) {
    moduleDescription = t('no_modules_or_fixtures')
  }

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
          expandStep={setExpandedStepKey}
          calibrationStatus={calibrationStatus}
        />
      ),
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
          loadedFixturesBySlot={STUBBED_LOAD_FIXTURE_BY_SLOT}
          hasModules={hasModules}
        />
      ),
      description: moduleDescription,
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
            stepsKeysInOrder.findIndex(v => v === LABWARE_SETUP_KEY) ===
            stepsKeysInOrder.length - 1
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
                (stepKey === 'module_setup_step' &&
                  (!hasModules ||
                    (enableDeckConfig && !hasModules && !hasFixtures))) ? (
                  <EmptySetupStep
                    title={t(`${stepKey}_title`)}
                    description={StepDetailMap[stepKey].description}
                    label={t('step', { index: index + 1 })}
                  />
                ) : (
                  <SetupStep
                    expanded={stepKey === expandedStepKey}
                    label={t('step', { index: index + 1 })}
                    title={t(
                      isOT3 && stepKey === MODULE_SETUP_KEY && enableDeckConfig
                        ? `module_and_deck_setup`
                        : `${stepKey}_title`
                    )}
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
