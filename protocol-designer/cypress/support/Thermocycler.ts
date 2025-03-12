// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { StepThunk } from './StepBuilder'

enum ThermoContent {
    Cancel = 'Cancel',
    Save = 'Save',
    DeleteStep = 'Delete step',
    DuplicateStep = 'Duplicate step',
    EditStep = 'Edit step',
    Thermocycler = 'Thermocycler',
    Rename = 'Rename',
    ChangeThermoState = 'Change Thermocycler state',
    ProgramThermoProfile = 'Program a Thermocycler profile',
    Continue = 'Continue',
    PartNumber = ' / 2',
    State = 'state',
    Block = 'Block',
    Lid = 'Lid',
    Temperature = 'temperature',
    Position = 'position',
    Deactivate = 'Deactivate',
    Active = 'Active',
    Open = 'Open',
    Closed = 'Closed',
    ProfileSettings = 'Profile settings',
    WellVolume = 'Well volume',
    ProfileSteps = 'Profile steps',
    NoProfileDefined = 'No profile defined',
    EndingHold = 'Ending hold',
    EditProfileSteps = 'Edit Thermocycler profile steps',
    AddCycle = 'Add cycle',
    AddStep = 'Add step',
    NoStepsDefined = 'No steps defined',

}

enum ThermoLocators {
    Button = 'button',
    Div = 'div',
    ThermocyclerEditor = '[data-testid="StepContainer_dcec0c89-338b-453b-a79b-c081830ff138"]',
    StateBlockTempInput = '[name="blockTargetTemp"]',
    StateLidTempInput = '[name="lidTargetTemp"]',
    ListButton = '[data-testid="ListButton_noActive"]',
    Back = 'button:contains("Back")',
    Save = 'button:contains("Save")',
    Cancel = 'button:contains("Cancel")',
    Delete = 'button:contains("Delete")',
    WellVolumeInput = '[name="profileVolume"]',
    ProfileLidTempInput = '[name="profileTargetLidTemp"]',
    BlockTargetTempHold = '[name="blockTargetTempHold"]',
    LidTargetTempHold = '[name="lidTargetTempHold"]',
    SelectorButton = '[data-testid="EmptySelectorButton_container"]',
    AddCycleStep = 'button:contains("Add a cycle step")',
    ButtonSwitch = 'button[role="switch"]',
    CyclesContainer = '.Flex-sc-1qhp8l7-0.IRIsG .Flex-sc-1qhp8l7-0.ijfQYO',
    AddStepContainer = '.Flex-sc-1qhp8l7-0.IRIsG .bJjWDY',
    AddStepInput = '.InputField__StyledInput-sc-1gyyvht-0.cLVzBl'
}

/**
 * Each function returns a StepThunk
 * Add a comment to all records
 */

