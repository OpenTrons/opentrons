import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled, { css } from 'styled-components'

import {
  ALIGN_CENTER,
  BORDERS,
  Btn,
  Tag,
  COLORS,
  DeckInfoLabel,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  DISPLAY_FLEX,
  DISPLAY_GRID,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  LabwareRender,
  MODULE_ICON_NAME_BY_TYPE,
  SIZE_AUTO,
  SPACING,
  StyledText,
  TYPOGRAPHY,
  WELL_LABEL_OPTIONS,
  ALIGN_FLEX_END,
} from '@opentrons/components'
import { useCreateLiveCommandMutation } from '@opentrons/react-api-client'
import {
  getModuleDisplayName,
  getModuleType,
  getAllDefinitions,
  HEATERSHAKER_MODULE_TYPE,
  MAGNETIC_MODULE_TYPE,
  TC_MODULE_LOCATION_OT2,
  TC_MODULE_LOCATION_OT3,
  THERMOCYCLER_MODULE_TYPE,
  THERMOCYCLER_MODULE_V2,
} from '@opentrons/shared-data'
import { getLiquidsByIdForLabware } from '/app/transformations/analysis'
import { getLabwareLiquidRenderInfoFromStack } from '/app/transformations/commands'
import { ToggleButton } from '/app/atoms/buttons'
import { Divider } from '/app/atoms/structure'
import { SecureLabwareModal } from './SecureLabwareModal'

import type {
  HeaterShakerCloseLatchCreateCommand,
  HeaterShakerOpenLatchCreateCommand,
  ModuleType,
  LabwareDefinition2,
} from '@opentrons/shared-data'
import type { ModuleRenderInfoForProtocol } from '/app/resources/runs'
import type {
  StackItem,
  ModuleInStack,
  LabwareInStack,
} from '/app/transformations/commands'
import type { ModuleTypesThatRequireExtraAttention } from '../utils/getModuleTypesThatRequireExtraAttention'
import type { LabwareByLiquidId } from '@opentrons/components/src/hardware-sim/ProtocolDeck/types'

const LabwareRow = styled.div`
  display: ${DISPLAY_GRID};
  grid-template-columns: 90px 12fr;
  background-color: ${COLORS.grey20};
  border-radius: ${BORDERS.borderRadius4};
  padding: ${SPACING.spacing12} ${SPACING.spacing16} ${SPACING.spacing12};
`

interface LabwareLiquidRenderInfo extends LabwareInStack {
  quantity: number
  liquids: number
}

interface LabwareListItemProps {
  attachedModuleInfo: { [moduleId: string]: ModuleRenderInfoForProtocol }
  extraAttentionModules: ModuleTypesThatRequireExtraAttention[]
  isFlex: boolean
  slotName: string
  stackedItems: StackItem[]
  labwareByLiquidId?: LabwareByLiquidId
  showLabwareSVG?: boolean
}

