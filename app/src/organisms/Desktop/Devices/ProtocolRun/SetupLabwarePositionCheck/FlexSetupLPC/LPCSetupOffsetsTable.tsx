import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  Flex,
  JUSTIFY_CENTER,
  SPACING,
  StyledText,
} from '@opentrons/components'
import { LabwareOffsetsTable } from '/app/organisms/LabwareOffsetsTable'
import type { SetupLabwarePositionCheckProps } from '..'
import { selectTotalCountLocationSpecificOffsets } from '/app/redux/protocol-runs'
import { useSelector } from 'react-redux'
import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'

export function LPCSetupOffsetsTable(
  props: SetupLabwarePositionCheckProps
): JSX.Element {
  const { t } = useTranslation('protocol_setup')
  const totalOffsetCount = useSelector(
    selectTotalCountLocationSpecificOffsets(props.runId)
  )

  return totalOffsetCount > 0 ? (
    <LabwareOffsetsTable {...props} />
  ) : (
    <Flex css={NO_OFFSETS_CONTAINER_STYLE}>
      <StyledText desktopStyle="bodyDefaultRegular">
        {t('no_labware_offset_data')}
      </StyledText>
    </Flex>
  )
}

const NO_OFFSETS_CONTAINER_STYLE = css`
  padding: ${SPACING.spacing8} 0;
  margin: ${SPACING.spacing24} 0;
  align-items: ${ALIGN_CENTER};
  justify-content: ${JUSTIFY_CENTER};
  border-radius: ${BORDERS.borderRadius8};
  background-color: ${COLORS.grey10};
`
