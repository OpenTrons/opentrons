import '../support/commands'
import {
  MixActions,
  MixVerifications,
} from '../support/mixSetting'
import { UniversalActions } from '../support/universalActions'
import { TestFilePath, getTestFile } from '../support/testFiles'
import {
  verifyImportProtocolPage,
} from '../support/import'
import { runSteps } from '../support/StepExecution'
import type { StepsList } from '../support/StepExecution'

describe('Redesigned Mixing Steps - Happy Path', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.closeAnalyticsModal()
    const protocol = getTestFile(TestFilePath.DoItAllV8)
    cy.importProtocol(protocol.path)
    verifyImportProtocolPage(protocol)
    
    // NOTE: vv make this chunk better//
    cy.contains("Edit protocol").click()
    cy.contains("Protocol steps").click()
    cy.get('[id="AddStepButton"]').contains("Add Step").click()
    cy.verifyOverflowBtn()
  });


  it('It should verify the working function of every permutation of mix checkboxes', () => {
    const steps: StepsList = [
      MixActions.SelectMix,
      UniversalActions.Snapshot,
      MixVerifications.PartOne,
      MixActions.SelectLabware,
      MixActions.SelectWellInputField,
      MixVerifications.WellSelectPopout,
      UniversalActions.Snapshot,
      MixActions.Save,
      MixActions.EnterVolume,
      MixActions.EnterMixReps,
      MixActions.SelectTipHandling,
      UniversalActions.Snapshot,
      MixActions.Continue,
      MixVerifications.PartTwoAsp,
      MixActions.AspirateFlowRate,
      MixActions.AspWellOrder,
      MixVerifications.AspWellOrder,
      MixActions.AspMixTipPos,
      MixVerifications.AspMixTipPos,
      MixActions.Delay,
      // MixActions.Save,
      // MixActions.Back,
      // MixActions.Dispense,
      // MixVerifications.PartTwoDisp,
      // MixActions.DispenseFlowRate,
      // MixActions.Delay,
      // MixActions.Blowout,
      // MixActions.TouchTip,
      
    ]
    runSteps(steps)
  });
});

/*
To Add:
MixActions.TipPosSideImageMove,
MixActions.Rename,
MixActions.TipPosTopImageMove,
MixVerification.TipPosCollisionCheck,
MixActions.FlowRateWarning, **for asp and disp
*/