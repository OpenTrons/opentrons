import * as React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { format, formatDistance } from 'date-fns'
import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  SPACING,
  TYPOGRAPHY,
  truncateString,
  useLongPress,
} from '@opentrons/components'

import { StyledText } from '../../../atoms/text'
import { ModalShell } from '../../../molecules/Modal'
import { getPinnedProtocolIds, updateConfigValue } from '../../../redux/config'

import type { Dispatch } from '../../../redux/types'

import {
  useCreateRunMutation,
  // TODO useDeleteProtocolMutation,
} from '@opentrons/react-api-client'
import type { ProtocolResource } from '@opentrons/shared-data'

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

export function ProtocolRow(props: {
  protocol: ProtocolResource
  lastRun?: string
}): JSX.Element {
  const { protocol, lastRun } = props
  const history = useHistory()
  const { t } = useTranslation('protocol_info')
  const dispatch = useDispatch<Dispatch>()
  let pinnedProtocolIds = useSelector(getPinnedProtocolIds) ?? []

  const pinned = pinnedProtocolIds.includes(protocol.id)
  const protocolName = protocol.metadata.protocolName ?? protocol.files[0].name

  const longpress = useLongPress()

  const { createRun } = useCreateRunMutation({
    onSuccess: data => {
      const runId: string = data.data.id
      history.push(`/protocols/${runId}/setup`)
    },
  })

  const handlePinnedProtocolIds = (pinnedProtocolIds: string[]): void => {
    dispatch(
      updateConfigValue('protocols.pinnedProtocolIds', pinnedProtocolIds)
    )
  }

  // TODO const { deleteProtocol } = useDeleteProtocolMutation(protocol.id)

  const handleDeleteClick = (): void => {
    longpress.setIsLongPressed(false)
    // TODO: deleteProtocol()
    console.log(`deleted protocol with id ${protocol.id}`)
    history.go(0)
  }

  const handlePinClick = (): void => {
    longpress.setIsLongPressed(false)
    if (pinned) {
      pinnedProtocolIds = pinnedProtocolIds.filter(p => p !== protocol.id)
    } else {
      pinnedProtocolIds.push(protocol.id)
    }
    handlePinnedProtocolIds(pinnedProtocolIds)
  }

  const handleProtocolClick = (): void => {
    if (!longpress.isLongPressed) {
      history.push(`/protocols/${protocol.id}`)
    }
  }

  const handleRunClick = (): void => {
    longpress.setIsLongPressed(false)
    createRun({ protocolId: protocol.id })
  }

  return (
    <TableRow
      key={protocol.key}
      onClick={() => handleProtocolClick()}
      ref={longpress.ref}
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
        {longpress.isLongPressed && (
          <ModalShell borderRadius="0.75rem" width="15.625rem">
            <Flex
              flexDirection={DIRECTION_COLUMN}
              justifyContent={JUSTIFY_CENTER}
            >
              <Flex
                alignItems={ALIGN_CENTER}
                gridGap={SPACING.spacing3}
                height="4.875rem"
                justifyContent={JUSTIFY_CENTER}
                padding={SPACING.spacing5}
                onClick={() => handleRunClick()}
              >
                <Icon name="play-circle" size="1.5rem" color={COLORS.black} />
                <StyledText
                  fontSize="1.375rem"
                  lineHeight="1.5rem"
                  fontWeight={TYPOGRAPHY.fontWeightRegular}
                  textAlign={TYPOGRAPHY.textAlignCenter}
                >
                  {t('run_protocol')}
                </StyledText>
              </Flex>
              <Flex
                alignItems={ALIGN_CENTER}
                gridGap={SPACING.spacing3}
                height="4.875rem"
                justifyContent={JUSTIFY_CENTER}
                padding={SPACING.spacing5}
                onClick={() => handlePinClick()}
              >
                <Icon name="push-pin" size="1.5rem" color={COLORS.black} />
                <StyledText
                  fontSize="1.375rem"
                  lineHeight="1.5rem"
                  fontWeight={TYPOGRAPHY.fontWeightRegular}
                  textAlign={TYPOGRAPHY.textAlignCenter}
                >
                  {pinned ? t('unpin_protocol') : t('pin_protocol')}
                </StyledText>
              </Flex>
              <Flex
                alignItems={ALIGN_CENTER}
                backgroundColor={COLORS.errorEnabled}
                gridGap={SPACING.spacing3}
                height="4.875rem"
                justifyContent={JUSTIFY_CENTER}
                padding={SPACING.spacing5}
                onClick={handleDeleteClick}
              >
                <Icon name="trash" size="1.5rem" color={COLORS.white} />
                <StyledText
                  color={COLORS.white}
                  fontSize="1.375rem"
                  lineHeight="1.5rem"
                  fontWeight={TYPOGRAPHY.fontWeightRegular}
                  textAlign={TYPOGRAPHY.textAlignCenter}
                >
                  {t('delete_protocol')}
                </StyledText>
              </Flex>
            </Flex>
          </ModalShell>
        )}
      </TableDatum>
    </TableRow>
  )
}
