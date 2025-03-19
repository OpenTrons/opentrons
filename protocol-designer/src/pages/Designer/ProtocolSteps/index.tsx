import { useState } from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'

import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  FLEX_MAX_CONTENT,
  Flex,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  POSITION_RELATIVE,
  SPACING,
  StyledText,
  ToggleGroup,
} from '@opentrons/components'
import {
  getSavedStepForms,
  getUnsavedForm,
} from '../../../step-forms/selectors'
import { getEnableHotKeysDisplay } from '../../../feature-flags/selectors'
import {
  getIsMultiSelectMode,
  getSelectedSubstep,
  getSelectedStepId,
  getHoveredStepId,
  getSelectedTerminalItemId,
  getHoveredTerminalItemId,
} from '../../../ui/steps/selectors'
import { HotKeyDisplay } from '../../../components/molecules'
import { OffDeck, TimelineAlerts } from '../../../components/organisms'
import { SubStepsToolbox } from './Timeline'
import { StepForm } from './StepForm'
import { StepSummary } from './StepSummary'
import { BatchEditToolbox } from './BatchEditToolbox'
import {
  getDesignerTab,
  getRobotStateTimeline,
} from '../../../file-data/selectors'

import { DraggableSidebar } from './DraggableSidebar'
import { ProtocolStepsDeckContainer } from '../DeckSetup/ProtocolStepsDeckContainer'

const CONTENT_MAX_WIDTH = '46.9375rem'

export function ProtocolSteps(): JSX.Element {
  const { i18n, t } = useTranslation('starting_deck_state')
  const formData = useSelector(getUnsavedForm)
  const selectedTerminalItem = useSelector(getSelectedTerminalItemId)
  const hoveredTerminalItem = useSelector(getHoveredTerminalItemId)
  const isMultiSelectMode = useSelector(getIsMultiSelectMode)
  const selectedSubstep = useSelector(getSelectedSubstep)
  const enableHotKeyDisplay = useSelector(getEnableHotKeysDisplay)
  const tab = useSelector(getDesignerTab)
  const leftString = t('onDeck')
  const rightString = t('offDeck')
  const [deckView, setDeckView] = useState<
    typeof leftString | typeof rightString
  >(leftString)
  // Note (02/03/25:kk) use DrraggableSidebar's initial width
  const [targetWidth, setTargetWidth] = useState<number>(235)

  const currentHoveredStepId = useSelector(getHoveredStepId)
  const currentSelectedStepId = useSelector(getSelectedStepId)
  const currentstepIdForStepSummary =
    currentHoveredStepId ?? currentSelectedStepId
  const savedStepForms = useSelector(getSavedStepForms)
  const currentStep =
    currentstepIdForStepSummary != null
      ? savedStepForms[currentstepIdForStepSummary]
      : null

  const { errors: timelineErrors } = useSelector(getRobotStateTimeline)
  const hasTimelineErrors =
    timelineErrors != null ? timelineErrors.length > 0 : false
  const showTimelineAlerts = hasTimelineErrors && tab === 'protocolSteps'
  const stepDetails = currentStep?.stepDetails ?? null

  return (
    <Flex
      backgroundColor={COLORS.grey10}
      height="calc(100vh - 4rem)"
      width="100%"
      minHeight={FLEX_MAX_CONTENT}
      id="container"
    >
      <Flex height="100%" padding={SPACING.spacing12}>
        <DraggableSidebar setTargetWidth={setTargetWidth} />
      </Flex>
      <Flex
        alignItems={ALIGN_CENTER}
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing16}
        flex="2.85"
        paddingTop={showTimelineAlerts ? '0' : SPACING.spacing24}
        height="100%"
        position={POSITION_RELATIVE}
      >
        <Flex
          flexDirection={DIRECTION_COLUMN}
          gridGap={SPACING.spacing24}
          width={CONTENT_MAX_WIDTH}
          height="100%"
          justifyContent={JUSTIFY_CENTER}
          paddingY={SPACING.spacing120}
        >
          {showTimelineAlerts ? (
            <TimelineAlerts
              justifyContent={JUSTIFY_CENTER}
              width="100%"
              flexDirection={DIRECTION_COLUMN}
              gridGap={SPACING.spacing4}
            />
          ) : null}
          <Flex
            justifyContent={JUSTIFY_SPACE_BETWEEN}
            alignItems={ALIGN_CENTER}
            height="2.25rem"
          >
            {currentStep != null && hoveredTerminalItem == null ? (
              <StyledText desktopStyle="headingSmallBold">
                {i18n.format(currentStep.stepName, 'titleCase')}
              </StyledText>
            ) : null}
            {(hoveredTerminalItem != null || selectedTerminalItem != null) &&
            currentHoveredStepId == null ? (
              <StyledText desktopStyle="headingSmallBold">
                {t(hoveredTerminalItem ?? selectedTerminalItem)}
              </StyledText>
            ) : null}

            <ToggleGroup
              selectedValue={deckView}
              leftText={leftString}
              rightText={rightString}
              leftClick={() => {
                setDeckView(leftString)
              }}
              rightClick={() => {
                setDeckView(rightString)
              }}
            />
          </Flex>
          <Flex
            flexDirection={DIRECTION_COLUMN}
            gridGap={SPACING.spacing16}
            height="100%"
          >
            {deckView === leftString ? (
              <ProtocolStepsDeckContainer />
            ) : (
              <OffDeck tab="protocolSteps" />
            )}
            {/* avoid shifting the deck view container */}
            <Flex
              height="5.5rem"
              opacity={formData == null ? 1 : 0}
              id="summary container"
            >
              <StepSummary
                currentStep={currentStep}
                stepDetails={stepDetails}
              />
            </Flex>
          </Flex>
        </Flex>
        {enableHotKeyDisplay ? (
          <HotKeyDisplay targetWidth={targetWidth} />
        ) : null}
      </Flex>
      {formData == null && selectedSubstep ? (
        <SubStepsToolbox stepId={selectedSubstep} />
      ) : null}
      <Flex padding={SPACING.spacing12}>
        <StepForm />
      </Flex>

      {isMultiSelectMode ? <BatchEditToolbox /> : null}
    </Flex>
  )
}
