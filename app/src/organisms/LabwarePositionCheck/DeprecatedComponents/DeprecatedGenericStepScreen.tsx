import * as React from 'react'
import uniq from 'lodash/uniq'
import isEqual from 'lodash/isEqual'
import {
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_CENTER,
  NewPrimaryBtn,
  ALIGN_FLEX_START,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'
import { StyledText } from '../../../atoms/text'
import { DeprecatedLabwarePositionCheckStepDetail } from './DeprecatedLabwarePositionCheckStepDetail'
import { DeprecatedSectionList } from './DeprecatedSectionList'
import {
  useIntroInfo,
  useLabwareIdsBySection,
  useDeprecatedSteps,
} from '../deprecatedHooks'
import { DeprecatedDeckMap } from './DeprecatedDeckMap'
import type { Jog } from '../../../molecules/DeprecatedJogControls'
import type {
  DeprecatedLabwarePositionCheckStep,
  SavePositionCommandData,
} from './types'

interface GenericStepScreenProps {
  selectedStep: DeprecatedLabwarePositionCheckStep
  ctaText: string
  proceed: () => void
  jog: Jog
  title: string
  runId: string
  savePositionCommandData: SavePositionCommandData
}

/**
 *
 * @deprecated
 */
export const DeprecatedGenericStepScreen = (
  props: GenericStepScreenProps
): JSX.Element | null => {
  const introInfo = useIntroInfo()
  const labwareIdsBySection = useLabwareIdsBySection(props.runId)
  const allSteps = useDeprecatedSteps(props.runId)
  if (introInfo == null) return null
  const { sections, primaryPipetteMount, secondaryPipetteMount } = introInfo
  const labwareIdsToHighlight = labwareIdsBySection[props.selectedStep.section]
  const currentSectionIndex = sections.findIndex(
    section => section === props.selectedStep.section
  )
  const completedSections = sections.slice(0, currentSectionIndex)
  const selectedStepIndex = allSteps.findIndex(step =>
    isEqual(step, props.selectedStep)
  )
  const completedSteps =
    selectedStepIndex > 0 ? allSteps.slice(0, selectedStepIndex) : []

  const completedLabwareIds = completedSteps.reduce<string[]>(
    (acc, step) => uniq([...acc, step.labwareId]),
    []
  )

  return (
    <Flex flexDirection={DIRECTION_COLUMN}>
      <StyledText
        as="h3"
        textTransform={TYPOGRAPHY.textTransformUppercase}
        fontWeight={TYPOGRAPHY.fontWeightSemiBold}
      >
        {props.title}
      </StyledText>
      <Flex alignItems={ALIGN_FLEX_START} marginTop={SPACING.spacing4}>
        <Flex flexDirection={DIRECTION_COLUMN}>
          <DeprecatedSectionList
            primaryPipetteMount={primaryPipetteMount}
            secondaryPipetteMount={secondaryPipetteMount}
            sections={sections}
            currentSection={props.selectedStep.section}
            completedSections={completedSections}
          />
          <Flex justifyContent={JUSTIFY_CENTER} marginTop={SPACING.spacing4}>
            <DeprecatedDeckMap
              labwareIdsToHighlight={labwareIdsToHighlight}
              completedLabwareIds={completedLabwareIds}
            />
          </Flex>
        </Flex>
        <Flex marginLeft={SPACING.spacing7}>
          <DeprecatedLabwarePositionCheckStepDetail
            selectedStep={props.selectedStep}
            jog={props.jog}
            runId={props.runId}
            savePositionCommandData={props.savePositionCommandData}
          />
        </Flex>
      </Flex>
      <Flex justifyContent={JUSTIFY_CENTER} marginTop={SPACING.spacing4}>
        <NewPrimaryBtn onClick={props.proceed}>{props.ctaText}</NewPrimaryBtn>
      </Flex>
    </Flex>
  )
}
