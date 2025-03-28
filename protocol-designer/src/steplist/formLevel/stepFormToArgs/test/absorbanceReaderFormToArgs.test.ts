import { it, describe, expect } from 'vitest'
import { absorbanceReaderFormToArgs } from '../absorbanceReaderFormToArgs'
import type { HydratedAbsorbanceReaderFormData } from '../../../../form-types'

describe('absorbanceReaderFormToArgs', () => {
  it('returns absorbance reader initialize command creator for single mode with reference', () => {
    const formData: HydratedAbsorbanceReaderFormData = {
      absorbanceReaderFormType: 'absorbanceReaderInitialize',
      fileName: null,
      id: 'stepId',
      lidOpen: null,
      mode: 'single',
      moduleId: 'absorbanceReaderId',
      referenceWavelength: '500',
      referenceWavelengthActive: true,
      stepName: 'absorbance reader step',
      stepDetails: '',
      stepType: 'absorbanceReader',
      wavelengths: ['450'],
    }

    const expected = {
      moduleId: 'absorbanceReaderId',
      commandCreatorFnName: 'absorbanceReaderInitialize',
      measureMode: 'single',
      sampleWavelengths: [450],
      referenceWavelength: 500,
      description: '',
      name: 'absorbance reader step',
    }
    expect(absorbanceReaderFormToArgs(formData)).toEqual(expected)
  })
  it('returns absorbance reader initialize command creator for single mode with reference, ignorning wavelengths for i > 0', () => {
    const formData: HydratedAbsorbanceReaderFormData = {
      absorbanceReaderFormType: 'absorbanceReaderInitialize',
      fileName: null,
      id: 'stepId',
      lidOpen: null,
      mode: 'single',
      moduleId: 'absorbanceReaderId',
      referenceWavelength: '500',
      referenceWavelengthActive: true,
      stepName: 'absorbance reader step',
      stepDetails: '',
      stepType: 'absorbanceReader',
      wavelengths: ['450', '600'],
    }

    const expected = {
      moduleId: 'absorbanceReaderId',
      commandCreatorFnName: 'absorbanceReaderInitialize',
      measureMode: 'single',
      sampleWavelengths: [450],
      referenceWavelength: 500,
      description: '',
      name: 'absorbance reader step',
    }
    expect(absorbanceReaderFormToArgs(formData)).toEqual(expected)
  })
  it('returns absorbance reader initialize command creator for single mode without reference active', () => {
    const formData: HydratedAbsorbanceReaderFormData = {
      absorbanceReaderFormType: 'absorbanceReaderInitialize',
      fileName: null,
      id: 'stepId',
      lidOpen: null,
      mode: 'single',
      moduleId: 'absorbanceReaderId',
      referenceWavelength: '500',
      referenceWavelengthActive: false,
      stepName: 'absorbance reader step',
      stepDetails: '',
      stepType: 'absorbanceReader',
      wavelengths: ['450'],
    }

    const expected = {
      moduleId: 'absorbanceReaderId',
      commandCreatorFnName: 'absorbanceReaderInitialize',
      measureMode: 'single',
      sampleWavelengths: [450],
      description: '',
      name: 'absorbance reader step',
    }
    expect(absorbanceReaderFormToArgs(formData)).toEqual(expected)
  })
  it('returns absorbance reader initialize command creator for multi mode', () => {
    const formData: HydratedAbsorbanceReaderFormData = {
      absorbanceReaderFormType: 'absorbanceReaderInitialize',
      fileName: null,
      id: 'stepId',
      lidOpen: null,
      mode: 'multi',
      moduleId: 'absorbanceReaderId',
      referenceWavelength: null,
      referenceWavelengthActive: false,
      stepName: 'absorbance reader step',
      stepDetails: '',
      stepType: 'absorbanceReader',
      wavelengths: ['450', '600'],
    }

    const expected = {
      moduleId: 'absorbanceReaderId',
      commandCreatorFnName: 'absorbanceReaderInitialize',
      measureMode: 'multi',
      sampleWavelengths: [450, 600],
      description: '',
      name: 'absorbance reader step',
    }
    expect(absorbanceReaderFormToArgs(formData)).toEqual(expected)
  })
  it('returns absorbance reader read command creator', () => {
    const formData: HydratedAbsorbanceReaderFormData = {
      absorbanceReaderFormType: 'absorbanceReaderRead',
      fileName: 'output_path.csv',
      id: 'stepId',
      lidOpen: null,
      mode: 'multi',
      moduleId: 'absorbanceReaderId',
      referenceWavelength: null,
      referenceWavelengthActive: false,
      stepName: 'absorbance reader step',
      stepDetails: '',
      stepType: 'absorbanceReader',
      wavelengths: [],
    }

    const expected = {
      moduleId: 'absorbanceReaderId',
      commandCreatorFnName: 'absorbanceReaderRead',
      fileName: 'output_path.csv',
      description: '',
      name: 'absorbance reader step',
    }
    expect(absorbanceReaderFormToArgs(formData)).toEqual(expected)
  })
  it('returns absorbance reader lid command creator to open lid', () => {
    const formData: HydratedAbsorbanceReaderFormData = {
      absorbanceReaderFormType: 'absorbanceReaderLid',
      fileName: null,
      id: 'stepId',
      lidOpen: true,
      mode: 'single',
      moduleId: 'absorbanceReaderId',
      referenceWavelength: null,
      referenceWavelengthActive: false,
      stepName: 'absorbance reader step',
      stepDetails: '',
      stepType: 'absorbanceReader',
      wavelengths: [],
    }

    const expected = {
      moduleId: 'absorbanceReaderId',
      commandCreatorFnName: 'absorbanceReaderOpenLid',
      description: '',
      name: 'absorbance reader step',
    }
    expect(absorbanceReaderFormToArgs(formData)).toEqual(expected)
  })
  it('returns absorbance reader lid command creator to close lid', () => {
    const formData: HydratedAbsorbanceReaderFormData = {
      absorbanceReaderFormType: 'absorbanceReaderLid',
      fileName: null,
      id: 'stepId',
      lidOpen: false,
      mode: 'single',
      moduleId: 'absorbanceReaderId',
      referenceWavelength: null,
      referenceWavelengthActive: false,
      stepName: 'absorbance reader step',
      stepDetails: '',
      stepType: 'absorbanceReader',
      wavelengths: [],
    }

    const expected = {
      moduleId: 'absorbanceReaderId',
      commandCreatorFnName: 'absorbanceReaderCloseLid',
      description: '',
      name: 'absorbance reader step',
    }
    expect(absorbanceReaderFormToArgs(formData)).toEqual(expected)
  })
})
