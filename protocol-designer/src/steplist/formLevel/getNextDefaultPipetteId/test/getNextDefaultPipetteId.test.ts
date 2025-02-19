import { describe, it, expect } from 'vitest'
import { getNextDefaultPipetteId } from '../'
import type { FormData, StepIdType } from '/protocol-designer/form-types'
import type { PipetteOnDeck } from '/protocol-designer/step-forms'

describe('getNextDefaultPipetteId', () => {
  describe('no previous forms', () => {
    const testCases: Array<{
      testMsg: string
      equippedPipettesById: Record<string, PipetteOnDeck>
      expected: string | null
    }> = [
      {
        testMsg: 'both pipettes present: use left pipette',
        equippedPipettesById: {
          leftId: {
            id: 'leftId',
            mount: 'left',
          } as any,
          rightId: {
            id: 'rightId',
            mount: 'right',
          } as any,
        },
        expected: 'leftId',
      },
      {
        testMsg: 'right only: use right',
        equippedPipettesById: {
          rightId: {
            id: 'rightId',
            mount: 'right',
          } as any,
        },
        expected: 'rightId',
      },
    ]
    testCases.forEach(({ testMsg, equippedPipettesById, expected }) => {
      it(testMsg, () => {
        const savedForms = {}
        const orderedStepIds: string[] = []
        const result = getNextDefaultPipetteId(
          savedForms,
          orderedStepIds,
          equippedPipettesById
        )
        expect(result).toBe(expected)
      })
    })
  })
  describe('with previous forms', () => {
    const testCases = [
      {
        testMsg: 'last used pipette',
        orderedStepIds: ['a', 'a', 'b'],
        expected: 'pipetteId_B',
      },
      {
        testMsg: 'no previous forms use pipettes',
        orderedStepIds: ['x', 'x', 'x'],
        expected: 'defaultId',
      },
      {
        testMsg: 'mix of steps with and without pipettes',
        orderedStepIds: ['x', 'a', 'x'],
        expected: 'pipetteId_A',
      },
      {
        testMsg: 'missing steps (no key in savedForms)',
        orderedStepIds: ['missingStep', 'a', 'missingStep', 'b', 'missingStep'],
        expected: 'pipetteId_B',
      },
      {
        testMsg: 'only missing steps',
        orderedStepIds: ['missingStep', 'missingStep'],
        expected: 'defaultId',
      },
    ]
    testCases.forEach(({ testMsg, orderedStepIds, expected }) => {
      it(testMsg, () => {
        const savedForms: Record<StepIdType, FormData> = {
          a: {
            pipette: 'pipetteId_A',
          } as any,
          b: {
            pipette: 'pipetteId_B',
          } as any,
          x: {} as any, // no 'pipette' key, eg a Pause step
        }
        const equippedPipettesById: Record<string, PipetteOnDeck> = {
          // @ts-expect-error(sa, 2021-6-14): missing properties for type PipetteOnDeck
          defaultId: {
            id: 'defaultId',
            mount: 'left',
          },
        }
        const result = getNextDefaultPipetteId(
          savedForms,
          orderedStepIds,
          equippedPipettesById
        )
        expect(result).toBe(expected)
      })
    })
  })
})
