import { useState } from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_CENTER,
  JUSTIFY_FLEX_START,
  JUSTIFY_SPACE_BETWEEN,
  POSITION_FIXED,
  SPACING,
  StyledText,
  Tag,
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
import { DeckSetupContainer } from '../DeckSetup'
import { OffDeck } from '../Offdeck'
import { TimelineToolbox, SubstepsToolbox } from './Timeline'
import { StepForm } from './StepForm'
import { StepSummary } from './StepSummary'
import { BatchEditToolbox } from './BatchEditToolbox'
import { getDesignerTab } from '../../../file-data/selectors'
import { TimelineAlerts } from '../../../organisms'

const CONTENT_MAX_WIDTH = '46.9375rem'

export function ProtocolSteps(): JSX.Element {
  const { i18n, t } = useTranslation('starting_deck_state')
  const formData = useSelector(getUnsavedForm)
  const selectedTerminalItem = useSelector(getSelectedTerminalItemId)
  const hoveredTerminalItem = useSelector(getHoveredTerminalItemId)
  const isMultiSelectMode = useSelector(getIsMultiSelectMode)
  const selectedSubstep = useSelector(getSelectedSubstep)
  const enableHoyKeyDisplay = useSelector(getEnableHotKeysDisplay)
  const tab = useSelector(getDesignerTab)
  const leftString = t('onDeck')
  const rightString = t('offDeck')
  const [deckView, setDeckView] = useState<
    typeof leftString | typeof rightString
  >(leftString)

  const currentHoveredStepId = useSelector(getHoveredStepId)
  const currentSelectedStepId = useSelector(getSelectedStepId)
  const currentstepIdForStepSummary =
    currentHoveredStepId ?? currentSelectedStepId
  const savedStepForms = useSelector(getSavedStepForms)
  const currentStep =
    currentstepIdForStepSummary != null
      ? savedStepForms[currentstepIdForStepSummary]
      : null

  const stepDetails = currentStep?.stepDetails ?? null
  return (
    <Flex
      backgroundColor={COLORS.grey10}
      width="100%"
      gridGap={SPACING.spacing16}
      height="calc(100vh - 4rem)"
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      padding={SPACING.spacing12}
    >
      <TimelineToolbox />
      <Flex
        alignItems={ALIGN_CENTER}
        alignSelf={ALIGN_CENTER}
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing16}
        width="100%"
        justifyContent={JUSTIFY_FLEX_START}
      >
        <Flex
          flexDirection={DIRECTION_COLUMN}
          gridGap={SPACING.spacing16}
          maxWidth={CONTENT_MAX_WIDTH}
        >
          {tab === 'protocolSteps' ? (
            <TimelineAlerts justifyContent={JUSTIFY_CENTER} width="100%" />
          ) : null}
          <Flex justifyContent={JUSTIFY_SPACE_BETWEEN}>
            {currentStep != null && hoveredTerminalItem == null ? (
              <StyledText desktopStyle="headingSmallBold">
                {i18n.format(currentStep.stepName, 'capitalize')}
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
          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing16}>
            {deckView === leftString ? (
              <DeckSetupContainer tab="protocolSteps" />
            ) : (
              <OffDeck tab="protocolSteps" />
            )}
            {formData == null ? (
              <StepSummary
                currentStep={currentStep}
                stepDetails={stepDetails}
              />
            ) : null}
            {selectedTerminalItem != null && currentHoveredStepId == null ? (
              <Flex height="4.75rem" width="100%" />
            ) : null}
          </Flex>
        </Flex>
        {enableHoyKeyDisplay ? (
          <Flex
            position={POSITION_FIXED}
            left="21rem"
            bottom="0.75rem"
            gridGap={SPACING.spacing6}
            flexDirection={DIRECTION_COLUMN}
          >
            <Tag
              text={t('double_click_to_edit')}
              type="default"
              shrinkToContent
            />
            <Tag
              text={t('shift_click_to_select_range')}
              type="default"
              shrinkToContent
            />
            <Tag
              text={t('command_click_to_multi_select')}
              type="default"
              shrinkToContent
            />
          </Flex>
        ) : null}
      </Flex>
      {formData == null && selectedSubstep ? (
        <SubstepsToolbox stepId={selectedSubstep} />
      ) : null}
      <StepForm />
      {isMultiSelectMode ? <BatchEditToolbox /> : null}
    </Flex>
  )
}
