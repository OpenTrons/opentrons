import type { Dispatch, SetStateAction } from 'react'
import type { CoordinateTuple } from '@opentrons/shared-data'
import type { LabwareOnDeck } from '../../../step-forms'
import type { DeckSetupTabType } from '../types'

export interface SharedControlsType extends DeckSetupTabType {
  slotPosition: CoordinateTuple | null
  //  this is the slotId (i.e. D1, A1, 1, 2, 3)
  itemId: string
  hover: string | null
  setHover: Dispatch<SetStateAction<string | null>>
  setShowMenuListForId: Dispatch<SetStateAction<string | null>>
  isSelected: boolean
}

export interface DroppedItem {
  labwareOnDeck: LabwareOnDeck
}
