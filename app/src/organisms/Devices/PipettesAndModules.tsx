import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { getPipetteModelSpecs, LEFT, RIGHT } from '@opentrons/shared-data'
import { useModulesQuery, usePipettesQuery } from '@opentrons/react-api-client'
import {
  Flex,
  ALIGN_CENTER,
  ALIGN_FLEX_START,
  DIRECTION_COLUMN,
  JUSTIFY_CENTER,
  SIZE_3,
  SPACING,
  WRAP,
  JUSTIFY_START,
  DIRECTION_ROW,
  TYPOGRAPHY,
} from '@opentrons/components'

import { StyledText } from '../../atoms/text'
import { Banner } from '../../atoms/Banner'
import { useCurrentRunId } from '../ProtocolUpload/hooks'
import { ModuleCard } from '../ModuleCard'
import { useIsRobotViewable, useRunStatuses } from './hooks'
import { PipetteCard } from './PipetteCard'

const EQUIPMENT_POLL_MS = 5000
interface PipettesAndModulesProps {
  robotName: string
}

export function PipettesAndModules({
  robotName,
}: PipettesAndModulesProps): JSX.Element | null {
  const { t } = useTranslation('device_details')

  const attachedModules =
    useModulesQuery({ refetchInterval: EQUIPMENT_POLL_MS })?.data?.data ?? []
  const attachedPipettes = usePipettesQuery({
    refetchInterval: EQUIPMENT_POLL_MS,
  })?.data ?? { left: undefined, right: undefined }
  const isRobotViewable = useIsRobotViewable(robotName)
  const currentRunId = useCurrentRunId()
  const { isRunTerminal } = useRunStatuses()

  return (
    <Flex
      alignItems={ALIGN_FLEX_START}
      flexDirection={DIRECTION_COLUMN}
      width="100%"
    >
      <StyledText
        as="h3"
        fontWeight={TYPOGRAPHY.fontWeightSemiBold}
        marginBottom={SPACING.spacing4}
        id="PipettesAndModules_title"
      >
        {t('pipettes_and_modules')}
      </StyledText>
      <Flex
        alignItems={ALIGN_CENTER}
        justifyContent={JUSTIFY_CENTER}
        minHeight={SIZE_3}
        paddingBottom={SPACING.spacing3}
        width="100%"
        flexDirection={DIRECTION_COLUMN}
      >
        {currentRunId != null && !isRunTerminal && (
          <Flex
            paddingBottom={SPACING.spacing4}
            flexDirection={DIRECTION_COLUMN}
            paddingX={SPACING.spacing2}
            width="100%"
          >
            <Banner type="warning">{t('robot_control_not_available')}</Banner>
          </Flex>
        )}
        {isRobotViewable ? (
          <Flex flexDirection={DIRECTION_COLUMN} width="100%">
            <Flex flexDirection={DIRECTION_ROW} gridGap={SPACING.spacing3}>
              <PipetteCard
                pipetteId={attachedPipettes.left?.id}
                pipetteInfo={
                  attachedPipettes.left?.model != null
                    ? getPipetteModelSpecs(attachedPipettes.left?.model) ?? null
                    : null
                }
                mount={LEFT}
                robotName={robotName}
              />
              <PipetteCard
                pipetteId={attachedPipettes.right?.id}
                pipetteInfo={
                  attachedPipettes.right?.model != null
                    ? getPipetteModelSpecs(attachedPipettes.right?.model) ??
                      null
                    : null
                }
                mount={RIGHT}
                robotName={robotName}
              />
            </Flex>
            <Flex
              justifyContent={JUSTIFY_START}
              flexDirection={DIRECTION_COLUMN}
              flexWrap={WRAP}
              maxHeight={attachedModules.length <= 3 ? '27rem ' : '34rem'}
            >
              {attachedModules.map((module, index) => {
                return (
                  <Flex
                    flex="1"
                    marginRight={SPACING.spacing3}
                    key={`moduleCard_${module.moduleType}_${index}`}
                    width={`calc(50% - ${SPACING.spacing2})`}
                  >
                    <ModuleCard
                      module={module}
                      robotName={robotName}
                      isLoadedInRun={false}
                    />
                  </Flex>
                )
              })}
            </Flex>
          </Flex>
        ) : (
          <StyledText as="p" id="PipettesAndModules_offline">
            {t('offline_pipettes_and_modules')}
          </StyledText>
        )}
      </Flex>
    </Flex>
  )
}
