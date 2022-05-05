import * as React from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { createStore, Store } from 'redux'
import { Provider } from 'react-redux'
import { when, resetAllWhenMocks } from 'jest-when'
import { renderHook } from '@testing-library/react-hooks'
import {
  useCreateCommandMutation,
  useCreateLabwareOffsetMutation,
  useCreateLabwareDefinitionMutation,
  useHost,
} from '@opentrons/react-api-client'
import { useTrackEvent } from '../../../../redux/analytics'
import {
  useCurrentRunId,
  useCurrentRunCommands,
} from '../../../ProtocolUpload/hooks'
import {
  useAttachedModules,
  useProtocolDetailsForRun,
} from '../../../Devices/hooks'
import { getLabwareLocation } from '../../../ProtocolSetup/utils/getLabwareLocation'
import { useSteps } from '../useSteps'
import { useLabwarePositionCheck } from '../useLabwarePositionCheck'

import type { HostConfig } from '@opentrons/api-client'
import type { LabwarePositionCheckStep } from '../../types'

jest.mock('@opentrons/react-api-client')
jest.mock('../../../../redux/analytics')
jest.mock('../../../../redux/modules')
jest.mock('../../../Devices/hooks')
jest.mock('../../../ProtocolUpload/hooks')
jest.mock('../../../ProtocolSetup/utils/getLabwareLocation')
jest.mock('../useSteps')

const queryClient = new QueryClient()
const store: Store<any> = createStore(jest.fn(), {})
const wrapper: React.FunctionComponent<{}> = ({ children }) => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </Provider>
)

const mockUseHost = useHost as jest.MockedFunction<typeof useHost>
const mockUseAttachedModules = useAttachedModules as jest.MockedFunction<
  typeof useAttachedModules
>
const mockUseCurrentRunId = useCurrentRunId as jest.MockedFunction<
  typeof useCurrentRunId
>
const mockUseSteps = useSteps as jest.MockedFunction<typeof useSteps>
const mockUseCreateCommandMutation = useCreateCommandMutation as jest.MockedFunction<
  typeof useCreateCommandMutation
>
const mockUseCreateLabwareDefinitionMutation = useCreateLabwareDefinitionMutation as jest.MockedFunction<
  typeof useCreateLabwareDefinitionMutation
>
const mockUseCreateLabwareOffsetMutation = useCreateLabwareOffsetMutation as jest.MockedFunction<
  typeof useCreateLabwareOffsetMutation
>
const mockUseCurrentRunCommands = useCurrentRunCommands as jest.MockedFunction<
  typeof useCurrentRunCommands
>
const mockGetLabwareLocation = getLabwareLocation as jest.MockedFunction<
  typeof getLabwareLocation
>
const mockUseTrackEvent = useTrackEvent as jest.MockedFunction<
  typeof useTrackEvent
>
const mockUseProtocolDetailsForRun = useProtocolDetailsForRun as jest.MockedFunction<
  typeof useProtocolDetailsForRun
