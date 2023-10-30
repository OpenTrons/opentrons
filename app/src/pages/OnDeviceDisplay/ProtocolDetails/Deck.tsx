import * as React from 'react'
import last from 'lodash/last'

import { Flex } from '@opentrons/components'
import {
  useProtocolAnalysisAsDocumentQuery,
  useProtocolQuery,
} from '@opentrons/react-api-client'

import { DeckThumbnail } from '../../../molecules/DeckThumbnail'

import type { CompletedProtocolAnalysis } from '@opentrons/shared-data'

export const Deck = (props: { protocolId: string }): JSX.Element => {
  const { data: protocolData } = useProtocolQuery(props.protocolId)
  const {
    data: mostRecentAnalysis,
  } = useProtocolAnalysisAsDocumentQuery(
    props.protocolId,
    last(protocolData?.data.analysisSummaries)?.id ?? null,
    { enabled: protocolData != null }
  )

  return (
    <Flex height="26.9375rem">
      <DeckThumbnail
        protocolAnalysis={mostRecentAnalysis}
        commands={
          (mostRecentAnalysis as CompletedProtocolAnalysis)?.commands ?? []
        }
        labware={
          (mostRecentAnalysis as CompletedProtocolAnalysis)?.labware ?? []
        }
        liquids={
          (mostRecentAnalysis as CompletedProtocolAnalysis)?.liquids != null
            ? (mostRecentAnalysis as CompletedProtocolAnalysis)?.liquids
            : []
        }
      />
    </Flex>
  )
}
