import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import last from 'lodash/last'
import { useNavigate } from 'react-router-dom'

import {
  AlertPrimaryButton,
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_FLEX_END,
  Link,
  PrimaryButton,
  SPACING,
  Modal,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import {
  useDispatchApiRequest,
  getRequestById,
  SUCCESS,
  PENDING,
} from '/app/redux/robot-api'
import { getResetConfigOptions, resetConfig } from '/app/redux/robot-admin'
import { useIsFlex } from '/app/redux-resources/robots'

import type { State } from '/app/redux/types'
import type { ResetConfigRequest } from '/app/redux/robot-admin/types'

interface DeviceResetModalProps {
  closeModal: () => void
  isRobotReachable: boolean
  robotName: string
  resetOptions?: ResetConfigRequest
}

export function DeviceResetModal({
  closeModal,
  isRobotReachable,
  robotName,
  resetOptions,
}: DeviceResetModalProps): JSX.Element {
  const { t } = useTranslation(['device_settings', 'shared', 'branded'])
  const navigate = useNavigate()
  const [dispatchRequest, requestIds] = useDispatchApiRequest()
  const isFlex = useIsFlex(robotName)
  const resetRequestStatus = useSelector((state: State) => {
    const lastId = last(requestIds)
    return lastId != null ? getRequestById(state, lastId) : null
  })?.status

  const serverResetOptions = useSelector((state: State) =>
    getResetConfigOptions(state, robotName)
  )

  const triggerReset = (): void => {
    if (resetOptions != null) {
      if (isFlex) {
        const totalOptionsSelected = Object.values(
          resetOptions.settingsResets
        ).filter(selected => selected === true).length

        const isEveryOptionSelected =
          totalOptionsSelected > 0 &&
          totalOptionsSelected ===
            // filtering out ODD setting because this gets implicitly cleared if all settings are selected
            serverResetOptions.filter(o => o.id !== 'onDeviceDisplay').length

        if (isEveryOptionSelected) {
          resetOptions = {
            ...resetOptions,
            settingsResets: {
              ...resetOptions.settingsResets,
              onDeviceDisplay: true,
            },
          }
        }
      }
      dispatchRequest(resetConfig(robotName, resetOptions))
      navigate('/devices/')
    }
  }

  useEffect(() => {
    if (resetRequestStatus === SUCCESS) closeModal()
  }, [resetRequestStatus, closeModal])

  const PENDING_STATUS = resetRequestStatus === PENDING

  return (
    <>
      {isRobotReachable ? (
        <Modal
          type="warning"
          title={t('reset_to_factory_settings')}
          onClose={closeModal}
        >
          <Flex flexDirection={DIRECTION_COLUMN}>
            <LegacyStyledText as="p" paddingBottom={SPACING.spacing24}>
              {t('factory_reset_modal_description')}
            </LegacyStyledText>
            <Flex justifyContent={JUSTIFY_FLEX_END} alignItems={ALIGN_CENTER}>
              <Link
                role="button"
                onClick={closeModal}
                textTransform={TYPOGRAPHY.textTransformCapitalize}
                marginRight={SPACING.spacing24}
                css={TYPOGRAPHY.linkPSemiBold}
                fontWeight={TYPOGRAPHY.fontWeightSemiBold}
              >
                {t('shared:cancel')}
              </Link>
              <AlertPrimaryButton
                onClick={triggerReset}
                disabled={PENDING_STATUS}
              >
                {t('yes_clear_data_and_restart_robot')}
              </AlertPrimaryButton>
            </Flex>
          </Flex>
        </Modal>
      ) : (
        <Modal
          type="warning"
          title={t('connection_to_robot_lost')}
          onClose={closeModal}
        >
          <LegacyStyledText
            as="p"
            marginBottom={SPACING.spacing24}
            paddingBottom={SPACING.spacing24}
          >
            {t('branded:connection_lost_description')}
          </LegacyStyledText>
          <Flex justifyContent={JUSTIFY_FLEX_END}>
            <PrimaryButton
              onClick={closeModal}
              textTransform={TYPOGRAPHY.textTransformCapitalize}
            >
              {t('shared:close')}
            </PrimaryButton>
          </Flex>
        </Modal>
      )}
    </>
  )
}
