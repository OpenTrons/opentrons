import {
  FLEX_ROBOT_TYPE,
  getSimplestDeckConfigForProtocol,
} from '@opentrons/shared-data'

import { BaseDeck } from '../BaseDeck'
import { getStandardDeckViewLayerBlockList } from './utils'
import { getLabwareInfoByLiquidId } from './utils/getLabwareInfoByLiquidId'
import { getTopMostLabwareInSlots } from './utils/getLabwareInSlots'
import { getModulesInSlots } from './utils/getModulesInSlots'
import { getWellFillFromLabwareId } from './utils/getWellFillFromLabwareId'

import type { ComponentProps } from 'react'
import type {
  CompletedProtocolAnalysis,
  ProtocolAnalysisOutput,
} from '@opentrons/shared-data'

export * from './utils/getStandardDeckViewLayerBlockList'

interface ProtocolDeckProps {
  protocolAnalysis: CompletedProtocolAnalysis | ProtocolAnalysisOutput | null
  /** extra props to pass through to BaseDeck component */
  baseDeckProps?: Partial<ComponentProps<typeof BaseDeck>>
}

export function ProtocolDeck(props: ProtocolDeckProps): JSX.Element | null {
  const { protocolAnalysis, baseDeckProps } = props

  if (protocolAnalysis == null || (protocolAnalysis?.errors ?? []).length > 0)
    return null

  const robotType = protocolAnalysis.robotType ?? FLEX_ROBOT_TYPE
  const deckConfig = getSimplestDeckConfigForProtocol(protocolAnalysis)
  const labwareByLiquidId = getLabwareInfoByLiquidId(protocolAnalysis.commands)

  const modulesInSlots = getModulesInSlots(protocolAnalysis)
  const modulesOnDeck = modulesInSlots.map(
    ({ moduleModel, moduleLocation, nestedLabwareId, nestedLabwareDef }) => {
      return {
        moduleModel,
        moduleLocation,
        nestedLabwareDef,
        nestedLabwareWellFill: getWellFillFromLabwareId(
          nestedLabwareId ?? '',
          protocolAnalysis.liquids,
          labwareByLiquidId
        ),
      }
    }
  )

  // this function gets the top most labware
  const topMostLabwareInSlots = getTopMostLabwareInSlots(protocolAnalysis)
  const labwareOnDeck = topMostLabwareInSlots.map(
    ({ labwareId, labwareDef, location }) => {
      return {
        definition: labwareDef,
        labwareLocation: location,
        wellFill: getWellFillFromLabwareId(
          labwareId,
          protocolAnalysis.liquids,
          labwareByLiquidId
        ),
      }
    }
  )

  return (
    <BaseDeck
      deckConfig={deckConfig}
      deckLayerBlocklist={getStandardDeckViewLayerBlockList(robotType)}
      robotType={robotType}
      labwareOnDeck={labwareOnDeck}
      modulesOnDeck={modulesOnDeck}
      {...{
        svgProps: {
          'aria-label': 'protocol deck map',
          ...(baseDeckProps?.svgProps ?? {}),
        },
        ...baseDeckProps,
      }}
    />
  )
}
