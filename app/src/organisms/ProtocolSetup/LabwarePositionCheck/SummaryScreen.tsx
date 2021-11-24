import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  ALIGN_START,
  C_BLUE,
  DIRECTION_COLUMN,
  Flex,
  FONT_WEIGHT_SEMIBOLD,
  JUSTIFY_CENTER,
  JUSTIFY_START,
  PrimaryBtn,
  SPACING_3,
  SPACING_4,
  Text,
  TEXT_TRANSFORM_UPPERCASE,
} from '@opentrons/components'
import { useCreateLabwareOffsetsMutation } from '@opentrons/react-api-client'
import { useProtocolDetails } from '../../RunDetails/hooks'
import { useCurrentProtocolRun } from '../../ProtocolUpload/hooks'
import { DeckMap } from './DeckMap'
import { SectionList } from './SectionList'
import { LabwareOffsetsSummary } from './LabwareOffsetsSummary'
import { useIntroInfo, useLabwareOffsets, LabwareOffsets } from './hooks'
import type { SavePositionCommandData } from './types'
import type { ProtocolFile } from '@opentrons/shared-data'

export const SummaryScreen = (props: {
  savePositionCommandData: SavePositionCommandData
  onLabwarePositionCheckComplete: () => void
  onCloseClick: () => unknown
}): JSX.Element | null => {
  const { savePositionCommandData } = props
  const [labwareOffsets, setLabwareOffsets] = React.useState<LabwareOffsets>([])
  const { t } = useTranslation('labware_position_check')
  const introInfo = useIntroInfo()
  const { protocolData } = useProtocolDetails()
  useLabwareOffsets(savePositionCommandData, protocolData as ProtocolFile<{}>)
    .then(offsets => setLabwareOffsets(offsets))
    .catch((e: Error) =>
      console.error(`error getting labware offsetsL ${e.message}`)
    )
  const { createLabwareOffsets } = useCreateLabwareOffsetsMutation()
  const { runRecord } = useCurrentProtocolRun()

  if (introInfo == null) return null
  if (protocolData == null) return null
  const labwareIds = Object.keys(protocolData.labware)
  const { sections, primaryPipetteMount, secondaryPipetteMount } = introInfo

  const applyLabwareOffsets = (): void => {
    if (labwareOffsets.length > 0) {
      createLabwareOffsets({
        runId: runRecord?.data.id as string,
        data: {
          labwareOffsets: labwareOffsets.map(offsetRecord => ({
            definitionUri: offsetRecord.labwareDefinitionUri,
            location: offsetRecord.labwareLocation,
            offset: offsetRecord.offsetData,
          })),
        },
      })
    } else {
      console.error('no labware offset data found')
    }
  }

  return (
    <Flex margin={SPACING_3} flexDirection={DIRECTION_COLUMN}>
      <Text
        as={'h3'}
        textTransform={TEXT_TRANSFORM_UPPERCASE}
        fontWeight={FONT_WEIGHT_SEMIBOLD}
        marginBottom={SPACING_3}
        marginLeft={SPACING_3}
      >
        {t('lpc_complete_summary_screen_heading')}
      </Text>
      <Flex justifyContent={JUSTIFY_START} alignItems={ALIGN_START}>
        <Flex flex={'1 1 10%'} flexDirection={DIRECTION_COLUMN}>
          <SectionList
            primaryPipetteMount={primaryPipetteMount}
            secondaryPipetteMount={secondaryPipetteMount}
            sections={sections}
            completedSections={sections}
          />

          <DeckMap completedLabwareIdSections={labwareIds} />
        </Flex>
        <Flex flex={'1 1 45%'}>
          <LabwareOffsetsSummary offsetData={labwareOffsets} />
        </Flex>
      </Flex>
      <Flex justifyContent={JUSTIFY_CENTER} marginBottom={SPACING_4}>
        <PrimaryBtn
          title={t('close_and_apply_offset_data')}
          backgroundColor={C_BLUE}
          id={'Lpc_summaryScreen_applyOffsetButton'}
          onClick={() => {
            props.onLabwarePositionCheckComplete()
            props.onCloseClick()
            applyLabwareOffsets()
          }}
        >
          {t('close_and_apply_offset_data')}
        </PrimaryBtn>
      </Flex>
    </Flex>
  )
}
