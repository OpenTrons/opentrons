import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'
import {
  FLEX_ROBOT_TYPE,
  ModuleLocation,
  getDeckDefFromRobotType,
  getModuleDisplayName,
  THERMOCYCLER_MODULE_TYPE,
  CutoutConfig,
  FLEX_SLOT_BY_CUTOUT_ID,
  FLEX_CUTOUT_BY_SLOT_ID,
} from '@opentrons/shared-data'
import {
  RESPONSIVENESS,
  TYPOGRAPHY,
  SPACING,
  SIZE_1,
  DeckLocationSelect,
} from '@opentrons/components'
import { Banner } from '../../atoms/Banner'
import { StyledText } from '../../atoms/text'
import { GenericWizardTile } from '../../molecules/GenericWizardTile'
import type { ModuleCalibrationWizardStepProps } from './types'
import type { CutoutFixtureId } from '@opentrons/shared-data'

export const BODY_STYLE = css`
  ${TYPOGRAPHY.pRegular};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    font-size: 1.275rem;
    line-height: 1.75rem;
  }
`
interface SelectLocationProps extends ModuleCalibrationWizardStepProps {
  setSlotName: React.Dispatch<React.SetStateAction<string>>
  availableSlotNames: string[]
  occupiedCutouts: CutoutConfig[]
}
export const SelectLocation = (
  props: SelectLocationProps
): JSX.Element | null => {
  const {
    proceed,
    attachedModule,
    slotName,
    setSlotName,
    availableSlotNames,
    occupiedCutouts,
  } = props
  const { t } = useTranslation('module_wizard_flows')
  const moduleName = getModuleDisplayName(attachedModule.moduleModel)
  const handleOnClick = (): void => {
    proceed()
  }
  const deckDef = getDeckDefFromRobotType(FLEX_ROBOT_TYPE)
  const bodyText = (
    <>
      <StyledText css={BODY_STYLE}>
        {t('select_the_slot', { module: moduleName })}
      </StyledText>
      <Banner type="warning" size={SIZE_1} marginY={SPACING.spacing4}>
        {t('module_secured')}
      </Banner>
    </>
  )

  const disabledLocations = deckDef.locations.addressableAreas.reduce<
    CutoutConfig[]
  >((acc, slot) => {
    if (availableSlotNames.some(slotName => slotName === slot.id)) return acc
    else {
      const cutoutMatches = occupiedCutouts.filter(
        fixture => FLEX_SLOT_BY_CUTOUT_ID[fixture.cutoutId] === slot.id
      )
      if (cutoutMatches.length > 0) {
        return [...acc, cutoutMatches[0]]
      } else {
        return [
          ...acc,
          {
            cutoutId: FLEX_CUTOUT_BY_SLOT_ID[slot.id],
            cutoutFixtureId: null,
          } as CutoutConfig,
        ]
      }
    }
  }, [])

  console.log('🚀 ~ disabledLocations:', disabledLocations)

  return (
    <GenericWizardTile
      header={t('select_location')}
      rightHandBody={
        <DeckLocationSelect
          deckDef={deckDef}
          selectedLocation={{ slotName }}
          setSelectedLocation={loc => setSlotName(loc.slotName)}
          disabledLocations={disabledLocations}
          isThermocycler={
            attachedModule.moduleType === THERMOCYCLER_MODULE_TYPE
          }
          showTooltipOnDisabled={true}
        />
      }
      bodyText={bodyText}
      proceedButtonText={t('confirm_location')}
      proceed={handleOnClick}
      proceedIsDisabled={slotName == null}
      disableProceedReason={
        slotName == null
          ? 'Current deck configuration prevents module placement'
          : undefined
      }
    />
  )
}
