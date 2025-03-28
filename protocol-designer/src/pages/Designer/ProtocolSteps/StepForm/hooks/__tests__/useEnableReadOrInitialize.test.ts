import { useSelector } from 'react-redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ABSORBANCE_READER_TYPE } from '@opentrons/shared-data'
import { renderHook } from '@testing-library/react'
import { getRobotStateAtActiveItem } from '../../../../../../top-selectors/labware-locations'
import { useAbsorbanceReaderCommandType } from '../useAbsorbanceReaderCommandType'
import type { Initialization, TimelineFrame } from '@opentrons/step-generation'
import {
  ABSORBANCE_READER_INITIALIZE,
  ABSORBANCE_READER_READ,
} from '../../../../../../constants'

vi.mock('../../../../../../top-selectors/labware-locations')
vi.mock('react-redux', () => ({
  useSelector: vi.fn(),
}))
const MOCK_MODULE_ID = 'absorbanceReaderId'
const MOCK_LABWARE_ID = 'labwareId'
const MOCK_INITIALIZATION = {
  mode: 'single',
  wavelengths: [450, 600],
} as Initialization
const MOCK_MODULE_STATE = {
  slot: 'D3',
  moduleState: {
    lidOpen: false,
    type: ABSORBANCE_READER_TYPE,
    initialization: null,
  },
}
const MOCK_LABWARE = {
  [MOCK_LABWARE_ID]: {
    slot: MOCK_MODULE_ID,
  },
}

const DEFAULT_ROBOT_STATE = {
  pipettes: {},
  tipState: { tipracks: {}, pipettes: {} },
  liquidState: { labware: {}, pipettes: {}, additionalEquipment: {} },
  labware: {},
  modules: {
    [MOCK_MODULE_ID]: MOCK_MODULE_STATE,
  },
} as TimelineFrame
describe('useEnableReadOrInitialize', () => {
  beforeEach(() => {
    vi.mocked(useSelector).mockImplementation(selector => selector({} as any))
    vi.mocked(getRobotStateAtActiveItem).mockReturnValue(DEFAULT_ROBOT_STATE)
  })
  it('returns null if null moduleId passed', () => {
    const { result } = renderHook(() => useAbsorbanceReaderCommandType(null))
    expect(result.current).toEqual(null)
  })
  it('returns initialize if no labware present on absorbance reader', () => {
    const { result } = renderHook(() =>
      useAbsorbanceReaderCommandType(MOCK_MODULE_ID)
    )
    expect(result.current).toEqual(ABSORBANCE_READER_INITIALIZE)
  })
  it('returns read if labware present on absorbance reader and initialization exists', () => {
    const moduleState = {
      ...MOCK_MODULE_STATE,
      moduleState: {
        ...MOCK_MODULE_STATE.moduleState,
        initialization: MOCK_INITIALIZATION,
      },
    }
    vi.mocked(getRobotStateAtActiveItem).mockReturnValue({
      ...DEFAULT_ROBOT_STATE,
      modules: { [MOCK_MODULE_ID]: moduleState },
      labware: MOCK_LABWARE,
    })
    const { result } = renderHook(() =>
      useAbsorbanceReaderCommandType(MOCK_MODULE_ID)
    )
    expect(result.current).toEqual(ABSORBANCE_READER_READ)
  })
  it('returns null if labware present on absorbance reader and no initialization exists', () => {
    vi.mocked(getRobotStateAtActiveItem).mockReturnValue({
      ...DEFAULT_ROBOT_STATE,
      labware: MOCK_LABWARE,
    })
    const { result } = renderHook(() =>
      useAbsorbanceReaderCommandType(MOCK_MODULE_ID)
    )
    expect(result.current).toEqual(null)
  })
})