export const ThermocylerEditor = {
    SelectThermocyclerStep: (): StepThunk => ({
        call: () => {
            cy.contains(ThermoContent.Thermocycler)
                .closest(ThermoLocators.Div)
                .click()
        },
    }),

    /**
     * 
     * "Select Thermocycler Duplicate Step"
     */

    DuplicateThermocylerStep: (): StepThunk => ({
        call: () => {
            cy.contains(ThermoContent.DuplicateStep)
                .click()
        },
    }),

    /**
     * 
     * "Select Thermocycler Delete Step"
     */
    DeleteThermocyclerStep: (): StepThunk => ({
        call: () => {
            cy.contains(ThermoContent.DeleteStep)
                .should('be.visible')
                .click()
        },
    }),

    /**
     * 
     * "Select Thermocycler Back Button"
     */
    BackButton: () : StepThunk => ({
        call: () => {
            cy.get(ThermoLocators.Back)
                .should('be.visible')
                .click()
        }
    }),

    /**
     * 
     * "Select Thermocycler Save Button"
     */
    SaveButton: () : StepThunk => ({
        call: () => {
            cy.get(ThermoLocators.Save)
                .first()
                .should('be.visible')
                .click()
        }
    }),
    /**
     * 
     * "Select Thermocycler Edit Step"
     */
    EditThermocyclerStep: (): StepThunk => ({
        call: () => {
            cy.contains(ThermoContent.EditStep)
                .click()
        },
    }),

    /**
     * 
     * "Coupled Thermocycler function for edit, duplicate, delete"
     */

    StepEditor: (stepNumber: string, editOption : string): StepThunk => ({
        call: () =>{
            cy.log(`*****clicking thermocycler step ${stepNumber} with edit option ${editOption}******`)
            cy.contains(`${stepNumber}. ${ThermoContent.Thermocycler}`)
                .click()
            cy.get('[data-testid^="StepContainer"]')
                .contains(`${stepNumber}. ${ThermoContent.Thermocycler}`)
                .parents('[data-testid^="StepContainer"]')
                .find('button[data-testid^="StepContainer"]')
                .click();
            if (editOption === ThermoContent.EditStep) {
                ThermocylerEditor.EditThermocyclerStep().call()
            } else if (editOption === ThermoContent.DeleteStep) {
                ThermocylerEditor.DeleteThermocyclerStep().call()
            } else if (editOption === ThermoContent.DuplicateStep) {
                ThermocylerEditor.DuplicateThermocylerStep().call()
            }
        },
    }),

    /**
     * 
     * "Function for selecting State or Profile"
     */
    SelectProfileOrState: (partOption : string): StepThunk => ({
        call: () => {
            if (partOption === 'state') {
                cy.get('input[id="Change Thermocycler state"]')
                    .click({force : true})
                cy.contains(ThermoContent.Continue)
                    .click({force: true})
            } else if (partOption === 'profile') {
                cy.get('input[id="Program a Thermocycler profile"]')
                    .click({force : true})
                cy.contains(ThermoContent.Continue)
                    .click({force: true})
            }
        }
    }),

    /**
     * 
     * "Activating or Deactivating Block Temp"
     */
    BlockTempOnOff: ( input : string ): StepThunk => ({
        call: () => {
            if (input === "active") {
                cy.contains(`${ThermoContent.Block} ${ThermoContent.Temperature}`)
                    .parent()
                    .find(ThermoLocators.ButtonSwitch)
                    .should('have.attr', 'aria-checked', 'false')
                    .click()
                    .should('have.attr', 'aria-checked', 'true')
            } else if (input === "deactivate") {
                cy.contains(`${ThermoContent.Block} ${ThermoContent.Temperature}`)
                    .parent()
                    .find(ThermoLocators.ButtonSwitch)
                    .should('have.attr', 'aria-checked', 'true')
                    .click()
                    .should('have.attr', 'aria-checked', 'false')
            }
        },
    }),

    /**
     * 
     * "Activating or Deactivating Lid Temp"
     */
    LidTempOnOff: ( input : string ): StepThunk => ({
        call: () => {
            if (input === "active") {
                cy.get(ThermoLocators.ListButton)
                    .contains(`${ThermoContent.Lid} ${ThermoContent.Temperature}`)
                    .parent()
                    .find(ThermoLocators.ButtonSwitch)
                    .should('have.attr', 'aria-checked', 'false')
                    .click()
                    .should('have.attr', 'aria-checked', 'true')
            } else if (input === "deactivate") {
                cy.get(ThermoLocators.ListButton)
                    .contains(`${ThermoContent.Lid} ${ThermoContent.Temperature}`)
                    .parent()
                    .find(ThermoLocators.ButtonSwitch)
                    .should('have.attr', 'aria-checked', 'true')
                    .click()
                    .should('have.attr', 'aria-checked', 'false')
            }
        },
    }),

    /**
     * 
     * "Open or Close the TC Lid"
     */
    LidOpenClosed: ( input : string ): StepThunk => ({
        call: () => {
            if (input === "open") {
                cy.get(ThermoLocators.ListButton)
                    .contains('Lid position')
                    .parents(ThermoLocators.ListButton) 
                    .find(ThermoLocators.ButtonSwitch)
                    .should('have.attr', 'aria-checked', 'false')
                    .click()
                    .should('have.attr', 'aria-checked', 'true');
            } else if (input === "closed") {
                cy.get(ThermoLocators.ListButton)
                    .contains('Lid position')
                    .parents(ThermoLocators.ListButton) 
                    .find(ThermoLocators.ButtonSwitch) 
                    .should('have.attr', 'aria-checked', 'true') 
                    .click()
                    .should('have.attr', 'aria-checked', 'false');
            }
        },
    }),

}

