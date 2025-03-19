import { describe, it, expect } from 'vitest'
import { comment } from '../commandCreators/atomic/comment'
import { getSuccessResult } from '../fixtures'

describe('comment', () => {
  it('should generate comment command', () => {
    // InvariantContext and RobotState don't matter for comment.
    const invariantContext: any = {}
    const robotInitialState: any = {}

    const message = 'I am a comment'
    const result = comment({ message }, invariantContext, robotInitialState)
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      {
        commandType: 'comment',
        key: expect.any(String),
        params: { message },
      },
    ])
    expect(res.python).toEqual(`protocol.comment("I am a comment")`)
  })
})
