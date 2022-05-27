import * as React from 'react'
import { useSelector } from 'react-redux'
import last from 'lodash/last'
import { useTranslation } from 'react-i18next'
import { Box } from '@opentrons/components'
import {
  SUCCESS,
  FAILURE,
  PENDING,
  useDispatchApiRequest,
  getRequestById,
} from '../../redux/robot-api'
import { updatePipetteSettings } from '../../redux/pipettes'
import { useFeatureFlag } from '../../redux/config'
import { ConfigForm } from './ConfigForm'
import { ConfigErrorBanner } from './ConfigErrorBanner'
import { usePipetteSettingsQuery } from '@opentrons/react-api-client/src/pipettes/usePipetteSettingsQuery'
import type { State } from '../../redux/types'
import type {
  AttachedPipette,
  PipetteSettingsFieldsUpdate,
} from '../../redux/pipettes/types'

const PIPETTE_SETTINGS_POLL_MS = 5000
interface Props {
  robotName: string
  closeModal: () => unknown
  pipetteId: AttachedPipette['id']
}

export function ConfigurePipette(props: Props): JSX.Element {
  const { robotName, closeModal, pipetteId } = props
  const { t } = useTranslation('device_details')
  const [dispatchRequest, requestIds] = useDispatchApiRequest()
  const settings = usePipetteSettingsQuery({
    refetchInterval: PIPETTE_SETTINGS_POLL_MS,
  })?.data
  const updateSettings = (fields: PipetteSettingsFieldsUpdate): void => {
    dispatchRequest(updatePipetteSettings(robotName, pipetteId, fields))
  }
  const latestRequestId = last(requestIds)
  const updateRequest = useSelector((state: State) =>
    latestRequestId != null ? getRequestById(state, latestRequestId) : null
  )

  const updateError: string | null =
    updateRequest && updateRequest.status === FAILURE
      ? // @ts-expect-error(sa, 2021-05-27): avoiding src code change, need to type narrow
        updateRequest.error.message || t('an_error_occurred_while_updating')
      : null

  // TODO(mc, 2019-12-09): remove this feature flag
  const __showHiddenFields = useFeatureFlag('allPipetteConfig')

  // when an in-progress request completes, close modal if response was ok
  React.useEffect(() => {
    if (updateRequest?.status === SUCCESS) {
      closeModal()
    }
  }, [updateRequest, closeModal])

  console.log(updateRequest)
  return (
    <Box zIndex={1}>
      {updateError && <ConfigErrorBanner message={updateError} />}
      {settings != null ? (
        <ConfigForm
          //  @ts-expect-error: settings is already being checked to not equal null on line 78
          settings={settings[pipetteId].fields}
          updateInProgress={updateRequest?.status === PENDING}
          updateSettings={updateSettings}
          closeModal={closeModal}
          __showHiddenFields={__showHiddenFields}
        />
      ) : null}
    </Box>
  )
}
