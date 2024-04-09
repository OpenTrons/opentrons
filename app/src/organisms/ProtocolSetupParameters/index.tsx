import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useHistory } from 'react-router-dom'
import { useCreateRunMutation, useHost } from '@opentrons/react-api-client'
import { useQueryClient } from 'react-query'
import {
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  Flex,
  SPACING,
} from '@opentrons/components'
import { formatRunTimeParameterValue } from '@opentrons/shared-data'

import { ProtocolSetupStep } from '../../pages/ProtocolSetup'
import { ChildNavigation } from '../ChildNavigation'
import { ResetValuesModal } from './ResetValuesModal'
import { ChooseEnum } from './ChooseEnum'
import { ChooseNumber } from './ChooseNumber'

import type { RunTimeParameter } from '@opentrons/shared-data'
import type { LabwareOffsetCreateData } from '@opentrons/api-client'

interface ProtocolSetupParametersProps {
  protocolId: string
  runTimeParameters: RunTimeParameter[]
  labwareOffsets?: LabwareOffsetCreateData[]
}

export function ProtocolSetupParameters({
  protocolId,
  labwareOffsets,
  runTimeParameters,
}: ProtocolSetupParametersProps): JSX.Element {
  const { t } = useTranslation('protocol_setup')
  const history = useHistory()
  const host = useHost()
  const queryClient = useQueryClient()
  const [
    chooseValueScreen,
    setChooseValueScreen,
  ] = React.useState<RunTimeParameter | null>(null)
  const [
    showNumericalInputScreen,
    setShowNumericalInputScreen,
  ] = React.useState<RunTimeParameter | null>(null)
  const [resetValuesModal, showResetValuesModal] = React.useState<boolean>(
    false
  )

  // todo (nd:04/01/2024): remove mock and look at runTimeParameters prop
  // const parameters = runTimeParameters ?? []
  const parameters = runTimeParameters
  const [
    runTimeParametersOverrides,
    setRunTimeParametersOverrides,
  ] = React.useState<RunTimeParameter[]>(parameters)

  const updateParameters = (
    value: boolean | string | number,
    variableName: string
  ): void => {
    const updatedParameters = runTimeParametersOverrides.map(parameter => {
      if (parameter.variableName === variableName) {
        return { ...parameter, value }
      }
      return parameter
    })
    setRunTimeParametersOverrides(updatedParameters)
    if (chooseValueScreen && chooseValueScreen.variableName === variableName) {
      const updatedParameter = updatedParameters.find(
        parameter => parameter.variableName === variableName
      )
      if (updatedParameter != null) {
        setChooseValueScreen(updatedParameter)
      }
    }
  }

  //    TODO(jr, 3/20/24): modify useCreateRunMutation to take in optional run time parameters
  //    newRunTimeParameters will be the param to plug in!
  const { createRun, isLoading } = useCreateRunMutation({
    onSuccess: data => {
      queryClient
        .invalidateQueries([host, 'runs'])
        .catch((e: Error) =>
          console.error(`could not invalidate runs cache: ${e.message}`)
        )
    },
  })
  const handleConfirmValues = (): void => {
    createRun({ protocolId, labwareOffsets })
  }
  let children = (
    <>
      <ChildNavigation
        header={t('parameters')}
        onClickBack={() => history.goBack()}
        onClickButton={handleConfirmValues}
        buttonText={t('confirm_values')}
        iconName={isLoading ? 'ot-spinner' : undefined}
        iconPlacement="startIcon"
        secondaryButtonProps={{
          buttonType: 'tertiaryLowLight',
          buttonText: t('restore_default'),
          onClick: () => showResetValuesModal(true),
        }}
      />
      <Flex
        marginTop="7.75rem"
        alignItems={ALIGN_CENTER}
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing8}
        paddingX={SPACING.spacing40}
        paddingBottom={SPACING.spacing40}
      >
        {runTimeParametersOverrides.map((parameter, index) => {
          return (
            <React.Fragment key={`${parameter.displayName}_${index}`}>
              <ProtocolSetupStep
                hasIcon={!(parameter.type === 'bool')}
                status="general"
                title={parameter.displayName}
                onClickSetupStep={() =>
                  parameter.type === 'bool'
                    ? updateParameters(!parameter.value, parameter.variableName)
                    : setChooseValueScreen(parameter)
                }
                detail={formatRunTimeParameterValue(parameter, t)}
                description={parameter.description}
                fontSize="h4"
              />
            </React.Fragment>
          )
        })}
      </Flex>
    </>
  )
  if (chooseValueScreen != null) {
    children = (
      <ChooseEnum
        handleGoBack={() => setChooseValueScreen(null)}
        parameter={chooseValueScreen}
        setParameter={updateParameters}
        rawValue={chooseValueScreen.value}
      />
    )
  }
  if (showNumericalInputScreen != null) {
    children = (
      <ChooseNumber
        handleGoBack={() => setShowNumericalInputScreen(null)}
        parameter={showNumericalInputScreen}
        setParameter={updateParameters}
        rawValue={showNumericalInputScreen.value}
      />
    )
  }

  return (
    <>
      {resetValuesModal ? (
        <ResetValuesModal
          runTimeParametersOverrides={runTimeParametersOverrides}
          setRunTimeParametersOverrides={setRunTimeParametersOverrides}
          handleGoBack={() => showResetValuesModal(false)}
        />
      ) : null}
      {children}
    </>
  )
}
