import * as React from 'react'
import { act, fireEvent, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { UseQueryResult } from 'react-query'
import { useProtocolAnalysisAsDocumentQuery } from '@opentrons/react-api-client'

import { renderWithProviders } from '@opentrons/components'
import { i18n } from '../../../i18n'
import { ProtocolCard } from '../ProtocolCard'

import type {
  CompletedProtocolAnalysis,
  ProtocolResource,
} from '@opentrons/shared-data'

const mockPush = jest.fn()

jest.mock('react-router-dom', () => {
  const reactRouterDom = jest.requireActual('react-router-dom')
  return {
    ...reactRouterDom,
    useHistory: () => ({ push: mockPush } as any),
  }
})
jest.mock('@opentrons/react-api-client')

const mockUseProtocolAnalysisAsDocumentQuery = useProtocolAnalysisAsDocumentQuery as jest.MockedFunction<
  typeof useProtocolAnalysisAsDocumentQuery
>

const mockProtocol: ProtocolResource = {
  id: 'mockProtocol1',
  createdAt: '2022-05-03T21:36:12.494778+00:00',
  protocolType: 'json',
  robotType: 'OT-3 Standard',
  metadata: {
    protocolName: 'yay mock protocol',
    author: 'engineering',
    description: 'A short mock protocol',
    created: 1606853851893,
    tags: ['unitTest'],
  },
  analysisSummaries: [],
  files: [],
  key: '26ed5a82-502f-4074-8981-57cdda1d066d',
}

const props = {
  protocol: mockProtocol,
  longPress: jest.fn(),
  setTargetProtocol: jest.fn(),
  setShowDeleteConfirmationModal: jest.fn(),
  setTargetProtocolId: jest.fn(),
}

const render = () => {
  return renderWithProviders(
    <MemoryRouter>
      <ProtocolCard {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

describe('ProtocolCard', () => {
  jest.useFakeTimers()

  beforeEach(() => {
    mockUseProtocolAnalysisAsDocumentQuery.mockReturnValue({
      data: { result: 'ok' } as any,
    } as UseQueryResult<CompletedProtocolAnalysis>)
  })
  it('should redirect to protocol details after short click', () => {
    render()
    const name = screen.getByText('yay mock protocol')
    fireEvent.click(name)
    expect(mockPush).toHaveBeenCalledWith('/protocols/mockProtocol1')
  })

  it('should display the analysis failed error modal when clicking on the protocol', () => {
    mockUseProtocolAnalysisAsDocumentQuery.mockReturnValue({
      data: { result: 'error' } as any,
    } as UseQueryResult<CompletedProtocolAnalysis>)
    render()
    screen.getByLabelText('failedAnalysis_icon')
    screen.getByText('Failed analysis')
    fireEvent.click(screen.getByText('yay mock protocol'))
    screen.getByText('Protocol analysis failed')
    screen.getByText(
      'Delete the protocol, make changes to address the error, and resend the protocol to this robot from the Opentrons App.'
    )
    screen.getByText('Delete protocol')
    fireEvent.click(screen.getByLabelText('closeIcon'))
    expect(
      screen.queryByText('Protocol analysis failed')
    ).not.toBeInTheDocument()
  })

  it('should display modal after long click', async () => {
    jest.useFakeTimers()
    render()
    const name = screen.getByText('yay mock protocol')
    fireEvent.mouseDown(name)
    act(() => {
      jest.advanceTimersByTime(1005)
    })
    expect(props.longPress).toHaveBeenCalled()
    screen.getByText('Run protocol')
    screen.getByText('Pin protocol')
    screen.getByText('Delete protocol')
  })

  it('should display the analysis failed error modal when clicking on the protocol when doing a long pressing', async () => {
    jest.useFakeTimers()
    mockUseProtocolAnalysisAsDocumentQuery.mockReturnValue({
      data: { result: 'error' } as any,
    } as UseQueryResult<CompletedProtocolAnalysis>)
    render()
    const name = screen.getByText('yay mock protocol')
    fireEvent.mouseDown(name)
    act(() => {
      jest.advanceTimersByTime(1005)
    })
    expect(props.longPress).toHaveBeenCalled()
    screen.getByLabelText('failedAnalysis_icon')
    screen.getByText('Failed analysis')
    fireEvent.click(screen.getByText('yay mock protocol'))
    screen.getByText('Protocol analysis failed')
    screen.getByText(
      'Delete the protocol, make changes to address the error, and resend the protocol to this robot from the Opentrons App.'
    )
    screen.getByText('Delete protocol')
  })

  it('should display a loading spinner when analysis is pending', async () => {
    mockUseProtocolAnalysisAsDocumentQuery.mockReturnValue({
      data: null as any,
    } as UseQueryResult<CompletedProtocolAnalysis>)
    render()
    const name = screen.getByText('yay mock protocol')
    fireEvent.mouseDown(name)
    act(() => {
      jest.advanceTimersByTime(1005)
    })
    expect(props.longPress).toHaveBeenCalled()
    screen.getByLabelText('Protocol is loading')
    screen.getByText('yay mock protocol').click()
  })
})
