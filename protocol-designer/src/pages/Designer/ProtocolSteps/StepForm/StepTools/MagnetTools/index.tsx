import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  COLORS,
  DIRECTION_COLUMN,
  DeckInfoLabel,
  Divider,
  Flex,
  ListItem,
  SPACING,
  StyledText,
} from '@opentrons/components'
import {
  MAGNETIC_MODULE_TYPE,
  MAGNETIC_MODULE_V1,
} from '@opentrons/shared-data'
import {
  MAX_ENGAGE_HEIGHT_V1,
  MAX_ENGAGE_HEIGHT_V2,
  MIN_ENGAGE_HEIGHT_V1,
  MIN_ENGAGE_HEIGHT_V2,
} from '../../../../../../constants'
import {
  getMagnetLabwareEngageHeight,
  getMagneticLabwareOptions,
} from '../../../../../../ui/modules/selectors'
import { ToggleExpandStepFormField } from '../../../../../../molecules'
import {
  getInitialDeckSetup,
  getModuleEntities,
} from '../../../../../../step-forms/selectors'
import { getModulesOnDeckByType } from '../../../../../../ui/modules/utils'

import type { StepFormProps } from '../../types'

export function MagnetTools(props: StepFormProps): JSX.Element {
  const { propsForFields, formData } = props
  const { t } = useTranslation(['application', 'form', 'protocol_steps'])
  const moduleLabwareOptions = useSelector(getMagneticLabwareOptions)
  const moduleEntities = useSelector(getModuleEntities)
  const defaultEngageHeight = useSelector(getMagnetLabwareEngageHeight)
  const deckSetup = useSelector(getInitialDeckSetup)
  const modulesOnDeck = getModulesOnDeckByType(deckSetup, MAGNETIC_MODULE_TYPE)

  console.log(modulesOnDeck)

  const moduleModel = moduleEntities[formData.moduleId].model

  const slotInfo = moduleLabwareOptions[0].name.split('in')
  const slotLocation = modulesOnDeck != null ? modulesOnDeck[0].slot : ''

  const mmUnits = t('units.millimeter')
  const isGen1 = moduleModel === MAGNETIC_MODULE_V1
  const engageHeightMinMax = isGen1
    ? t('magnet_height_caption', {
        low: MIN_ENGAGE_HEIGHT_V1,
        high: MAX_ENGAGE_HEIGHT_V1,
      })
    : t('magnet_height_caption', {
        low: `${MIN_ENGAGE_HEIGHT_V2} ${mmUnits}`,
        high: `${MAX_ENGAGE_HEIGHT_V2} ${mmUnits}`,
      })
  const engageHeightDefault =
    defaultEngageHeight != null
      ? isGen1
        ? t('magnet_recommended', { default: defaultEngageHeight })
        : t('magnet_recommended', {
            default: `${defaultEngageHeight} ${mmUnits}`,
          })
      : ''
  const engageHeightCaption = `${engageHeightMinMax} ${engageHeightDefault}`
  // TODO (10-9-2024): Replace ListItem with ListItemDescriptor
  return (
    <Flex flexDirection={DIRECTION_COLUMN}>
      <Flex
        flexDirection={DIRECTION_COLUMN}
        padding={`${SPACING.spacing16} ${SPACING.spacing16} ${SPACING.spacing12}`}
        gridGap={SPACING.spacing12}
        width="100%"
      >
        <StyledText desktopStyle="bodyDefaultRegular" color={COLORS.grey60}>
          {t('protocol_steps:module')}
        </StyledText>
        <ListItem type="noActive">
          <Flex padding={SPACING.spacing12} gridGap={SPACING.spacing32}>
            <Flex>
              <DeckInfoLabel deckLabel={slotLocation} />
            </Flex>
            <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
              <StyledText desktopStyle="bodyDefaultRegular">
                {slotInfo[0]}
              </StyledText>
              <StyledText
                desktopStyle="bodyDefaultRegular"
                color={COLORS.grey60}
              >
                {slotInfo[1]}
              </StyledText>
            </Flex>
          </Flex>
        </ListItem>
      </Flex>
      <Divider marginY="0" />
      <Flex flexDirection={DIRECTION_COLUMN} padding={SPACING.spacing16}>
        <ToggleExpandStepFormField
          {...propsForFields.engageHeight}
          toggleValue={propsForFields.magnetAction.value}
          toggleUpdateValue={propsForFields.magnetAction.updateValue}
          title={t('form:step_edit_form.field.magnetAction.label')}
          fieldTitle={t('protocol_steps:engage_height')}
          isSelected={formData.magnetAction === 'engage'}
          units={mmUnits}
          onLabel={t('form:step_edit_form.field.magnetAction.options.engage')}
          offLabel={t(
            'form:step_edit_form.field.magnetAction.options.disengage'
          )}
          caption={engageHeightCaption}
          islabel={true}
        />
      </Flex>
    </Flex>
  )
}
