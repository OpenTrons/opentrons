import {
  ThermocyclerEditor,
  ThermoProfile,
  ThermoProfileSteps,
  ThermoState,
  ThermoVerifications,
} from '../support/Thermocycler'
import { TestFilePath, getTestFile } from '../support/TestFiles'
import { verifyImportProtocolPage } from '../support/Import'
import { StepBuilder } from '../support/StepBuilder'
import { TimelineSteps } from '../support/Timeline'

describe('Redesigned Thermocycler Set Up Steps - Happy Path', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.closeAnalyticsModal()
    cy.closeReleaseNotesModal()
    const protocol = getTestFile(TestFilePath.DoItAllV8)
    cy.importProtocol(protocol.path)
    verifyImportProtocolPage(protocol)
    cy.contains('Edit protocol').click()
    cy.contains('Protocol steps').click()
  })

  it('It should verify the working function of thermocycler set up', () => {
    const steps = new StepBuilder()
    steps.add(
      TimelineSteps.SelectItemMenuOption('1. Thermocycler', 'Edit step')
    )
    steps.add(ThermoVerifications.VerifyPartOne())
    steps.add(ThermocyclerEditor.SelectProfileOrState('state'))
    steps.add(ThermoVerifications.VerifyThermoState())
    steps.add(ThermocyclerEditor.BlockTempOnOff('active'))
    steps.add(ThermoState.BlockTempInput('99'))
    steps.add(ThermocyclerEditor.BlockTempOnOff('deactivate'))
    steps.add(ThermocyclerEditor.BlockTempOnOff('active'))
    steps.add(ThermoState.BlockTempInput('15'))
    steps.add(ThermocyclerEditor.LidTempOnOff('active'))
    steps.add(ThermoState.LidTempInput('37'))
    steps.add(ThermocyclerEditor.LidTempOnOff('deactivate'))
    steps.add(ThermocyclerEditor.LidTempOnOff('active'))
    steps.add(ThermoState.LidTempInput('110'))
    steps.add(ThermocyclerEditor.LidOpenClosed('closed'))
    steps.add(ThermocyclerEditor.LidOpenClosed('open'))
    steps.add(ThermocyclerEditor.LidOpenClosed('closed'))
    steps.add(ThermocyclerEditor.BackButton())
    steps.add(ThermocyclerEditor.SelectProfileOrState('state'))
    steps.add(ThermoVerifications.VerifyOptionsPersist('state'))
    steps.add(ThermocyclerEditor.BackButton())
    steps.add(ThermocyclerEditor.SelectProfileOrState('profile'))
    steps.add(ThermoVerifications.VerifyThermoProfile())
    steps.add(ThermoProfile.WellVolumeInput('99'))
    steps.add(ThermoProfile.LidTempInput('40'))
    steps.add(ThermocyclerEditor.BlockTempOnOff('active'))
    steps.add(ThermoProfile.BlockTempHoldInput('90'))
    steps.add(ThermocyclerEditor.LidTempOnOff('active'))
    steps.add(ThermoProfile.LidTempHoldInput('40'))
    steps.add(ThermocyclerEditor.LidOpenClosed('open'))
    steps.add(ThermocyclerEditor.BackButton())
    steps.add(ThermocyclerEditor.SelectProfileOrState('profile'))
    steps.add(ThermoVerifications.VerifyOptionsPersist('profile'))
    steps.add(ThermoVerifications.VerifyProfileSteps())
    steps.add(ThermoProfileSteps.AddCycle())
    steps.add(ThermoProfileSteps.DeleteCycle(0))
    steps.add(ThermoProfileSteps.AddCycle())
    steps.add(ThermoProfileSteps.SetCycleCount(0, '3'))
    steps.add(ThermoProfileSteps.AddCycleStep(0))
    steps.add(
      ThermoProfileSteps.FillCycleStep({
        cycle: 0,
        step: 0,
        stepName: 'cycle test 1',
        temp: '50',
        time: '05:00',
      })
    )
    steps.add(ThermoProfileSteps.AddCycleStep(0))
    steps.add(
      ThermoProfileSteps.FillCycleStep({
        cycle: 0,
        step: 1,
        stepName: 'cycle test 2',
        temp: '45',
        time: '05:55',
      })
    )
    steps.add(ThermoProfileSteps.AddCycleStep(0))
    steps.add(ThermoProfileSteps.DeleteCycleStep(0, 2))
    steps.add(ThermoProfileSteps.AddCycleStep(0))
    steps.add(
      ThermoProfileSteps.FillCycleStep({
        cycle: 0,
        step: 2,
        stepName: 'cycle test 3',
        temp: '35',
        time: '03:33',
      })
    )
    steps.add(ThermoProfileSteps.SaveCycle(0))
    steps.add(ThermoProfileSteps.AddStep())
    steps.add(
      ThermoProfileSteps.FillThermocyclerStep({
        step: 0,
        stepName: 'Thermocycler Step 1',
        temp: '30',
        time: '03:01',
      })
    )
    steps.add(ThermoProfileSteps.DeleteThermocyclerStep(0))
    steps.add(ThermoProfileSteps.AddStep())
    steps.add(
      ThermoProfileSteps.FillThermocyclerStep({
        step: 0,
        stepName: 'Thermocycler step 2',
        temp: '25',
        time: '02:02',
      })
    )
    steps.add(ThermoProfileSteps.SaveThermocyclerStep(0))
    steps.add(ThermoProfileSteps.AddStep())
    steps.add(
      ThermoProfileSteps.FillThermocyclerStep({
        step: 1,
        stepName: 'Thermocycler Step 3',
        temp: '49',
        time: '01:59',
      })
    )
    steps.add(ThermoProfileSteps.SaveThermocyclerStep(1))
    steps.add(ThermocyclerEditor.SaveProfileSteps())
    steps.add(ThermocyclerEditor.SaveButton())
    steps.execute()
  })
})
