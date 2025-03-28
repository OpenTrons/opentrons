import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  FLEX_MAX_CONTENT,
  Flex,
  Icon,
  LegacyStyledText,
  SPACING,
  StyledText,
} from '@opentrons/components'
import {
  FLEX_ROBOT_TYPE,
  OT2_ROBOT_TYPE,
  parseAllRequiredModuleModels,
} from '@opentrons/shared-data'
import { useProtocolQuery } from '@opentrons/react-api-client'

import { Line } from '/app/atoms/structure'
import { InfoMessage } from '/app/molecules/InfoMessage'
import { INCOMPATIBLE, INEXACT_MATCH } from '/app/redux/pipettes'
import {
  getIsFixtureMismatch,
  getRequiredDeckConfig,
} from '/app/resources/deck_configuration/utils'
import { useDeckConfigurationCompatibility } from '/app/resources/deck_configuration/hooks'
import { useRobot, useIsFlex } from '/app/redux-resources/robots'
import { useRequiredSetupStepsInOrder } from '/app/redux-resources/runs'
import { useStoredProtocolAnalysis } from '/app/resources/analysis'
import {
  useMostRecentCompletedAnalysis,
  useRunPipetteInfoByMount,
  useRunCalibrationStatus,
  useRunHasStarted,
  useUnmatchedModulesForProtocol,
  useModuleCalibrationStatus,
  useProtocolAnalysisErrors,
  useNotifyRunQuery,
} from '/app/resources/runs'
import {
  ROBOT_CALIBRATION_STEP_KEY,
  MODULE_SETUP_STEP_KEY,
  LPC_STEP_KEY,
  LABWARE_SETUP_STEP_KEY,
  LIQUID_SETUP_STEP_KEY,
  updateRunSetupStepsComplete,
  getMissingSetupSteps,
  selectIsAnyNecessaryDefaultOffsetMissing,
  appliedOffsetsToRun,
  selectAreOffsetsApplied,
  selectTotalCountLocationSpecificOffsets,
} from '/app/redux/protocol-runs'
import { SetupLabware } from './SetupLabware'
import { SetupLabwarePositionCheck } from './SetupLabwarePositionCheck'
import { SetupRobotCalibration } from './SetupRobotCalibration'
import { SetupModuleAndDeck } from './SetupModuleAndDeck'
import { SetupStep } from './SetupStep'
import { SetupLiquids } from './SetupLiquids'
import { EmptySetupStep } from './EmptySetupStep'
import { LearnAboutOffsetsLink } from './LearnAboutOffsetsLink'
import { useLPCFlows } from '/app/organisms/LabwarePositionCheck'

import type { RefObject } from 'react'
import type { Dispatch, State } from '/app/redux/types'
import type { StepKey } from '/app/redux/protocol-runs'

interface ProtocolRunSetupProps {
  protocolRunHeaderRef: RefObject<HTMLDivElement> | null
  robotName: string
  runId: string
}

