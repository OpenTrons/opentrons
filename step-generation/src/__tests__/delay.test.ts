import { delay } from '../commandCreators/atomic/delay'
import { PauseArgs } from '../types'
import { getSuccessResult } from '../fixtures'

const getRobotInitialState = (): any => {
  // This particular state shouldn't matter for delay
  return {}
}

// neither should InvariantContext
const invariantContext: any = {}
let mixInArgs: PauseArgs
beforeEach(() => {
  mixInArgs = {
    commandCreatorFnName: 'delay',
    meta: null,
    name: 'Delay Test',
    description: 'test blah blah',
    wait: true,
  }
})
describe('delay indefinitely', () => {
  it('...', () => {
    const robotInitialState = getRobotInitialState()
    const message = 'delay indefinitely message'
    const result = delay(
      { ...mixInArgs, message, wait: true },
      invariantContext,
      robotInitialState
    )
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      {
        commandType: 'delay',
        params: {
          wait: true,
          message,
        },
      },
    ])
  })
})
describe('delay for a given time', () => {
  it('...', () => {
    const robotInitialState = getRobotInitialState()
    const message = 'delay 95.5 secs message'
    const result = delay(
      { ...mixInArgs, message, wait: 95.5 },
      invariantContext,
      robotInitialState
    )
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      {
        commandType: 'delay',
        params: {
          wait: 95.5,
          message,
        },
      },
    ])
  })
})
