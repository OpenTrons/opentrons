import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Text,
  Flex,
  Icon,
  SIZE_2,
  FONT_SIZE_BODY_1,
  FONT_SIZE_BODY_2,
  FONT_STYLE_ITALIC,
  C_NEAR_WHITE,
  C_WHITE,
  COLOR_SUCCESS,
  SPACING_2,
  ALIGN_CENTER,
  DIRECTION_ROW,
  BORDER_SOLID_MEDIUM,
  Box,
  JUSTIFY_SPACE_BETWEEN,
} from '@opentrons/components'
import { formatLastModified } from '../../../CalibrationPanels/utils'

interface Props {
  button?: JSX.Element
  calibrated: boolean
  calibratedDate?: string | null
  index?: number
  subText?: string
  title?: string
}

export function CalibrationItem(props: Props): JSX.Element | null {
  const { index, title, subText, calibratedDate, calibrated, button } = props
  const { t } = useTranslation(['protocol_setup'])
  const backgroundColor =
    index !== undefined && index % 2 === 0 ? C_NEAR_WHITE : C_WHITE
  const calibratedText =
    calibratedDate !== null && calibratedDate !== undefined
      ? t('last_calibrated', {
          date: formatLastModified(calibratedDate),
        })
      : t('not_calibrated')
  return (
    <Box backgroundColor={backgroundColor}>
      <Flex
        flexDirection={DIRECTION_ROW}
        alignItems={ALIGN_CENTER}
        padding={SPACING_2}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
      >
        <Flex flexDirection={DIRECTION_ROW} alignItems={ALIGN_CENTER}>
          {calibrated ? (
            <Icon
              name={'check-circle'}
              size={SIZE_2}
              color={COLOR_SUCCESS}
              marginRight={SPACING_2}
            />
          ) : (
            <Icon
              name={'circle'}
              size={SIZE_2}
              color={C_WHITE}
              border={BORDER_SOLID_MEDIUM}
              borderRadius={SIZE_2}
              marginRight={SPACING_2}
            />
          )}
          <span>
            {title !== undefined && (
              <Text fontSize={FONT_SIZE_BODY_2} as="h1">
                {title}
              </Text>
            )}
            <Text
              fontSize={FONT_SIZE_BODY_1}
              as="h2"
              fontStyle={FONT_STYLE_ITALIC}
            >
              {subText !== undefined ? subText : calibratedText}
            </Text>
          </span>
        </Flex>
        <div>{button}</div>
      </Flex>
    </Box>
  )
}
