import * as React from 'react'
import { LEFT, renderWithProviders } from '@opentrons/components'
import { fireEvent } from '@testing-library/react'
import { i18n } from '../../../i18n'
import { PipetteWizardFlows } from '../../PipetteWizardFlows'
import { GripperWizardFlows } from '../../GripperWizardFlows'
import { ProtocolInstrumentMountItem } from '..'

jest.mock('../../PipetteWizardFlows')
jest.mock('../../GripperWizardFlows')
jest.mock('../../TakeoverModal')

const mockPipetteWizardFlows = PipetteWizardFlows as jest.MockedFunction<
  typeof PipetteWizardFlows
>
const mockGripperWizardFlows = GripperWizardFlows as jest.MockedFunction<
  typeof GripperWizardFlows
>

const mockGripperData = {
  instrumentModel: 'gripper_v1',
  instrumentType: 'gripper',
  mount: 'extension',
  serialNumber: 'ghi789',
  data: {
    calibratedOffset: {
      offset: {
        x: 1,
        y: 2,
        z: 4,
      },
      source: 'standard',
      last_modified: undefined,
    },
  },
  subsystem: 'gripper',
  ok: true,
}
const mockLeftPipetteData = {
  instrumentModel: 'p1000_multi_flex',
  instrumentType: 'p1000',
  mount: 'left',
  serialNumber: 'def456',
  data: {
    calibratedOffset: {
      offset: {
        x: 1,
        y: 2,
        z: 4,
      },
      source: 'standard',
      last_modified: 'date',
    },
  },
  subsystem: 'pipette_left',
  ok: true,
}

const render = (
  props: React.ComponentProps<typeof ProtocolInstrumentMountItem>
) => {
  return renderWithProviders(<ProtocolInstrumentMountItem {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('ProtocolInstrumentMountItem', () => {
  let props: React.ComponentProps<typeof ProtocolInstrumentMountItem>
  beforeEach(() => {
    props = {
      mount: LEFT,
      attachedInstrument: null,
      speccedName: 'p1000_multi_flex',
    }
    mockPipetteWizardFlows.mockReturnValue(<div>pipette wizard flow</div>)
    mockGripperWizardFlows.mockReturnValue(<div>gripper wizard flow</div>)
  })

  it('renders the correct information when there is no pipette attached', () => {
    const { getByText, getByLabelText } = render(props)
    getByText('Left Mount')
    getByText('No data')
    getByText('Flex 8-Channel 1000 μL')
    getByText('Attach')
    getByLabelText('SmallButton_primary').click()
    getByText('pipette wizard flow')
  })
  it('renders the correct information when there is no pipette attached for 96 channel', () => {
    props = {
      ...props,
      speccedName: 'p1000_96',
    }
    const { getByText } = render(props)
    getByText('Left + Right Mount')
    getByText('No data')
    getByText('Flex 96-Channel 1000 μL')
    getByText('Attach')
  })
  it('renders the correct information when there is a pipette attached with cal data', () => {
    props = {
      ...props,
      mount: LEFT,
      attachedInstrument: mockLeftPipetteData as any,
    }
    const { getByText } = render(props)
    getByText('Left Mount')
    getByText('Calibrated')
    getByText('Flex 8-Channel 1000 μL')
  })
  it('renders the pipette with no cal data and the calibration button and clicking on it launches the correct flow', () => {
    props = {
      ...props,
      mount: LEFT,
      attachedInstrument: {
        ...mockLeftPipetteData,
        data: {
          calibratedOffset: null,
        },
      } as any,
    }
    const { getByText } = render(props)
    getByText('Left Mount')
    getByText('No data')
    getByText('Flex 8-Channel 1000 μL')
    const button = getByText('Calibrate')
    fireEvent.click(button)
    getByText('pipette wizard flow')
  })
  it('renders the attach button and clicking on it launches the correct flow', () => {
    props = {
      ...props,
      mount: LEFT,
    }
    const { getByText } = render(props)
    getByText('Left Mount')
    getByText('No data')
    getByText('Flex 8-Channel 1000 μL')
    const button = getByText('Attach')
    fireEvent.click(button)
    getByText('pipette wizard flow')
  })
  it('renders the correct information when gripper needs to be atached', () => {
    props = {
      ...props,
      mount: 'extension',
      speccedName: 'gripperV1',
    }
    const { getByText } = render(props)
    getByText('Extension Mount')
    getByText('No data')
    getByText('Flex Gripper')
    const button = getByText('Attach')
    fireEvent.click(button)
    getByText('gripper wizard flow')
  })
  it('renders the correct information when gripper is attached but not calibrated', () => {
    props = {
      ...props,
      mount: 'extension',
      speccedName: 'gripperV1',
      attachedInstrument: mockGripperData as any,
    }
    const { getByText } = render(props)
    getByText('Extension Mount')
    getByText('Flex Gripper')
    const button = getByText('Calibrate')
    fireEvent.click(button)
    getByText('gripper wizard flow')
  })
})
