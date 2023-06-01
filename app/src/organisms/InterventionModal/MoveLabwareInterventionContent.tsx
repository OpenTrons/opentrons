import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { map } from 'lodash'

import {
  Flex,
  ALIGN_CENTER,
  Icon,
  SPACING,
  COLORS,
  DIRECTION_COLUMN,
  TYPOGRAPHY,
  BORDERS,
  Box,
  RobotWorkSpace,
  LabwareRender,
  Module,
} from '@opentrons/components'
import {
  THERMOCYCLER_MODULE_V1,
  getDeckDefFromRobotType,
  inferModuleOrientationFromXCoordinate,
} from '@opentrons/shared-data'

import { StyledText } from '../../atoms/text'
import { Divider } from '../../atoms/structure'
import { getStandardDeckViewLayerBlockList } from '../Devices/ProtocolRun/utils/getStandardDeckViewLayerBlockList'

import type { RobotType } from '@opentrons/shared-data'
import type { ModuleRenderInfoById } from '../Devices/hooks'
import type { LabwareRenderInfoById } from '../Devices/ProtocolRun/utils/getLabwareRenderInfo'

export interface MoveLabwareInterventionProps {
  robotType: RobotType
  moduleRenderInfo: ModuleRenderInfoById
  labwareRenderInfo: LabwareRenderInfoById
  labwareName: string
  oldDisplayLocation: string
  newDisplayLocation: string
}

export function MoveLabwareInterventionContent({
  robotType,
  labwareName,
  moduleRenderInfo,
  labwareRenderInfo,
  oldDisplayLocation,
  newDisplayLocation,
}: MoveLabwareInterventionProps): JSX.Element {
  const { t: protocolSetupTranslator } = useTranslation('protocol_setup')
  const deckDef = getDeckDefFromRobotType(robotType)

  return (
    <Flex flexDirection={DIRECTION_COLUMN} gridGap="0.75rem" width="100%">
      <MoveLabwareHeader />
      <Flex gridGap={SPACING.spacing32}>
        <Flex flexDirection={DIRECTION_COLUMN} gridGap="0.75rem" width="50%">
          <Flex
            flexDirection={DIRECTION_COLUMN}
            padding={SPACING.spacing4}
            backgroundColor={COLORS.fundamentalsBackground}
            borderRadius={BORDERS.radiusSoftCorners}
          >
            <StyledText
              as="p"
              fontWeight={TYPOGRAPHY.fontWeightSemiBold}
              marginBottom={SPACING.spacing2}
            >
              {protocolSetupTranslator('labware_name')}
            </StyledText>
            <StyledText as="p">{labwareName}</StyledText>
            <Divider marginY={SPACING.spacing8} />
            <StyledText
              as="p"
              fontWeight={TYPOGRAPHY.fontWeightSemiBold}
              marginBottom={SPACING.spacing2}
            >
              {protocolSetupTranslator('labware_location')}
            </StyledText>
            <StyledText as="p">
              {oldDisplayLocation} &rarr; {newDisplayLocation}
            </StyledText>
          </Flex>
        </Flex>
        <Flex width="50%">
          <Box margin="0 auto" width="100%">
            <RobotWorkSpace
              deckDef={deckDef}
              deckLayerBlocklist={getStandardDeckViewLayerBlockList(robotType)}
              id="InterventionModal_deckMap"
            >
              {() => (
                <>
                  {map(
                    moduleRenderInfo,
                    ({
                      x,
                      y,
                      moduleDef,
                      nestedLabwareDef,
                      nestedLabwareId,
                    }) => (
                      <Module
                        key={`InterventionModal_Module_${String(
                          moduleDef.model
                        )}_${x}${y}`}
                        x={x}
                        y={y}
                        orientation={inferModuleOrientationFromXCoordinate(x)}
                        def={moduleDef}
                        innerProps={
                          moduleDef.model === THERMOCYCLER_MODULE_V1
                            ? { lidMotorState: 'open' }
                            : {}
                        }
                      >
                        {nestedLabwareDef != null && nestedLabwareId != null ? (
                          <React.Fragment
                            key={`InterventionModal_Labware_${String(
                              nestedLabwareDef.metadata.displayName
                            )}_${x}${y}`}
                          >
                            <LabwareRender definition={nestedLabwareDef} />
                          </React.Fragment>
                        ) : null}
                      </Module>
                    )
                  )}
                  {map(labwareRenderInfo, ({ x, y, labwareDef }) => {
                    return (
                      <React.Fragment
                        key={`InterventionModal_Labware_${String(
                          labwareDef.metadata.displayName
                        )}_${x}${y}`}
                      >
                        <g transform={`translate(${x},${y})`}>
                          <LabwareRender definition={labwareDef} />
                        </g>
                      </React.Fragment>
                    )
                  })}
                </>
              )}
            </RobotWorkSpace>
          </Box>
        </Flex>
      </Flex>
    </Flex>
  )
}

function MoveLabwareHeader(): JSX.Element {
  const { t } = useTranslation('run_details')
  return (
    <Flex alignItems={ALIGN_CENTER} gridGap="0.75rem">
      <Icon
        name="move-xy-circle"
        size={SPACING.spacing32}
        flex="0 0 auto"
        color={COLORS.successEnabled}
      />
      <StyledText as="h1">{t('move_labware')}</StyledText>
    </Flex>
  )
}
