import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { css } from 'styled-components'

import {
  ListTable,
  ListAccordion,
  StyledText,
  RESPONSIVENESS,
} from '@opentrons/components'

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
    <>
      <ListTable headers={[t('labware_type'), t('total_offsets')]}>
        {labwareInfo.map(aLwInfo => (
          <ListAccordion
            key={aLwInfo.uri}
            alertKind={alertKind(aLwInfo.isMissingDefaultOffset)}
            tableHeaders={[
              <StyledText key="location" css={LOCATION_COLUMN_STYLE}>
                {t('location')}
              </StyledText>,
              t('offset_type'),
              <StyledText key="offset" css={OFFSET_COLUMN_STYLE}>
                {t('offset')}
              </StyledText>,
            ]}
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
    </>
  )
}

const LOCATION_COLUMN_STYLE = css`
  padding-right: 3.5rem;

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    padding-right: 0;
  }
`

const OFFSET_COLUMN_STYLE = css`
  padding-right: 6.438rem;

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    padding-right: 0;
  }
`