export function ProtocolRunSetup({
  protocolRunHeaderRef,
  robotName,
  runId,
}: ProtocolRunSetupProps): JSX.Element | null {
  const { t, i18n } = useTranslation('protocol_setup')
  const dispatch = useDispatch<Dispatch>()
  const robotProtocolAnalysis = useMostRecentCompletedAnalysis(runId)
  const storedProtocolAnalysis = useStoredProtocolAnalysis(runId)
  const protocolAnalysis = robotProtocolAnalysis ?? storedProtocolAnalysis
  const {
    orderedSteps,
    orderedApplicableSteps,
  } = useRequiredSetupStepsInOrder({ runId, protocolAnalysis })
  const modules = parseAllRequiredModuleModels(protocolAnalysis?.commands ?? [])
  const robot = useRobot(robotName)
  const calibrationStatusRobot = useRunCalibrationStatus(robotName, runId)
  const calibrationStatusModules = useModuleCalibrationStatus(robotName, runId)
  const { missingModuleIds } = useUnmatchedModulesForProtocol(robotName, runId)
  const isFlex = useIsFlex(robotName)
  const runHasStarted = useRunHasStarted(runId)
  const { analysisErrors } = useProtocolAnalysisErrors(runId)
  const [expandedStepKey, setExpandedStepKey] = useState<StepKey | null>(null)
  const robotType = isFlex ? FLEX_ROBOT_TYPE : OT2_ROBOT_TYPE
  const deckConfigCompatibility = useDeckConfigurationCompatibility(
    robotType,
    protocolAnalysis
  )
  const runPipetteInfoByMount = useRunPipetteInfoByMount(runId)
  const { data: runRecord } = useNotifyRunQuery(runId, { staleTime: Infinity })
  const { data: protocolRecord } = useProtocolQuery(
    runRecord?.data.protocolId ?? null,
    {
      staleTime: Infinity,
    }
  )
  const protocolName =
    protocolRecord?.data.metadata.protocolName ??
    protocolRecord?.data.files[0].name ??
    ''

  const lpcUtils = useLPCFlows({
    runId,
    robotType,
    protocolName,
  })

  const missingSteps = useSelector<State, StepKey[]>(
    (state: State): StepKey[] => getMissingSetupSteps(state, runId)
  )

  const flexOffsetsMissing = useSelector(
    selectIsAnyNecessaryDefaultOffsetMissing(runId)
  )
  const flexOffsetsApplied = useSelector(selectAreOffsetsApplied(runId))
  const noLwOffsetsInRun =
    useSelector(selectTotalCountLocationSpecificOffsets(runId)) === 0 && isFlex

  const offsetsConfirmed = isFlex
    ? flexOffsetsApplied && !missingSteps.includes(LPC_STEP_KEY)
    : !missingSteps.includes(LPC_STEP_KEY)
  const buildLPCIncompleteText = (): string | null => {
    if (isFlex) {
      return flexOffsetsMissing
        ? t('offsets_missing')
        : t('offsets_not_applied')
    } else {
      return null
    }
  }

  const buildLPCCompleteText = (): string => {
    if (noLwOffsetsInRun) {
      return t('offsets_not_required')
    } else {
      return isFlex ? t('offsets_applied') : t('offsets_ready')
    }
  }

  const isMissingPipette =
    (runPipetteInfoByMount.left != null &&
      runPipetteInfoByMount.left.requestedPipetteMatch === INCOMPATIBLE) ||
    (runPipetteInfoByMount.right != null &&
      runPipetteInfoByMount.right.requestedPipetteMatch === INCOMPATIBLE) ||
    // for Flex, require exact match
    (isFlex &&
      runPipetteInfoByMount.left != null &&
      runPipetteInfoByMount.left.requestedPipetteMatch === INEXACT_MATCH) ||
    (isFlex &&
      runPipetteInfoByMount.right != null &&
      runPipetteInfoByMount.right.requestedPipetteMatch === INEXACT_MATCH)

  const isFixtureMismatch = getIsFixtureMismatch(deckConfigCompatibility)

  const isMissingModule = missingModuleIds.length > 0

  const liquids = protocolAnalysis?.liquids ?? []
  const hasLiquids = liquids.length > 0
  const hasModules = protocolAnalysis != null && modules.length > 0
  // need config compatibility (including check for single slot conflicts)
  const requiredDeckConfigCompatibility = getRequiredDeckConfig(
    deckConfigCompatibility
  )
  const hasFixtures = requiredDeckConfigCompatibility.length > 0
  const flexDeckHardwareDescription =
    hasModules || hasFixtures
      ? t('install_modules_and_fixtures')
      : t('no_deck_hardware_specified')
  const ot2DeckHardwareDescription = hasModules
    ? t('install_modules', { count: modules.length })
    : t('no_deck_hardware_specified')

  if (robot == null) {
    return null
  }
  const StepDetailMap: Record<
    StepKey,
    {
      stepInternals: JSX.Element
      description: string
      descriptionElement: JSX.Element | null
      rightElProps: StepRightElementProps
    }
  > = {
    [ROBOT_CALIBRATION_STEP_KEY]: {
      stepInternals: (
        <SetupRobotCalibration
          robotName={robotName}
          runId={runId}
          nextStep={
            orderedApplicableSteps[
              orderedApplicableSteps.findIndex(
                v => v === ROBOT_CALIBRATION_STEP_KEY
              ) + 1
            ]
          }
          expandStep={setExpandedStepKey}
          calibrationStatus={calibrationStatusRobot}
        />
      ),
      // change description for Flex
      description: isFlex
        ? t(`${ROBOT_CALIBRATION_STEP_KEY}_description_pipettes_only`)
        : t(`${ROBOT_CALIBRATION_STEP_KEY}_description`),
      descriptionElement: null,
      rightElProps: {
        stepKey: ROBOT_CALIBRATION_STEP_KEY,
        complete: calibrationStatusRobot.complete,
        completeText: t('calibration_ready'),
        missingHardware: isMissingPipette,
        incompleteText: t('calibration_needed'),
        missingHardwareText: t('action_needed'),
        incompleteElement: null,
      },
    },
    [MODULE_SETUP_STEP_KEY]: {
      stepInternals: (
        <SetupModuleAndDeck
          expandLabwarePositionCheckStep={() => {
            setExpandedStepKey(LPC_STEP_KEY)
          }}
          robotName={robotName}
          runId={runId}
          hasModules={hasModules}
          protocolAnalysis={protocolAnalysis}
        />
      ),
      description: isFlex
        ? flexDeckHardwareDescription
        : ot2DeckHardwareDescription,
      descriptionElement: null,
      rightElProps: {
        stepKey: MODULE_SETUP_STEP_KEY,
        complete:
          calibrationStatusModules.complete &&
          !isMissingModule &&
          !isFixtureMismatch,
        completeText:
          isFlex && hasModules
            ? t('calibration_ready')
            : t('deck_hardware_ready'),
        incompleteText:
          isFlex && hasModules ? t('calibration_needed') : t('action_needed'),
        missingHardware: isMissingModule || isFixtureMismatch,
        missingHardwareText: t('action_needed'),
        incompleteElement: null,
      },
    },
    [LPC_STEP_KEY]: {
      stepInternals: (
        <SetupLabwarePositionCheck
          {...{ runId, robotName, robotType }}
          setOffsetsConfirmed={confirmed => {
            dispatch(
              updateRunSetupStepsComplete(runId, { [LPC_STEP_KEY]: confirmed })
            )
            if (confirmed) {
              dispatch(appliedOffsetsToRun(runId))

              setExpandedStepKey(LABWARE_SETUP_STEP_KEY)
            }
          }}
          offsetsConfirmed={offsetsConfirmed}
          lpcUtils={lpcUtils}
        />
      ),
      description: noLwOffsetsInRun
        ? t('no_offsets_in_run')
        : t('labware_position_check_step_description'),
      descriptionElement: <LearnAboutOffsetsLink />,
      rightElProps: {
        stepKey: LPC_STEP_KEY,
        complete: offsetsConfirmed,
        completeText: buildLPCCompleteText(),
        incompleteText: buildLPCIncompleteText(),
        incompleteElement: null,
      },
    },
    [LABWARE_SETUP_STEP_KEY]: {
      stepInternals: (
        <SetupLabware
          robotName={robotName}
          runId={runId}
          labwareConfirmed={!missingSteps.includes(LABWARE_SETUP_STEP_KEY)}
          setLabwareConfirmed={(confirmed: boolean) => {
            dispatch(
              updateRunSetupStepsComplete(runId, {
                [LABWARE_SETUP_STEP_KEY]: confirmed,
              })
            )
            if (confirmed) {
              const nextStep =
                orderedApplicableSteps.findIndex(
                  v => v === LABWARE_SETUP_STEP_KEY
                ) ===
                orderedApplicableSteps.length - 1
                  ? null
                  : LIQUID_SETUP_STEP_KEY
              setExpandedStepKey(nextStep)
            }
          }}
        />
      ),
      description: t(`${LABWARE_SETUP_STEP_KEY}_description`),
      descriptionElement: null,
      rightElProps: {
        stepKey: LABWARE_SETUP_STEP_KEY,
        complete: !missingSteps.includes(LABWARE_SETUP_STEP_KEY),
        completeText: t('placements_ready'),
        incompleteText: null,
        incompleteElement: null,
      },
    },
    [LIQUID_SETUP_STEP_KEY]: {
      stepInternals: (
        <SetupLiquids
          robotName={robotName}
          runId={runId}
          protocolAnalysis={protocolAnalysis}
          isLiquidSetupConfirmed={!missingSteps.includes(LIQUID_SETUP_STEP_KEY)}
          setLiquidSetupConfirmed={(confirmed: boolean) => {
            dispatch(
              updateRunSetupStepsComplete(runId, {
                [LIQUID_SETUP_STEP_KEY]: confirmed,
              })
            )
            if (confirmed) {
              setExpandedStepKey(null)
            }
          }}
        />
      ),
      description: hasLiquids
        ? t(`${LIQUID_SETUP_STEP_KEY}_description`)
        : i18n.format(t('liquids_not_in_the_protocol'), 'capitalize'),
      descriptionElement: null,
      rightElProps: {
        stepKey: LIQUID_SETUP_STEP_KEY,
        complete: !missingSteps.includes(LIQUID_SETUP_STEP_KEY),
        completeText: t('liquids_ready'),
        incompleteText: null,
        incompleteElement: null,
      },
    },
  }

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing16}
      margin={SPACING.spacing16}
    >
      {protocolAnalysis != null ? (
        <>
          {runHasStarted ? (
            <InfoMessage title={t('setup_is_view_only')} />
          ) : null}
          {analysisErrors != null && analysisErrors?.length > 0 ? (
            <LegacyStyledText alignSelf={ALIGN_CENTER} color={COLORS.grey50}>
              {t('protocol_analysis_failed')}
            </LegacyStyledText>
          ) : (
            orderedSteps.map((stepKey, index) => {
              const setupStepTitle = t(`${stepKey}_title`)
              const showEmptySetupStep =
                (stepKey === 'liquid_setup_step' && !hasLiquids) ||
                (stepKey === 'module_setup_step' &&
                  ((!isFlex && !hasModules) ||
                    (isFlex && !hasModules && !hasFixtures))) ||
                (stepKey === 'labware_position_check_step' && noLwOffsetsInRun)
              return (
                <Flex flexDirection={DIRECTION_COLUMN} key={stepKey}>
                  {showEmptySetupStep ? (
                    <EmptySetupStep
                      title={t(`${stepKey}_title`)}
                      description={StepDetailMap[stepKey].description}
                      rightElement={
                        <StepRightElement
                          {...StepDetailMap[stepKey].rightElProps}
                        />
                      }
                    />
                  ) : (
                    <SetupStep
                      expanded={stepKey === expandedStepKey}
                      title={setupStepTitle}
                      description={StepDetailMap[stepKey].description}
                      descriptionElement={
                        StepDetailMap[stepKey].descriptionElement
                      }
                      toggleExpanded={() => {
                        stepKey === expandedStepKey
                          ? setExpandedStepKey(null)
                          : setExpandedStepKey(stepKey)
                      }}
                      rightElement={
                        <StepRightElement
                          {...StepDetailMap[stepKey].rightElProps}
                        />
                      }
                    >
                      {StepDetailMap[stepKey].stepInternals}
                    </SetupStep>
                  )}
                  {index !== orderedSteps.length - 1 ? (
                    <Line marginTop={SPACING.spacing24} />
                  ) : null}
                </Flex>
              )
            })
          )}
        </>
      ) : (
        <LegacyStyledText alignSelf={ALIGN_CENTER} color={COLORS.grey50}>
          {t('loading_data')}
        </LegacyStyledText>
      )}
    </Flex>
  )
}

