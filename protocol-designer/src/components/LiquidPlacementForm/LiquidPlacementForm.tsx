// @flow
import * as React from 'react'
import { Formik } from 'formik'
import * as Yup from 'yup'
// TODO: Ian 2018-10-19 move the processors out of steplist (chore)
import * as fieldProcessors from '../../steplist/fieldLevel/processing'
import {
  DropdownField,
  InputField,
  FormGroup,
  OutlineButton,
  PrimaryButton,
} from '@opentrons/components'
import { i18n } from '../../localization'
import styles from './LiquidPlacementForm.css'
import formStyles from '../forms/forms.css'
import stepEditFormStyles from '../StepEditForm/StepEditForm.css'

import { Options } from '@opentrons/components'
import { FormikProps } from 'formik/@flow-typed'

type ValidFormValues = {
  selectedLiquidId: string,
  volume: string,
}

export type LiquidPlacementFormValues = {
  selectedLiquidId: string | null | undefined,
  volume: string | null | undefined,
}

type Props = {
  commonSelectedLiquidId: string | null | undefined,
  commonSelectedVolume: number | null | undefined,
  liquidSelectionOptions: Options,
  selectedWellsMaxVolume: number,
  showForm: boolean,

  cancelForm: () => unknown,
  clearWells: () => unknown | null | undefined,
  saveForm: (liquidPlacementFormValues: LiquidPlacementFormValues) => unknown,
}

export class LiquidPlacementForm extends React.Component<Props> {
  getInitialValues: () => ValidFormValues = () => {
    const { commonSelectedLiquidId, commonSelectedVolume } = this.props
    return {
      selectedLiquidId: commonSelectedLiquidId || '',
      volume: commonSelectedVolume != null ? String(commonSelectedVolume) : '',
    }
  }

  getValidationSchema: () => Yup.Schema<
    {
      selectedLiquidId: string,
      volume: number,
    },
    any
  > = () => {
    const { selectedWellsMaxVolume } = this.props
    return Yup.object().shape({
      selectedLiquidId: Yup.string().required(
        i18n.t('form.generic.error.required', {
          name: i18n.t('form.liquid_placement.liquid'),
        })
      ),
      volume: Yup.number()
        .nullable()
        .required(
          i18n.t('form.generic.error.required', {
            name: i18n.t('form.liquid_placement.volume'),
          })
        )
        .moreThan(0, i18n.t('form.generic.error.more_than_zero'))
        .max(
          selectedWellsMaxVolume,
          i18n.t('form.liquid_placement.volume_exceeded', {
            volume: selectedWellsMaxVolume,
          })
        ),
    })
  }

  handleCancelForm: () => void = () => {
    this.props.cancelForm()
  }

  handleClearWells: () => void = () => {
    this.props.clearWells && this.props.clearWells()
  }

  handleChangeVolume: (
    setFieldValue: (fieldName: string, value: mixed) => mixed
  ) => (e: SyntheticInputEvent<*>) => void = setFieldValue => e => {
    const value: string | null | undefined = e.currentTarget.value
    const masked = fieldProcessors.composeMaskers(
      fieldProcessors.maskToFloat,
      fieldProcessors.onlyPositiveNumbers,
      fieldProcessors.trimDecimals(1)
    )(value)
    setFieldValue('volume', masked)
  }

  handleSubmit: (values: LiquidPlacementFormValues) => void = values => {
    this.props.saveForm(values)
  }

  render(): React.ReactNode {
    const { liquidSelectionOptions, showForm } = this.props
    if (!showForm) return null
    return (
      <div className={formStyles.form}>
        <Formik
          enableReinitialize
          initialValues={this.getInitialValues()}
          onSubmit={this.handleSubmit}
          validationSchema={this.getValidationSchema}
        >
          {({
            handleBlur,
            handleChange,
            handleSubmit,
            errors,
            setFieldValue,
            touched,
            values,
          }: FormikProps<LiquidPlacementFormValues>) => (
            <form onSubmit={handleSubmit}>
              <div className={styles.field_row}>
                <FormGroup
                  label={i18n.t('form.liquid_placement.liquid')}
                  className={styles.liquid_field}
                >
                  <DropdownField
                    name="selectedLiquidId"
                    className={stepEditFormStyles.large_field}
                    options={liquidSelectionOptions}
                    error={
                      touched.selectedLiquidId ? errors.selectedLiquidId : null
                    }
                    value={values.selectedLiquidId}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </FormGroup>
                <FormGroup
                  label={i18n.t('form.liquid_placement.volume')}
                  className={styles.volume_field}
                >
                  <InputField
                    name="volume"
                    units={i18n.t('application.units.microliter')}
                    error={touched.volume ? errors.volume : null}
                    value={values.volume}
                    onChange={this.handleChangeVolume(setFieldValue)}
                    onBlur={handleBlur}
                  />
                </FormGroup>
              </div>

              <div className={styles.button_row}>
                <OutlineButton
                  disabled={!this.props.clearWells}
                  onClick={this.handleClearWells}
                >
                  {i18n.t('button.clear_wells')}
                </OutlineButton>
                <OutlineButton onClick={this.handleCancelForm}>
                  {i18n.t('button.cancel')}
                </OutlineButton>
                <PrimaryButton type="submit">
                  {i18n.t('button.save')}
                </PrimaryButton>
              </div>
            </form>
          )}
        </Formik>
      </div>
    )
  }
}
