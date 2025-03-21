import {
  ALIGN_CENTER,
  SPACING,
  Flex,
  JUSTIFY_CENTER,
} from '@opentrons/components'
import type { ProtocolSetupOffsetsProps } from '/app/organisms/ODD/ProtocolSetup'
import { LabwareOffsetsTable } from '/app/organisms/LabwareOffsetsTable'
import { css } from 'styled-components'

export function SetupOffsetsTable(
  props: ProtocolSetupOffsetsProps
): JSX.Element {
  return (
    <Flex css={TABLE_CONTAINER_STYLE}>
      <LabwareOffsetsTable {...props} />
    </Flex>
  )
}

const TABLE_CONTAINER_STYLE = css`
  padding: ${SPACING.spacing32} ${SPACING.spacing60};
  align-items: ${ALIGN_CENTER};
  justify-content: ${JUSTIFY_CENTER};
`
