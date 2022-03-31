import * as React from 'react'
import { renderWithProviders } from '@opentrons/components'
import { fireEvent } from '@testing-library/react'
import { i18n } from '../../../../i18n'
import {
  mockMagneticModule,
  mockTemperatureModuleGen2,
  mockThermocycler,
  mockHeaterShaker,
} from '../../../../redux/modules/__fixtures__'
import { ModuleOverflowMenu } from '../ModuleOverflowMenu'

const render = (props: React.ComponentProps<typeof ModuleOverflowMenu>) => {
  return renderWithProviders(<ModuleOverflowMenu {...props} />, {
    i18nInstance: i18n,
  })[0]
}

const mockMovingHeaterShaker = {
  model: 'heaterShakerModuleV1',
  type: 'heaterShakerModuleType',
  port: '/dev/ot_module_thermocycler0',
  serial: 'jkl123',
  revision: 'heatershaker_v4.0',
  fwVersion: 'v2.0.0',
  status: 'idle',
  hasAvailableUpdate: true,
  data: {
    labwareLatchStatus: 'idle_closed',
    speedStatus: 'speeding up',
    temperatureStatus: 'idle',
    currentSpeed: null,
    currentTemp: null,
    targetSpeed: null,
    targetTemp: null,
    errorDetails: null,
  },
  usbPort: { hub: 1, port: 1 },
} as any

const mockOpenLatchHeaterShaker = {
  model: 'heaterShakerModuleV1',
  type: 'heaterShakerModuleType',
  port: '/dev/ot_module_thermocycler0',
  serial: 'jkl123',
  revision: 'heatershaker_v4.0',
  fwVersion: 'v2.0.0',
  status: 'idle',
  hasAvailableUpdate: true,
  data: {
    labwareLatchStatus: 'idle_open',
    speedStatus: 'idle',
    temperatureStatus: 'idle',
    currentSpeed: null,
    currentTemp: null,
    targetSpeed: null,
    targetTemp: null,
    errorDetails: null,
  },
  usbPort: { hub: 1, port: 1 },
} as any

const mockCloseLatchHeaterShaker = {
  model: 'heaterShakerModuleV1',
  type: 'heaterShakerModuleType',
  port: '/dev/ot_module_thermocycler0',
  serial: 'jkl123',
  revision: 'heatershaker_v4.0',
  fwVersion: 'v2.0.0',
  status: 'idle',
  hasAvailableUpdate: true,
  data: {
    labwareLatchStatus: 'idle_closed',
    speedStatus: 'idle',
    temperatureStatus: 'idle',
    currentSpeed: null,
    currentTemp: null,
    targetSpeed: null,
    targetTemp: null,
    errorDetails: null,
  },
  usbPort: { hub: 1, port: 1 },
} as any

const mockDeactivateHeatHeaterShaker = {
  id: 'heaterShaker_id',
  model: 'heaterShakerModuleV1',
  type: 'heaterShakerModuleType',
  port: '/dev/ot_module_thermocycler0',
  serial: 'jkl123',
  revision: 'heatershaker_v4.0',
  fwVersion: 'v2.0.0',
  status: 'heating',
  hasAvailableUpdate: true,
  data: {
    labwareLatchStatus: 'idle_open',
    speedStatus: 'idle',
    temperatureStatus: 'idle',
    currentSpeed: null,
    currentTemp: null,
    targetSpeed: null,
    targetTemp: null,
    errorDetails: null,
  },
  usbPort: { hub: 1, port: 1 },
} as any

const mockTemperatureModuleHeating = {
  id: 'tempdeck_id',
  model: 'temperatureModuleV2',
  type: 'temperatureModuleType',
  port: '/dev/ot_module_tempdeck0',
  serial: 'abc123',
  revision: 'temp_deck_v20.0',
  fwVersion: 'v2.0.0',
  status: 'heating',
  hasAvailableUpdate: true,
  data: {
    currentTemp: 25,
    targetTemp: null,
  },
  usbPort: { hub: 1, port: 1 },
} as any

const mockMagDeckEngaged = {
  id: 'magdeck_id',
  model: 'magneticModuleV1',
  type: 'magneticModuleType',
  port: '/dev/ot_module_magdeck0',
  serial: 'def456',
  revision: 'mag_deck_v4.0',
  fwVersion: 'v2.0.0',
  status: 'engaged',
  hasAvailableUpdate: true,
  data: {
    engaged: false,
    height: 42,
  },
  usbPort: { hub: 1, port: 1 },
} as any

