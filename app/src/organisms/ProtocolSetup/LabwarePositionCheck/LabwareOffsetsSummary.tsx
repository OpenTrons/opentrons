import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  C_MED_GRAY,
  C_NEAR_WHITE,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  FONT_BODY_1_DARK,
  FONT_SIZE_CAPTION,
  FONT_WEIGHT_SEMIBOLD,
  JUSTIFY_CENTER,
  SPACING_3,
  SPACING_4,
  SPACING_1,
  Text,
  TEXT_TRANSFORM_UPPERCASE,
  SPACING_2,
} from '@opentrons/components'

const getOffsetDataInfo = (): Array<{
  location: string
  labware: string
  offsetData: { x: number; y: number; z: number }
}> => [
  {
    location: 'Temperature Module',
    labware: 'Opentrons 96 100mL Tiprack',
    offsetData: { x: 1.1, y: 2.1, z: 3.1 },
  },
  {
    location: 'Deck Slot 3',
    labware: 'Opentrons 96 Tip Rack 20µL',
    offsetData: { x: 0.0, y: -1.2, z: 1.1 },
  },
  {
    location: 'Deck Slot 5',
    labware: 'Opentrons Mixed Tube Rack',
    offsetData: { x: 5.1, y: 2.2, z: 3.1 },
  },
  {
    location: 'Deck Slot 6',
    labware: 'Opentrons Mixed Tube Rack',
    offsetData: { x: 0.0, y: 0.0, z: 0.0 },
  },
  {
    location: 'Thermocycler',
    labware: 'Opentrons Mixed Tube Rack',
    offsetData: { x: 0.0, y: 0.0, z: 0.0 },
  },
]

export const LabwareOffsetsSummary = (): JSX.Element | null => {
  const { t } = useTranslation('labware_position_check')
  const offsetData = getOffsetDataInfo().map(({ offsetData }) => offsetData)

  return (
    <React.Fragment>
      <Flex
        flex={'auto'}
        padding={SPACING_4}
        boxShadow="1px 1px 1px rgba(0, 0, 0, 0.25)"
        borderRadius="4px"
        backgroundColor={C_NEAR_WHITE}
        flexDirection={DIRECTION_COLUMN}
      >
        <Text
          as={'h5'}
          fontWeight={FONT_WEIGHT_SEMIBOLD}
          marginBottom={SPACING_3}
        >
          {t('labware_offsets_summary_title')}
        </Text>
        <Flex flexDirection={DIRECTION_ROW}>
          <Flex
            flex={'auto'}
            flexDirection={DIRECTION_COLUMN}
            justifyContent={JUSTIFY_CENTER}
          >
            <Text
              textTransform={TEXT_TRANSFORM_UPPERCASE}
              marginBottom={SPACING_3}
              color={C_MED_GRAY}
              fontSize={FONT_SIZE_CAPTION}
            >
              {t('labware_offsets_summary_location')}
            </Text>
            {getOffsetDataInfo().map(({ location }) => {
              return (
                <Flex
                  key={location}
                  marginBottom={SPACING_3}
                  css={FONT_BODY_1_DARK}
                >
                  {location}
                </Flex>
              )
            })}
          </Flex>
          <Flex
            flex={'auto'}
            flexDirection={DIRECTION_COLUMN}
            justifyContent={JUSTIFY_CENTER}
          >
            <Text
              textTransform={TEXT_TRANSFORM_UPPERCASE}
              marginBottom={SPACING_3}
              color={C_MED_GRAY}
              fontSize={FONT_SIZE_CAPTION}
            >
              {t('labware_offsets_summary_labware')}
            </Text>
            {getOffsetDataInfo().map(({ labware }, index) => {
              return (
                <Flex
                  key={index}
                  marginBottom={SPACING_3}
                  css={FONT_BODY_1_DARK}
                >
                  {labware}
                </Flex>
              )
            })}
          </Flex>
          <Flex
            flex={'auto'}
            flexDirection={DIRECTION_COLUMN}
            justifyContent={JUSTIFY_CENTER}
          >
            <Text
              textTransform={TEXT_TRANSFORM_UPPERCASE}
              marginBottom={SPACING_3}
              color={C_MED_GRAY}
              fontSize={FONT_SIZE_CAPTION}
            >
              {t('labware_offsets_summary_offset')}
            </Text>
            {offsetData.map(({ x, y, z }, index) => {
              return x === 0 && y === 0 && z === 0 ? (
                <Flex
                  key={index}
                  marginBottom={SPACING_3}
                  css={FONT_BODY_1_DARK}
                >
                  {t('no_labware_offsets')}
                </Flex>
              ) : (
                <Flex
                  key={index}
                  marginBottom={SPACING_3}
                  css={FONT_BODY_1_DARK}
                >
                  <Text as={'span'} marginRight={SPACING_1}>
                    <strong>X</strong>
                  </Text>
                  <Text key={x} as={'span'} marginRight={SPACING_2}>
                    {x}
                  </Text>
                  <Text as={'span'} marginRight={SPACING_1}>
                    <strong>Y</strong>
                  </Text>
                  <Text key={y} as={'span'} marginRight={SPACING_2}>
                    {y}
                  </Text>
                  <Text as={'span'} marginRight={SPACING_1}>
                    <strong>Z</strong>
                  </Text>
                  <Text key={z} as={'span'} marginRight={SPACING_2}>
                    {z}
                  </Text>
                </Flex>
              )
            })}
          </Flex>
        </Flex>
      </Flex>
    </React.Fragment>
  )
}
