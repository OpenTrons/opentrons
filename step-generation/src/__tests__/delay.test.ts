import { describe, it, expect } from 'vitest'
import { delay } from '../commandCreators/atomic/delay'
import { getSuccessResult } from '../fixtures'

const getRobotInitialState = (): any => {
  // This particular state shouldn't matter for delay
  return {}
}

// neither should InvariantContext
const invariantContext: any = {}
describe('delay', () => {
  it('should delay until the user clicks resume', () => {
    const robotInitialState = getRobotInitialState()
    const message = 'delay indefinitely message'
    const result = delay({ message }, invariantContext, robotInitialState)
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      {
        commandType: 'waitForResume',
        key: expect.any(String),
        params: {
          message,
        },
      },
    ])
    expect(res.python).toEqual(`protocol.pause("delay indefinitely message")`)
  })

  it('should delay for a given duration', () => {
    const robotInitialState = getRobotInitialState()
    const message = 'delay 95.5 secs message'
    const result = delay(
      { message, seconds: 95.5 },
      invariantContext,
      robotInitialState
    )
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      {
        commandType: 'waitForDuration',
        key: expect.any(String),
        params: {
          seconds: 95.5,
          message,
        },
      },
    ])
    expect(res.python).toEqual(
      `protocol.delay(seconds=95.5, msg="delay 95.5 secs message")`
    )
  })

  it('should delay with no message', () => {
    const robotInitialState = getRobotInitialState()
    const result = delay({ seconds: 12.3 }, invariantContext, robotInitialState)
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      {
        commandType: 'waitForDuration',
        key: expect.any(String),
        params: {
          seconds: 12.3,
        },
      },
    ])
    expect(res.python).toEqual(`protocol.delay(seconds=12.3)`)
  })
})
