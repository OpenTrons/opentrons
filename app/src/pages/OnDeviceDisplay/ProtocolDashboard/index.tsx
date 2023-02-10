import * as React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { format, formatDistance } from 'date-fns'
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  Flex,
  DIRECTION_COLUMN,
  JUSTIFY_SPACE_BETWEEN,
  truncateString,
  Btn,
  Icon,
  JUSTIFY_CENTER,
  ALIGN_CENTER,
} from '@opentrons/components'
import {
  useAllProtocolsQuery,
  useAllRunsQuery,
} from '@opentrons/react-api-client'
import { StyledText } from '../../../atoms/text'
import { Navigation } from '../../../organisms/OnDeviceDisplay/Navigation'
import { onDeviceDisplayRoutes } from '../../../App/OnDeviceDisplayApp'
import {
  getProtocolsOnDeviceSortKey,
  updateConfigValue,
} from '../../../redux/config'
import { sortProtocols } from './utils'

import imgSrc from '../../../assets/images/odd/abstract@x2.png'

import type { Dispatch } from '../../../redux/types'
import type { ProtocolsOnDeviceSortKey } from '../../../redux/config/types'

const Table = styled('table')`
  ${TYPOGRAPHY.labelRegular}
  border-collapse: collapse;
  table-layout: auto;
  width: 100%;
  border-spacing: 0 ${SPACING.spacing2};
  margin: ${SPACING.spacing4} 0;
  text-align: left;
`
const TableHeader = styled('th')`
  text-transform: ${TYPOGRAPHY.textTransformUppercase};
  color: ${COLORS.darkBlackEnabled};
  font-weight: ${TYPOGRAPHY.fontWeightRegular};
  font-size: ${TYPOGRAPHY.fontSizeCaption};
  padding: ${SPACING.spacing2};
`
const TableRow = styled('tr')`
  border: 1px ${COLORS.medGreyHover} solid;
  height: 4rem;
  padding: ${SPACING.spacing5};
`

const TableDatum = styled('td')`
  padding: ${SPACING.spacing2};
  white-space: break-spaces;
  text-overflow: wrap;
`

