import * as React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import isEqual from 'lodash/isEqual'
import { DIRECTION_COLUMN, Flex, TYPOGRAPHY } from '@opentrons/components'
import { StyledText } from '../../atoms/text'
import { RobotMotionLoader } from './RobotMotionLoader'
import { PrepareSpace } from './PrepareSpace'
import { JogToWell } from './JogToWell'
import {
  CompletedProtocolAnalysis,
  CreateCommand,
  FIXED_TRASH_ID,
  getLabwareDefURI,
  getLabwareDisplayName,
  getModuleType,
  getVectorDifference,
  HEATERSHAKER_MODULE_TYPE,
  IDENTITY_VECTOR,
} from '@opentrons/shared-data'
import { useChainRunCommands } from '../../resources/runs/hooks'
import { UnorderedList } from '../../molecules/UnorderedList'
import { getCurrentOffsetForLabwareInLocation } from '../Devices/ProtocolRun/utils/getCurrentOffsetForLabwareInLocation'
import { TipConfirmation } from './TipConfirmation'
import { getLabwareDef } from './utils/labware'
import { getDisplayLocation } from './utils/getDisplayLocation'

import type { Jog } from '../../molecules/JogControls/types'
import type {
  PickUpTipStep,
  RegisterPositionAction,
  CreateRunCommand,
  WorkingOffset,
} from './types'
import type { LabwareOffset } from '@opentrons/api-client'