>
let mockTrackEvent: jest.Mock
describe('useLabwarePositionCheck', () => {
  const MOCK_ROBOT_NAME = 'otie'
  const MOCK_RUN_ID = 'MOCK_RUN_ID'
  const HOST_CONFIG: HostConfig = {
    hostname: 'localhost',
    robotName: MOCK_ROBOT_NAME,
  }
  const MOCK_PIPETTE_ID = 'MOCK_PIPETTE_ID'
  const MOCK_LABWARE_ID = 'MOCK_LABWARE_ID'
  const MOCK_COMMAND_ID = 'MOCK_COMMAND_ID'
  const MOCK_SLOT = '1'
  let mockCreateCommand: jest.Mock
  let mockCreateLabwareOffset: jest.Mock
  let mockCreateLabwareDefinition: jest.Mock
  beforeEach(() => {
    when(mockUseHost).calledWith().mockReturnValue(HOST_CONFIG)
    when(mockUseAttachedModules).calledWith(MOCK_ROBOT_NAME).mockReturnValue([])
    when(mockUseCurrentRunId).calledWith().mockReturnValue(MOCK_RUN_ID)
    when(mockUseProtocolDetailsForRun)
      .calledWith(MOCK_RUN_ID)
      .mockReturnValue({ protocolData: null } as any)
    when(mockUseCurrentRunCommands).calledWith().mockReturnValue([])
    when(mockUseSteps)
      .calledWith(MOCK_RUN_ID)
      .mockReturnValue([
        {
          commands: [
            {
              commandType: 'pickUpTip',
              params: {
                pipetteId: MOCK_PIPETTE_ID,
                labwareId: MOCK_LABWARE_ID,
              },
            },
          ],
          labwareId: MOCK_LABWARE_ID,
          section: 'PRIMARY_PIPETTE_TIPRACKS',
        } as LabwarePositionCheckStep,
      ])
    mockCreateCommand = jest.fn(() =>
      Promise.resolve({ data: { id: MOCK_COMMAND_ID } })
    )
    when(mockUseCreateCommandMutation)
      .calledWith()
      .mockReturnValue({ createCommand: mockCreateCommand } as any)
    mockCreateLabwareOffset = jest.fn()
    when(mockUseCreateLabwareOffsetMutation)
      .calledWith()
      .mockReturnValue({ createLabwareOffset: mockCreateLabwareOffset } as any)
    mockCreateLabwareDefinition = jest.fn()
    when(mockUseCreateLabwareDefinitionMutation)
      .calledWith()
      .mockReturnValue({
        createLabwareOffset: mockCreateLabwareDefinition,
      } as any)
    when(mockGetLabwareLocation)
      .calledWith(MOCK_LABWARE_ID, [])
      .mockReturnValue({ slotName: MOCK_SLOT })
    mockTrackEvent = jest.fn()
    when(mockUseTrackEvent).calledWith().mockReturnValue(mockTrackEvent)
  })
  afterEach(() => {
    resetAllWhenMocks()
    jest.restoreAllMocks()
  })
  describe('beginLPC', () => {
    it('should track a mixpanel event', async () => {
      const { result, waitForNextUpdate } = renderHook(
        () => useLabwarePositionCheck(() => null, {}),
        { wrapper }
      )
      if ('error' in result.current) {
        throw new Error('error should not be present')
      }
      const { beginLPC } = result.current
      beginLPC()
      await waitForNextUpdate()
      expect(mockTrackEvent).toHaveBeenCalledWith({
        name: 'LabwarePositionCheckStarted',
        properties: {},
      })
    })
  })
  describe('jog', () => {
    it('should NOT queue up a new jog command when a previous jog command has NOT completed', async () => {
      const { result, waitForNextUpdate } = renderHook(
        () => useLabwarePositionCheck(() => null, {}),
        { wrapper }
      )
      if ('error' in result.current) {
        throw new Error('error should not be present')
      }
      const { beginLPC } = result.current
      beginLPC()
      await waitForNextUpdate()
      const [FIRST_JOG_AXIS, FIRST_JOG_DIRECTION, FIRST_JOG_DISTANCE] = [
        'x' as 'x',
        1 as 1,
        2,
      ]
      if ('error' in result.current) {
        throw new Error('error should not be present')
      }
      result.current.jog(
        FIRST_JOG_AXIS,
        FIRST_JOG_DIRECTION,
        FIRST_JOG_DISTANCE
      )
      expect(mockCreateCommand).toHaveBeenCalledWith({
        runId: MOCK_RUN_ID,
        command: {
          commandType: 'moveRelative',
          params: {
            pipetteId: 'MOCK_PIPETTE_ID',
            distance: FIRST_JOG_DIRECTION * FIRST_JOG_DISTANCE,
            axis: FIRST_JOG_AXIS,
          },
        },
        waitUntilComplete: true,
        timeout: 10000,
      })
    })
  })
  describe('proceed', () => {
    it('should home the robot after issuing the last LPC command', async () => {
      when(mockUseSteps)
        .calledWith(MOCK_RUN_ID)
        .mockReturnValue([
          {
            commands: [
              {
                commandType: 'pickUpTip',
                params: {
                  pipetteId: MOCK_PIPETTE_ID,
                  labwareId: MOCK_LABWARE_ID,
                },
              },
            ],
            labwareId: MOCK_LABWARE_ID,
            section: 'PRIMARY_PIPETTE_TIPRACKS',
          } as LabwarePositionCheckStep,
          {
            commands: [
              {
                commandType: 'dropTip',
                params: {
                  pipetteId: MOCK_PIPETTE_ID,
                  labwareId: MOCK_LABWARE_ID,
                },
              },
            ],
            labwareId: MOCK_LABWARE_ID,
            section: 'RETURN_TIP',
          } as LabwarePositionCheckStep,
        ])
      const { result, waitForNextUpdate } = renderHook(
        () => useLabwarePositionCheck(() => null, {}),
        { wrapper }
      )
      if ('error' in result.current) {
        throw new Error('error should not be present')
      }
      const { beginLPC } = result.current
      beginLPC()
      await waitForNextUpdate()
      mockCreateCommand.mockClear() // clear calls to mockCreateCommand because beginLPC issues a home command
      const { proceed } = result.current
      proceed()
      await waitForNextUpdate()
      expect(mockCreateCommand).toHaveBeenCalledWith({
        runId: MOCK_RUN_ID,
        command: {
          commandType: 'home',
          params: {},
        },
      })
    })
    it('should execute the next command', async () => {
      when(mockUseSteps)
        .calledWith(MOCK_RUN_ID)
        .mockReturnValue([
          {
            commands: [
              {
                commandType: 'pickUpTip',
                params: {
                  pipetteId: MOCK_PIPETTE_ID,
                  labwareId: MOCK_LABWARE_ID,
                },
              },
              {
                commandType: 'dropTip',
                params: {
                  pipetteId: MOCK_PIPETTE_ID,
                  labwareId: MOCK_LABWARE_ID,
                },
              },
            ],
            labwareId: MOCK_LABWARE_ID,
            section: 'PRIMARY_PIPETTE_TIPRACKS',
          } as LabwarePositionCheckStep,
        ])

      const { result, waitForNextUpdate } = renderHook(
        () => useLabwarePositionCheck(() => null, {}),
        { wrapper }
      )
      if ('error' in result.current) {
        throw new Error('error should not be present')
      }
      const { beginLPC } = result.current
      beginLPC() // beginLPC calls the first command
      await waitForNextUpdate()
      const { proceed } = result.current
      proceed()
      await waitForNextUpdate()
      // this is from the begin LPC call
      expect(mockCreateCommand).toHaveBeenCalledWith({
        runId: MOCK_RUN_ID,
        command: {
          commandType: 'pickUpTip',
          params: {
            pipetteId: MOCK_PIPETTE_ID,
            labwareId: MOCK_LABWARE_ID,
          },
        },
      })
      // drop tip call should get logged
      expect(mockCreateCommand).toHaveBeenCalledWith({
        runId: MOCK_RUN_ID,
        command: {
          commandType: 'dropTip',
          params: expect.objectContaining({
            pipetteId: MOCK_PIPETTE_ID,
            labwareId: MOCK_LABWARE_ID,
          }),
        },
      })
    })
  })
})
