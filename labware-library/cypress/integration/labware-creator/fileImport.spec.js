import jszip from 'jszip'
import { expectDeepEqual } from '@opentrons/shared-data/js/cypressUtils'

const importedLabwareFile = 'TestLabwareDefinition.json'
const pythonFileFixture = 'TestLabwareProtocol.py'

context('File Import', () => {
  before(() => {
    cy.visit('/create')
    cy.viewport('macbook-15')
    cy.contains('NO').click({ force: true })
  })

  it('drags in a file', () => {
    cy.fixture(importedLabwareFile, 'utf8').then(fileJson => {
      const fileContent = JSON.stringify(fileJson)
      cy.get('[class*="_file_drop__"]').upload(
        {
          fileContent,
          fileName: importedLabwareFile,
          mimeType: 'application/json',
          encoding: 'utf8',
        },
        { subjectType: 'drag-n-drop', force: true }
      )
    })
  })

  it('contains a button to the testing guide', () => {
    cy.contains('view test guide')
      .should('have.prop', 'href')
      .and('to.have.string', 'labwareDefinition_testGuide')
  })

  it('does has a preview image', () => {
    cy.contains('Add missing info to see labware preview').should('not.exist')
  })

  it('tests regularity', () => {
    cy.get("input[name='homogeneousWells'][value='true']").should('be.checked')
  })

  it('tests footprint', () => {
    cy.get("input[name='footprintXDimension'][value='127']").should('exist')
    cy.get("input[name='footprintYDimension'][value='85']").should('exist')
  })

  it('tests height', () => {
    cy.get("input[name='labwareZDimension'][value='5']").should('exist')
  })

  describe('Grid tests', () => {
    it('tests number of rows', () => {
      cy.get("input[name='gridRows'][value='3']").should('exist')
    })

    it('tests are all of your rows evenly spaced', () => {
      cy.get("input[name='regularRowSpacing'][value='true']").should('exist')
    })

    it('tests number of columns', () => {
      cy.get("input[name='gridColumns'][value='5']").should('exist')
    })

    it('tests are all of your columns evenly spaced', () => {
      cy.get("input[name='regularColumnSpacing'][value='true']").should('exist')
    })
  })

  it('tests volume', () => {
    cy.get("input[name='wellVolume'][value='5']").should('exist')
  })

  it('tests well shape', () => {
    cy.get("input[name='wellShape'][value='circular']").should('exist')
    cy.get("input[name='wellDiameter'][value='5']").should('exist')
  })

  it('tests well bottom shape and depth', () => {
    cy.get("input[name='wellBottomShape'][value='flat']").should('exist')
    cy.get("img[src*='_flat.']").should('exist')
    cy.get("img[src*='_round.']").should('not.exist')
    cy.get("img[src*='_v.']").should('not.exist')
    cy.get("input[name='wellDepth'][value='5']").should('exist')
  })

  it('tests well spacing', () => {
    cy.get("input[name='gridSpacingX'][value='25']").should('exist')
    cy.get("input[name='gridSpacingY'][value='25']").should('exist')
  })

  it('tests grid offset', () => {
    cy.get("input[name='gridOffsetX'][value='10']").should('exist')
    cy.get("input[name='gridOffsetY'][value='10']").should('exist')
  })

  it('tests the file export', () => {
    // Brand info
    cy.get("input[name='brand'][value='TestPro']").should('exist')
    cy.get("input[name='brandId'][value='001']").should('exist')

    // File info
    cy.get("input[placeholder='TestPro 15 Well Plate 5 µL']").should('exist')
    cy.get("input[placeholder='testpro_15_wellplate_5ul']").should('exist')

    // Test pipette
    // TODO(IL, 2021-05-15): give Dropdown component semantic selectors for E2E
    cy.get('label')
      .contains('Test Pipette')
      .children()
      .first()
      .trigger('mousedown')
    cy.get('*[class^="Dropdown__option_label"]')
      .contains('P10 Single GEN1')
      .click()

    // All fields present
    cy.get('button[class*="_export_button_"]').click({ force: true })
    cy.contains(
      'Please resolve all invalid fields in order to export the labware definition'
    ).should('not.exist')

    cy.window()
      .its('__lastSavedBlobZip__')
      .should('be.a', 'blob') // wait until we get the blob
      .then(blob => jszip.loadAsync(blob)) // load blob into ZipObject
      .then(zipObject => {
        const jsonFiles = zipObject.file(/.*\.json$/)
        expect(jsonFiles).to.have.lengthOf(1)
        cy.wrap(jsonFiles[0])
          .invoke('async', 'string')
          .then(jsonFile => {
            cy.fixture(importedLabwareFile).then(expected => {
              // TODO(IL, 2020/04/13): use deep equal util from PD cypress tests
              expectDeepEqual(assert, JSON.parse(jsonFile), expected)
            })
          })

        const pythonFiles = zipObject.file(/.*\.py$/)
        expect(pythonFiles).to.have.lengthOf(1)
        cy.wrap(pythonFiles[0].async('string')).then(contents => {
          cy.fixture(pythonFileFixture).then(expected => {
            expect(contents).to.equal(expected)
          })
        })
      })

    cy.window()
      .its('__lastSavedFileName__')
      .should('equal', 'testpro_15_wellplate_5ul.zip')
  })
})
