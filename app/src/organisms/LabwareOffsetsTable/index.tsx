import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

import { ListTable, ListAccordion } from '@opentrons/components'

import { selectAllLabwareInfoAndDefaultStatusSorted } from '/app/redux/protocol-runs'
import { AccordionHeader } from './AccordionHeader'
import { AccordionChildren } from './AccordionChildren'

import type { ListAccordionProps } from '@opentrons/components'

export interface LabwareOffsetsTableProps {
  runId: string
}

export function LabwareOffsetsTable(
  props: LabwareOffsetsTableProps
): JSX.Element {
  const { t } = useTranslation('protocol_setup')
  const { runId } = props

  const labwareInfo = useSelector(
    selectAllLabwareInfoAndDefaultStatusSorted(runId)
  )

  const alertKind = (
    missingOffset: boolean
  ): ListAccordionProps['alertKind'] => {
    return missingOffset ? 'warning' : 'default'
  }

  return (
    <ListTable headers={[t('labware_type'), t('total_offsets')]}>
      {labwareInfo.map(aLwInfo => (
        <ListAccordion
          key={aLwInfo.uri}
          alertKind={alertKind(aLwInfo.isMissingDefaultOffset)}
          tableHeaders={[t('location'), t('offset_type'), t('offset')]}
          headerChild={
            <AccordionHeader
              {...props}
              uri={aLwInfo.uri}
              lwDisplayName={aLwInfo.info.displayName}
            />
          }
        >
          <AccordionChildren {...props} lpcLabwareInfo={aLwInfo} />
        </ListAccordion>
      ))}
    </ListTable>
  )
}
