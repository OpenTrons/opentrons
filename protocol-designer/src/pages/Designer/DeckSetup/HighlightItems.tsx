import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'

import {
  STANDARD_FLEX_SLOTS,
  STANDARD_OT2_SLOTS,
  THERMOCYCLER_MODULE_TYPE,
  THERMOCYCLER_MODULE_V2,
  WASTE_CHUTE_CUTOUT,
  getAddressableAreaFromSlotId,
  getPositionFromSlotId,
  inferModuleOrientationFromXCoordinate,
} from '@opentrons/shared-data'
import { getDeckSetupForActiveItem } from '../../../top-selectors/labware-locations'
import {
  getHoveredDropdownItem,
  getSelectedDropdownItem,
} from '../../../ui/steps/selectors'
import { getDesignerTab } from '../../../file-data/selectors'
import { LabwareLabel } from '../LabwareLabel'
import { ModuleLabel } from './ModuleLabel'
import { FixtureRender } from './FixtureRender'
import { DeckItemHighlight } from './DeckItemHighlight'
import { getHighlightLabwareAndModules } from './utils'
import type { AdditionalEquipmentName } from '@opentrons/step-generation'
import type {
  RobotType,
  DeckDefinition,
  CutoutId,
  AddressableAreaName,
  CoordinateTuple,
} from '@opentrons/shared-data'
import type { Fixture } from './constants'
interface HighlightItemsProps {
  deckDef: DeckDefinition
  robotType: RobotType
}
//  TODO(ja, 1/13/25): get actual coordinates from thermocycler and deck definitions
const FLEX_TC_POSITION: CoordinateTuple = [-20, 282, 0]
const OT2_TC_GEN_1_POSITION: CoordinateTuple = [0, 264, 0]
const OT2_TC_GEN_2_POSITION: CoordinateTuple = [0, 250, 0]

const SLOTS = [
  ...STANDARD_FLEX_SLOTS,
  ...STANDARD_OT2_SLOTS,
  'A4',
  'B4',
  'C4',
  'D4',
  'cutoutD3',
]

