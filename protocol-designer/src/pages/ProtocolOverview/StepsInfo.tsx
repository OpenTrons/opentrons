import { useTranslation } from 'react-i18next'

import {
  Flex,
  DIRECTION_COLUMN,
  SPACING,
  StyledText,
  InfoScreen,
  ListItem,
  ListItemDescriptor,
  COLORS,
} from '@opentrons/components'

import type { SavedStepFormState } from '../../step-forms'

interface StepsInfoProps {
  savedStepForms: SavedStepFormState
}

export function StepsInfo({ savedStepForms }: StepsInfoProps): JSX.Element {
  const { t } = useTranslation('protocol_overview')

  return (
    <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing12}>
      <Flex>
        <StyledText desktopStyle="headingSmallBold">
          {t('protocol_steps')}
        </StyledText>
      </Flex>
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
        {Object.keys(savedStepForms).length <= 1 ? (
          <InfoScreen content={t('no_steps')} />
        ) : (
          <ListItem type="default" key="ProtocolOverview_Step">
            <ListItemDescriptor
              type="large"
              description={
                <Flex minWidth="13.75rem">
                  <StyledText
                    desktopStyle="bodyDefaultRegular"
                    color={COLORS.grey60}
                  >
                    {t('number_of_steps')}
                  </StyledText>
                </Flex>
              }
              content={
                <StyledText desktopStyle="bodyDefaultRegular">
                  {t('steps', {
                    count: (Object.keys(savedStepForms).length - 1).toString(),
                  })}
                </StyledText>
              }
            />
          </ListItem>
        )}
      </Flex>
    </Flex>
  )
}
