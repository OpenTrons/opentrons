import * as React from 'react'
import { fireEvent } from '@testing-library/react'

import { renderWithProviders } from '@opentrons/components'
import { i18n } from '../../../i18n'
import { useAllLabware } from '../../../pages/Labware/hooks'
import { mockOpentronsLabwareDetailsDefinition } from '../../../redux/custom-labware/__fixtures__'
import { CustomLabwareOverflowMenu } from '../../LabwareCard/CustomLabwareOverflowMenu'
import { Dimensions } from '../Dimensions'
import { Gallery } from '../Gallery'
import { ManufacturerDetails } from '../ManufacturerDetails'
import { WellCount } from '../WellCount'
import { WellProperties } from '../WellProperties'
import { WellDimensions } from '../WellDimensions'
import { WellSpacing } from '../WellSpacing'

import { LabwareDetails } from '..'

jest.mock('../../../pages/Labware/hooks')
jest.mock('../../LabwareCard/CustomLabwareOverflowMenu')
jest.mock('../Dimensions')
jest.mock('../Gallery')
jest.mock('../ManufacturerDetails')
jest.mock('../WellProperties')
jest.mock('../WellCount')
jest.mock('../WellDimensions')
jest.mock('../WellSpacing')

const mockCustomLabwareOverflowMenu = CustomLabwareOverflowMenu as jest.MockedFunction<
  typeof CustomLabwareOverflowMenu
>
const mockDimensions = Dimensions as jest.MockedFunction<typeof Dimensions>
const mockGallery = Gallery as jest.MockedFunction<typeof Gallery>
const mockManufacturerDetails = ManufacturerDetails as jest.MockedFunction<
  typeof ManufacturerDetails
>
const mockUseAllLabware = useAllLabware as jest.MockedFunction<
  typeof useAllLabware
>
const mockWellCount = WellCount as jest.MockedFunction<typeof WellCount>
const mockWellProperties = WellProperties as jest.MockedFunction<
  typeof WellProperties
>
const mockWellDimensions = WellDimensions as jest.MockedFunction<
  typeof WellDimensions
>
const mockWellSpacing = WellSpacing as jest.MockedFunction<typeof WellSpacing>

const render = (
  props: React.ComponentProps<typeof LabwareDetails>
): ReturnType<typeof renderWithProviders> => {
  return renderWithProviders(<LabwareDetails {...props} />, {
    i18nInstance: i18n,
  })
}

describe('LabwareDetails', () => {
  let props: React.ComponentProps<typeof LabwareDetails>
  beforeEach(() => {
    mockCustomLabwareOverflowMenu.mockReturnValue(
      <div>Mock CustomLabwareOverflowMenu</div>
    )
    mockUseAllLabware.mockReturnValue([
      { definition: mockOpentronsLabwareDetailsDefinition },
    ])
    mockDimensions.mockReturnValue(<div>Mock Dimensions</div>)
    mockGallery.mockReturnValue(<div>Mock Gallery</div>)
    mockManufacturerDetails.mockReturnValue(<div>Mock ManufacturerDetails</div>)
    mockWellCount.mockReturnValue(<div>Mock WellCount</div>)
    mockWellProperties.mockReturnValue(<div>Mock WellProperties</div>)
    mockWellDimensions.mockReturnValue(<div>Mock WellDimensions</div>)
    mockWellSpacing.mockReturnValue(<div>Mock WellSpacing</div>)
    props = {
      labware: {
        definition: mockOpentronsLabwareDetailsDefinition,
      },
      onClose: jest.fn(),
    }
  })

  afterEach(() => {
    jest.resetAllMocks()
  })
  it('should render correct info for opentrons labware', () => {
    const [{ getByText }] = render(props)
    getByText('Mock Definition')
    getByText('Opentrons Definition')
    getByText('API Name')
    getByText('mock_definition')
    getByText('Mock Dimensions')
    getByText('Mock Gallery')
    getByText('Mock ManufacturerDetails')
    getByText('Mock WellCount')
    getByText('Mock WellProperties')
    getByText('Mock WellDimensions')
    getByText('Mock WellSpacing')
  })

  it('should no render Mock Well Dimensions, if a labware does not have groupMetaData', () => {
    props.labware.definition.groups = []
    const [{ queryByText }] = render(props)
    expect(queryByText('Mock WellDimensions')).not.toBeInTheDocument()
  })

  it('should render correct info for custom labware', () => {
    props.labware.definition.namespace = 'custom'
    const [{ queryByText }] = render(props)
    expect(queryByText('Opentrons Definition')).not.toBeInTheDocument()
  })

  it('when clicking copy icon, should show tooltip as feedback', () => {
    const [{ getByTestId, findByText }] = render(props)
    const button = getByTestId('labwareDetails_slideout_close_button')
    fireEvent.click(button)
    findByText('Copied')
  })

  it('should close the slideout when clicking the close button', () => {
    const [{ getByTestId }] = render(props)
    const closeButton = getByTestId('labwareDetails_slideout_close_button')
    fireEvent.click(closeButton)
    expect(props.onClose).toHaveBeenCalled()
  })
})
