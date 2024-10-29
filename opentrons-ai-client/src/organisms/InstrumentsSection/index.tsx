import {
  DIRECTION_COLUMN,
  DISPLAY_FLEX,
  Flex,
  JUSTIFY_FLEX_END,
  LargeButton,
  SPACING,
  StyledText,
} from '@opentrons/components'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { useAtom } from 'jotai'
import { createProtocolAtom } from '../../resources/atoms'
import { INSTRUMENTS_STEP } from '../ProtocolSectionsContainer'
import { ControlledDropdownMenu } from '../../atoms/ControlledDropdownMenu'
import { ControlledRadioButtonGroup } from '../../molecules/ControlledRadioButtonGroup'

export function InstrumentsSection(): JSX.Element | null {
  const { t } = useTranslation('create_protocol')
  const {
    formState: { isValid },
    watch,
  } = useFormContext()
  const [{ currentStep }, setCreateProtocolAtom] = useAtom(createProtocolAtom)

  // const leftMountOptions = [
  //   { name: t(BASIC_ALIQUOTING), value: BASIC_ALIQUOTING },
  //   { name: t(PCR), value: PCR },
  //   { name: t(OTHER), value: OTHER },
  // ]

  // const rightMountOptions = [
  //   { name: t(BASIC_ALIQUOTING), value: BASIC_ALIQUOTING },
  //   { name: t(PCR), value: PCR },
  //   { name: t(OTHER), value: OTHER },
  // ]

  const isOtherPipettesSelected =
    watch('instruments.pipettes') === 'other-pipettes'
  const isOpentronsOT2Selected = watch('instruments.robot') === 'opentrons-ot2'

  function handleConfirmButtonClick(): void {
    const step =
      currentStep > INSTRUMENTS_STEP ? currentStep : INSTRUMENTS_STEP + 1

    setCreateProtocolAtom({
      currentStep: step,
      focusStep: step,
    })
  }

  const robotOptions = [
    {
      id: 'opentrons-flex',
      buttonLabel: 'Opentrons Flex',
      buttonValue: 'opentrons-flex',
    },
    {
      id: 'opentrons-ot2',
      buttonLabel: 'Opentrons OT-2',
      buttonValue: 'opentrons-ot2',
    },
  ]

  const pipetteOptions = [
    {
      id: '96-channel-1000ul-pipette',
      buttonLabel: '96-Channel 1000µL pipette',
      buttonValue: '96-channel-1000ul-pipette',
    },
    {
      id: 'other-pipettes',
      buttonLabel: 'Other pipettes',
      buttonValue: 'other-pipettes',
    },
  ]

  const flexGripperOptions = [
    {
      id: 'flex-gripper',
      buttonLabel: 'Yes, use the Flex Gripper',
      buttonValue: 'flex-gripper',
    },
    {
      id: 'no-flex-gripper',
      buttonLabel: 'No, do not use the Flex Gripper',
      buttonValue: 'no-flex-gripper',
    },
  ]

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      height="100%"
      gap={SPACING.spacing24}
    >
      <ControlledRadioButtonGroup
        radioButtons={robotOptions}
        title="What robot would you like to use?"
        name={'instruments.robot'}
        defaultValue="opentrons-flex"
      />

      <PipettesSection isOpentronsOT2Selected={isOpentronsOT2Selected}>
        {!isOpentronsOT2Selected && (
          <ControlledRadioButtonGroup
            radioButtons={pipetteOptions}
            title="What pipettes would you like to use?"
            name={'instruments.pipettes'}
            defaultValue="96-channel-1000ul-pipette"
          />
        )}

        {(isOtherPipettesSelected || isOpentronsOT2Selected) && (
          <PipettesDropdown isOpentronsOT2Selected={isOpentronsOT2Selected}>
            {isOpentronsOT2Selected && (
              <StyledText desktopStyle="bodyDefaultSemiBold">
                What instruments would you like to use?
              </StyledText>
            )}
            <ControlledDropdownMenu
              width="100%"
              dropdownType="neutral"
              title="Left mount"
              name={''}
              options={[]}
            />
            <ControlledDropdownMenu
              width="100%"
              dropdownType="neutral"
              title="Right mount"
              name={''}
              options={[]}
            />
          </PipettesDropdown>
        )}
      </PipettesSection>

      {!isOpentronsOT2Selected && (
        <ControlledRadioButtonGroup
          radioButtons={flexGripperOptions}
          title="Do you want to use the Flex Gripper?"
          name={'instruments.flex-gripper'}
          defaultValue="flex-gripper"
        />
      )}

      <ButtonContainer>
        <LargeButton
          onClick={handleConfirmButtonClick}
          disabled={!isValid}
          buttonText={t('section_confirm_button')}
        ></LargeButton>
      </ButtonContainer>
    </Flex>
  )
}

const ButtonContainer = styled.div`
  display: ${DISPLAY_FLEX};
  justify-content: ${JUSTIFY_FLEX_END};
`

const PipettesDropdown = styled.div<{ isOpentronsOT2Selected?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${props =>
    props.isOpentronsOT2Selected ?? false
      ? SPACING.spacing16
      : SPACING.spacing8};
`

const PipettesSection = styled.div<{ isOpentronsOT2Selected?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${props =>
    props.isOpentronsOT2Selected ?? false
      ? SPACING.spacing16
      : SPACING.spacing8};
`
