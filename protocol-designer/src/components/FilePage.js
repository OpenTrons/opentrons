// @flow
import * as React from 'react'
import { Formik } from 'formik'
import { format } from 'date-fns'

import {
  Card,
  FormGroup,
  InputField,
  InstrumentGroup,
  OutlineButton,
  PrimaryButton,
} from '@opentrons/components'
import cx from 'classnames'
import { i18n } from '../localization'
import { resetScrollElements } from '../ui/steps/utils'
import { Portal } from './portals/MainPageModalPortal'
import { EditPipettesModal } from './modals/EditPipettesModal'
import { EditModulesCard } from './modules'
import { EditModules } from './EditModules'
import styles from './FilePage.css'
import modalStyles from '../components/modals/modal.css'
import formStyles from '../components/forms/forms.css'
import type { FormikProps } from 'formik/@flow-typed'
import type { ModuleRealType } from '@opentrons/shared-data'
import type { FileMetadataFields } from '../file-data'
import type { ModulesForEditModulesCard } from '../step-forms'

export type Props = {|
  formValues: FileMetadataFields,
  instruments: React.ElementProps<typeof InstrumentGroup>,
  goToNextPage: () => mixed,
  saveFileMetadata: FileMetadataFields => mixed,
  swapPipettes: () => mixed,
  modules: ModulesForEditModulesCard,
|}

type State = {|
  isEditPipetteModalOpen: boolean,
  moduleToEdit: {|
    moduleType: ModuleRealType,
    moduleId: ?string,
  |} | null,
|}

// TODO(mc, 2020-02-28): explore l10n for these dates
const DATE_ONLY_FORMAT = 'MMM dd, yyyy'
const DATETIME_FORMAT = 'MMM dd, yyyy | h:mm a'

// TODO: Ian 2019-03-15 use i18n for labels
export class FilePage extends React.Component<Props, State> {
  state: State = {
    isEditPipetteModalOpen: false,
    moduleToEdit: null,
  }

  openEditPipetteModal: () => void = () => {
    resetScrollElements()
    this.setState({ isEditPipetteModalOpen: true })
  }

  closeEditPipetteModal: () => void = () =>
    this.setState({ isEditPipetteModalOpen: false })

  handleEditModule: (moduleType: ModuleRealType, moduleId?: string) => void = (
    moduleType,
    moduleId
  ) => {
    resetScrollElements()
    this.setState({
      moduleToEdit: { moduleType: moduleType, moduleId: moduleId },
    })
  }

  closeEditModulesModal: () => void = () => {
    this.setState({
      moduleToEdit: null,
    })
  }

  render(): React.Node {
    const {
      formValues,
      instruments,
      goToNextPage,
      saveFileMetadata,
      swapPipettes,
      modules,
    } = this.props

    return (
      <div className={styles.file_page}>
        <Card title="Information">
          <Formik
            enableReinitialize
            initialValues={formValues}
            onSubmit={saveFileMetadata}
          >
            {({
              handleChange,
              handleSubmit,
              dirty,
              touched,
              values,
            }: FormikProps<FileMetadataFields>) => (
              <form onSubmit={handleSubmit} className={styles.card_content}>
                <div
                  className={cx(
                    formStyles.row_wrapper,
                    formStyles.stacked_row_large
                  )}
                >
                  <FormGroup
                    label="Date Created"
                    className={formStyles.column_1_2}
                  >
                    {values.created && format(values.created, DATE_ONLY_FORMAT)}
                  </FormGroup>

                  <FormGroup
                    label="Last Exported"
                    className={formStyles.column_1_2}
                  >
                    {values.lastModified &&
                      format(values.lastModified, DATETIME_FORMAT)}
                  </FormGroup>
                </div>

                <div
                  className={cx(formStyles.row_wrapper, formStyles.stacked_row)}
                >
                  <FormGroup
                    label="Protocol Name"
                    className={formStyles.column_1_2}
                  >
                    <InputField
                      placeholder="Untitled"
                      name="protocolName"
                      onChange={handleChange}
                      value={values['protocolName']}
                    />
                  </FormGroup>

                  <FormGroup
                    label="Organization/Author"
                    className={formStyles.column_1_2}
                  >
                    <InputField
                      name="author"
                      onChange={handleChange}
                      value={values.author}
                    />
                  </FormGroup>
                </div>

                <FormGroup
                  label="Description"
                  className={formStyles.stacked_row}
                >
                  <InputField
                    name="description"
                    value={values.description}
                    onChange={handleChange}
                  />
                </FormGroup>
                <div className={modalStyles.button_row}>
                  <OutlineButton
                    type="submit"
                    className={styles.update_button}
                    disabled={!dirty}
                  >
                    {dirty ? 'UPDATE' : 'UPDATED'}
                  </OutlineButton>
                </div>
              </form>
            )}
          </Formik>
        </Card>

        <Card title="Pipettes">
          <div className={styles.card_content}>
            <InstrumentGroup {...instruments} showMountLabel />
            <div className={styles.pipette_button_row}>
              <PrimaryButton
                onClick={this.openEditPipetteModal}
                className={styles.edit_button}
                name={'editPipettes'}
              >
                {i18n.t('button.edit')}
              </PrimaryButton>
              <OutlineButton
                onClick={swapPipettes}
                className={styles.swap_button}
                iconName="swap-horizontal"
                name={'swapPipettes'}
              >
                {i18n.t('button.swap')}
              </OutlineButton>
            </div>
          </div>
        </Card>

        <EditModulesCard
          modules={modules}
          openEditModuleModal={this.handleEditModule}
        />

        <div className={modalStyles.button_row}>
          <PrimaryButton
            onClick={goToNextPage}
            className={styles.continue_button}
            iconName="arrow-right"
            name={'continueToLiquids'}
          >
            {i18n.t('button.continue_to_liquids')}
          </PrimaryButton>
        </div>

        <Portal>
          {this.state.isEditPipetteModalOpen && (
            <EditPipettesModal closeModal={this.closeEditPipetteModal} />
          )}
          {this.state.moduleToEdit && (
            <EditModules
              moduleToEdit={this.state.moduleToEdit}
              onCloseClick={this.closeEditModulesModal}
            />
          )}
        </Portal>
      </div>
    )
  }
}
