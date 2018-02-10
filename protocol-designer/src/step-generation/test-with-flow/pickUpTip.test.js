// @flow
import {filledTiprackWells, emptyTiprackWells, p300Single} from './fixtures'
import {pickUpTip} from '../'

describe('pickUpTip: single channel', () => {
  const robotInitialState = {
    instruments: {
      p300SingleId: p300Single
    },
    labware: {
      tiprack1Id: {
        slot: '1',
        type: 'tiprack-200uL',
        name: 'Tip rack'
      },
      tiprack10Id: {
        slot: '10',
        type: 'tiprack-200uL',
        name: 'Tip rack'
      },
      sourcePlateId: {
        slot: '11',
        type: 'trough-12row',
        name: 'Source (Buffer)'
      },
      destPlateId: {
        slot: '8',
        type: '96-flat',
        name: 'Destination Plate'
      },
      trashId: {
        slot: '12',
        type: 'fixed-trash',
        name: 'Trash'
      }
    },
    tipState: {
      tipracks: {
        tiprack1Id: {...filledTiprackWells},
        tiprack10Id: {...filledTiprackWells}
      },
      pipettes: {
        p300SingleId: false
      }
    }
  }

  test('Single-channel: first tip', () => {
    const result = pickUpTip('p300SingleId', robotInitialState)

    expect(result.nextCommands).toEqual([{
      command: 'pick-up-tip',
      pipette: 'p300SingleId',
      labware: 'tiprack1Id',
      well: 'A1'
    }])

    expect(result.nextRobotState).toEqual({
      ...robotInitialState,
      tipState: {
        tipracks: {
          ...robotInitialState.tipState.tipracks,
          tiprack1Id: {
            ...filledTiprackWells,
            A1: false
          }
        },
        pipettes: {
          p300SingleId: true
        }
      }
    })
  })

  test('Single-channel: second tip B1', () => {
    const result = pickUpTip('p300SingleId', {
      ...robotInitialState,
      tipState: {
        tipracks: {
          ...robotInitialState.tipState.tipracks,
          tiprack1Id: {
            ...filledTiprackWells,
            A1: false
          }
        },
        pipettes: {
          p300SingleId: false
        }
      }
    })

    expect(result.nextCommands).toEqual([{
      command: 'pick-up-tip',
      pipette: 'p300SingleId',
      labware: 'tiprack1Id',
      well: 'B1'
    }])

    expect(result.nextRobotState).toEqual({
      ...robotInitialState,
      tipState: {
        tipracks: {
          ...robotInitialState.tipState.tipracks,
          tiprack1Id: {
            ...filledTiprackWells,
            A1: false,
            B1: false
          }
        },
        pipettes: {
          p300SingleId: true
        }
      }
    })
  })

  test('Single-channel: ninth tip (next column)', () => {
    const result = pickUpTip('p300SingleId', {
      ...robotInitialState,
      tipState: {
        tipracks: {
          ...robotInitialState.tipState.tipracks,
          tiprack1Id: {
            ...filledTiprackWells,
            A1: false,
            B1: false,
            C1: false,
            D1: false,
            E1: false,
            F1: false,
            G1: false,
            H1: false
          }
        },
        pipettes: {
          p300SingleId: false
        }
      }
    })

    expect(result.nextCommands).toEqual([{
      command: 'pick-up-tip',
      pipette: 'p300SingleId',
      labware: 'tiprack1Id',
      well: 'A2'
    }])

    expect(result.nextRobotState).toEqual({
      ...robotInitialState,
      tipState: {
        tipracks: {
          ...robotInitialState.tipState.tipracks,
          tiprack1Id: {
            ...filledTiprackWells,
            A1: false,
            B1: false,
            C1: false,
            D1: false,
            E1: false,
            F1: false,
            G1: false,
            H1: false,
            A2: false
          }
        },
        pipettes: {
          p300SingleId: true
        }
      }
    })
  })

  test('Single-channel: pipette already has tip, so tip will be replaced.', () => {
    const result = pickUpTip('p300SingleId', {
      ...robotInitialState,
      tipState: {
        tipracks: {
          ...robotInitialState.tipState.tipracks,
          tiprack1Id: {
            ...filledTiprackWells,
            A1: false
          }
        },
        pipettes: {
          p300SingleId: true
        }
      }
    })

    expect(result.nextCommands).toEqual([
      {
        command: 'drop-tip',
        pipette: 'p300SingleId',
        labware: 'trashId',
        well: 'A1'
      },
      {
        command: 'pick-up-tip',
        pipette: 'p300SingleId',
        labware: 'tiprack1Id',
        well: 'B1'
      }
    ])

    expect(result.nextRobotState).toEqual({
      ...robotInitialState,
      tipState: {
        tipracks: {
          ...robotInitialState.tipState.tipracks,
          tiprack1Id: {
            ...filledTiprackWells,
            A1: false,
            B1: false
          }
        },
        pipettes: {
          p300SingleId: true
        }
      }
    })
  })

  test('Single-channel: used all tips in first rack, move to second rack', () => {
    const result = pickUpTip('p300SingleId', {
      ...robotInitialState,
      tipState: {
        tipracks: {
          ...robotInitialState.tipState.tipracks,
          tiprack1Id: {...emptyTiprackWells}
        },
        pipettes: {
          p300SingleId: false
        }
      }
    })

    expect(result.nextCommands).toEqual([{
      command: 'pick-up-tip',
      pipette: 'p300SingleId',
      labware: 'tiprack10Id',
      well: 'A1'
    }])

    expect(result.nextRobotState).toEqual({
      ...robotInitialState,
      tipState: {
        tipracks: {
          ...robotInitialState.tipState.tipracks,
          tiprack1Id: {
            ...emptyTiprackWells
          },
          tiprack10Id: {
            ...filledTiprackWells,
            A1: false
          }
        },
        pipettes: {
          p300SingleId: true
        }
      }
    })
  })
})

describe.skip('pickUpTip: multi-channel', () => {
  // TODO add tests immediately!
})
