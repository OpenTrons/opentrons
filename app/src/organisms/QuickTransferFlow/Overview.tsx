import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Flex,
  StyledText,
  SPACING,
  TYPOGRAPHY,
  DIRECTION_COLUMN,
  JUSTIFY_SPACE_BETWEEN,
  COLORS,
  TEXT_ALIGN_RIGHT,
} from '@opentrons/components'

import type { QuickTransferSetupState } from './types'
import { ListItem } from '../../atoms/ListItem'

interface OverviewProps {
  state: QuickTransferSetupState
}

export function Overview(props: OverviewProps): JSX.Element | null {
  const { state } = props
  const { t } = useTranslation(['quick_transfer', 'shared'])

  let transferCopy = t('volume_per_well')
  if (state.transferType === 'consolidate') {
    transferCopy = t('aspirate_volume')
  } else if (state.transferType === 'distribute') {
    transferCopy = t('dispense_volume')
  }

  const displayItems = [
    {
      option: t('pipette'),
      value: state.pipette?.displayName,
    },
    {
      option: t('source_labware'),
      value: state.source?.metadata.displayName,
    },
    {
      option: t('destination_labware'),
      value:
        state.destination === 'source'
          ? state.source?.metadata.displayName
          : state.destination?.metadata.displayName,
    },
    {
      option: transferCopy,
      value: `${state.volume}µL`,
    },
  ]

  return (
    <Flex
      gridGap={SPACING.spacing8}
      flexDirection={DIRECTION_COLUMN}
      marginTop="192px"
    >
      {displayItems.map(displayItem => (
        <ListItem type="noActive" key={displayItem.option}>
          <Flex justifyContent={JUSTIFY_SPACE_BETWEEN} width="100%">
            <StyledText css={TYPOGRAPHY.level4HeaderSemiBold} width="30rem">
              {displayItem.option}
            </StyledText>
            <StyledText
              css={TYPOGRAPHY.level4HeaderRegular}
              color={COLORS.grey60}
              textAlign={TEXT_ALIGN_RIGHT}
            >
              {displayItem.value}
            </StyledText>
          </Flex>
        </ListItem>
      ))}
    </Flex>
  )
}
