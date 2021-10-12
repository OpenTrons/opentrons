import * as React from 'react'
import { useTranslation } from 'react-i18next'
import capitalize from 'lodash/capitalize'

import {
  Flex,
  Box,
  ALIGN_CENTER,
  SIZE_1,
  SPACING_2,
  SPACING_5,
  C_WHITE,
  C_NEAR_WHITE,
  C_DARK_GRAY,
  TEXT_ALIGN_CENTER,
  FONT_SIZE_CAPTION,
  Text,
} from '@opentrons/components'
import type { Section } from './types'
interface Props {
  sections: Section[]
  currentSection: Section
  primaryPipetteMount: string
  secondaryPipetteMount: string
}

export function PositionCheckNav(props: Props): JSX.Element {
  const {
    currentSection,
    sections,
    primaryPipetteMount,
    secondaryPipetteMount,
  } = props
  const { t } = useTranslation('labware_position_check')

  return (
    <Box
      fontSize={FONT_SIZE_CAPTION}
      padding={SPACING_2}
      width="13.25rem"
      marginLeft={SPACING_5}
      boxShadow="1px 1px 1px rgba(0, 0, 0, 0.25)"
      borderRadius="4px"
      backgroundColor={C_NEAR_WHITE}
    >
      {sections.map((section, index) => (
        <Flex key={index} padding={SPACING_2} alignItems={ALIGN_CENTER}>
          <Box
            width={SIZE_1}
            height={SIZE_1}
            lineHeight={SIZE_1}
            backgroundColor={
              section === currentSection ? '#00c3e6' : C_DARK_GRAY
            }
            color={C_WHITE}
            borderRadius="50%"
            marginRight={SPACING_2}
            textAlign={TEXT_ALIGN_CENTER}
          >
            {index + 1}
          </Box>
          <Box maxWidth="85%">
            <Text color={section === currentSection ? '#00c3e6' : C_DARK_GRAY}>
              {t(`${section.toLowerCase()}_section`, {
                primary_mount: capitalize(primaryPipetteMount),
                secondary_mount: capitalize(secondaryPipetteMount),
              })}
            </Text>
          </Box>
        </Flex>
      ))}
    </Box>
  )
}
