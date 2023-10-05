import * as React from 'react'
import styled from 'styled-components'
import { FLEX_ROBOT_TYPE, WASTE_CHUTE_SLOT } from '@opentrons/shared-data'
import {
  OutlineButton,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  DIRECTION_COLUMN,
  LabeledValue,
  SPACING,
  SlotMap,
  Tooltip,
  useHoverTooltip,
  Box,
  TYPOGRAPHY,
  DIRECTION_ROW,
} from '@opentrons/components'
import { i18n } from '../../localization'
import gripperImage from '../../images/flex_gripper.png'
import { Portal } from '../portals/TopPortal'
import { TrashModal } from './TrashModal'
import styles from './styles.css'

interface AdditionalItemsRowProps {
  handleAttachment: () => void
  isEquipmentAdded: boolean
  name: 'gripper' | 'wasteChute' | 'trashBin'
  hasWasteChute?: boolean
  trashBinSlot?: string
  trashBinId?: string
}

export function AdditionalItemsRow(
  props: AdditionalItemsRowProps
): JSX.Element {
  const {
    handleAttachment,
    isEquipmentAdded,
    name,
    trashBinSlot,
    trashBinId,
    hasWasteChute,
  } = props
  const [targetProps, tooltipProps] = useHoverTooltip()
  const [trashModal, openTrashModal] = React.useState<boolean>(false)
  const addTrash = name !== 'gripper' && !isEquipmentAdded
  const disabledRemoveButton =
    (name === 'trashBin' && isEquipmentAdded && !hasWasteChute) ||
    (name === 'wasteChute' && isEquipmentAdded && trashBinId == null)

  return (
    <>
      {trashModal && name !== 'gripper' ? (
        <Portal>
          <TrashModal
            onCloseClick={() => openTrashModal(false)}
            trashName={name}
            trashBinId={trashBinId}
          />
        </Portal>
      ) : null}
      <Flex justifyContent={JUSTIFY_SPACE_BETWEEN} height="7rem">
        <Flex flexDirection={DIRECTION_COLUMN}>
          <h4 className={styles.row_title}>
            {i18n.t(`modules.additional_equipment_display_names.${name}`)}
          </h4>
          <AdditionalItemImage
            //  TODO(jr, 9/13/23): update this image to the waste chute and trash asset
            src={gripperImage}
            alt={i18n.t(`modules.additional_equipment_display_names.${name}`)}
          />
        </Flex>
        <div
          className={styles.module_col}
          style={{ marginLeft: SPACING.spacing32 }}
        >
          {isEquipmentAdded && name === 'gripper' ? (
            <LabeledValue
              label="Model"
              value={i18n.t(`modules.model_display_name.gripperV1`)}
            />
          ) : null}
        </div>

        {isEquipmentAdded && name !== 'gripper' ? (
          <>
            <div className={styles.module_col}>
              <LabeledValue
                label="Position"
                value={`Slot ${
                  name === 'trashBin' ? trashBinSlot : WASTE_CHUTE_SLOT
                }`}
              />
            </div>
            <div className={styles.slot_map}>
              <SlotMap
                occupiedSlots={
                  name === 'trashBin' && trashBinSlot != null
                    ? [trashBinSlot]
                    : [WASTE_CHUTE_SLOT]
                }
                collisionSlots={[]}
                robotType={FLEX_ROBOT_TYPE}
              />
            </div>
          </>
        ) : null}

        <Box
          flexDirection={DIRECTION_ROW}
          flex="1 0 40%"
          textAlign={TYPOGRAPHY.textAlignRight}
        >
          {name === 'trashBin' && isEquipmentAdded ? (
            <OutlineButton
              onClick={() => openTrashModal(true)}
              className={styles.module_button}
            >
              {i18n.t('shared.edit')}
            </OutlineButton>
          ) : null}
          <Box
            {...targetProps}
            width="6.75rem"
            display="inline-block"
            marginRight={SPACING.spacing16}
          >
            <OutlineButton
              className={styles.module_button}
              disabled={disabledRemoveButton}
              onClick={addTrash ? () => openTrashModal(true) : handleAttachment}
            >
              {isEquipmentAdded
                ? i18n.t('shared.remove')
                : i18n.t('shared.add')}
            </OutlineButton>
          </Box>
          {disabledRemoveButton ? (
            <Tooltip
              {...tooltipProps}
              width="10rem"
              textAlign={TYPOGRAPHY.textAlignCenter}
            >
              {i18n.t(`tooltip.disabled_cannot_delete_trash`)}
            </Tooltip>
          ) : null}
        </Box>
      </Flex>
    </>
  )
}

const AdditionalItemImage = styled.img`
  width: 6rem;
  max-height: 4rem;
  display: block;
`