interface NoHardwareRequiredStepCompletion {
  stepKey: Exclude<
    StepKey,
    typeof ROBOT_CALIBRATION_STEP_KEY | typeof MODULE_SETUP_STEP_KEY
  >
  complete: boolean
  incompleteText: string | null
  incompleteElement: JSX.Element | null
  completeText: string
}

interface HardwareRequiredStepCompletion {
  stepKey: typeof ROBOT_CALIBRATION_STEP_KEY | typeof MODULE_SETUP_STEP_KEY
  complete: boolean
  missingHardware: boolean
  incompleteText: string | null
  incompleteElement: JSX.Element | null
  completeText: string
  missingHardwareText: string
}

type StepRightElementProps =
  | NoHardwareRequiredStepCompletion
  | HardwareRequiredStepCompletion

const stepRequiresHW = (
  props: StepRightElementProps
): props is HardwareRequiredStepCompletion =>
  props.stepKey === ROBOT_CALIBRATION_STEP_KEY ||
  props.stepKey === MODULE_SETUP_STEP_KEY

function StepRightElement(props: StepRightElementProps): JSX.Element | null {
  if (props.complete) {
    return (
      <Flex
        flexDirection={DIRECTION_ROW}
        alignItems={ALIGN_CENTER}
        width={FLEX_MAX_CONTENT}
      >
        <Icon
          size="1rem"
          color={COLORS.green60}
          marginRight={SPACING.spacing8}
          name="ot-check"
          id={`RunSetupCard_${props.stepKey}_completeIcon`}
        />
        <StyledText
          desktopStyle="bodyDefaultSemiBold"
          color={COLORS.green60}
          marginRight={SPACING.spacing16}
          id={`RunSetupCard_${props.stepKey}_completeText`}
        >
          {props.completeText}
        </StyledText>
      </Flex>
    )
  } else if (stepRequiresHW(props) && props.missingHardware) {
    return (
      <Flex flexDirection={DIRECTION_ROW} alignItems={ALIGN_CENTER}>
        <Icon
          size="1rem"
          color={COLORS.yellow60}
          marginRight={SPACING.spacing8}
          name="alert-circle"
          id={`RunSetupCard_${props.stepKey}_missingHardwareIcon`}
        />
        <StyledText
          desktopStyle="bodyDefaultSemiBold"
          color={COLORS.yellow60}
          marginRight={SPACING.spacing16}
          id={`RunSetupCard_${props.stepKey}_missingHardwareText`}
        >
          {props.missingHardwareText}
        </StyledText>
      </Flex>
    )
  } else if (props.incompleteText != null) {
    return (
      <Flex flexDirection={DIRECTION_ROW} alignItems={ALIGN_CENTER}>
        <Icon
          size="1rem"
          color={COLORS.yellow60}
          marginRight={SPACING.spacing8}
          name="alert-circle"
          id={`RunSetupCard_${props.stepKey}_incompleteIcon`}
        />
        <StyledText
          desktopStyle="bodyDefaultSemiBold"
          color={COLORS.yellow60}
          marginRight={SPACING.spacing16}
          id={`RunSetupCard_${props.stepKey}_incompleteText`}
        >
          {props.incompleteText}
        </StyledText>
      </Flex>
    )
  } else if (props.incompleteElement != null) {
    return props.incompleteElement
  } else {
    return null
  }
}
