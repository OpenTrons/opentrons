import { vi } from 'vitest'

import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'

export const mockLPCContentProps: LPCWizardContentProps = {
  runId: 'MOCK_RUN_ID',
  commandUtils: {} as any,
  proceedStep: vi.fn(),
  goBackLastStep: vi.fn(),
}