export function LabwareListItem(
  props: LabwareListItemProps
): JSX.Element | null {
  const {
    stackedItems,
    slotName,
    attachedModuleInfo,
    extraAttentionModules,
    isFlex,
    labwareByLiquidId,
    showLabwareSVG,
  } = props
  const moduleInStack = stackedItems.find(
    (item): item is ModuleInStack => 'moduleModel' in item
  )
  const labwareInStack = stackedItems.filter(
    (lw): lw is LabwareInStack => 'labwareId' in lw
  )

  const labwareLiquidRenderInfo = getLabwareLiquidRenderInfoFromStack(
    labwareInStack,
    labwareByLiquidId
  )

  const isStacked =
    labwareLiquidRenderInfo.length > 1 ||
    labwareLiquidRenderInfo.some(labware => labware.quantity > 1)

  const { i18n, t } = useTranslation('protocol_setup')
  const [
    secureLabwareModalType,
    setSecureLabwareModalType,
  ] = useState<ModuleType | null>(null)
  const { createLiveCommand } = useCreateLiveCommandMutation()
  const [isLatchLoading, setIsLatchLoading] = useState<boolean>(false)
  const [isLatchClosed, setIsLatchClosed] = useState<boolean>(false)

  let slotInfo: string | null = slotName
  if (slotName === 'offDeck') {
    slotInfo = i18n.format(t('off_deck'), 'upperCase')
  }

  let moduleDisplayName: string | null = null
  let moduleType: ModuleType | null = null
  let secureLabwareInstructions: JSX.Element | null = null
  let isCorrectHeaterShakerAttached: boolean = false
  let isHeaterShakerInProtocol: boolean = false
  let latchCommand:
    | HeaterShakerOpenLatchCreateCommand
    | HeaterShakerCloseLatchCreateCommand

  if (moduleInStack != null) {
    moduleType = getModuleType(moduleInStack.moduleModel)
    moduleDisplayName = getModuleDisplayName(moduleInStack.moduleModel)

    const moduleTypeNeedsAttention = extraAttentionModules.find(
      extraAttentionModType => extraAttentionModType === moduleType
    )

    switch (moduleTypeNeedsAttention) {
      case MAGNETIC_MODULE_TYPE:
      case THERMOCYCLER_MODULE_TYPE:
        if (moduleType === THERMOCYCLER_MODULE_TYPE) {
          slotInfo = isFlex ? TC_MODULE_LOCATION_OT3 : TC_MODULE_LOCATION_OT2
        }
        if (moduleInStack.moduleModel !== THERMOCYCLER_MODULE_V2) {
          secureLabwareInstructions = (
            <Btn
              css={css`
                color: ${COLORS.grey50};

                &:hover {
                  color: ${COLORS.black90};
                }
              `}
              onClick={() => {
                setSecureLabwareModalType(moduleType)
              }}
            >
              <Flex flexDirection={DIRECTION_ROW} width="15rem">
                <Icon
                  name="information"
                  size="0.75rem"
                  marginTop={SPACING.spacing4}
                  color={COLORS.grey60}
                />
                <StyledText
                  marginLeft={SPACING.spacing4}
                  desktopStyle="bodyDefaultRegular"
                  textDecoration={TYPOGRAPHY.textDecorationUnderline}
                  color={COLORS.grey60}
                >
                  {t('secure_labware_instructions')}
                </StyledText>
              </Flex>
            </Btn>
          )
        }
        break
      case HEATERSHAKER_MODULE_TYPE:
        isHeaterShakerInProtocol = true
        const matchingHeaterShaker =
          attachedModuleInfo != null &&
          attachedModuleInfo[moduleInStack.moduleId] != null
            ? attachedModuleInfo[moduleInStack.moduleId].attachedModuleMatch
            : null
        if (
          matchingHeaterShaker != null &&
          matchingHeaterShaker.moduleType === HEATERSHAKER_MODULE_TYPE
        ) {
          if (
            (!isLatchClosed &&
              (matchingHeaterShaker.data.labwareLatchStatus === 'idle_closed' ||
                matchingHeaterShaker.data.labwareLatchStatus === 'closing')) ||
            (isLatchClosed &&
              (matchingHeaterShaker.data.labwareLatchStatus === 'idle_open' ||
                matchingHeaterShaker.data.labwareLatchStatus === 'opening'))
          ) {
            setIsLatchClosed(
              matchingHeaterShaker.data.labwareLatchStatus === 'idle_closed' ||
                matchingHeaterShaker.data.labwareLatchStatus === 'closing'
            )
            setIsLatchLoading(false)
          }
          latchCommand = {
            commandType: isLatchClosed
              ? 'heaterShaker/openLabwareLatch'
              : 'heaterShaker/closeLabwareLatch',
            params: { moduleId: matchingHeaterShaker.id },
          }
          //  Labware latch button is disabled unless the correct H-S is attached
          //  this is for MoaM support
          isCorrectHeaterShakerAttached = true
        }
    }
  }
  const toggleLatch = (): void => {
    setIsLatchLoading(true)
    createLiveCommand({
      command: latchCommand,
    }).catch((e: Error) => {
      console.error(
        `error setting module status with command type ${latchCommand.commandType}: ${e.message}`
      )
    })
  }
  const commandType = isLatchClosed
    ? 'heaterShaker/openLabwareLatch'
    : 'heaterShaker/closeLabwareLatch'
  let hsLatchText: string = t('secure')
  if (commandType === 'heaterShaker/closeLabwareLatch' && isLatchLoading) {
    hsLatchText = t('closing')
  } else if (
    commandType === 'heaterShaker/openLabwareLatch' &&
    isLatchLoading
  ) {
    hsLatchText = t('opening')
  }

  return (
    <LabwareRow>
      <Flex
        alignItems={ALIGN_CENTER}
        gridGap={SPACING.spacing2}
        width="6.25rem"
      >
        {isFlex ? (
          <DeckInfoLabel deckLabel={slotName} />
        ) : (
          <StyledText
            css={TYPOGRAPHY.pSemiBold}
            data-testid={`slot_info_${slotName}`}
          >
            {slotName}
          </StyledText>
        )}
        {moduleType != null ? (
          <DeckInfoLabel iconName={MODULE_ICON_NAME_BY_TYPE[moduleType]} />
        ) : null}
        {isStacked ? <DeckInfoLabel iconName="stacked" /> : null}
      </Flex>
      <Flex
        flexDirection={DIRECTION_ROW}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        alignItems={ALIGN_CENTER}
        gridGap={SPACING.spacing24}
      >
        <Flex
          flexDirection={DIRECTION_COLUMN}
          gridGap={SPACING.spacing12}
          marginLeft={SPACING.spacing24}
          width="100%"
        >
          <>
            {labwareLiquidRenderInfo.map((labware, index) => (
              <>
                <Flex>
                  {showLabwareSVG ? (
                    <StandaloneLabware
                      definition={getAllDefinitions()[labware.definitionUri]}
                    />
                  ) : null}
                  <Flex
                    flexDirection={DIRECTION_COLUMN}
                    justifyContent={JUSTIFY_CENTER}
                    marginLeft={SPACING.spacing8}
                    marginRight={SPACING.spacing24}
                  >
                    <StyledText desktopStyle="bodyDefaultSemiBold">
                      {labware.displayName}
                    </StyledText>
                    {labware.lidDisplayName != null ? (
                      <StyledText
                        desktopStyle="bodyDefaultRegular"
                        color={COLORS.grey60}
                      >
                        {labware.lidDisplayName}
                      </StyledText>
                    ) : null}
                    {labware.quantity > 1 || labware.liquids != null ? (
                      <Flex
                        flexDirection={DIRECTION_ROW}
                        paddingTop={SPACING.spacing4}
                      >
                        {labware.quantity > 1 ? (
                          <Tag
                            type="default"
                            text={t('labware_quantity', {
                              quantity: labware.quantity,
                            })}
                          />
                        ) : null}
                        {labware.liquids > 0 ? (
                          <Tag
                            type="default"
                            text={
                              labware.quantity > 1
                                ? t('multiple_liquid_layouts')
                                : t('number_of_liquids', {
                                    number: labware.liquids,
                                    count: labware.liquids,
                                  })
                            }
                          />
                        ) : null}
                      </Flex>
                    ) : null}
                  </Flex>
                </Flex>
                {index !== labwareLiquidRenderInfo.length - 1 ? (
                  <Divider marginY="0" width="100%" />
                ) : null}
              </>
            ))}
          </>
        </Flex>
        <Flex
          flexDirection={DIRECTION_ROW}
          gridGap={SPACING.spacing24}
          align={ALIGN_FLEX_END}
        >
          {secureLabwareInstructions ?? null}
          {isHeaterShakerInProtocol ? (
            <Flex flexDirection={DIRECTION_COLUMN}>
              <StyledText
                desktopStyle="bodyDefaultRegular"
                color={COLORS.grey60}
                minWidth="6.2rem"
              >
                {t('labware_latch')}
              </StyledText>
              <Flex
                flexDirection={DIRECTION_ROW}
                gridGap={SPACING.spacing4}
                marginTop="3px"
              >
                <ToggleButton
                  label={`heater_shaker_${slotInfo ?? ''}_latch_toggle`}
                  size={SIZE_AUTO}
                  disabled={!isCorrectHeaterShakerAttached || isLatchLoading}
                  toggledOn={isLatchClosed}
                  onClick={toggleLatch}
                  display={DISPLAY_FLEX}
                  alignItems={ALIGN_CENTER}
                />
                <StyledText desktopStyle="bodyDefaultRegular" width="4rem">
                  {hsLatchText}
                </StyledText>
              </Flex>
            </Flex>
          ) : null}
          <Icon name="more" size={SPACING.spacing24} />
        </Flex>
      </Flex>
      {secureLabwareModalType != null && (
        <SecureLabwareModal
          type={secureLabwareModalType as ModuleTypesThatRequireExtraAttention}
          onCloseClick={() => {
            setSecureLabwareModalType(null)
          }}
        />
      )}
    </LabwareRow>
  )
}

const LabwareThumbnail = styled.svg`
  transform: scale(1, -1);
  width: 4.2rem;
  flex-shrink: 0;
`

function StandaloneLabware(props: {
  definition: LabwareDefinition2
}): JSX.Element {
  const { definition } = props
  return (
    <LabwareThumbnail
      viewBox={`${definition.cornerOffsetFromSlot.x} ${definition.cornerOffsetFromSlot.y} ${definition.dimensions.xDimension} ${definition.dimensions.yDimension}`}
    >
      <LabwareRender
        definition={definition}
        wellLabelOption={WELL_LABEL_OPTIONS.SHOW_LABEL_INSIDE}
      />
    </LabwareThumbnail>
  )
}