export const ThermoState = {

    /**
     * 
     * "Input Block Temp"
     */
    BlockTempInput: ( value : string) : StepThunk => ({
        call: () => {
            cy.get(ThermoLocators.StateBlockTempInput)
                .should('exist')
                .type(value)
        }
    }),

    /**
     * 
     * "Input Lid Temp"
     */
    LidTempInput: ( value : string) : StepThunk => ({
        call: () => {
            cy.get(ThermoLocators.StateLidTempInput)
                .should('exist')
                .type(value)
        }
    }),

}

export const ThermoProfile ={

    /**
     * 
     * "Input Well Volume"
     */
    WellVolumeInput: ( value : string ): StepThunk => ({
        call: () => {
            cy.get(ThermoLocators.WellVolumeInput)
                .should('exist')
                .type(value)
        }
    }),

    /**
     * 
     * "Input Lid Temp"
     */
    LidTempInput: ( value : string) : StepThunk => ({
        call: () => {
            cy.get(ThermoLocators.ProfileLidTempInput)
                .should('exist')
                .type(value)
        }
    }),

    /**
     * 
     * "Input Hold Block Temp"
     */
    BlockTempHoldInput: ( value : string) : StepThunk => ({
        call: () => {
            cy.get(ThermoLocators.BlockTargetTempHold)
                .should('exist')
                .type(value)
        }
    }),

    /**
     * 
     * "Input Hold Lid Temp"
     */
    LidTempHoldInput: ( value : string) : StepThunk => ({
        call: () => {
            cy.get(ThermoLocators.LidTargetTempHold)
                .should('exist')
                .type(value)
        }
    })
}

export const ThermoProfileSteps = {

    /**
     * 
     * "Add cycle to profile"
     */
    AddCycle: (): StepThunk => ({
        call: () => {
            cy.get(ThermoLocators.SelectorButton)
                .find('p')
                .contains(ThermoContent.AddCycle)
                .click()
        }
    }),

    /**
     * 
     * "Add step to profile"
     */
    AddStep: (): StepThunk => ({
        call: () => {
            cy.get(ThermoLocators.SelectorButton)
                .find('p')
                .contains(ThermoContent.AddStep)
                .click()
        }
    }),

    /**
     * 
     * "Input information for either cycle step or add step"
     */
    CreateStep: (
        stepType: "cycleStep" | "addStep",
        cycleStep: number,
        name: string,
        temp: string,
        time: string,
        cycles?: string
    ): StepThunk => ({
        call: () => {
            if (cycles){
                cy.log('IF CYCLES****')
                cy.contains('p', 'Number of cycles')
                    .closest('.Flex-sc-1qhp8l7-0.ivRgZg')
                    .find('input') 
                    .type(cycles)
            } 
            if (stepType === "cycleStep") {
                cy.get(ThermoLocators.CyclesContainer)
                    .eq(cycleStep)
                    .within(() => {
                        const values = [name, temp, time];
                        
                        cy.get(ThermoLocators.AddStepInput)
                            .each(($el, index) => {
                                cy.wrap($el).clear().type(values[index]);
                            });
                    });
            } else if (stepType === "addStep") {
                cy.get(ThermoLocators.AddStepContainer)
                    .within(() => {
                        const values = [name, temp, time];
    
                        cy.get(ThermoLocators.AddStepInput)
                            .each(($el, index) => {
                                cy.wrap($el).clear().type(values[index]);
                            });
                    });
            }
        }
    }),

    /**
     * 
     * "Add cycle step to cycle"
     */
    AddCycleStep: (): StepThunk => ({
        call: () => {
            cy.get(ThermoLocators.AddCycleStep).click()
        }
    }),

    /**
     * 
     * "delete cycle step from cycle"
     */
    DeleteCycleStep: (step:number): StepThunk => ({
        call: () => {
            cy.get('.Flex-sc-1qhp8l7-0.ijfQYO')
                .eq(step)
                .find('path[aria-roledescription="close"]')
                .click() 
        }
    }),

    /**
     * 
     * "Delete cycle or step"
     */
    DeleteCycleOrStep: (): StepThunk => ({
        call: () => {
            cy.get(ThermoLocators.Delete).click()
        }
    }),

    /**
     * 
     * "Save cycle or step"
     */
    SaveCycleOrStep: (): StepThunk => ({
        call: () => {
            cy.get('button.Btn-sc-o3dtr1-0.Btn__PrimaryBtn-sc-o3dtr1-1.Btn__NewPrimaryBtn-sc-o3dtr1-3.PrimaryButton-sc-1bbed59-0')
                .contains('Save')
                .click();
        }
    }),
}

