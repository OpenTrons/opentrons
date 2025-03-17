import type { UseLPCCommandsResult } from '/app/organisms/LabwarePositionCheck/hooks'
import type { LPCWizardFlexProps } from '/app/organisms/LabwarePositionCheck/LPCWizardFlex'
import type { LPCStep } from '/app/redux/protocol-runs'
import type { UseLPCHeaderCommandsResult } from '/app/organisms/LabwarePositionCheck/hooks/useLPCCommands/useLPCHeaderCommands'

export type LPCWizardContentProps = Pick<LPCWizardFlexProps, 'runId'> & {
  proceedStep: (toStep?: LPCStep) => void
  goBackLastStep: () => void
  commandUtils: UseLPCCommandsResult & {
    headerCommands: UseLPCHeaderCommandsResult
  }
}
