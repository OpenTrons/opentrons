import * as React from 'react'
import { when } from 'jest-when'
import '@testing-library/jest-dom'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@opentrons/components/__utils__'
import noModulesProtocol from '@opentrons/shared-data/protocol/fixtures/4/simpleV4.json'
import withModulesProtocol from '@opentrons/shared-data/protocol/fixtures/4/testModulesProtocol.json'
import standardDeckDef from '@opentrons/shared-data/deck/definitions/2/ot2_standard.json'

import { i18n } from '../../../i18n'
import { RunSetupCard } from '../RunSetupCard'

import * as protocolSelectors from '../../../redux/protocol/selectors'
import { LabwareSetup } from '../LabwareSetup'
import { ModuleSetup } from '../ModuleSetup'
import { getModuleRenderCoords } from '../utils/getModuleRenderCoords'
import { getLabwareRenderCoords } from '../utils/getLabwareRenderCoords'

jest.mock('../../../redux/protocol/selectors')
jest.mock('../LabwareSetup')
jest.mock('../ModuleSetup')
jest.mock('../utils/getModuleRenderCoords')
jest.mock('../utils/getLabwareRenderCoords')

const mockGetProtocolData = protocolSelectors.getProtocolData as jest.MockedFunction<
  typeof protocolSelectors.getProtocolData
>
const mockLabwareSetup = LabwareSetup as jest.MockedFunction<
  typeof LabwareSetup
>
const mockModuleSetup = ModuleSetup as jest.MockedFunction<typeof ModuleSetup>
const mockGetModuleRenderCoords = getModuleRenderCoords as jest.MockedFunction<
  typeof getModuleRenderCoords
>
const mockGetLabwareRenderCoords = getLabwareRenderCoords as jest.MockedFunction<
  typeof getLabwareRenderCoords
>

// this is needed because under the hood react calls components with two arguments (props and some second argument nobody seems to know)
// https://github.com/timkindberg/jest-when/issues/66
const componentPropsMatcher = (matcher: unknown) =>
  // @ts-expect-error(sa, 2021-08-03): when.allArgs not part of type definition yet for jest-when
  when.allArgs((args, equals) => equals(args[0], matcher))

const mockModuleRenderCoords = {
  mockModuleId: { x: 0, y: 0, z: 0, moduleModel: 'mockModule' as any },
}
const mockLabwareRenderCoords = {
  mockLabwareId: { x: 0, y: 0, z: 0, labwareDef: {} as any },
}
describe('RunSetupCard', () => {
  let render: () => ReturnType<typeof renderWithProviders>

  beforeEach(() => {
    mockGetProtocolData.mockReturnValue(noModulesProtocol as any)
    when(mockGetModuleRenderCoords)
      .calledWith(noModulesProtocol as any, standardDeckDef as any)
      .mockReturnValue(mockModuleRenderCoords)
    when(mockGetLabwareRenderCoords)
      .calledWith(noModulesProtocol as any, standardDeckDef as any)
      .mockReturnValue(mockLabwareRenderCoords)

    when(mockLabwareSetup)
      .mockReturnValue(<div></div>) // this (default) empty div will be returned when LabwareSetup isn't called with expected props
      .calledWith(
        componentPropsMatcher({
          moduleRenderCoords: mockModuleRenderCoords,
          labwareRenderCoords: mockLabwareRenderCoords,
        })
      )
      .mockReturnValue(<div>Mock Labware Setup</div>)
    when(mockModuleSetup)
      .mockReturnValue(<div></div>) // this (default) empty div will be returned when ModuleSetup isn't called with expected props
      .calledWith(
        componentPropsMatcher({
          moduleRenderCoords: mockModuleRenderCoords,
          expandLabwareSetupStep: expect.anything(),
        })
      )
      .mockImplementation(({ expandLabwareSetupStep }) => (
        <div onClick={expandLabwareSetupStep}>Mock Module Setup</div>
      ))
    render = () => {
      return renderWithProviders(<RunSetupCard />, { i18nInstance: i18n })
    }
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('when no modules are in the protocol', () => {
    it('renders robot calibration', () => {
      const { getByRole } = render()
      getByRole('heading', { name: 'Robot Calibration' })
    })
    it('renders labware setup', () => {
      const { getByRole, getByText } = render()
      const labwareSetup = getByRole('heading', { name: 'Labware Setup' })
      fireEvent.click(labwareSetup)
      getByText('Mock Labware Setup')
    })
    it('does NOT render module setup', () => {
      const { queryByText } = render()
      expect(queryByText(/module setup/i)).toBeNull()
    })
  })

  it('renders module setup and allows the user to proceed to labware setup', () => {
    mockGetProtocolData.mockReturnValue(withModulesProtocol as any)
    when(mockGetModuleRenderCoords)
      .calledWith(withModulesProtocol as any, standardDeckDef as any)
      .mockReturnValue(mockModuleRenderCoords)
    when(mockGetLabwareRenderCoords)
      .calledWith(withModulesProtocol as any, standardDeckDef as any)
      .mockReturnValue(mockLabwareRenderCoords)
    const { getByRole, getByText } = render()
    const moduleSetupHeading = getByRole('heading', { name: 'Module Setup' })
    fireEvent.click(moduleSetupHeading)
    const moduleSetup = getByText('Mock Module Setup')
    fireEvent.click(moduleSetup)
    getByText('Mock Labware Setup')
  })
  it('renders null if python protocol with only metadata field', () => {
    mockGetProtocolData.mockReturnValue({ metadata: {} as any })
    const { container } = render()
    expect(container.firstChild).toBeNull()
  })
  it('renders correct text contents', () => {
    mockGetProtocolData.mockReturnValue(withModulesProtocol as any)
    const { getByRole, getByText } = render()
    expect(getByRole('heading', { name: 'Setup for Run' })).toBeTruthy()
    expect(getByRole('heading', { name: 'STEP 1' })).toBeTruthy()
    expect(getByRole('heading', { name: 'Robot Calibration' })).toBeTruthy()
    expect(
      getByText(
        'Review required pipettes and tip length calibrations for this protocol.'
      )
    ).toBeTruthy()
    expect(getByRole('heading', { name: 'STEP 2' })).toBeTruthy()
    expect(getByRole('heading', { name: 'Labware Setup' })).toBeTruthy()
    expect(
      getByText(
        'Position full tip racks and labware in the deck slots as shown in the deck map.'
      )
    ).toBeTruthy()
    expect(getByRole('heading', { name: 'STEP 3' })).toBeTruthy()
    expect(getByRole('heading', { name: 'Module Setup' })).toBeTruthy()
    expect(
      getByText(
        'Plug in and power up the required module(s) via the OT-2 USB Port(s). Place the module(s) as shown in the deck map.'
      )
    ).toBeTruthy()
  })
})
