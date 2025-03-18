import {
    ThermocylerEditor,
    ThermoProfile,
    ThermoProfileSteps,
    ThermoState,
    ThermoVerifications,
  } from '../support/Thermocycler'
  import { TestFilePath, getTestFile } from '../support/TestFiles'
  import { verifyImportProtocolPage } from '../support/Import'
  import { StepBuilder } from '../support/StepBuilder'
  
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
      steps.add(ThermocylerEditor.SelectThermocyclerStep())
      steps.add(ThermoVerifications.VerifyStepEditorMenu())
      steps.add(ThermocylerEditor.StepEditor('1', 'Duplicate step'))
      steps.add(ThermocylerEditor.StepEditor('2', 'Delete step'))
      steps.add(ThermoVerifications.VerifyDeleteStep())
      steps.add(ThermocylerEditor.SelectThermocyclerStep())
      steps.add(ThermocylerEditor.StepEditor('1', 'Edit step'))
      steps.add(ThermoVerifications.VerifyPartOne())
      steps.add(ThermocylerEditor.SelectProfileOrState('state'))
      steps.add(ThermoVerifications.VerifyThermoState())
      steps.add(ThermocylerEditor.BlockTempOnOff('active'))
      steps.add(ThermoState.BlockTempInput('99'))
      steps.add(ThermocylerEditor.BlockTempOnOff('deactivate'))
      steps.add(ThermocylerEditor.BlockTempOnOff('active'))
      steps.add(ThermoState.BlockTempInput('15'))
      steps.add(ThermocylerEditor.LidTempOnOff('active'))
      steps.add(ThermoState.LidTempInput('37'))
      steps.add(ThermocylerEditor.LidTempOnOff('deactivate'))
      steps.add(ThermocylerEditor.LidTempOnOff('active'))
      steps.add(ThermoState.LidTempInput('110'))
      steps.add(ThermocylerEditor.LidOpenClosed('closed'))
      steps.add(ThermocylerEditor.LidOpenClosed('open'))
      steps.add(ThermocylerEditor.LidOpenClosed('closed'))
      steps.add(ThermocylerEditor.BackButton())
      steps.add(ThermocylerEditor.SelectProfileOrState('state'))
      steps.add(ThermoVerifications.VerifyOptionsPersist('state'))
      steps.add(ThermocylerEditor.BackButton())
      steps.add(ThermocylerEditor.SelectProfileOrState('profile'))
      steps.add(ThermoVerifications.VerifyThermoProfile())
      steps.add(ThermoProfile.WellVolumeInput('99'))
      steps.add(ThermoProfile.LidTempInput('40'))
      steps.add(ThermocylerEditor.BlockTempOnOff('active'))
      steps.add(ThermoProfile.BlockTempHoldInput('90'))
      steps.add(ThermocylerEditor.LidTempOnOff('active'))
      steps.add(ThermoProfile.LidTempHoldInput('40'))
      steps.add(ThermocylerEditor.LidOpenClosed('open'))
      steps.add(ThermocylerEditor.BackButton())
      steps.add(ThermocylerEditor.SelectProfileOrState('profile'))
      steps.add(ThermoVerifications.VerifyOptionsPersist('profile'))
      steps.add(ThermoVerifications.VerifyProfileSteps())
      steps.add(ThermoProfileSteps.AddCycle())
      steps.add(ThermoProfileSteps.DeleteCycleOrStep())
      steps.add(ThermoProfileSteps.AddCycle())
      steps.add(
        ThermoProfileSteps.CreateStep(
          'cycleStep',
          0,
          'cycle test 1',
          '50',
          '05:00',
          '3'
        )
      )
      steps.add(ThermoProfileSteps.AddCycleStep())
      steps.add(
        ThermoProfileSteps.CreateStep(
          'cycleStep',
          1,
          'cycle test 2',
          '45',
          '05:55'
        )
      )
      steps.add(ThermoProfileSteps.AddCycleStep())
      steps.add(ThermoProfileSteps.DeleteCycleStep(2))
      steps.add(ThermoProfileSteps.AddCycleStep())
      steps.add(
        ThermoProfileSteps.CreateStep(
          'cycleStep',
          2,
          'cycle test 3',
          '35',
          '03:33'
        )
      )
      steps.add(ThermoProfileSteps.SaveCycleOrStep())
      steps.add(ThermoProfileSteps.AddStep())
      steps.add(
        ThermoProfileSteps.CreateStep('addStep', NaN, 'add test 1', '35', '03:33')
      )
      steps.add(ThermoProfileSteps.DeleteCycleOrStep())
      steps.add(ThermoProfileSteps.AddStep())
      steps.add(
        ThermoProfileSteps.CreateStep('addStep', NaN, 'add test 2', '35', '03:33')
      )
      steps.add(ThermoProfileSteps.SaveCycleOrStep())
      steps.add(ThermoProfileSteps.AddStep())
      steps.add(
        ThermoProfileSteps.CreateStep('addStep', NaN, 'add test 3', '35', '03:33')
      )
      steps.add(ThermoProfileSteps.SaveCycleOrStep())
      steps.add(ThermocylerEditor.SaveButton())
      steps.add(ThermocylerEditor.SaveButton())
      steps.execute()
    })
  })
  