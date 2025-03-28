import * as StepGeneration from '@opentrons/step-generation'

export const commandCreatorFromStepArgs = (
  args: StepGeneration.CommandCreatorArgs
): StepGeneration.CurriedCommandCreator | null => {
  switch (args.commandCreatorFnName) {
    case 'consolidate': {
      return StepGeneration.curryCommandCreator(
        StepGeneration.consolidate,
        args
      )
    }

    case 'delay': {
      return StepGeneration.curryCommandCreator(StepGeneration.delay, args)
    }

    case 'distribute':
      return StepGeneration.curryCommandCreator(StepGeneration.distribute, args)

    case 'transfer':
      return StepGeneration.curryCommandCreator(StepGeneration.transfer, args)

    case 'mix':
      return StepGeneration.curryCommandCreator(StepGeneration.mix, args)

    case 'moveLabware': {
      return StepGeneration.curryCommandCreator(
        StepGeneration.moveLabware,
        args
      )
    }

    case 'engageMagnet':
      return StepGeneration.curryCommandCreator(
        StepGeneration.engageMagnet,
        args
      )

    case 'disengageMagnet':
      return StepGeneration.curryCommandCreator(
        StepGeneration.disengageMagnet,
        args
      )

    case 'setTemperature':
      return StepGeneration.curryCommandCreator(
        StepGeneration.setTemperature,
        args
      )

    case 'deactivateTemperature':
      return StepGeneration.curryCommandCreator(
        StepGeneration.deactivateTemperature,
        args
      )

    case 'waitForTemperature':
      return StepGeneration.curryCommandCreator(
        StepGeneration.waitForTemperature,
        args
      )

    case 'thermocyclerProfile':
      return StepGeneration.curryCommandCreator(
        StepGeneration.thermocyclerProfileStep,
        args
      )

    case 'thermocyclerState':
      return StepGeneration.curryCommandCreator(
        StepGeneration.thermocyclerStateStep,
        args
      )
    case 'heaterShaker':
      return StepGeneration.curryCommandCreator(
        StepGeneration.heaterShaker,
        args
      )
    case 'comment':
      return StepGeneration.curryCommandCreator(StepGeneration.comment, args)
    case 'absorbanceReaderOpenLid':
      return StepGeneration.curryCommandCreator(
        StepGeneration.absorbanceReaderOpenLid,
        args
      )
    case 'absorbanceReaderCloseLid':
      return StepGeneration.curryCommandCreator(
        StepGeneration.absorbanceReaderCloseLid,
        args
      )
    case 'absorbanceReaderRead':
      return StepGeneration.curryCommandCreator(
        StepGeneration.absorbanceReaderCloseRead,
        args
      )
    case 'absorbanceReaderInitialize':
      return StepGeneration.curryCommandCreator(
        StepGeneration.absorbanceReaderCloseInitialize,
        args
      )
  }
  // @ts-expect-error we've exhausted all command creators, but keeping this console warn
  // for when we impelement the next command creator
  console.warn(`unhandled commandCreatorFnName: ${args.commandCreatorFnName}`)
  return null
}