export function HighlightItems(props: HighlightItemsProps): JSX.Element | null {
  const { robotType, deckDef } = props
  const { t } = useTranslation('application')
  const tab = useSelector(getDesignerTab)
  const { labware, modules, additionalEquipmentOnDeck } = useSelector(
    getDeckSetupForActiveItem
  )
  const hoveredItem = useSelector(getHoveredDropdownItem)
  const selectedDropdownItems = useSelector(getSelectedDropdownItem)

  if (
    hoveredItem == null &&
    (selectedDropdownItems == null || selectedDropdownItems.length === 0)
  ) {
    return null
  }

  const highlightItems = getHighlightLabwareAndModules(
    hoveredItem,
    selectedDropdownItems,
    labware,
    modules
  )

  const hoveredItemTrash: {
    name: AdditionalEquipmentName
    id: string
    location?: string | undefined
  } | null =
    hoveredItem?.id != null && additionalEquipmentOnDeck[hoveredItem.id] != null
      ? additionalEquipmentOnDeck[hoveredItem.id]
      : null
  const selectedItemTrash = selectedDropdownItems.find(
    selected => selected.id != null && additionalEquipmentOnDeck[selected.id]
  )

  const hoveredDeckItem: string | null =
    hoveredItem?.id != null &&
    SLOTS.includes(hoveredItem.id as AddressableAreaName)
      ? hoveredItem.id
      : null
  const selectedItemSlot = selectedDropdownItems.find(
    selected =>
      selected.id != null && SLOTS.includes(selected.id as AddressableAreaName)
  )

  const labwareItems = highlightItems.highlightLabwareItems.reduce<
    JSX.Element[]
  >((acc, { labware: labwareOnDeck, selection, isSelected = false }, index) => {
    const { text } = selection
    if (!labwareOnDeck) {
      console.warn(
        `labwareOnDeck was null as ${labwareOnDeck}, expected to find a matching entity`
      )
      return acc
    }
    let labwareSlot = labwareOnDeck.slot
    const tcModel = Object.values(modules).find(
      module => module.type === THERMOCYCLER_MODULE_TYPE
    )?.model

    if (modules[labwareSlot]) {
      labwareSlot = modules[labwareSlot].slot
    } else if (labware[labwareSlot]) {
      const adapter = labware[labwareSlot]
      labwareSlot = modules[adapter.slot]?.slot ?? adapter.slot
    }

    const position = getPositionFromSlotId(labwareSlot, deckDef)
    if (position != null) {
      let tcPosition: CoordinateTuple = FLEX_TC_POSITION
      if (labwareSlot === '7') {
        tcPosition =
          tcModel === THERMOCYCLER_MODULE_V2
            ? OT2_TC_GEN_2_POSITION
            : OT2_TC_GEN_1_POSITION
      }

      return [
        ...acc,
        <LabwareLabel
          key={`${labwareOnDeck.id}_${index}`}
          isSelected={isSelected}
          isLast
          position={
            tcModel != null && (labwareSlot === '7' || labwareSlot === 'B1')
              ? tcPosition
              : position
          }
          labwareDef={labwareOnDeck.def}
          labelText={text ?? ''}
        />,
      ]
    }
    return acc
  }, [])

  const moduleItems = highlightItems.highlightModuleItems.reduce<JSX.Element[]>(
    (acc, { module: moduleOnDeck, selection, isSelected = false }) => {
      const { text } = selection
      if (moduleOnDeck == null) {
        return acc
      }
      const position = getPositionFromSlotId(moduleOnDeck.slot, deckDef)
      if (position != null) {
        return [
          ...acc,
          <ModuleLabel
            key={`module_${moduleOnDeck.id}`}
            isLast
            isSelected={isSelected}
            moduleModel={moduleOnDeck.model}
            position={position}
            orientation={inferModuleOrientationFromXCoordinate(position[0])}
            isZoomed={false}
            labelName={text ?? ''}
            slot={moduleOnDeck.slot}
          />,
        ]
      }
      return acc
    },
    []
  )

  const getTrashItems = (): JSX.Element[] => {
    const items: JSX.Element[] = []

    if (hoveredItemTrash != null || selectedItemTrash != null) {
      const selectedTrashOnDeck =
        selectedItemTrash?.id != null
          ? additionalEquipmentOnDeck[selectedItemTrash.id]
          : null
      const trashOnDeck = hoveredItemTrash ?? selectedTrashOnDeck

      if (!trashOnDeck) {
        console.warn(
          `trashOnDeck was null as ${trashOnDeck}, expected to find a matching entity`
        )
        return []
      }

      if (hoveredItemTrash != null) {
        items.push(
          <FixtureRender
            key={`${hoveredItemTrash.id}_hovered`}
            fixture={hoveredItemTrash.name as Fixture}
            cutout={hoveredItemTrash.location as CutoutId}
            robotType={robotType}
            deckDef={deckDef}
            showHighlight={true}
            tagInfo={[
              {
                text: hoveredItem.text ?? '',
                isSelected: false,
                isLast: true,
                isZoomed: false,
              },
            ]}
          />
        )
      }

      if (selectedTrashOnDeck != null && selectedItemTrash != null) {
        items.push(
          <FixtureRender
            key={`${selectedTrashOnDeck.id}_selected`}
            fixture={selectedTrashOnDeck.name as Fixture}
            cutout={selectedTrashOnDeck.location as CutoutId}
            robotType={robotType}
            deckDef={deckDef}
            showHighlight={true}
            tagInfo={[
              {
                text: selectedItemTrash.text ?? '',
                isSelected: true,
                isLast: true,
                isZoomed: false,
              },
            ]}
          />
        )
      }
    }

    return items
  }

  const getDeckItems = (): JSX.Element[] => {
    const items: JSX.Element[] = []

    if (hoveredDeckItem != null || selectedItemSlot != null) {
      const slot = hoveredDeckItem ?? selectedItemSlot?.id

      if (slot === WASTE_CHUTE_CUTOUT) {
        items.push(
          <FixtureRender
            key={`${slot}_wasteChute_selected`}
            fixture={'wasteChute' as Fixture}
            cutout={WASTE_CHUTE_CUTOUT as CutoutId}
            robotType={robotType}
            deckDef={deckDef}
            showHighlight={true}
            tagInfo={[
              {
                text: t('location'),
                isSelected: true,
                isLast: true,
                isZoomed: false,
              },
            ]}
          />
        )
      } else {
        const addressableArea =
          slot != null && slot !== WASTE_CHUTE_CUTOUT
            ? getAddressableAreaFromSlotId(slot, deckDef)
            : null

        if (!addressableArea) {
          console.warn(
            `addressableArea was null as ${addressableArea}, expected to find a matching entity`
          )
          return []
        }
        items.push(
          <DeckItemHighlight
            tab={tab}
            slotBoundingBox={addressableArea.boundingBox}
            slotPosition={getPositionFromSlotId(addressableArea.id, deckDef)}
            itemId={addressableArea.id}
          />
        )
      }
    }

    return items
  }

  const renderItems = (): JSX.Element[] => {
    return [
      ...labwareItems,
      ...moduleItems,
      ...getTrashItems(),
      ...getDeckItems(),
    ]
  }

  return <>{renderItems()}</>
}