interface PickUpTipProps extends PickUpTipStep {
  protocolData: CompletedProtocolAnalysis
  proceed: () => void
  registerPosition: React.Dispatch<RegisterPositionAction>
  createRunCommand: CreateRunCommand
  chainRunCommands: ReturnType<typeof useChainRunCommands>['chainRunCommands']
  workingOffsets: WorkingOffset[]
  existingOffsets: LabwareOffset[]
  handleJog: Jog
  isRobotMoving: boolean
}
export const PickUpTip = (props: PickUpTipProps): JSX.Element | null => {
  const { t } = useTranslation(['labware_position_check', 'shared'])
  const {
    labwareId,
    pipetteId,
    location,
    protocolData,
    proceed,
    createRunCommand,
    chainRunCommands,
    registerPosition,
    handleJog,
    isRobotMoving,
    existingOffsets,
    workingOffsets,
  } = props
  const [showTipConfirmation, setShowTipConfirmation] = React.useState(false)

  const labwareDef = getLabwareDef(labwareId, protocolData)
  const pipetteName =
    protocolData.pipettes.find(p => p.id === pipetteId)?.pipetteName ?? null
  if (pipetteName == null || labwareDef == null) return null

  const displayLocation = getDisplayLocation(location, t)
  const labwareDisplayName = getLabwareDisplayName(labwareDef)
  const instructions = [
    t('clear_all_slots'),
    <Trans
      key="place_a_full_tip_rack_in_location"
      t={t}
      i18nKey="place_a_full_tip_rack_in_location"
      tOptions={{ tip_rack: labwareDisplayName, location: displayLocation }}
      components={{
        bold: (
          <StyledText as="span" fontWeight={TYPOGRAPHY.fontWeightSemiBold} />
        ),
      }}
    />,
  ]

  const initialPosition = workingOffsets.find(
    o =>
      o.labwareId === labwareId &&
      isEqual(o.location, location) &&
      o.initialPosition != null
  )?.initialPosition

  const handleConfirmPlacement = (): void => {
    const modulePrepCommands = protocolData.modules.reduce<CreateCommand[]>(
      (acc, module) => {
        if (getModuleType(module.model) === HEATERSHAKER_MODULE_TYPE) {
          return [
            ...acc,
            {
              commandType: 'heaterShaker/closeLabwareLatch',
              params: { moduleId: module.id },
            },
          ]
        }
        return acc
      },
      []
    )
    chainRunCommands(
      [
        ...modulePrepCommands,
        {
          commandType: 'moveLabware' as const,
          params: {
            labwareId: labwareId,
            newLocation: location,
            strategy: 'manualMoveWithoutPause',
          },
        },
        {
          commandType: 'moveToWell' as const,
          params: {
            pipetteId: pipetteId,
            labwareId: labwareId,
            wellName: 'A1',
            wellLocation: { origin: 'top' as const },
          },
        },
      ],
      true
    )
      .then(() => {
        createRunCommand({
          command: { commandType: 'savePosition', params: { pipetteId } },
          waitUntilComplete: true,
        })
          .then(response => {
            const { position } = response.data.result
            registerPosition({
              type: 'initialPosition',
              labwareId,
              location,
              position,
            })
          })
          .catch(e => {
            console.error('Unexpected command failure: ', e)
          })
      })
      .catch(e => {
        console.error('Unexpected command failure: ', e)
      })
  }
  const handleConfirmPosition = (): void => {
    createRunCommand({
      command: { commandType: 'savePosition', params: { pipetteId } },
      waitUntilComplete: true,
    })
      .then(response => {
        const { position } = response.data.result
        const offset =
          initialPosition != null
            ? getVectorDifference(position, initialPosition)
            : position
        registerPosition({
          type: 'finalPosition',
          labwareId,
          location,
          position,
        })
        registerPosition({ type: 'tipPickUpOffset', offset })
        createRunCommand({
          command: {
            commandType: 'pickUpTip',
            params: {
              pipetteId,
              labwareId,
              wellName: 'A1',
              wellLocation: { origin: 'top', offset },
            },
          },
          waitUntilComplete: true,
        })
          .then(() => setShowTipConfirmation(true))
          .catch(e => {
            console.error('Unexpected command failure: ', e)
          })
      })
      .catch(e => {
        console.error('Unexpected command failure: ', e)
      })
  }

  const handleConfirmTipAttached = (): void => {
    chainRunCommands(
      [
        {
          commandType: 'moveLabware' as const,
          params: {
            labwareId: labwareId,
            newLocation: 'offDeck',
            strategy: 'manualMoveWithoutPause',
          },
        },
        {
          commandType: 'moveToWell' as const,
          params: {
            pipetteId: pipetteId,
            labwareId: FIXED_TRASH_ID,
            wellName: 'A1',
            wellLocation: { origin: 'top' as const },
          },
        },
      ],
      true
    )
      .then(() => proceed())
      .catch(e => {
        console.error('Unexpected command failure: ', e)
      })
  }
  const handleInvalidateTip = (): void => {
    createRunCommand({
      command: {
        commandType: 'dropTip',
        params: {
          pipetteId,
          labwareId,
          wellName: 'A1',
        },
      },
      waitUntilComplete: true,
    })
      .then(() => {
        registerPosition({ type: 'tipPickUpOffset', offset: null })
        registerPosition({
          type: 'finalPosition',
          labwareId,
          location,
          position: null,
        })
        setShowTipConfirmation(false)
      })
      .catch(e => {
        console.error('Unexpected command failure: ', e)
      })
  }
  const handleGoBack = (): void => {
    registerPosition({
      type: 'initialPosition',
      labwareId,
      location,
      position: null,
    })
  }

  const existingOffset =
    getCurrentOffsetForLabwareInLocation(
      existingOffsets,
      getLabwareDefURI(labwareDef),
      location
    )?.vector ?? IDENTITY_VECTOR

  if (isRobotMoving)
    return (
      <RobotMotionLoader header={t('shared:stand_back_robot_is_in_motion')} />
    )
  return showTipConfirmation ? (
    <TipConfirmation
      invalidateTip={handleInvalidateTip}
      confirmTip={handleConfirmTipAttached}
    />
  ) : (
    <Flex flexDirection={DIRECTION_COLUMN}>
      {initialPosition != null ? (
        <JogToWell
          header={t('pick_up_tip_from_rack_in_location', {
            location: displayLocation,
          })}
          body={
            <StyledText as="p">{t('ensure_nozzle_is_above_tip')}</StyledText>
          }
          labwareDef={labwareDef}
          pipetteName={pipetteName}
          handleConfirmPosition={handleConfirmPosition}
          handleGoBack={handleGoBack}
          handleJog={handleJog}
          initialPosition={initialPosition}
          existingOffset={existingOffset}
        />
      ) : (
        <PrepareSpace
          {...props}
          header={t('prepare_item_in_location', {
            item: t('tip_rack'),
            location: displayLocation,
          })}
          body={<UnorderedList items={instructions} />}
          labwareDef={labwareDef}
          confirmPlacement={handleConfirmPlacement}
        />
      )}
    </Flex>
  )
}
