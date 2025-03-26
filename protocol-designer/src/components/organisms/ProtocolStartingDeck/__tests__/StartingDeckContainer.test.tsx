import { describe, it, beforeEach, vi } from 'vitest'
import { when } from 'vitest-when'
import { screen } from '@testing-library/react'
import {
  getDeckDefFromRobotType,
  FLEX_ROBOT_TYPE,
  OT2_ROBOT_TYPE,
  ot2StandardDeckV4 as ot2StandardDeckDef,
  ot3StandardDeckV4 as ot3StandardDeckDef,
} from '@opentrons/shared-data'

import { renderWithProviders } from '../../../../__testing-utils__'
import { getDeckSetupForActiveItem } from '../../../../top-selectors/labware-locations'
import { selectors } from '../../../../labware-ingred/selectors'
import { getRobotType } from '../../../../file-data/selectors'
import { getDisableModuleRestrictions } from '../../../../feature-flags/selectors'
// import { DeckSetupDetails } from '../../../../pages/Designer/DeckSetup/DeckSetupDetails'
import { DeckSetupTools } from '../../../../pages/Designer/DeckSetup/DeckSetupTools'
import { StartingDeckContainer } from '../StartingDeckContainer'

import type * as OpentronsComponents from '@opentrons/components'

vi.mock('../../../../top-selectors/labware-locations')
// vi.mock('../../../../pages/Designer/DeckSetup/DeckSetupDetails')
vi.mock('../../../../pages/Designer/DeckSetup/DeckSetupTools')
vi.mock('../../../../labware-ingred/selectors')
vi.mock('../../../../feature-flags/selectors')
vi.mock('../../../../file-data/selectors')
vi.mock('../../../../pages/Designer/DeckSetup/utils')
vi.mock('@opentrons/components', async importOriginal => {
  const actual = await importOriginal<typeof OpentronsComponents>()
  return {
    ...actual,
    RobotCoordinateSpaceWithRef: () => (
      <div>mock RobotCoordinateSpaceWithRef</div>
    ),
    SlotLabels: () => <div>mock SlotLabels</div>,
    DeckFromLayers: () => <div>mock DeckFromLayers</div>,
    SingleSlotFixture: () => <div>mock StagingAreaFixture</div>,
  }
})
vi.mock('@opentrons/shared-data', async importOriginal => {
  const actual = await importOriginal<typeof getDeckDefFromRobotType>()
  return {
    ...actual,
    getDeckDefFromRobotType: vi.fn(),
  }
})

const render = () => {
  return renderWithProviders(<StartingDeckContainer />)
}

describe('StartingDeckContainer', () => {
  beforeEach(() => {
    // vi.mocked(DeckSetupDetails).mockReturnValue(
    //   <div>mock DeckSetupDetails</div>
    // )
    vi.mocked(DeckSetupTools).mockReturnValue(<div>mock DeckSetupTools</div>)
    vi.mocked(getDisableModuleRestrictions).mockReturnValue(false)
    vi.mocked(getRobotType).mockReturnValue(FLEX_ROBOT_TYPE)
    when(vi.mocked(getDeckDefFromRobotType))
      .calledWith(FLEX_ROBOT_TYPE)
      .thenReturn(ot3StandardDeckDef as any)
    vi.mocked(getDeckSetupForActiveItem).mockReturnValue({
      labware: {},
      modules: {},
      additionalEquipmentOnDeck: {},
      pipettes: {},
    })
    vi.mocked(selectors.getZoomedInSlotInfo).mockReturnValue({
      selectedLabwareDefUri: null,
      selectedNestedLabwareDefUri: null,
      selectedFixture: null,
      selectedModuleModel: null,
      selectedSlot: { slot: 'D3', cutout: 'cutoutD3' },
    })
    vi.mocked(selectors.getZoomedInSlot).mockReturnValue({
      slot: 'D3',
      cutout: 'cutoutD3',
    })
  })

  it('should render mock RobotCoordinateSpaceWithRef when robot type is Flex', () => {
    render()
    screen.getByText('mock RobotCoordinateSpaceWithRef')
    screen.getByText('mock DeckSetupTools')
  })

  it('should render mock RobotCoordinateSpaceWithRef when robot type is OT-2', () => {
    when(vi.mocked(getDeckDefFromRobotType))
      .calledWith(OT2_ROBOT_TYPE)
      .thenReturn(ot2StandardDeckDef as any)
    render()
    screen.getByText('mock RobotCoordinateSpaceWithRef')
    screen.getByText('mock DeckSetupTools')
  })

  // ToDo (kk:03/19/25) add more tests
})
