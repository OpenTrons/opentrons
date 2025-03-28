// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { StepThunk } from './StepBuilder'
/**
 * UniversalSteps is an object containing high-level or "universal" actions
 * that might be used across multiple tests (e.g., snapshots, clearing caches).
 */
export const UniversalSteps = {
  /**
   * Placeholder for a future visual testing snapshot.
   * In a real implementation, you might integrate with a visual diff tool
   * or screenshot approach here.
   */
  Snapshot: (): StepThunk => ({
    call: () => {
      // Placeholder code for taking a snapshot
      // e.g., cy.screenshot() or a call to a third-party visual testing service
    },
  }),
}