export const thermoVerifications = {

    /**
     * 
     * "Verify step editor menu"
     */
    VerifyStepEditorMenu: (): StepThunk => ({
        call: () => {
            cy.get(ThermoLocators.ThermocyclerEditor).click({ multiple : true})
            cy.contains(ThermoContent.EditStep).should('be.visible')
            cy.contains(ThermoContent.DuplicateStep).should('be.visible')
            cy.contains(ThermoContent.DeleteStep).should('be.visible')
        },
    }),

    /**
     * 
     * "Verify TC Header"
     */
    VerifyThermoSetupHeader: (partNum : string): StepThunk => ({
        call: () => {
            cy.contains(`Part ${partNum}${ThermoContent.PartNumber}`)
            .should('exist')
            .should('be.visible')
            cy.contains(ThermoContent.Thermocycler)
            .should('exist')
            .should('be.visible')
            cy.contains(ThermoContent.Rename)
            .should('exist')
            .should('be.visible')
        },
    }),

    /**
     * 
     * "Verify delete step pop out"
     */
    VerifyDeleteStep: (): StepThunk => ({
        call: () => {
            cy.contains(ThermoContent.DeleteStep)
            cy.contains('Are you sure you want to delete this step?')
                .should('exist')
                .should('be.visible')
            cy.get('button')
                .contains(ThermoContent.Cancel)
                .should('exist')
                .should('be.visible')
            cy.get('button')
                .contains(ThermoContent.DeleteStep)
                .should('exist')
                .should('be.visible')         
                .click()
            },
    }),

    /**
     * 
     * "Verify delete step pop out"
     */
    VerifyPartOne: (): StepThunk => ({
        call: () => {            
            cy.log(`*****checking part 1 of TC setup******`)
            thermoVerifications.VerifyThermoSetupHeader('1').call()
            cy.contains(ThermoContent.ChangeThermoState)
            .should('exist')
            .should('be.visible')
            cy.contains(ThermoContent.ProgramThermoProfile)
            .should('exist')
            .should('be.visible')
            cy.contains(ThermoContent.Continue)
            .should('exist')
            .should('be.visible')
        },
    }),

    /**
     * 
     * "Verify TC state options"
     */
    VerifyThermoState: () : StepThunk => ({
       call: () => {
        thermoVerifications.VerifyThermoSetupHeader('2').call()
        cy.contains(`${ThermoContent.Thermocycler} ${ThermoContent.State}`)
            .should('exist')
            .should('be.visible')
        cy.contains(`${ThermoContent.Block} ${ThermoContent.Temperature}`)
            .should('exist')
            .should('be.visible')
            .parent()
            .find('p')
            .contains(ThermoContent.Deactivate)
        cy.contains(`${ThermoContent.Lid} ${ThermoContent.Temperature}`)
            .should('exist')
            .should('be.visible')
            .parent()
            .find('p')
            .contains(ThermoContent.Deactivate)

        cy.get(ThermoLocators.ListButton)
            .find('p')
            .contains(`${ThermoContent.Lid} ${ThermoContent.Position}`)
            .should('exist')
            .should('be.visible')
        cy.get(ThermoLocators.ListButton)
            .find('p')
            .contains(`${ThermoContent.Open}`)
            .should('exist')
            .should('be.visible')
        cy.get('button[aria-label="Deactivate"]').each(($btn, index) => {
            cy.wrap($btn)
                .should('be.visible')
                .and('have.attr', 'aria-checked', 'false');
            })

        cy.get('button[aria-label="Open"]').each(($btn, index) => {
            cy.wrap($btn)
                .should('be.visible')
                .and('have.attr', 'aria-checked', 'true');
            })
       }, 
    }),

    /**
     * 
     * "Verify TC profile options"
     */
    VerifyThermoProfile: () : StepThunk => ({
        call: () => {
            thermoVerifications.VerifyThermoSetupHeader('2').call()
            cy.contains(ThermoContent.ProfileSettings)
                .should('exist')
                .should('be.visible')
            cy.contains(ThermoContent.WellVolume)
                .should('exist')
                .should('be.visible')
            cy.contains(`${ThermoContent.Lid} ${ThermoContent.Temperature}`)
                .should('exist')
                .should('be.visible')
            cy.contains(`${ThermoContent.Block} ${ThermoContent.Temperature}`)
                .should('exist')
                .should('be.visible')
                .parent()
                .find('p')
                .contains(ThermoContent.Deactivate)
            cy.get(ThermoLocators.ListButton)
                .contains(`${ThermoContent.Lid} ${ThermoContent.Temperature}`)
                .should('exist')
                .should('be.visible')
                .parent()
                .find('p')
                .contains(ThermoContent.Deactivate)
            cy.get(ThermoLocators.ListButton)
                .contains(`${ThermoContent.Lid} ${ThermoContent.Position}`)
                .should('exist')
                .should('be.visible')
            cy.contains(ThermoContent.Closed)
                .should('exist')
                .should('be.visible')
        }
    }),

    /**
     * 
     * "Verify state selections persist if you go back and return"
     */
    VerifyOptionsPersist: ( partOption : string ) : StepThunk => ({
        call: () => {
            if (partOption === 'state') {
                cy.get(ThermoLocators.StateBlockTempInput)
                    .should('have.prop', 'value')
                cy.get(ThermoLocators.StateLidTempInput)
                    .should('have.prop', 'value')
                cy.get(ThermoLocators.ListButton)
                    .find('p')
                    .contains(`${ThermoContent.Closed}`)
                    .should('exist')
                    .should('be.visible')
            } else if (partOption === 'profile') {
                cy.get(ThermoLocators.WellVolumeInput)
                    .should('have.prop', 'value')
                cy.get(ThermoLocators.ProfileLidTempInput)
                    .should('have.prop', 'value') 
                cy.get(ThermoLocators.BlockTargetTempHold)
                    .should('have.prop', 'value')
                cy.get(ThermoLocators.LidTargetTempHold)
                    .should('have.prop', 'value')
                cy.get(ThermoLocators.ListButton)
                    .find('p')
                    .contains(`${ThermoContent.Open}`)
                    .should('exist')
                    .should('be.visible') 
            }
        }
    }),

    /**
     * 
     * "Verify profile pop out page"
     */
    VerifyProfileSteps: () : StepThunk => ({
        call: () => {
            cy.get(ThermoLocators.ListButton)
                .find('p')
                .contains(ThermoContent.NoProfileDefined)
                .click()
            cy.contains(ThermoContent.EditProfileSteps)
                .should('exist')
                .should('be.visible')
            cy.contains(ThermoContent.AddCycle)
                .should('exist')
                .should('be.visible')
            cy.contains(ThermoContent.AddStep)
                .should('exist')
                .should('be.visible')
            cy.contains(ThermoContent.NoStepsDefined)
                .should('exist')
                .should('be.visible')
            cy.get(ThermoLocators.Save)
                .should('exist')
                .should('be.visible')
            cy.get(ThermoLocators.Cancel)
                .should('exist')
                .should('be.visible')
        }
    })

}