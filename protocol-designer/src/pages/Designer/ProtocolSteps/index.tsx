import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_CENTER,
  POSITION_FIXED,
  SPACING,
  Tag,
  ToggleGroup,
} from '@opentrons/components'
import { getUnsavedForm } from '../../../step-forms/selectors'
import { getEnableHotKeysDisplay } from '../../../feature-flags/selectors'
import {
  getIsMultiSelectMode,
  getSelectedSubstep,
} from '../../../ui/steps/selectors'
import { DeckSetupContainer } from '../DeckSetup'
import { OffDeck } from '../Offdeck'
import { TimelineToolbox, SubstepsToolbox } from './Timeline'
import { StepForm } from './StepForm'
import { BatchEditToolbox } from './BatchEditToolbox'

export function ProtocolSteps(): JSX.Element {
  const { t } = useTranslation('starting_deck_state')
  const formData = useSelector(getUnsavedForm)
  const isMultiSelectMode = useSelector(getIsMultiSelectMode)
  const selectedSubstep = useSelector(getSelectedSubstep)
  const enableHoyKeyDisplay = useSelector(getEnableHotKeysDisplay)
  const leftString = t('onDeck')
  const rightString = t('offDeck')
  const [deckView, setDeckView] = useState<
    typeof leftString | typeof rightString
  >(leftString)

  const formType = formData?.stepType

  useEffect(() => {
    if (formData != null && formType !== 'moveLabware') {
      setDeckView(leftString)
    }
  }, [formData, formType, deckView])

  return (
    <>
      {selectedSubstep ? <SubstepsToolbox stepId={selectedSubstep} /> : null}
      <StepForm />
      <Flex
        backgroundColor={COLORS.grey10}
        alignItems={ALIGN_CENTER}
        width="100%"
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing16}
        height="calc(100vh - 64px)"
        justifyContent={JUSTIFY_CENTER}
      >
        <TimelineToolbox />
        {isMultiSelectMode ? <BatchEditToolbox /> : null}
        {formData == null || formType === 'moveLabware' ? (
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
        ) : null}
        {deckView === leftString ? (
          <DeckSetupContainer tab="protocolSteps" />
        ) : (
          <OffDeck tab="protocolSteps" />
        )}
        {enableHoyKeyDisplay ? (
          <Box position={POSITION_FIXED} left="20.25rem" bottom="0.75rem">
            <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
              <Tag text={t('double_click_to_edit')} type="default" />
              <Tag text={t('shift_click_to_select_all')} type="default" />
              <Tag text={t('command_click_to_multi_select')} type="default" />
            </Flex>
          </Box>
        ) : null}
      </Flex>
    </>
  )
}
