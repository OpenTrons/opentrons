import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'
import {
  parseLabwareInfoByLiquidId,
  parseLiquidsInLoadOrder,
} from '@opentrons/api-client'

import {
  Flex,
  SPACING,
  Icon,
  COLORS,
  DIRECTION_ROW,
  DIRECTION_COLUMN,
  TYPOGRAPHY,
  JUSTIFY_CENTER,
  SIZE_1,
  BORDERS,
  ALIGN_CENTER,
  SIZE_AUTO,
  JUSTIFY_SPACE_BETWEEN,
  Box,
} from '@opentrons/components'
import { MICRO_LITERS } from '@opentrons/shared-data'
import { useProtocolDetailsForRun } from '../../../Devices/hooks'
import { StyledText } from '../../../../atoms/text'
import { LiquidsLabwareDetailsModal } from './LiquidsLabwareDetailsModal'
import {
  getTotalVolumePerLiquidId,
  getTotalVolumePerLiquidLabwarePair,
  getSlotLabwareName,
} from './utils'

interface SetupLiquidsListProps {
  runId: string
}

const HIDE_SCROLLBAR = css`
  ::-webkit-scrollbar {
    display: none;
  }
`

export function SetupLiquidsList(props: SetupLiquidsListProps): JSX.Element {
  const liquidsInLoadOrder = parseLiquidsInLoadOrder()

  return (
    <Flex
      css={HIDE_SCROLLBAR}
      flexDirection={DIRECTION_COLUMN}
      maxHeight={'31.25rem'}
      overflowY={'auto'}
      data-testid={'SetupLiquidsList_ListView'}
    >
      {liquidsInLoadOrder?.map(liquid => (
        <LiquidsListItem
          key={liquid.liquidId}
          liquidId={liquid.liquidId}
          description={liquid.description}
          displayColor={liquid.displayColor}
          displayName={liquid.displayName}
          runId={props.runId}
        />
      ))}
    </Flex>
  )
}

interface LiquidsListItemProps {
  liquidId: string
  description: string | null
  displayColor: string
  displayName: string
  runId: string
}

export function LiquidsListItem(props: LiquidsListItemProps): JSX.Element {
  const { liquidId, description, displayColor, displayName, runId } = props
  const { t } = useTranslation('protocol_setup')
  const [openItem, setOpenItem] = React.useState(false)
  const [liquidDetailsLabwareId, setLiquidDetailsLabwareId] = React.useState<
    string | null
  >(null)
  const commands = useProtocolDetailsForRun(runId).protocolData?.commands
  const labwareByLiquidId = parseLabwareInfoByLiquidId()

  const LIQUID_CARD_STYLE = css`
    ${BORDERS.cardOutlineBorder}

    &:hover {
      background-color: ${COLORS.background};
      border: 1px solid ${COLORS.medGreyHover};
    }
  `
  const LIQUID_CARD_ITEM_STYLE = css`
    ${BORDERS.cardOutlineBorder}

    &:hover {
      cursor: pointer;
      border: 1px solid ${COLORS.medGreyHover};
    }
  `

  return (
    <Box
      css={LIQUID_CARD_STYLE}
      marginBottom={SPACING.spacing3}
      padding={SPACING.spacing4}
      onClick={() => setOpenItem(!openItem)}
      backgroundColor={openItem ? COLORS.lightGrey : COLORS.white}
      data-testid={'LiquidsListItem_Row'}
    >
      <Flex flexDirection={DIRECTION_ROW}>
        <Flex
          css={BORDERS.cardOutlineBorder}
          padding={'0.75rem'}
          height={'max-content'}
          backgroundColor={COLORS.white}
        >
          <Icon name="circle" color={displayColor} size={SIZE_1} />
        </Flex>
        <Flex flexDirection={DIRECTION_COLUMN} justifyContent={JUSTIFY_CENTER}>
          <StyledText
            as="p"
            fontWeight={TYPOGRAPHY.fontWeightSemiBold}
            marginX={SPACING.spacing4}
          >
            {displayName}
          </StyledText>
          <StyledText
            as="p"
            fontWeight={TYPOGRAPHY.fontWeightRegular}
            color={COLORS.darkGreyEnabled}
            marginX={SPACING.spacing4}
          >
            {description != null ? description : null}
          </StyledText>
        </Flex>
        <Flex
          backgroundColor={COLORS.darkBlack + '1A'}
          borderRadius={BORDERS.radiusSoftCorners}
          height={'max-content'}
          paddingY={SPACING.spacing2}
          paddingX={SPACING.spacing3}
          alignSelf={ALIGN_CENTER}
          marginLeft={SIZE_AUTO}
        >
          <StyledText as="p" fontWeight={TYPOGRAPHY.fontWeightRegular}>
            {getTotalVolumePerLiquidId(liquidId, labwareByLiquidId)}{' '}
            {MICRO_LITERS}
          </StyledText>
        </Flex>
      </Flex>
      {liquidDetailsLabwareId != null && (
        <LiquidsLabwareDetailsModal
          labwareId={liquidDetailsLabwareId}
          liquidId={liquidId}
          runId={runId}
          closeModal={() => setLiquidDetailsLabwareId(null)}
        />
      )}
      {openItem && (
        <Flex flexDirection={DIRECTION_COLUMN}>
          <Flex
            flexDirection={DIRECTION_ROW}
            justifyContent={JUSTIFY_SPACE_BETWEEN}
            marginTop={SPACING.spacing4}
          >
            <StyledText
              as="p"
              fontWeight={TYPOGRAPHY.fontWeightSemiBold}
              marginLeft={SPACING.spacing4}
            >
              {t('location')}
            </StyledText>
            <StyledText
              as="p"
              fontWeight={TYPOGRAPHY.fontWeightSemiBold}
              marginRight={SPACING.spacing6}
            >
              {t('labware_name')}
            </StyledText>
            <StyledText
              as="p"
              fontWeight={TYPOGRAPHY.fontWeightSemiBold}
              marginRight={SPACING.spacing4}
            >
              {t('volume')}
            </StyledText>
          </Flex>
          {labwareByLiquidId[liquidId].map((labware, index) => {
            const { slotName, labwareName } = getSlotLabwareName(
              labware.labwareId,
              commands
            )
            return (
              <Box
                css={LIQUID_CARD_ITEM_STYLE}
                key={index}
                borderRadius={'4px'}
                marginY={SPACING.spacing3}
                padding={SPACING.spacing4}
                backgroundColor={COLORS.white}
                data-testid={`LiquidsListItem_slotRow_${index}`}
                onClick={() => setLiquidDetailsLabwareId(labware.labwareId)}
              >
                <Flex
                  flexDirection={DIRECTION_ROW}
                  justifyContent={JUSTIFY_SPACE_BETWEEN}
                >
                  <StyledText as="p" fontWeight={TYPOGRAPHY.fontWeightRegular}>
                    {t('slot_location', {
                      slotName: slotName,
                    })}
                  </StyledText>
                  <StyledText as="p" fontWeight={TYPOGRAPHY.fontWeightRegular}>
                    {labwareName}
                  </StyledText>
                  <StyledText as="p" fontWeight={TYPOGRAPHY.fontWeightRegular}>
                    {getTotalVolumePerLiquidLabwarePair(
                      liquidId,
                      labware.labwareId,
                      labwareByLiquidId
                    )}{' '}
                    {MICRO_LITERS}
                  </StyledText>
                </Flex>
              </Box>
            )
          })}
        </Flex>
      )}
    </Box>
  )
}
