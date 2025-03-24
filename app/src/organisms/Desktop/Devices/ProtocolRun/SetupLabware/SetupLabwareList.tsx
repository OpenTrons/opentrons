import { useTranslation } from 'react-i18next'
import {
  getLabwareInfoByLiquidId,
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  StyledText,
  COLORS,
} from '@opentrons/components'
import { getStackedItemsOnStartingDeck } from '/app/transformations/commands/transformations/getStackedItemsOnStartingDeck'
import { LabwareListItem } from './LabwareListItem'

import type {
  CompletedProtocolAnalysis,
  ProtocolAnalysisOutput,
} from '@opentrons/shared-data'
import type { ModuleRenderInfoForProtocol } from '/app/resources/runs'
import type { ModuleTypesThatRequireExtraAttention } from '../utils/getModuleTypesThatRequireExtraAttention'

interface SetupLabwareListProps {
  attachedModuleInfo: { [moduleId: string]: ModuleRenderInfoForProtocol }
  protocolAnalysis: CompletedProtocolAnalysis | ProtocolAnalysisOutput | null
  extraAttentionModules: ModuleTypesThatRequireExtraAttention[]
  isFlex: boolean
}
export function SetupLabwareList(
  props: SetupLabwareListProps
): JSX.Element | null {
  const {
    attachedModuleInfo,
    protocolAnalysis,
    extraAttentionModules,
    isFlex,
  } = props
  const { t } = useTranslation('protocol_setup')

  const startingDeck = getStackedItemsOnStartingDeck(
    protocolAnalysis?.commands ?? [],
    protocolAnalysis?.labware ?? [],
    protocolAnalysis?.modules ?? []
  )
  const labwareByLiquidId = getLabwareInfoByLiquidId(
    protocolAnalysis?.commands ?? []
  )
  const sortedStartingDeckEntries = Object.entries(startingDeck)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .filter(([key]) => key !== 'offDeck')
  const offDeckItems = Object.keys(startingDeck).includes('offDeck')
    ? startingDeck['offDeck']
    : null

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing4}
      marginBottom={SPACING.spacing16}
    >
      <Flex
        gridGap={SPACING.spacing16}
        paddingLeft={SPACING.spacing16}
        paddingTop={SPACING.spacing20}
      >
        <StyledText
          width="6.25rem"
          desktopStyle="bodyDefaultRegular"
          color={COLORS.grey60}
        >
          {t('location')}
        </StyledText>
        <StyledText desktopStyle="bodyDefaultRegular" color={COLORS.grey60}>
          {t('labware_name')}
        </StyledText>
      </Flex>
      {sortedStartingDeckEntries.map(([key, value]) => {
        return (
          <LabwareListItem
            key={key}
            attachedModuleInfo={attachedModuleInfo}
            extraAttentionModules={extraAttentionModules}
            isFlex={isFlex}
            slotName={key}
            stackedItems={value}
            labwareByLiquidId={labwareByLiquidId}
          />
        )
      })}
      {offDeckItems?.forEach((item, index) => (
        <LabwareListItem
          key={index}
          attachedModuleInfo={attachedModuleInfo}
          extraAttentionModules={extraAttentionModules}
          slotName={'offDeck'}
          stackedItems={[item]}
          isFlex={isFlex}
        />
      ))}
    </Flex>
  )
}
