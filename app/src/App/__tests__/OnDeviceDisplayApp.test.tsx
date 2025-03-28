import { screen } from '@testing-library/react'
import { vi, describe, beforeEach, afterEach, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { LocalizationProvider } from '../../LocalizationProvider'
import { ChooseLanguage } from '/app/pages/ODD/ChooseLanguage'
import { ConnectViaEthernet } from '/app/pages/ODD/ConnectViaEthernet'
import { ConnectViaUSB } from '/app/pages/ODD/ConnectViaUSB'
import { ConnectViaWifi } from '/app/pages/ODD/ConnectViaWifi'
import { NetworkSetupMenu } from '/app/pages/ODD/NetworkSetupMenu'
import { InstrumentsDashboard } from '/app/pages/ODD/InstrumentsDashboard'
import { RobotDashboard } from '/app/pages/ODD/RobotDashboard'
import { RobotSettingsDashboard } from '/app/pages/ODD/RobotSettingsDashboard'
import { ProtocolDashboard } from '/app/pages/ODD/ProtocolDashboard'
import { ProtocolSetup } from '/app/pages/ODD/ProtocolSetup'
import { ProtocolDetails } from '/app/pages/ODD/ProtocolDetails'
import { OnDeviceDisplayApp } from '../OnDeviceDisplayApp'
import { RunningProtocol } from '/app/pages/ODD/RunningProtocol'
import { RunSummary } from '/app/pages/ODD/RunSummary'
import { Welcome } from '/app/pages/ODD/Welcome'
import { NameRobot } from '/app/pages/ODD/NameRobot'
import { EmergencyStop } from '/app/pages/ODD/EmergencyStop'
import { DeckConfigurationEditor } from '/app/pages/ODD/DeckConfiguration'
import { getOnDeviceDisplaySettings } from '/app/redux/config'
import { getIsShellReady } from '/app/redux/shell'
import { getLocalRobot } from '/app/redux/discovery'
import { mockConnectedRobot } from '/app/redux/discovery/__fixtures__'
import { useProtocolReceiptToast, useScrollRef } from '../hooks'
import { useNotifyCurrentMaintenanceRun } from '/app/resources/maintenance_runs'
import { ODDTopLevelRedirects } from '../ODDTopLevelRedirects'

import type { UseQueryResult } from 'react-query'
import type { RobotSettingsResponse } from '@opentrons/api-client'
import type { LocalizationProviderProps } from '../../LocalizationProvider'
import type { OnDeviceDisplaySettings } from '/app/redux/config/schema-types'

vi.mock('@opentrons/react-api-client', async () => {
  const actual = await vi.importActual('@opentrons/react-api-client')
  return {
    ...actual,
    useRobotSettingsQuery: () =>
      (({
        data: { settings: [] },
      } as unknown) as UseQueryResult<RobotSettingsResponse>),
  }
})
vi.mock('../../LocalizationProvider')
vi.mock('/app/pages/ODD/Welcome')
vi.mock('/app/pages/ODD/NetworkSetupMenu')
vi.mock('/app/pages/ODD/ChooseLanguage')
vi.mock('/app/pages/ODD/ConnectViaEthernet')
vi.mock('/app/pages/ODD/ConnectViaUSB')
vi.mock('/app/pages/ODD/ConnectViaWifi')
vi.mock('/app/pages/ODD/RobotDashboard')
vi.mock('/app/pages/ODD/RobotSettingsDashboard')
vi.mock('/app/pages/ODD/ProtocolDashboard')
vi.mock('/app/pages/ODD/ProtocolSetup')
vi.mock('/app/pages/ODD/ProtocolDetails')
vi.mock('/app/pages/ODD/InstrumentsDashboard')
vi.mock('/app/pages/ODD/RunningProtocol')
vi.mock('/app/pages/ODD/RunSummary')
vi.mock('/app/pages/ODD/NameRobot')
vi.mock('/app/pages/ODD/EmergencyStop')
vi.mock('/app/pages/ODD/DeckConfiguration')
vi.mock('/app/redux/config')
vi.mock('/app/redux/shell')
vi.mock('/app/redux/discovery')
vi.mock('/app/resources/maintenance_runs')
vi.mock('../hooks')
vi.mock('../ODDTopLevelRedirects')

const mockSettings = {
  sleepMs: 60 * 1000 * 60 * 24 * 7,
  brightness: 4,
  textSize: 1,
  unfinishedUnboxingFlowRoute: '/welcome',
} as OnDeviceDisplaySettings

const render = (path = '/') => {
  return renderWithProviders(
    <MemoryRouter initialEntries={[path]} initialIndex={0}>
      <OnDeviceDisplayApp />
    </MemoryRouter>,
    { i18nInstance: i18n }
  )
}

describe('OnDeviceDisplayApp', () => {
  beforeEach(() => {
    vi.mocked(getOnDeviceDisplaySettings).mockReturnValue(mockSettings as any)
    vi.mocked(getIsShellReady).mockReturnValue(true)
    vi.mocked(ODDTopLevelRedirects).mockReturnValue(null)
    vi.mocked(getLocalRobot).mockReturnValue(mockConnectedRobot)
    vi.mocked(useScrollRef).mockReturnValue({
      isScrolling: false,
      refCallback: () => null,
      element: null,
    })
    vi.mocked(useNotifyCurrentMaintenanceRun).mockReturnValue({
      data: {
        data: {
          id: 'test',
        },
      },
    } as any)
    // TODO(bh, 2024-03-27): implement testing of branded and anonymous i18n, but for now pass through
    vi.mocked(
      LocalizationProvider
    ).mockImplementation((props: LocalizationProviderProps) => (
      <>{props.children}</>
    ))
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders ChooseLanguage component from /choose-language', () => {
    render('/choose-language')
    expect(vi.mocked(ChooseLanguage)).toHaveBeenCalled()
  })
  it('renders Welcome component from /welcome', () => {
    render('/welcome')
    expect(vi.mocked(Welcome)).toHaveBeenCalled()
  })
  it('renders NetworkSetupMenu component from /network-setup', () => {
    render('/network-setup')
    expect(vi.mocked(NetworkSetupMenu)).toHaveBeenCalled()
  })
  it('renders ConnectViaEthernet component from /network-setup/ethernet', () => {
    render('/network-setup/ethernet')
    expect(vi.mocked(ConnectViaEthernet)).toHaveBeenCalled()
  })
  it('renders ConnectViaUSB component from /network-setup/usb', () => {
    render('/network-setup/usb')
    expect(vi.mocked(ConnectViaUSB)).toHaveBeenCalled()
  })
  it('renders ConnectViaWifi component from /network-setup/wifi', () => {
    render('/network-setup/wifi')
    expect(vi.mocked(ConnectViaWifi)).toHaveBeenCalled()
  })
  it('renders RobotDashboard component from /dashboard', () => {
    render('/dashboard')
    expect(vi.mocked(RobotDashboard)).toHaveBeenCalled()
  })
  it('renders ProtocolDashboard component from /protocols', () => {
    render('/protocols')
    expect(vi.mocked(ProtocolDashboard)).toHaveBeenCalled()
  })
  it('renders ProtocolDetails component from /protocols/:protocolId/setup', () => {
    render('/protocols/my-protocol-id')
    expect(vi.mocked(ProtocolDetails)).toHaveBeenCalled()
  })
  it('renders RobotSettingsDashboard component from /robot-settings', () => {
    render('/robot-settings')
    expect(vi.mocked(RobotSettingsDashboard)).toHaveBeenCalled()
  })
  it('renders InstrumentsDashboard component from /instruments', () => {
    render('/instruments')
    expect(vi.mocked(InstrumentsDashboard)).toHaveBeenCalled()
  })
  it('when current run route present renders ProtocolSetup component from /runs/:runId/setup', () => {
    render('/runs/my-run-id/setup')
    expect(vi.mocked(ProtocolSetup)).toHaveBeenCalled()
  })
  it('when current run route present renders RunningProtocol component from /runs/:runId/run', () => {
    render('/runs/my-run-id/run')
    expect(vi.mocked(RunningProtocol)).toHaveBeenCalled()
  })
  it('when current run route present renders a RunSummary component from /runs/:runId/summary', () => {
    render('/runs/my-run-id/summary')
    expect(vi.mocked(RunSummary)).toHaveBeenCalled()
  })
  it('renders the localization provider and not the loading screen when app-shell is ready', () => {
    render('/')
    expect(vi.mocked(LocalizationProvider)).toHaveBeenCalled()
    expect(screen.queryByLabelText('loading indicator')).toBeNull()
  })
  it('renders the loading screen when app-shell is not ready', () => {
    vi.mocked(getIsShellReady).mockReturnValue(false)
    render('/')
    screen.getByLabelText('loading indicator')
    expect(vi.mocked(LocalizationProvider)).not.toHaveBeenCalled()
  })
  it('renders EmergencyStop component from /emergency-stop', () => {
    render('/emergency-stop')
    expect(vi.mocked(EmergencyStop)).toHaveBeenCalled()
  })
  it('renders DeckConfiguration component from /deck-configuration', () => {
    render('/deck-configuration')
    expect(vi.mocked(DeckConfigurationEditor)).toHaveBeenCalled()
  })
  it('renders DeckConfiguration component from /deck-configuration', () => {
    render('/robot-settings/rename-robot')
    expect(vi.mocked(NameRobot)).toHaveBeenCalled()
  })
  it('renders protocol receipt toasts', () => {
    render('/')
    expect(vi.mocked(useProtocolReceiptToast)).toHaveBeenCalled()
  })
  it('renders TopLevelRedirects when it should conditionally render', () => {
    vi.mocked(ODDTopLevelRedirects).mockReturnValue(<div>MOCK_REDIRECTS</div>)
    render('/')
    screen.getByText('MOCK_REDIRECTS')
  })
})
