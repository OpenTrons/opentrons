import { beforeEach, describe, it, expect } from 'vitest'
import merge from 'lodash/merge'
import {
  COLUMN,
  fixtureTiprack1000ul,
  fixtureTiprack300ul,
  getLabwareDefURI,
} from '@opentrons/shared-data'
import {
  getInitialRobotStateStandard,
  makeContext,
  getTiprackTipstate,
  getTipColumn,
  getSuccessResult,
  pickUpTipHelper,
  dropTipHelper,
  dropTipInPlaceHelper,
  moveToAddressableAreaHelper,
  DEFAULT_PIPETTE,
  PIPETTE_96,
} from '../fixtures'
import { replaceTip } from '../commandCreators/compound/replaceTip'
import { FIXED_TRASH_ID } from '../constants'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { InvariantContext, RobotState } from '../types'

const tiprack1Id = 'tiprack1Id'
const tiprack2Id = 'tiprack2Id'
const tiprack4Id = 'tiprack4Id'
const tiprack5Id = 'tiprack5Id'
const tiprackURI1 = getLabwareDefURI(fixtureTiprack300ul as LabwareDefinition2)
const tiprackURI2 = getLabwareDefURI(fixtureTiprack1000ul as LabwareDefinition2)
const p300SingleId = DEFAULT_PIPETTE
const p300MultiId = 'p300MultiId'
const p100096Id = 'p100096Id'
const wasteChuteId = 'wasteChuteId'
describe('replaceTip', () => {
  let invariantContext: InvariantContext
  let initialRobotState: RobotState
  beforeEach(() => {
    invariantContext = makeContext()
    initialRobotState = getInitialRobotStateStandard(invariantContext)
  })
  describe('replaceTip: single channel', () => {
    it('Single-channel: first tip', () => {
      const result = replaceTip(
        {
          pipette: p300SingleId,
          dropTipLocation: FIXED_TRASH_ID,
          tipRack: tiprackURI1,
        },
        invariantContext,
        initialRobotState
      )
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([pickUpTipHelper(0)])
    })
    it('Single-channel: second tip B1', () => {
      const result = replaceTip(
        {
          pipette: p300SingleId,
          dropTipLocation: FIXED_TRASH_ID,
          tipRack: tiprackURI1,
        },
        invariantContext,
        merge({}, initialRobotState, {
          tipState: {
            tipracks: {
              [tiprack1Id]: {
                A1: false,
              },
            },
            pipettes: {
              p300SingleId: false,
            },
          },
        })
      )
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([pickUpTipHelper(1)])
    })
    it('Single-channel: ninth tip (next column)', () => {
      const initialTestRobotState = merge({}, initialRobotState, {
        tipState: {
          tipracks: {
            [tiprack1Id]: getTipColumn(1, false),
          },
          pipettes: {
            p300SingleId: false,
          },
        },
      })
      const result = replaceTip(
        {
          pipette: p300SingleId,
          dropTipLocation: FIXED_TRASH_ID,
          tipRack: tiprackURI1,
        },
        invariantContext,
        initialTestRobotState
      )
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([pickUpTipHelper('A2')])
    })
    it('Single-channel: pipette already has tip, so tip will be replaced.', () => {
      const initialTestRobotState = merge({}, initialRobotState, {
        tipState: {
          tipracks: {
            [tiprack1Id]: {
              A1: false,
            },
          },
          pipettes: {
            p300SingleId: true,
          },
        },
      })
      const result = replaceTip(
        {
          pipette: p300SingleId,
          dropTipLocation: FIXED_TRASH_ID,
          tipRack: tiprackURI1,
        },
        invariantContext,
        initialTestRobotState
      )
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        ...dropTipHelper(p300SingleId),
        pickUpTipHelper('B1'),
      ])
    })
    it('96-channel full tip and emits the configure nozzle layout command before picking up tip', () => {
      const initialTestRobotState = merge({}, initialRobotState, {
        tipState: {
          tipracks: {
            [tiprack1Id]: {
              A1: false,
            },
          },
          pipettes: {
            [PIPETTE_96]: true,
          },
        },
        pipettes: {
          [PIPETTE_96]: { nozzles: 'ALL' },
        },
      })
      const result = replaceTip(
        {
          pipette: PIPETTE_96,
          dropTipLocation: FIXED_TRASH_ID,
          tipRack: tiprackURI1,
          nozzles: COLUMN,
        },
        invariantContext,
        initialTestRobotState
      )
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        ...dropTipHelper(PIPETTE_96),
        {
          commandType: 'configureNozzleLayout',
          key: expect.any(String),
          params: {
            pipetteId: PIPETTE_96,
            configurationParams: {
              primaryNozzle: 'A12',
              style: COLUMN,
            },
          },
        },
        pickUpTipHelper('A2', { pipetteId: PIPETTE_96 }),
      ])
    })
    it('Single-channel: used all tips in first rack, move to second rack', () => {
      const initialTestRobotState = merge({}, initialRobotState, {
        tipState: {
          tipracks: {
            [tiprack1Id]: getTiprackTipstate(false),
          },
          pipettes: {
            p300SingleId: false,
          },
        },
      })
      const result = replaceTip(
        {
          pipette: p300SingleId,
          dropTipLocation: FIXED_TRASH_ID,
          tipRack: tiprackURI1,
        },
        invariantContext,
        initialTestRobotState
      )
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        pickUpTipHelper('A1', {
          labwareId: tiprack2Id,
        }),
      ])
    })
    it('Single-channel: dropping tips in waste chute', () => {
      invariantContext = {
        ...invariantContext,
        additionalEquipmentEntities: {
          wasteChuteId: {
            name: 'wasteChute',
            id: wasteChuteId,
            location: 'cutoutD3',
          },
        },
      }
      const initialTestRobotState = merge({}, initialRobotState, {
        tipState: {
          tipracks: {
            [tiprack1Id]: {
              A1: false,
            },
          },
          pipettes: {
            p300SingleId: true,
          },
        },
      })
      const result = replaceTip(
        {
          pipette: p300SingleId,
          dropTipLocation: 'wasteChuteId',
          tipRack: tiprackURI1,
        },
        invariantContext,
        initialTestRobotState
      )
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        moveToAddressableAreaHelper(),
        dropTipInPlaceHelper(),
        pickUpTipHelper('B1'),
      ])
    })
  })
  describe('replaceTip: multi-channel', () => {
    it('multi-channel, all tipracks have tips', () => {
      const result = replaceTip(
        {
          pipette: p300MultiId,
          dropTipLocation: FIXED_TRASH_ID,
          tipRack: tiprackURI1,
        },
        invariantContext,
        initialRobotState
      )
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        pickUpTipHelper('A1', {
          pipetteId: p300MultiId,
        }),
      ])
    })
    it('multi-channel, missing tip in first row', () => {
      const robotStateWithTipA1Missing = {
        ...initialRobotState,
        tipState: {
          ...initialRobotState.tipState,
          tipracks: {
            [tiprack1Id]: { ...getTiprackTipstate(true), A1: false },
            [tiprack2Id]: getTiprackTipstate(true),
          },
        },
      }
      const result = replaceTip(
        {
          pipette: p300MultiId,
          dropTipLocation: FIXED_TRASH_ID,
          tipRack: tiprackURI1,
        },
        invariantContext,
        robotStateWithTipA1Missing
      )
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        pickUpTipHelper('A2', {
          pipetteId: p300MultiId,
        }),
      ])
    })
    it('Multi-channel: pipette already has tip, so tip will be replaced.', () => {
      const robotStateWithTipsOnMulti = {
        ...initialRobotState,
        tipState: {
          ...initialRobotState.tipState,
          pipettes: {
            p300MultiId: true,
          },
        },
      }
      const result = replaceTip(
        {
          pipette: p300MultiId,
          dropTipLocation: FIXED_TRASH_ID,
          tipRack: tiprackURI1,
        },
        invariantContext,
        robotStateWithTipsOnMulti
      )
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        ...dropTipHelper(p300MultiId),
        pickUpTipHelper('A1', {
          pipetteId: p300MultiId,
        }),
      ])
    })
  })
  describe('replaceTip: 96-channel', () => {
    it('96-channel, dropping 1 column of tips in waste chute', () => {
      invariantContext = {
        ...invariantContext,

        additionalEquipmentEntities: {
          wasteChuteId: {
            name: 'wasteChute',
            id: wasteChuteId,
            location: 'cutoutD3',
          },
        },
      }
      initialRobotState = {
        ...initialRobotState,
        pipettes: { p100096Id: { mount: 'left', nozzles: COLUMN } },
        tipState: {
          tipracks: {
            [tiprack4Id]: getTiprackTipstate(false),
            [tiprack5Id]: getTiprackTipstate(true),
          },
          pipettes: {
            p100096Id: true,
          },
        },
      }

      const result = replaceTip(
        {
          pipette: p100096Id,
          dropTipLocation: 'wasteChuteId',
          tipRack: tiprackURI2,
          nozzles: COLUMN,
        },
        invariantContext,
        initialRobotState
      )
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        moveToAddressableAreaHelper({
          pipetteId: p100096Id,
          addressableAreaName: '96ChannelWasteChute',
        }),
        dropTipInPlaceHelper({ pipetteId: p100096Id }),
        pickUpTipHelper('A1', {
          pipetteId: p100096Id,
          labwareId: tiprack5Id,
        }),
      ])
    })
  })
})
