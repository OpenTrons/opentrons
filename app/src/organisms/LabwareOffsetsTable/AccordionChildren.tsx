import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

import { selectSortedLSOffsetDetailsWithCopy } from '/app/redux/protocol-runs'
import { AccordionDetail } from './AccordionDetail'

import type { TFunction } from 'i18next'
import type { LabwareOffsetsTableProps } from '.'
import type { LPCLabwareInfoAndDefaultStatus } from '/app/redux/protocol-runs'

export interface AccordionChildrenProps extends LabwareOffsetsTableProps {
  lpcLabwareInfo: LPCLabwareInfoAndDefaultStatus
}

export function AccordionChildren(props: AccordionChildrenProps): JSX.Element {
  const { runId, lpcLabwareInfo } = props
  const { t: commandTextT } = useTranslation('protocol_command_text')

  const sortedLSDetailsWithCopy = useSelector(
    selectSortedLSOffsetDetailsWithCopy(
      runId,
      lpcLabwareInfo.uri,
      commandTextT as TFunction
    )
  )

  return (
    <>
      {sortedLSDetailsWithCopy.map(lsDetail => (
        <AccordionDetail
          key={`${lsDetail.locationDetails.addressableAreaName}${lsDetail.locationDetails.closestBeneathModuleId}${lsDetail.locationDetails.closestBeneathAdapterId}`}
          {...props}
          detail={lsDetail}
        />
      ))}
    </>
  )
}
