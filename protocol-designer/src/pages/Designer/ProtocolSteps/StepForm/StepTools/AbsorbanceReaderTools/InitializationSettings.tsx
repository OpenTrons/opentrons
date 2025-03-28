import { useTranslation } from 'react-i18next'
import {
  Flex,
  DIRECTION_COLUMN,
  SPACING,
  ListItem,
  StyledText,
  InfoScreen,
  ALIGN_CENTER,
  Icon,
  useHoverTooltip,
  Tooltip,
  COLORS,
} from '@opentrons/components'
import { ABSORBANCE_READER_COLOR_BY_WAVELENGTH } from '../../../../../../constants'
import type { Initialization } from '../../../../../../step-forms/types'

const getWavelengthDisplay = (
  wavelength: number,
  knownColor: string | null,
  isReference: boolean,
  t: any
): string => {
  if (isReference) {
    return `${wavelength} ${t('application:units.nanometer')} ${
      knownColor != null
        ? t(
            'form:step_edit_form.absorbanceReader.reference_wavelength_color_parentheses',
            { color: knownColor }
          )
        : t(
            'form:step_edit_form.absorbanceReader.reference_wavelength_parentheses'
          )
    }`
  }
  return `${wavelength} ${t('application:units.nanometer')} ${
    knownColor != null
      ? t('form:step_edit_form.absorbanceReader.color_parentheses', {
          color: knownColor,
        })
      : ''
  }`
}

interface InitializationSettingsProps {
  initialization: Initialization | null
}

export function InitializationSettings(
  props: InitializationSettingsProps
): JSX.Element {
  const { initialization } = props
  const { t } = useTranslation(['application', 'form'])
  const [targetProps, tooltipProps] = useHoverTooltip()
  const content =
    initialization == null ? (
      <InfoScreen
        height="12.75rem"
        content={t('form:step_edit_form.absorbanceReader.no_settings_defined')}
      />
    ) : (
      <>
        {initialization.wavelengths.map(wavelength => {
          const knownColor = ABSORBANCE_READER_COLOR_BY_WAVELENGTH[wavelength]
          return (
            <ListItem
              type="default"
              key={`listItem_${wavelength}`}
              padding={SPACING.spacing12}
            >
              <StyledText desktopStyle="bodyDefaultRegular">
                {getWavelengthDisplay(wavelength, knownColor, false, t)}
              </StyledText>
            </ListItem>
          )
        })}
        {initialization.referenceWavelength != null ? (
          <ListItem
            type="default"
            key={`listItem_${initialization.referenceWavelength}`}
            padding={SPACING.spacing12}
          >
            <StyledText desktopStyle="bodyDefaultRegular">
              {getWavelengthDisplay(
                initialization.referenceWavelength,
                ABSORBANCE_READER_COLOR_BY_WAVELENGTH[
                  initialization.referenceWavelength
                ],
                true,
                t
              )}
            </StyledText>
          </ListItem>
        ) : null}
      </>
    )

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing4}
      width="100%"
    >
      <Flex gridGap={SPACING.spacing8} alignItems={ALIGN_CENTER}>
        <StyledText desktopStyle="bodyDefaultSemiBold">
          {t(
            'form:step_edit_form.absorbanceReader.current_initialization_settings.title'
          )}
        </StyledText>
        <Flex {...targetProps}>
          <Icon size="1rem" name="information" color={COLORS.grey60} />
        </Flex>
        <Tooltip tooltipProps={tooltipProps}>
          {t(
            'form:step_edit_form.absorbanceReader.current_initialization_settings.tooltip'
          )}
        </Tooltip>
      </Flex>
      {content}
    </Flex>
  )
}
