import * as React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useQueryClient } from 'react-query'
import { useHistory } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'
import { deleteProtocol, deleteRun, getProtocol } from '@opentrons/api-client'
import { useCreateRunMutation, useHost } from '@opentrons/react-api-client'

import { MAXIMUM_PINNED_PROTOCOLS } from '../../../App/constants'
import { StyledText } from '../../../atoms/text'
import { ModalShell } from '../../../molecules/Modal'
import { SmallModalChildren } from '../../../molecules/Modal/OnDeviceDisplay'
import { useToaster } from '../../../organisms/ToasterOven'
import { getPinnedProtocolIds, updateConfigValue } from '../../../redux/config'

import type { Dispatch } from '../../../redux/types'
import type { UseLongPressResult } from '@opentrons/components'

export function LongPressModal(props: {
  longpress: UseLongPressResult
  protocolId: string
}): JSX.Element {
  const { longpress, protocolId } = props
  const history = useHistory()
  const host = useHost()
  const queryClient = useQueryClient()
  let pinnedProtocolIds = useSelector(getPinnedProtocolIds) ?? []
  const { t } = useTranslation(['protocol_info', 'shared'])
  const dispatch = useDispatch<Dispatch>()
  const { makeSnackbar } = useToaster()

  const pinned = pinnedProtocolIds.includes(protocolId)

  const [showMaxPinsAlert, setShowMaxPinsAlert] = React.useState<boolean>(false)

  // This looks totally bonkers, and it is. This construction is to make
  // it easier to use in unit tests, where we have to mock both the mutation
  // and the createRun function. The real code didn't like the mock:
  //
  // TypeError: Cannot read properties of undefined (reading 'createRun')
  //
  // Having the empty function fallback lets the mocks get called. In real use it
  // shouldn't ever get needed.
  const createRunUse = useCreateRunMutation({
    onSuccess: data => {
      const runId: string = data.data.id
      history.push(`/protocols/${runId}/setup`)
    },
  })
  const createRun =
    createRunUse?.createRun !== undefined ? createRunUse.createRun : () => {}

  const handleCloseModal = (): void => {
    longpress.setIsLongPressed(false)
  }

  const handleDeleteClick = (): void => {
    if (host != null) {
      getProtocol(host, protocolId)
        .then(
          response =>
            response.data.links?.referencingRunIds.map(({ id }) => id) ?? []
        )
        .then(referencingRunIds => {
          return Promise.all(
            referencingRunIds?.map(runId => deleteRun(host, runId))
          )
        })
        .then(() => deleteProtocol(host, protocolId))
        .then(() =>
          queryClient
            .invalidateQueries([host, 'protocols'])
            .catch((e: Error) =>
              console.error(`error invalidating runs query: ${e.message}`)
            )
        )
        .then(() => longpress.setIsLongPressed(false))
        .catch((e: Error) => {
          console.error(`error deleting resources: ${e.message}`)
          longpress.setIsLongPressed(false)
        })
    } else {
      console.error(
        'could not delete resources because the robot host is unknown'
      )
      longpress.setIsLongPressed(false)
    }
  }

  const handlePinClick = (): void => {
    if (!pinned) {
      if (pinnedProtocolIds.length === MAXIMUM_PINNED_PROTOCOLS) {
        setShowMaxPinsAlert(true)
      } else {
        pinnedProtocolIds.push(protocolId)
        handlePinnedProtocolIds(pinnedProtocolIds)
        makeSnackbar(t('pinned_protocol'))
      }
    } else {
      pinnedProtocolIds = pinnedProtocolIds.filter(p => p !== protocolId)
      handlePinnedProtocolIds(pinnedProtocolIds)
      makeSnackbar(t('unpinned_protocol'))
    }
  }

  const handleRunClick = (): void => {
    longpress.setIsLongPressed(false)
    createRun({ protocolId: protocolId })
  }

  const handlePinnedProtocolIds = (pinnedProtocolIds: string[]): void => {
    dispatch(
      updateConfigValue('protocols.pinnedProtocolIds', pinnedProtocolIds)
    )

    longpress.setIsLongPressed(false)
  }

  return (
    <>
      {showMaxPinsAlert ? (
        <SmallModalChildren
          header={t('too_many_pins_header')}
          subText={t('too_many_pins_body')}
          buttonText={t('shared:close')}
          handleCloseMaxPinsAlert={() => longpress?.setIsLongPressed(false)}
        />
      ) : (
        <ModalShell
          borderRadius={BORDERS.size_three}
          onOutsideClick={handleCloseModal}
          width="15.625rem"
        >
          <Flex
            flexDirection={DIRECTION_COLUMN}
            justifyContent={JUSTIFY_CENTER}
          >
            <Flex
              alignItems={ALIGN_CENTER}
              gridGap={SPACING.spacingSM}
              height="4.875rem"
              padding={SPACING.spacing5}
              onClick={handleRunClick}
              as="button"
            >
              <Icon name="play-circle" size="1.75rem" color={COLORS.black} />
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
              gridGap={SPACING.spacingSM}
              height="4.875rem"
              padding={SPACING.spacing5}
              onClick={handlePinClick}
              as="button"
            >
              <Icon name="pin" size="1.875rem" color={COLORS.black} />
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
              gridGap={SPACING.spacingSM}
              height="4.875rem"
              padding={SPACING.spacing5}
              onClick={handleDeleteClick}
              as="button"
            >
              <Icon name="trash" size="1.875rem" color={COLORS.white} />
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
    </>
  )
}
