import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DIRECTION_ROW,
  Flex,
  Icon,
  SPACING,
  StyledText,
  TYPOGRAPHY,
  WRAP,
  DIRECTION_COLUMN,
} from '@opentrons/components'

import { useRequiredProtocolLabware } from '/app/resources/protocols'
import { EmptySection } from './EmptySection'

const Table = styled('table')`
  ${TYPOGRAPHY.labelRegular}
  border-collapse: separate
  table-layout: auto;
  width: 100%;
  border-spacing: 0 ${SPACING.spacing8};
  margin: ${SPACING.spacing16} 0;
  text-align: ${TYPOGRAPHY.textAlignLeft};
`
const TableHeader = styled('th')`
  padding: ${SPACING.spacing4};
`

const TableRow = styled('tr')`
  background-color: ${COLORS.grey35};
  border: 1px ${COLORS.white} solid;
  height: 4.75rem;
`

const TableDatum = styled('td')`
  padding: ${SPACING.spacing4};
  white-space: break-spaces;
  text-overflow: ${WRAP};
  &:first-child {
    border-top-left-radius: ${BORDERS.borderRadius16};
    border-bottom-left-radius: ${BORDERS.borderRadius16};
  }
  &:last-child {
    border-top-right-radius: ${BORDERS.borderRadius16};
    border-bottom-right-radius: ${BORDERS.borderRadius16};
  }
`

export const Labware = (props: { protocolId: string }): JSX.Element => {
  const labwareItems = useRequiredProtocolLabware(props.protocolId)

  const { t, i18n } = useTranslation('protocol_details')

  return labwareItems.length === 0 ? (
    <EmptySection section="labware" />
  ) : (
    <Table>
      <thead>
        <tr>
          <TableHeader>
            <StyledText
              color={COLORS.grey60}
              fontSize={TYPOGRAPHY.fontSize20}
              fontWeight={TYPOGRAPHY.fontWeightSemiBold}
              paddingLeft={SPACING.spacing24}
            >
              {i18n.format(t('labware_name'), 'titleCase')}
            </StyledText>
          </TableHeader>
          <TableHeader>
            <StyledText
              alignItems={ALIGN_CENTER}
              color={COLORS.grey60}
              fontSize={TYPOGRAPHY.fontSize20}
              fontWeight={TYPOGRAPHY.fontWeightSemiBold}
              paddingRight={SPACING.spacing12}
              textAlign={TYPOGRAPHY.textAlignCenter}
            >
              {i18n.format(t('quantity'), 'sentenceCase')}
            </StyledText>
          </TableHeader>
        </tr>
      </thead>
      <tbody>
        {labwareItems.map(labware => {
          return (
            <TableRow key={labware.displayName}>
              <TableDatum>
                <Flex
                  flexDirection={DIRECTION_ROW}
                  paddingLeft={SPACING.spacing24}
                  alignItems={ALIGN_CENTER}
                >
                  {labware.namespace === 'opentrons' ? (
                    <Icon
                      color={COLORS.blue50}
                      name="check-decagram"
                      height="1.77125rem"
                      minHeight="1.77125rem"
                      minWidth="1.77125rem"
                      marginRight={SPACING.spacing8}
                    />
                  ) : (
                    <Flex marginLeft={SPACING.spacing20} />
                  )}
                  <Flex flexDirection={DIRECTION_COLUMN}>
                    <StyledText
                      oddStyle="bodyTextRegular"
                      alignItems={ALIGN_CENTER}
                    >
                      {labware.displayName}
                    </StyledText>
                    {labware.lidDisplayName ? (
                      <StyledText
                        oddStyle="smallBodyTextRegular"
                        alignItems={ALIGN_CENTER}
                        color={COLORS.grey60}
                      >
                        {t('with_lid_name', { lid: labware.lidDisplayName })}
                      </StyledText>
                    ) : null}
                  </Flex>
                </Flex>
              </TableDatum>
              <TableDatum>
                <StyledText
                  oddStyle="bodyTextRegular"
                  alignItems={ALIGN_CENTER}
                  textAlign={TYPOGRAPHY.textAlignCenter}
                >
                  {labware.quantity}
                </StyledText>
              </TableDatum>
            </TableRow>
          )
        })}
      </tbody>
    </Table>
  )
}
