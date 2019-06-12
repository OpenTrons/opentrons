// @flow
import { tiprackWellNamesFlat } from './data'
import type {
  AspirateArgsV3,
  DispenseArgsV3,
  CommandV3 as Command,
} from '@opentrons/shared-data'

export const replaceTipCommands = (tip: number | string): Array<Command> => [
  dropTip('A1'),
  pickUpTip(tip),
]

// TODO IMMEDIATELY: make a factory that bakes args into these fns, don't bake them in here...???

export const dropTip = (
  well: string,
  params?: {| pipette?: string, labware?: string |}
): Command => ({
  command: 'dropTip',
  params: {
    pipette: 'p300SingleId',
    labware: 'trashId',
    well: typeof well === 'string' ? well : tiprackWellNamesFlat[well],
    ...params,
  },
})

export const pickUpTip = (
  tip: number | string,
  params?: {| pipette?: string, labware?: string |}
): Command => ({
  command: 'pickUpTip',
  params: {
    pipette: 'p300SingleId',
    labware: 'tiprack1Id',
    ...params,
    well: typeof tip === 'string' ? tip : tiprackWellNamesFlat[tip],
  },
})

export const touchTip = (
  well: string,
  params: {| offsetFromBottomMm: number, labware?: string |}
): Command => ({
  command: 'touchTip',
  params: {
    labware: 'sourcePlateId',
    pipette: 'p300SingleId',
    ...params,
    well,
  },
})

export const aspirate = (
  well: string,
  volume: number,
  params?: $Shape<AspirateArgsV3>
): Command => ({
  command: 'aspirate',
  params: {
    pipette: 'p300SingleId',
    labware: 'sourcePlateId',
    volume,
    well,
    ...params,
  },
})

export const dispense = (
  well: string,
  volume: number,
  params?: $Shape<DispenseArgsV3>
): Command => ({
  command: 'dispense',
  params: {
    pipette: 'p300SingleId',
    labware: 'sourcePlateId',
    volume,
    well,
    ...params,
  },
})

export const blowout = (
  labware?: string,
  params?: {|
    offsetFromBottomMm: number,
    flowRate: number,
    pipette?: string,
    well?: string,
  |}
): Command => ({
  command: 'blowout',
  params: {
    pipette: 'p300SingleId',
    well: 'A1',
    labware: labware || 'trashId',
    ...params,
  },
})