export function ProtocolDashboard(): JSX.Element {
  const protocols = useAllProtocolsQuery()
  const runs = useAllRunsQuery()
  const history = useHistory()
  const { t } = useTranslation('protocol_info')
  const dispatch = useDispatch<Dispatch>()
  const sortBy = useSelector(getProtocolsOnDeviceSortKey) ?? 'alphabetical'
  const protocolsData = protocols.data?.data != null ? protocols.data?.data : []
  const runData = runs.data?.data != null ? runs.data?.data : []
  const sortedProtocols = sortProtocols(sortBy, protocolsData, runData)

  const handleProtocolsBySortKey = (
    sortKey: ProtocolsOnDeviceSortKey
  ): void => {
    dispatch(updateConfigValue('protocols.protocolsOnDeviceSortKey', sortKey))
  }

  const handleSortByName = (): void => {
    if (sortBy === 'alphabetical') {
      handleProtocolsBySortKey('reverse')
    } else {
      handleProtocolsBySortKey('alphabetical')
    }
  }

  const handleSortByLastRun = (): void => {
    if (sortBy === 'recentRun') {
      handleProtocolsBySortKey('oldRun')
    } else {
      handleProtocolsBySortKey('recentRun')
    }
  }

  const handleSortByDate = (): void => {
    if (sortBy === 'recentCreated') {
      handleProtocolsBySortKey('oldCreated')
    } else {
      handleProtocolsBySortKey('recentCreated')
    }
  }

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      padding={SPACING.spacing6}
      minHeight="25rem"
    >
      <Navigation routes={onDeviceDisplayRoutes} />
      {sortedProtocols.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <TableHeader>
                <Flex flexDirection="row" alignItems="center">
                  <Btn onClick={handleSortByName}>
                    <StyledText
                      fontSize="1.25rem"
                      lineHeight="1.6875rem"
                      fontWeight={TYPOGRAPHY.fontWeightSemiBold}
                    >
                      {t('protocol_name_title')}
                    </StyledText>
                  </Btn>
                  {sortBy === 'alphabetical' || sortBy === 'reverse' ? (
                    <Icon
                      name={
                        sortBy === 'alphabetical'
                          ? 'chevron-down'
                          : 'chevron-up'
                      }
                      size="1rem"
                    />
                  ) : null}
                </Flex>
              </TableHeader>
              <TableHeader>
                <Flex flexDirection="row" alignItems="center">
                  <Btn onClick={handleSortByLastRun}>
                    <StyledText
                      fontSize="1.25rem"
                      lineHeight="1.6875rem"
                      fontWeight={TYPOGRAPHY.fontWeightSemiBold}
                    >
                      {t('last_run')}
                    </StyledText>
                  </Btn>
                  {sortBy === 'recentRun' || sortBy === 'oldRun' ? (
                    <Icon
                      name={
                        sortBy === 'recentRun' ? 'chevron-down' : 'chevron-up'
                      }
                      size="1rem"
                    />
                  ) : null}
                </Flex>
              </TableHeader>
              <TableHeader>
                <Flex flexDirection="row" alignItems="center">
                  <Btn onClick={handleSortByDate}>
                    <StyledText
                      fontSize="1.25rem"
                      lineHeight="1.6875rem"
                      fontWeight={TYPOGRAPHY.fontWeightSemiBold}
                    >
                      {t('date_added')}
                    </StyledText>
                  </Btn>
                  {sortBy === 'recentCreated' || sortBy === 'oldCreated' ? (
                    <Icon
                      name={
                        sortBy === 'recentCreated'
                          ? 'chevron-down'
                          : 'chevron-up'
                      }
                      size="1rem"
                    />
                  ) : null}
                </Flex>
              </TableHeader>
            </tr>
          </thead>

          <tbody>
            {sortedProtocols.map((protocol, index) => {
              const lastRun = runs.data?.data.find(
                run => run.protocolId === protocol.id
              )?.createdAt

              const protocolName =
                protocol.metadata.protocolName ?? protocol.files[0].name

              return (
                <TableRow
                  key={protocol.key ?? index}
                  onClick={() => history.push(`/protocols/${protocol.id}`)}
                >
                  <TableDatum>
                    <StyledText
                      fontSize="1.5rem"
                      lineHeight="2.0625rem"
                      fontWeight={TYPOGRAPHY.fontWeightSemiBold}
                    >
                      {truncateString(protocolName, 88, 66)}
                    </StyledText>
                  </TableDatum>
                  <TableDatum>
                    <StyledText
                      fontSize="1.375rem"
                      lineHeight="1.75rem"
                      fontWeight={TYPOGRAPHY.fontWeightRegular}
                    >
                      {lastRun != null
                        ? formatDistance(new Date(lastRun), new Date(), {
                            addSuffix: true,
                          })
                        : t('no_history')}
                    </StyledText>
                  </TableDatum>
                  <TableDatum>
                    <StyledText
                      fontSize="1.375rem"
                      lineHeight="1.75rem"
                      fontWeight={TYPOGRAPHY.fontWeightRegular}
                    >
                      {format(new Date(protocol.createdAt), 'Pp')}
                    </StyledText>
                  </TableDatum>
                </TableRow>
              )
            })}
          </tbody>
        </Table>
      ) : (
        <Flex
          flexDirection={DIRECTION_COLUMN}
          justifyContent={JUSTIFY_CENTER}
          alignItems={ALIGN_CENTER}
          height="27.75rem"
          backgroundColor={COLORS.medGreyEnabled}
        >
          <img src={imgSrc} />
          <StyledText
            fontSize="2rem"
            lineHeight="2.75rem"
            fontWeight={TYPOGRAPHY.fontWeightSemiBold}
          >
            {t('nothing_here_yet')}
          </StyledText>
          <StyledText
            fontSize="1.25rem"
            lineHeight="1.6875rem"
            fontWeight={TYPOGRAPHY.fontWeightRegular}
          >
            {t('send_a_protocol_to_store')}
          </StyledText>
        </Flex>
      )}
    </Flex>
  )
}
