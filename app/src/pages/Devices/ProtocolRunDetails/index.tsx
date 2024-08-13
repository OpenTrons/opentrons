import * as React from 'react'
import isEmpty from 'lodash/isEmpty'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { NavLink, Navigate, useParams, useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'

import {
  BORDERS,
  Box,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  JUSTIFY_SPACE_AROUND,
  LegacyStyledText,
  OVERFLOW_SCROLL,
  POSITION_RELATIVE,
  SPACING,
  Tooltip,
  TYPOGRAPHY,
  useHoverTooltip,
} from '@opentrons/components'
import { ApiHostProvider } from '@opentrons/react-api-client'
import {
  useModuleRenderInfoForProtocolById,
  useRobot,
  useRobotType,
  useRunStatuses,
  useSyncRobotClock,
} from '../../../organisms/Devices/hooks'
import { ProtocolRunHeader } from '../../../organisms/Devices/ProtocolRun/ProtocolRunHeader'
import { RunPreview } from '../../../organisms/RunPreview'
import {
  ProtocolRunSetup,
  initialMissingSteps,
} from '../../../organisms/Devices/ProtocolRun/ProtocolRunSetup'
import { BackToTopButton } from '../../../organisms/Devices/ProtocolRun/BackToTopButton'
import { ProtocolRunModuleControls } from '../../../organisms/Devices/ProtocolRun/ProtocolRunModuleControls'
import { ProtocolRunRuntimeParameters } from '../../../organisms/Devices/ProtocolRun/ProtocolRunRunTimeParameters'
import { useCurrentRunId } from '../../../resources/runs'
import { OPENTRONS_USB } from '../../../redux/discovery'
import { fetchProtocols } from '../../../redux/protocol-storage'
import { appShellRequestor } from '../../../redux/shell/remote'
import { useMostRecentCompletedAnalysis } from '../../../organisms/LabwarePositionCheck/useMostRecentCompletedAnalysis'

import type { ViewportListRef } from 'react-viewport-list'
import type {
  DesktopRouteParams,
  ProtocolRunDetailsTab,
} from '../../../App/types'
import type { Dispatch } from '../../../redux/types'

const baseRoundTabStyling = css`
  ${TYPOGRAPHY.pSemiBold}
  color: ${COLORS.black90};
  background-color: ${COLORS.purple30};
  border: 0px ${BORDERS.styleSolid} ${COLORS.purple30};
  border-radius: ${BORDERS.borderRadius8};
  padding: ${SPACING.spacing8} ${SPACING.spacing16};
  position: ${POSITION_RELATIVE};

  &:hover {
    background-color: ${COLORS.purple35};
  }

  &:focus-visible {
    outline: 2px ${BORDERS.styleSolid} ${COLORS.yellow50};
  }
`

const disabledRoundTabStyling = css`
  ${baseRoundTabStyling}
  color: ${COLORS.grey40};
  background-color: ${COLORS.grey30};

  &:hover {
    background-color: ${COLORS.grey30};
  }
`

const RoundNavLink = styled(NavLink)`
  ${baseRoundTabStyling}
  color: ${COLORS.black90};

  &:hover {
    background-color: ${COLORS.purple35};
  }

  &.active {
    background-color: ${COLORS.purple50};
    color: ${COLORS.white};

    &:hover {
      background-color: ${COLORS.purple55};
    }
  }
`

const JUMP_OFFSET_FROM_TOP_PX = 20

interface RoundTabProps {
  disabled: boolean
  tabDisabledReason?: string
  to: string
  tabName: string
}

function RoundTab({
  disabled,
  tabDisabledReason,
  to,
  tabName,
}: RoundTabProps): JSX.Element {
  const [targetProps, tooltipProps] = useHoverTooltip()
  return disabled ? (
    <>
      <LegacyStyledText css={disabledRoundTabStyling} {...targetProps}>
        {tabName}
      </LegacyStyledText>
      {tabDisabledReason != null ? (
        <Tooltip tooltipProps={tooltipProps}>{tabDisabledReason}</Tooltip>
      ) : null}
    </>
  ) : (
    <RoundNavLink to={to} replace>
      {tabName}
    </RoundNavLink>
  )
}

export function ProtocolRunDetails(): JSX.Element | null {
  const { robotName, runId, protocolRunDetailsTab } = useParams<
    keyof DesktopRouteParams
  >() as DesktopRouteParams
  const dispatch = useDispatch<Dispatch>()

  const robot = useRobot(robotName)
  useSyncRobotClock(robotName)
  React.useEffect(() => {
    dispatch(fetchProtocols())
  }, [dispatch])
  return robot != null ? (
    <ApiHostProvider
      key={robot.name}
      hostname={robot.ip ?? null}
      requestor={robot?.ip === OPENTRONS_USB ? appShellRequestor : undefined}
      robotName={robot.name}
    >
      <Box
        minWidth="32rem"
        height="100%"
        overflow={OVERFLOW_SCROLL}
        padding={SPACING.spacing16}
      >
        <Flex
          flexDirection={DIRECTION_COLUMN}
          marginBottom={SPACING.spacing16}
          width="100%"
        >
          <PageContents
            runId={runId}
            robotName={robotName}
            protocolRunDetailsTab={protocolRunDetailsTab}
          />
        </Flex>
      </Box>
    </ApiHostProvider>
  ) : null
}

const JUMPED_STEP_HIGHLIGHT_DELAY_MS = 1000
interface PageContentsProps {
  runId: string
  robotName: string
  protocolRunDetailsTab: ProtocolRunDetailsTab
}
function PageContents(props: PageContentsProps): JSX.Element {
  const { runId, robotName, protocolRunDetailsTab } = props
  const robotType = useRobotType(robotName)
  const protocolRunHeaderRef = React.useRef<HTMLDivElement>(null)
  const listRef = React.useRef<ViewportListRef | null>(null)
  const [jumpedIndex, setJumpedIndex] = React.useState<number | null>(null)

  React.useEffect(() => {
    if (jumpedIndex != null) {
      setTimeout(() => {
        setJumpedIndex(null)
      }, JUMPED_STEP_HIGHLIGHT_DELAY_MS)
    }
  }, [jumpedIndex])

  const [missingSteps, setMissingSteps] = React.useState<
    ReturnType<typeof initialMissingSteps>
  >(initialMissingSteps())

  const makeHandleScrollToStep = (i: number) => () => {
    listRef.current?.scrollToIndex(i, true, -1 * JUMP_OFFSET_FROM_TOP_PX)
  }
  const makeHandleJumpToStep = (i: number) => () => {
    makeHandleScrollToStep(i)()
    setJumpedIndex(i)
  }
  const protocolRunDetailsContentByTab: {
    [K in ProtocolRunDetailsTab]: {
      content: JSX.Element | null
      backToTop: JSX.Element | null
    }
  } = {
    setup: {
      content: (
        <ProtocolRunSetup
          protocolRunHeaderRef={protocolRunHeaderRef}
          robotName={robotName}
          runId={runId}
          setMissingSteps={setMissingSteps}
          missingSteps={missingSteps}
        />
      ),
      backToTop: (
        <Flex
          width="100%"
          flexDirection={DIRECTION_ROW}
          justifyContent={JUSTIFY_SPACE_AROUND}
          marginTop={SPACING.spacing16}
        >
          <BackToTopButton
            protocolRunHeaderRef={protocolRunHeaderRef}
            robotName={robotName}
            runId={runId}
            sourceLocation=""
          />
        </Flex>
      ),
    },
    'runtime-parameters': {
      content: <ProtocolRunRuntimeParameters runId={runId} />,
      backToTop: null,
    },
    'module-controls': {
      content: (
        <ProtocolRunModuleControls robotName={robotName} runId={runId} />
      ),
      backToTop: null,
    },
    'run-preview': {
      content: (
        <RunPreview
          runId={runId}
          robotType={robotType}
          ref={listRef}
          jumpedIndex={jumpedIndex}
          makeHandleScrollToStep={makeHandleScrollToStep}
        />
      ),
      backToTop: null,
    },
  }
  const tabDetails = protocolRunDetailsContentByTab[protocolRunDetailsTab] ?? {
    // default to the setup tab if no tab or nonexistent tab is passed as a param
    content: (
      <Navigate to={`/devices/${robotName}/protocol-runs/${runId}/setup`} />
    ),
    backToTop: null,
  }
  const { content, backToTop } = tabDetails

  return (
    <>
      <ProtocolRunHeader
        protocolRunHeaderRef={protocolRunHeaderRef}
        robotName={robotName}
        runId={runId}
        makeHandleJumpToStep={makeHandleJumpToStep}
        missingSetupSteps={missingSteps}
      />
      <Flex gridGap={SPACING.spacing8} marginBottom={SPACING.spacing12}>
        <SetupTab
          robotName={robotName}
          runId={runId}
          protocolRunDetailsTab={protocolRunDetailsTab}
        />
        <ParametersTab
          robotName={robotName}
          runId={runId}
          protocolRunDetailsTab={protocolRunDetailsTab}
        />
        <ModuleControlsTab
          robotName={robotName}
          runId={runId}
          protocolRunDetailsTab={protocolRunDetailsTab}
        />
        <RunPreviewTab robotName={robotName} runId={runId} />
      </Flex>
      <Box
        backgroundColor={COLORS.white}
        // remove left upper corner border radius when first tab is active
        borderRadius={BORDERS.borderRadius8}
      >
        {content}
      </Box>
      {backToTop}
    </>
  )
}

interface SetupTabProps {
  robotName: string
  runId: string
  protocolRunDetailsTab?: ProtocolRunDetailsTab
}

const SetupTab = (props: SetupTabProps): JSX.Element | null => {
  const { robotName, runId, protocolRunDetailsTab } = props
  const { t } = useTranslation('run_details')
  const currentRunId = useCurrentRunId()
  const navigate = useNavigate()

  const disabled = currentRunId !== runId
  const tabDisabledReason = `${t('setup')} ${t(
    'not_available_for_a_completed_run'
  )}`

  React.useEffect(() => {
    if (disabled && protocolRunDetailsTab === 'setup')
      navigate(`/devices/${robotName}/protocol-runs/${runId}/run-preview`)
  }, [disabled, navigate, robotName, runId])

  return (
    <RoundTab
      disabled={disabled}
      tabDisabledReason={tabDisabledReason}
      to={`/devices/${robotName}/protocol-runs/${runId}/setup`}
      tabName={t('setup')}
    />
  )
}

interface ParametersTabProps {
  robotName: string
  runId: string
  protocolRunDetailsTab: ProtocolRunDetailsTab
}

const ParametersTab = (props: ParametersTabProps): JSX.Element | null => {
  const { robotName, runId, protocolRunDetailsTab } = props
  const { t } = useTranslation('run_details')
  const mostRecentAnalysis = useMostRecentCompletedAnalysis(runId)
  const navigate = useNavigate()
  const disabled = mostRecentAnalysis == null

  React.useEffect(() => {
    if (disabled && protocolRunDetailsTab === 'runtime-parameters') {
      navigate(`/devices/${robotName}/protocol-runs/${runId}/run-preview`, {
        replace: true,
      })
    }
  }, [disabled, navigate, robotName, runId])

  return (
    <RoundTab
      disabled={disabled}
      to={`/devices/${robotName}/protocol-runs/${runId}/runtime-parameters`}
      tabName={t('parameters')}
    />
  )
}

interface ModuleControlsTabProps {
  robotName: string
  runId: string
  protocolRunDetailsTab: ProtocolRunDetailsTab
}

const ModuleControlsTab = (
  props: ModuleControlsTabProps
): JSX.Element | null => {
  const { robotName, runId, protocolRunDetailsTab } = props
  const { t } = useTranslation('run_details')
  const currentRunId = useCurrentRunId()
  const moduleRenderInfoForProtocolById = useModuleRenderInfoForProtocolById(
    runId
  )
  const { isRunStill } = useRunStatuses()
  const navigate = useNavigate()

  const disabled = currentRunId !== runId || !isRunStill
  const tabDisabledReason = `${t('module_controls')} ${t(
    currentRunId !== runId
      ? 'not_available_for_a_completed_run'
      : 'not_available_for_a_run_in_progress'
  )}`

  React.useEffect(() => {
    if (disabled && protocolRunDetailsTab === 'module-controls')
      navigate(`/devices/${robotName}/protocol-runs/${runId}/run-preview`)
  }, [disabled, navigate, robotName, runId])

  return isEmpty(moduleRenderInfoForProtocolById) ? null : (
    <RoundTab
      disabled={disabled}
      tabDisabledReason={tabDisabledReason}
      to={`/devices/${robotName}/protocol-runs/${runId}/module-controls`}
      tabName={t('module_controls')}
    />
  )
}

const RunPreviewTab = (props: SetupTabProps): JSX.Element | null => {
  const { robotName, runId } = props
  const { t } = useTranslation('run_details')

  const robotSideAnalysis = useMostRecentCompletedAnalysis(runId)

  return (
    <RoundTab
      disabled={robotSideAnalysis == null}
      to={`/devices/${robotName}/protocol-runs/${runId}/run-preview`}
      tabName={t('run_preview')}
    />
  )
}
