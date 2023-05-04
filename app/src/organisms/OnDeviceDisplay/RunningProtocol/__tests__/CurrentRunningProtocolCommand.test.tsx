import * as React from 'react'
import { fireEvent } from '@testing-library/react'

import { renderWithProviders } from '@opentrons/components'
import { RUN_STATUS_RUNNING, RUN_STATUS_IDLE } from '@opentrons/api-client'

import { i18n } from '../../../../i18n'
import { mockRobotSideAnalysis } from '../../../CommandText/__fixtures__'
import { CurrentRunningProtocolCommand } from '../CurrentRunningProtocolCommand'

const mockPlayRun = jest.fn()
const mockPauseRun = jest.fn()
const mockShowModal = jest.fn()

const mockRunTimer = {
  runStatus: RUN_STATUS_RUNNING,
  startedAt: '2022-05-04T18:24:40.833862+00:00',
  stoppedAt: '',
  completedAt: '2022-05-04T18:24:41.833862+00:00',
}

const render = (
  props: React.ComponentProps<typeof CurrentRunningProtocolCommand>
) => {
  return renderWithProviders(<CurrentRunningProtocolCommand {...props} />, {
    i18nInstance: i18n,
  })
}

describe('CurrentRunningProtocolCommand', () => {
  let props: React.ComponentProps<typeof CurrentRunningProtocolCommand>

  beforeEach(() => {
    props = {
      runStatus: RUN_STATUS_RUNNING,
      robotSideAnalysis: mockRobotSideAnalysis,
      runTimerInfo: mockRunTimer,
      playRun: mockPlayRun,
      pauseRun: mockPauseRun,
      setShowConfirmCancelRunModal: mockShowModal,
      trackProtocolRunEvent: jest.fn(), // temporary
      protocolName: 'mockRunningProtocolName',
      currentRunCommandIndex: 0,
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render text and buttons', () => {
    const [{ getByText, getByLabelText }] = render(props)
    getByText('Running')
    getByText('mockRunningProtocolName')
    getByText('00:00:01')
    getByText('Load P300 Single-Channel GEN1 in Left Mount')
    getByLabelText('stop')
    getByLabelText('pause')
  })

  it('should render play button when runStatus is idle', () => {
    props = {
      ...props,
      runStatus: RUN_STATUS_IDLE,
    }
    const [{ getByLabelText }] = render(props)
    getByLabelText('play')
  })

  it('when tapping stop button, the modal is showing up', () => {
    const [{ getByLabelText }] = render(props)
    const button = getByLabelText('stop')
    fireEvent.click(button)
    expect(mockShowModal).toHaveBeenCalled()
  })

  // ToDo (kj:04/10/2023) once we fix the track event stuff, we can implement tests
  it.todo('when tapping play button, track event mock function is called')
})
