import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'

import { Flex, RESPONSIVENESS, COLORS, BORDERS } from '@opentrons/components'

import { OffsetTag } from '/app/organisms/LabwarePositionCheck'
import { DeckInfoLabelTextTag } from '/app/molecules/DeckInfoLabelTextTag'
import { LabwareOffsetsDeckInfoLabels } from '/app/organisms/LabwareOffsetsDeckInfoLabels'

import type { OffsetTagProps } from '/app/organisms/LabwarePositionCheck'
import type { LocationSpecificOffsetDetailsWithCopy } from '/app/redux/protocol-runs'
import type { AccordionChildrenProps } from './AccordionChildren'

interface AccordionDetailProps extends AccordionChildrenProps {
  detail: LocationSpecificOffsetDetailsWithCopy
}

export function AccordionDetail({
  detail,
  lpcLabwareInfo,
}: AccordionDetailProps): JSX.Element {
  const { t } = useTranslation('labware_position_check')
  const { locationDetails, existingOffset: lsExistingOffset } = detail
  const {
    existingOffset: defaultExistingOffset,
  } = lpcLabwareInfo.info.defaultOffsetDetails
  const isHardcoded = locationDetails.hardCodedOffsetId != null

  const buildColTwoText = (): string => {
    if (isHardcoded || lsExistingOffset?.vector != null) {
      return t('custom')
    } else {
      return t('default')
    }
  }

  const buildColThreeTag = (): OffsetTagProps => {
    if (isHardcoded) {
      return { kind: 'hardcoded' }
    } else if (lsExistingOffset?.vector != null) {
      return { kind: 'vector', ...lsExistingOffset.vector }
    } else if (defaultExistingOffset?.vector != null) {
      return { kind: 'vector', ...defaultExistingOffset.vector }
    } else {
      return { kind: 'noOffset' }
    }
  }

  return (
    <Flex css={DECK_LABEL_CONTAINER_STYLE}>
      <DeckInfoLabelTextTag
        colOneDeckInfoLabels={[
          <LabwareOffsetsDeckInfoLabels
            detail={detail}
            slotCopy={detail.slotCopy}
            key="1"
          />,
        ]}
        colTwoText={buildColTwoText()}
        colThreeTag={<OffsetTag {...buildColThreeTag()} />}
      />
    </Flex>
  )
}

const DECK_LABEL_CONTAINER_STYLE = css`
  background-color: ${COLORS.grey20};
  border-radius: ${BORDERS.borderRadius4};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    background-color: ${COLORS.grey20};
    border-radius: ${BORDERS.borderRadius8};
  }
`
