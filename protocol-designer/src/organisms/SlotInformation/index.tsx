import React from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import {
  ALIGN_CENTER,
  Box,
  DeckInfoLabel,
  DIRECTION_COLUMN,
  Flex,
  ListItem,
  ListItemDescriptor,
  SPACING,
  StyledText,
} from '@opentrons/components'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'
import type { RobotType } from '@opentrons/shared-data'

interface SlotInformationProps {
  location: string
  robotType: RobotType
  liquids?: string[]
  labwares?: string[]
  adapters?: string[]
  modules?: string[]
  fixtures?: string[]
}

export const SlotInformation: React.FC<SlotInformationProps> = ({
  location,
  robotType,
  liquids = [],
  labwares = [],
  adapters = [],
  modules = [],
  fixtures = [],
}) => {
  const { t } = useTranslation('shared')
  const isOffDeck = location === 'offDeck'
  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing12}
      width="100%"
    >
      <Flex gridGap={SPACING.spacing8} alignItems={ALIGN_CENTER}>
        {isOffDeck ? null : <DeckInfoLabel deckLabel={location} />}
        <StyledText desktopStyle="headingSmallBold">
          {t(isOffDeck ? 'labware_detail' : 'slot_detail')}
        </StyledText>
      </Flex>
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
        {liquids.length > 1 ? (
          <ListItem type="noActive">
            <ListItemDescriptor
              type="mini"
              content={liquids.join(', ')}
              description={t('liquid')}
            />
          </ListItem>
        ) : (
          <StackInfoList title={t('liquid')} items={liquids} />
        )}
        <StackInfoList title={t('labware')} items={labwares} />
        {adapters.length > 0 ? (
          <StackInfoList title={t('labware')} items={adapters} />
        ) : null}
        {isOffDeck ? null : (
          <StackInfoList title={t('module')} items={modules} />
        )}
        {robotType === FLEX_ROBOT_TYPE && !isOffDeck ? (
          <StackInfoList title={t('fixtures')} items={fixtures} />
        ) : null}
      </Flex>
    </Flex>
  )
}

interface StackInfoListProps {
  title: string
  items: string[]
}

function StackInfoList({ title, items }: StackInfoListProps): JSX.Element {
  const pathLocation = useLocation()
  return (
    <Box width={pathLocation.pathname === '/designer' ? '15.8125rem' : '100%'}>
      {items.length > 0 ? (
        items.map((item, index) => (
          <StackInfo
            key={`${title}_${index}`}
            title={title}
            stackInformation={item}
          />
        ))
      ) : (
        <StackInfo title={title} />
      )}
    </Box>
  )
}

interface StackInfoProps {
  title: string
  stackInformation?: string
}

function StackInfo({ title, stackInformation }: StackInfoProps): JSX.Element {
  const { t } = useTranslation('shared')
  return (
    <ListItem type="noActive">
      <ListItemDescriptor
        type="mini"
        content={stackInformation ?? t('none')}
        description={title}
      />
    </ListItem>
  )
}