const mockTCBlockHeating = {
  id: 'thermocycler_id',
  model: 'thermocyclerModuleV1',
  type: 'thermocyclerModuleType',
  port: '/dev/ot_module_thermocycler0',
  serial: 'ghi789',
  revision: 'thermocycler_v4.0',
  fwVersion: 'v2.0.0',
  status: 'heating',
  hasAvailableUpdate: true,
  data: {
    lid: 'open',
    lidTarget: null,
    lidTemp: null,
    currentTemp: null,
    targetTemp: null,
    holdTime: null,
    rampRate: null,
    currentCycleIndex: null,
    totalCycleCount: null,
    currentStepIndex: null,
    totalStepCount: null,
  },
  usbPort: { hub: 1, port: 1 },
} as any

describe('ModuleOverflowMenu', () => {
  let props: React.ComponentProps<typeof ModuleOverflowMenu>
  beforeEach(() => {
    props = {
      module: mockMagneticModule,
      handleSlideoutClick: jest.fn(),
      handleAboutClick: jest.fn(),
      handleTestShakeClick: jest.fn(),
      handleWizardClick: jest.fn(),
    }
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('renders the correct magnetic module menu', () => {
    const { getByText } = render(props)
    getByText('Set engage height')
    getByText('About module')
  })

  it('renders the correct temperature module menu', () => {
    props = {
      module: mockTemperatureModuleGen2,
      handleSlideoutClick: jest.fn(),
      handleAboutClick: jest.fn(),
      handleTestShakeClick: jest.fn(),
      handleWizardClick: jest.fn(),
    }
    const { getByRole } = render(props)
    const buttonSetting = getByRole('button', {
      name: 'Set module temperature',
    })
    fireEvent.click(buttonSetting)
    expect(props.handleSlideoutClick).toHaveBeenCalled()
    const buttonAbout = getByRole('button', { name: 'About module' })
    fireEvent.click(buttonAbout)
    expect(props.handleAboutClick).toHaveBeenCalled()
  })
  it('renders the correct TC module menu', () => {
    props = {
      module: mockThermocycler,
      handleSlideoutClick: jest.fn(),
      handleAboutClick: jest.fn(),
      handleTestShakeClick: jest.fn(),
      handleWizardClick: jest.fn(),
    }
    const { getByRole } = render(props)
    const buttonSettingLid = getByRole('button', {
      name: 'Set lid temperature',
    })
    fireEvent.click(buttonSettingLid)
    expect(props.handleSlideoutClick).toHaveBeenCalled()
    const buttonAbout = getByRole('button', { name: 'About module' })
    fireEvent.click(buttonAbout)
    expect(props.handleAboutClick).toHaveBeenCalled()
    const buttonSettingBlock = getByRole('button', {
      name: 'Set block temperature',
    })
    fireEvent.click(buttonSettingBlock)
    expect(props.handleSlideoutClick).toHaveBeenCalled()
  })
  it('renders the correct Heater Shaker module menu', () => {
    props = {
      module: mockHeaterShaker,
      handleSlideoutClick: jest.fn(),
      handleAboutClick: jest.fn(),
      handleTestShakeClick: jest.fn(),
      handleWizardClick: jest.fn(),
    }
    const { getByRole } = render(props)
    getByRole('button', {
      name: 'Set module temperature',
    })
    getByRole('button', {
      name: 'Set shake speed',
    })
    getByRole('button', {
      name: 'Close Labware Latch',
    })
    const aboutButton = getByRole('button', { name: 'About module' })
    getByRole('button', { name: 'See how to attach to deck' })
    const testButton = getByRole('button', { name: 'Test shake' })
    fireEvent.click(testButton)
    expect(props.handleTestShakeClick).toHaveBeenCalled()
    fireEvent.click(aboutButton)
    expect(props.handleAboutClick).toHaveBeenCalled()
  })
  it('renders heater shaker see how to attach to deck button and when clicked, launches hs wizard', () => {
    props = {
      module: mockHeaterShaker,
      handleSlideoutClick: jest.fn(),
      handleAboutClick: jest.fn(),
      handleTestShakeClick: jest.fn(),
      handleWizardClick: jest.fn(),
    }
    const { getByRole } = render(props)
    const btn = getByRole('button', { name: 'See how to attach to deck' })
    fireEvent.click(btn)
    expect(props.handleWizardClick).toHaveBeenCalled()
  })

  it('renders heater shaker labware latch button and is disabled when status is not idle', () => {
    props = {
      module: mockMovingHeaterShaker,
      handleSlideoutClick: jest.fn(),
      handleAboutClick: jest.fn(),
      handleTestShakeClick: jest.fn(),
      handleWizardClick: jest.fn(),
    }
    const { getByRole } = render(props)
    expect(
      getByRole('button', {
        name: 'Open Labware Latch',
      })
    ).toBeDisabled()
  })

  it('renders heater shaker shake button and is disabled when latch is opened', () => {
    props = {
      module: mockOpenLatchHeaterShaker,
      handleSlideoutClick: jest.fn(),
      handleAboutClick: jest.fn(),
      handleTestShakeClick: jest.fn(),
      handleWizardClick: jest.fn(),
    }
    const { getByRole } = render(props)
    expect(
      getByRole('button', {
        name: 'Set shake speed',
      })
    ).toBeDisabled()
  })

  it('renders heater shaker labware latch button and when clicked, moves labware latch open', () => {
    props = {
      module: mockCloseLatchHeaterShaker,
      handleSlideoutClick: jest.fn(),
      handleAboutClick: jest.fn(),
      handleTestShakeClick: jest.fn(),
      handleWizardClick: jest.fn(),
    }

    const { getByRole } = render(props)

    const btn = getByRole('button', {
      name: 'Open Labware Latch',
    })
    expect(btn).not.toBeDisabled()
    fireEvent.click(btn)
  })

  it('renders heater shaker labware latch button and when clicked, moves labware latch close', () => {
    props = {
      module: mockHeaterShaker,
      handleSlideoutClick: jest.fn(),
      handleAboutClick: jest.fn(),
      handleTestShakeClick: jest.fn(),
      handleWizardClick: jest.fn(),
    }
    const { getByRole } = render(props)

    const btn = getByRole('button', {
      name: 'Close Labware Latch',
    })

    fireEvent.click(btn)
  })

  it('renders heater shaker overflow menu and deactivates heater when status changes', () => {
    props = {
      module: mockDeactivateHeatHeaterShaker,
      handleSlideoutClick: jest.fn(),
      handleAboutClick: jest.fn(),
      handleTestShakeClick: jest.fn(),
      handleWizardClick: jest.fn(),
    }

    const { getByRole } = render(props)

    const btn = getByRole('button', {
      name: 'Deactivate',
    })
    expect(btn).not.toBeDisabled()
    fireEvent.click(btn)
  })

  it('renders temperature module overflow menu and deactivates heat when status changes', () => {
    props = {
      module: mockTemperatureModuleHeating,
      handleSlideoutClick: jest.fn(),
      handleAboutClick: jest.fn(),
      handleTestShakeClick: jest.fn(),
      handleWizardClick: jest.fn(),
    }

    const { getByRole } = render(props)

    const btn = getByRole('button', {
      name: 'Deactivate module',
    })
    expect(btn).not.toBeDisabled()
    fireEvent.click(btn)
  })

  it('renders magnetic module overflow menu and disengages when status changes', () => {
    props = {
      module: mockMagDeckEngaged,
      handleSlideoutClick: jest.fn(),
      handleAboutClick: jest.fn(),
      handleTestShakeClick: jest.fn(),
      handleWizardClick: jest.fn(),
    }

    const { getByRole } = render(props)

    const btn = getByRole('button', {
      name: 'Disengage module',
    })
    expect(btn).not.toBeDisabled()
    fireEvent.click(btn)
  })

  it('renders thermocycler overflow menu and deactivates block when status changes', () => {
    props = {
      module: mockTCBlockHeating,
      handleSlideoutClick: jest.fn(),
      handleAboutClick: jest.fn(),
      handleTestShakeClick: jest.fn(),
      handleWizardClick: jest.fn(),
    }

    const { getByRole } = render(props)

    const btn = getByRole('button', {
      name: 'Deactivate block',
    })
    expect(btn).not.toBeDisabled()
    fireEvent.click(btn)
  })
})
