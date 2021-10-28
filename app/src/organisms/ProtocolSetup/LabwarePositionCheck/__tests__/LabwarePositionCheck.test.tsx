import * as React from 'react'
import { resetAllWhenMocks, when } from 'jest-when'
import { renderWithProviders } from '@opentrons/components'
import { fireEvent } from '@testing-library/dom'
import { i18n } from '../../../../i18n'
import { LabwarePositionCheck } from '../index'
import { GenericStepScreen } from '../GenericStepScreen'
import { IntroScreen } from '../IntroScreen'
import { useSteps } from '../hooks'
import { LabwarePositionCheckStep } from '../types'

jest.mock('../GenericStepScreen')
jest.mock('../IntroScreen')
jest.mock('../hooks')

const mockGenericStepScreen = GenericStepScreen as jest.MockedFunction<
  typeof GenericStepScreen
>
const mockIntroScreen = IntroScreen as jest.MockedFunction<typeof IntroScreen>
const mockUseSteps = useSteps as jest.MockedFunction<typeof useSteps>

const PICKUP_TIP_LABWARE_ID = 'PICKUP_TIP_LABWARE_ID'
const PRIMARY_PIPETTE_ID = 'PRIMARY_PIPETTE_ID'

const render = (props: React.ComponentProps<typeof LabwarePositionCheck>) => {
  return renderWithProviders(<LabwarePositionCheck {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('LabwarePositionCheck', () => {
  let props: React.ComponentProps<typeof LabwarePositionCheck>
  beforeEach(() => {
    props = {
      onCloseClick: jest.fn(),
    }
    when(mockUseSteps)
      .calledWith()
      .mockReturnValue([
        {
          commands: [
            {
              command: 'pickUpTip',
              params: {
                pipette: PRIMARY_PIPETTE_ID,
                labware: PICKUP_TIP_LABWARE_ID,
              },
            },
          ],
          labwareId:
            '1d57fc10-67ad-11ea-9f8b-3b50068bd62d:opentrons/opentrons_96_filtertiprack_200ul/1',
          section: 'PRIMARY_PIPETTE_TIPRACKS',
        } as LabwarePositionCheckStep,
      ])
    mockIntroScreen.mockReturnValue(<div>Mock Intro Screen Component </div>)
    mockGenericStepScreen.mockReturnValue(null)
  })
  afterEach(() => {
    resetAllWhenMocks()
    jest.resetAllMocks()
  })
  it('renders LabwarePositionCheck header and button and no components', () => {
    const { getByRole } = render(props)
    getByRole('heading', {
      name: 'Labware Position Check',
    })
    getByRole('button', {
      name: 'exit',
    })
  })
  it('renders LabwarePositionCheck header and exit button is pressed', () => {
    const { getByRole } = render(props)
    expect(props.onCloseClick).not.toHaveBeenCalled()
    const exitButton = getByRole('button', {
      name: 'exit',
    })
    fireEvent.click(exitButton)
    expect(props.onCloseClick).toHaveBeenCalled()
  })

  it('renders LabwarePositionCheck with IntroScreen component', () => {
    const { getByText } = render(props)
    getByText('Mock Intro Screen Component')
  })
})
