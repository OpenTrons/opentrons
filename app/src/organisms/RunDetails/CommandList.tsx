import dropWhile from 'lodash/dropWhile'
import last from 'lodash/last'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Flex,
  DIRECTION_COLUMN,
  TEXT_TRANSFORM_UPPERCASE,
  FONT_SIZE_CAPTION,
  SPACING_1,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  Btn,
  SIZE_1,
  C_MED_DARK_GRAY,
  FONT_HEADER_DARK,
  JUSTIFY_START,
  Text,
  SPACING_2,
  C_NEAR_WHITE,
  TEXT_TRANSFORM_CAPITALIZE,
  AlertItem,
  Box,
} from '@opentrons/components'
import { useRunStatus } from '../RunTimeControl/hooks'
import { useProtocolDetails } from './hooks'
import { useCurrentProtocolRun } from '../ProtocolUpload/hooks'
import { ProtocolSetupInfo } from './ProtocolSetupInfo'
import { CommandItem } from './CommandItem'
import type {
  ProtocolFile,
  Command,
  CommandStatus,
} from '@opentrons/shared-data'
import type { RunCommandSummary } from '@opentrons/api-client'

export function CommandList(): JSX.Element | null {
  const { t } = useTranslation('run_details')
  const [
    showProtocolSetupInfo,
    setShowProtocolSetupInfo,
  ] = React.useState<boolean>(false)
  const protocolData: ProtocolFile<{}> | null = useProtocolDetails()
    .protocolData
  const { runRecord } = useCurrentProtocolRun()
  const runStatus = useRunStatus()
  const runDataCommands = runRecord?.data.commands
  const firstPlayTimestamp = runRecord?.data.actions.find(
    action => action.actionType === 'play'
  )?.createdAt

  const analysisCommandsWithStatus =
    protocolData?.commands != null
      ? protocolData.commands.map(command => ({
          ...command,
          status: 'queued' as CommandStatus,
        }))
      : []
  const allProtocolCommands: Command[] =
    protocolData != null ? analysisCommandsWithStatus : []
  const lastProtocolSetupCommand =
    last(
      allProtocolCommands.filter(command =>
        ['loadLabware', 'loadPipette', 'loadModule'].includes(
          command.commandType
        )
      )
    ) ?? null
  const lastProtocolSetupIndex = allProtocolCommands.findIndex(
    command => command.id === lastProtocolSetupCommand?.id
  )

  const protocolSetupCommandList =
    lastProtocolSetupCommand != null
      ? allProtocolCommands.slice(0, lastProtocolSetupIndex + 1)
      : []
  const postSetupAnticipatedCommands: Command[] =
    lastProtocolSetupCommand != null
      ? allProtocolCommands.slice(lastProtocolSetupIndex + 1)
      : allProtocolCommands

  let currentCommandList: Array<
    Command | RunCommandSummary
  > = postSetupAnticipatedCommands
  if (
    runDataCommands != null &&
    runDataCommands.length > 0 &&
    firstPlayTimestamp != null
  ) {
    const firstPostPlayRunCommandIndex = runDataCommands.findIndex(
      command => command.id === postSetupAnticipatedCommands[0]?.id
    )
    const postPlayRunCommands =
      firstPostPlayRunCommandIndex >= 0
        ? runDataCommands.slice(firstPostPlayRunCommandIndex)
        : []

    const remainingAnticipatedCommands = dropWhile(
      postSetupAnticipatedCommands,
      anticipatedCommand =>
        runDataCommands.some(runC => runC.id === anticipatedCommand.id)
    )

    const isProtocolDeterministic = postPlayRunCommands.reduce(
      (isDeterministic, command, index) => {
        return (
          isDeterministic &&
          command.id === postSetupAnticipatedCommands[index]?.id
        )
      },
      true
    )

    currentCommandList = isProtocolDeterministic
      ? [...postPlayRunCommands, ...remainingAnticipatedCommands]
      : [...postPlayRunCommands]
  }

  if (protocolData == null || runStatus == null) return null

  let alertItemTitle
  if (runStatus === 'failed') {
    alertItemTitle = t('protocol_run_failed')
  }
  if (runStatus === 'stop-requested') {
    alertItemTitle = t('protocol_run_canceled')
  }
  if (runStatus === 'succeeded') {
    alertItemTitle = t('protocol_run_complete')
  }

  return (
    <React.Fragment>
      <Flex flexDirection={DIRECTION_COLUMN} flex={'auto'}>
        {runStatus === 'failed' ||
        runStatus === 'succeeded' ||
        runStatus === 'stop-requested' ? (
          <Box padding={SPACING_2}>
            <AlertItem
              type={
                runStatus === 'stop-requested' || runStatus === 'failed'
                  ? 'error'
                  : 'success'
              }
              title={alertItemTitle}
            />
          </Box>
        ) : null}
        <Flex
          paddingLeft={SPACING_2}
          css={FONT_HEADER_DARK}
          textTransform={TEXT_TRANSFORM_CAPITALIZE}
        >
          {t('protocol_steps')}
        </Flex>
        <Flex margin={SPACING_1}>
          {showProtocolSetupInfo ? (
            <React.Fragment>
              <Flex
                flexDirection={DIRECTION_COLUMN}
                flex={'auto'}
                backgroundColor={C_NEAR_WHITE}
                marginLeft={SPACING_2}
              >
                <Flex
                  justifyContent={JUSTIFY_SPACE_BETWEEN}
                  color={C_MED_DARK_GRAY}
                  padding={SPACING_2}
                >
                  <Text
                    textTransform={TEXT_TRANSFORM_UPPERCASE}
                    fontSize={FONT_SIZE_CAPTION}
                    id={`RunDetails_ProtocolSetupTitle`}
                  >
                    {t('protocol_setup')}
                  </Text>
                  <Btn
                    size={SIZE_1}
                    onClick={() => setShowProtocolSetupInfo(false)}
                  >
                    <Icon name="chevron-up" color={C_MED_DARK_GRAY}></Icon>
                  </Btn>
                </Flex>
                <Flex
                  id={`RunDetails_ProtocolSetup_CommandList`}
                  flexDirection={DIRECTION_COLUMN}
                  marginLeft={SPACING_1}
                >
                  {protocolSetupCommandList?.map(command => {
                    return (
                      <ProtocolSetupInfo
                        key={command.id}
                        setupCommand={command as Command}
                      />
                    )
                  })}
                </Flex>
              </Flex>
            </React.Fragment>
          ) : (
            <Btn
              width={'100%'}
              role={'link'}
              onClick={() => setShowProtocolSetupInfo(true)}
              margin={SPACING_1}
            >
              <Flex
                fontSize={FONT_SIZE_CAPTION}
                justifyContent={JUSTIFY_SPACE_BETWEEN}
                textTransform={TEXT_TRANSFORM_UPPERCASE}
                color={C_MED_DARK_GRAY}
                backgroundColor={C_NEAR_WHITE}
                marginLeft={SPACING_1}
              >
                <Flex padding={SPACING_2}>{t('protocol_setup')}</Flex>
                <Flex>
                  <Icon name={'chevron-left'} width={SIZE_1} />
                </Flex>
              </Flex>
            </Btn>
          )}
        </Flex>

        <Flex
          fontSize={FONT_SIZE_CAPTION}
          color={C_MED_DARK_GRAY}
          flexDirection={DIRECTION_COLUMN}
        >
          <Flex flexDirection={DIRECTION_COLUMN}>
            {currentCommandList?.map((command, index) => {
              const showAnticipatedStepsTitle =
                (index === 0 && runDataCommands?.length === 0) ||
                (index > 0 &&
                  currentCommandList[index - 1].status === 'running')

              return (
                <Flex
                  key={command.id}
                  id={`RunDetails_CommandItem`}
                  paddingLeft={SPACING_1}
                  justifyContent={JUSTIFY_START}
                  flexDirection={DIRECTION_COLUMN}
                  flex={'auto'}
                >
                  {showAnticipatedStepsTitle && (
                    <Flex
                      fontSize={FONT_SIZE_CAPTION}
                      marginLeft={SPACING_2}
                      paddingBottom={SPACING_1}
                    >
                      {t('anticipated')}
                    </Flex>
                  )}
                  <Flex
                    padding={`${SPACING_1} ${SPACING_2} ${SPACING_1} ${SPACING_2}`}
                    flexDirection={DIRECTION_COLUMN}
                    flex={'auto'}
                  >
                    <CommandItem
                      commandOrSummary={command}
                      runStatus={runStatus}
                    />
                  </Flex>
                </Flex>
              )
            })}
          </Flex>
          <Flex padding={SPACING_1}>{t('end_of_protocol')}</Flex>
        </Flex>
      </Flex>
    </React.Fragment>
  )
}
