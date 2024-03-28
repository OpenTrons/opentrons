import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  BORDERS,
  Box,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  RoundTab,
  SPACING,
  StyledText,
} from '@opentrons/components'

import type { StyleProps } from '@opentrons/components'

type TabOptions = 'table' | 'jupyter' | 'cli'

export interface LabwareOffsetTabsProps extends StyleProps {
  TableComponent: JSX.Element
  JupyterComponent: JSX.Element
  CommandLineComponent: JSX.Element
}

export function LabwareOffsetTabs({
  TableComponent,
  JupyterComponent,
  CommandLineComponent,
  ...styleProps
}: LabwareOffsetTabsProps): JSX.Element {
  const { t } = useTranslation('labware_position_check')
  const [currentTab, setCurrentTab] = React.useState<TabOptions>('table')

  const activeTabComponent = {
    table: TableComponent,
    jupyter: JupyterComponent,
    cli: CommandLineComponent,
  }
  return (
    <Flex
      width="100%"
      height="100%"
      flexDirection={DIRECTION_COLUMN}
      {...styleProps}
    >
      <Flex>
        <RoundTab
          isCurrent={currentTab === 'table'}
          onClick={() => setCurrentTab('table')}
        >
          <StyledText>{t('table_view')}</StyledText>
        </RoundTab>
        <RoundTab
          isCurrent={currentTab === 'jupyter'}
          onClick={() => setCurrentTab('jupyter')}
        >
          <StyledText>{t('jupyter_notebook')}</StyledText>
        </RoundTab>
        <RoundTab
          isCurrent={currentTab === 'cli'}
          onClick={() => setCurrentTab('cli')}
        >
          <StyledText>{t('cli_ssh')}</StyledText>
        </RoundTab>
      </Flex>
      <Box
        backgroundColor={COLORS.white}
        border={BORDERS.lineBorder}
        // remove left upper corner border radius when first tab is active
        borderRadius={`${
          currentTab === 'table' ? '0' : BORDERS.borderRadius4
        } ${BORDERS.borderRadius4} ${BORDERS.borderRadius4} ${
          BORDERS.borderRadius4
        }`}
        paddingX={SPACING.spacing16}
      >
        {activeTabComponent[currentTab]}
      </Box>
    </Flex>
  )
}
