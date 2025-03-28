import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import {
  DIRECTION_COLUMN,
  Divider,
  Flex,
  RadioButton,
  SPACING,
  StyledText,
} from '@opentrons/components'
import {
  ABSORBANCE_READER_INITIALIZE,
  ABSORBANCE_READER_LID,
  ABSORBANCE_READER_READ,
} from '../../../../../../constants'
import { DropdownStepFormField } from '../../../../../../components/molecules'
import { getRobotStateAtActiveItem } from '../../../../../../top-selectors/labware-locations'
import { getAbsorbanceReaderLabwareOptions } from '../../../../../../ui/modules/selectors'
import { hoverSelection } from '../../../../../../ui/steps/actions/actions'
import { useAbsorbanceReaderCommandType } from '../../hooks'
import { getFormErrorsMappedToField } from '../../utils'
import { InitializationSettings } from './InitializationSettings'
import { Initialization } from './Initialization'
import { LidControls } from './LidControls'
import { ReadSettings } from './ReadSettings'

import type { AbsorbanceReaderState } from '@opentrons/step-generation'
import type { AbsorbanceReaderFormType } from '../../../../../../form-types'
import type { StepFormProps } from '../../types'

export function AbsorbanceReaderTools(props: StepFormProps): JSX.Element {
  const {
    formData,
    propsForFields,
    toolboxStep,
    visibleFormErrors,
    showFormErrors,
  } = props
  const { moduleId } = formData
  const dispatch = useDispatch()
  const { t } = useTranslation(['application', 'form', 'protocol_steps'])
  const isAfterMount = useRef(false)
  const robotState = useSelector(getRobotStateAtActiveItem)
  const absorbanceReaderOptions = useSelector(getAbsorbanceReaderLabwareOptions)
  const compoundCommandType = useAbsorbanceReaderCommandType(
    moduleId as string | null
  )
  const { modules } = robotState ?? {}
  const absorbanceReaderFormType = formData.absorbanceReaderFormType as AbsorbanceReaderFormType
  const initialization = (modules?.[moduleId]
    ?.moduleState as AbsorbanceReaderState)?.initialization

  // pre-select radio button on module change if compound command (read/initialize)
  // we useRef to avoid changing data from a previously created form
  useEffect(() => {
    if (isAfterMount.current) {
      propsForFields.absorbanceReaderFormType.updateValue(
        compoundCommandType ?? ABSORBANCE_READER_LID
      )
      return
    }
    isAfterMount.current = true
  }, [formData.moduleId])

  const mappedErrorsToField = getFormErrorsMappedToField(visibleFormErrors)

  const lidRadioButton = (
    <RadioButton
      onChange={() => {
        propsForFields.absorbanceReaderFormType.updateValue(
          ABSORBANCE_READER_LID
        )
      }}
      isSelected={absorbanceReaderFormType === ABSORBANCE_READER_LID}
      buttonLabel={t(
        `form:step_edit_form.field.absorbanceReader.absorbanceReaderFormType.${ABSORBANCE_READER_LID}`
      )}
      buttonValue={ABSORBANCE_READER_LID}
      largeDesktopBorderRadius
    />
  )

  let buttonLabelKey: string = `form:step_edit_form.field.absorbanceReader.absorbanceReaderFormType.${compoundCommandType}`
  if (compoundCommandType === 'absorbanceReaderInitialize') {
    buttonLabelKey = `form:step_edit_form.field.absorbanceReader.absorbanceReaderFormType.${compoundCommandType}.${
      initialization == null ? 'define' : 'change'
    }`
  }
  const compoundCommandButton =
    compoundCommandType != null ? (
      <RadioButton
        onChange={() => {
          propsForFields.absorbanceReaderFormType.updateValue(
            compoundCommandType
          )
        }}
        isSelected={absorbanceReaderFormType === compoundCommandType}
        buttonLabel={t(buttonLabelKey)}
        buttonValue={compoundCommandType}
        largeDesktopBorderRadius
      />
    ) : null

  const page1Content = (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing12}
      width="100%"
    >
      <DropdownStepFormField
        options={absorbanceReaderOptions}
        title={t('form:step_edit_form.field.absorbanceReader.moduleId.module')}
        {...propsForFields.moduleId}
        tooltipContent={null}
        onEnter={(id: string) => {
          dispatch(hoverSelection({ id, text: t('application:select') }))
        }}
        onExit={() => {
          dispatch(hoverSelection({ id: null, text: null }))
        }}
        errorToShow={mappedErrorsToField.moduleId?.title}
      />
      {moduleId != null ? (
        <>
          <Divider marginY="0" />
          <Flex paddingX={SPACING.spacing16}>
            <InitializationSettings initialization={initialization} />
          </Flex>
          <Divider marginY="0" />
          <Flex
            flexDirection={DIRECTION_COLUMN}
            gridGap={SPACING.spacing4}
            paddingX={SPACING.spacing16}
          >
            <StyledText desktopStyle="bodyDefaultSemiBold">
              {t('form:step_edit_form:absorbanceReader.module_controls')}
            </StyledText>
            {compoundCommandType != null ? (
              <>
                {compoundCommandButton}
                {lidRadioButton}
              </>
            ) : (
              <LidControls fieldProps={propsForFields.lidOpen} />
            )}
          </Flex>
        </>
      ) : null}
    </Flex>
  )

  const page2ContentMap = {
    [ABSORBANCE_READER_READ]: (
      <ReadSettings
        propsForFields={propsForFields}
        visibleFormErrors={visibleFormErrors}
      />
    ),
    [ABSORBANCE_READER_INITIALIZE]: (
      <Initialization
        formData={formData}
        propsForFields={propsForFields}
        visibleFormErrors={visibleFormErrors}
        showFormErrors={showFormErrors}
      />
    ),
    [ABSORBANCE_READER_LID]: (
      <LidControls
        fieldProps={propsForFields.lidOpen}
        label={t(
          'form:step_edit_form.field.absorbanceReader.absorbanceReaderFormType.absorbanceReaderLid'
        )}
        paddingX={SPACING.spacing16}
      />
    ),
  }

  const contentByPage: JSX.Element[] = [
    page1Content,
    page2ContentMap[absorbanceReaderFormType],
  ]

  return <Flex paddingY={SPACING.spacing16}>{contentByPage[toolboxStep]}</Flex>
}
