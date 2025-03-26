import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  DIRECTION_COLUMN,
  Flex,
  INFO_TOAST,
  useOnClickOutside,
} from '@opentrons/components'
import { selectTerminalItem } from '../../ui/steps/actions/actions'
import { useKitchen } from '../../components/organisms/Kitchen/hooks'
import { getDeckSetupForActiveItem } from '../../top-selectors/labware-locations'
import { generateNewProtocol } from '../../labware-ingred/actions'
import {
  DefineLiquidsModal,
  DesignerNavigation,
} from '../../components/organisms'
import { getDesignerTab, getFileMetadata } from '../../file-data/selectors'
import { selectors } from '../../labware-ingred/selectors'
import { LiquidsOverflowMenu } from './LiquidsOverflowMenu'
import { ProtocolSteps } from './ProtocolSteps'
import { ProtocolStartingDeck } from '../../components/organisms/ProtocolStartingDeck'

import type { CutoutId } from '@opentrons/shared-data'
import type { DeckSlot } from '@opentrons/step-generation'

export interface OpenSlot {
  cutoutId: CutoutId
  slot: DeckSlot
}

export function Designer(): JSX.Element {
  const { t } = useTranslation(['starting_deck_state', 'protocol_steps'])
  const { bakeToast } = useKitchen()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const fileMetadata = useSelector(getFileMetadata)
  const zoomIn = useSelector(selectors.getZoomedInSlot)
  const deckSetup = useSelector(getDeckSetupForActiveItem)
  const isNewProtocol = useSelector(selectors.getIsNewProtocol)
  const [liquidOverflowMenu, showLiquidOverflowMenu] = useState<boolean>(false)
  const [showDefineLiquidModal, setDefineLiquidModal] = useState<boolean>(false)
  const tab = useSelector(getDesignerTab)

  const { modules, additionalEquipmentOnDeck } = deckSetup

  const hasTrashEntity = Object.values(additionalEquipmentOnDeck).some(
    ae => ae.name === 'trashBin' || ae.name === 'wasteChute'
  )

  const hasHardware =
    (modules != null && Object.values(modules).length > 0) ||
    // greater than 1 to account for the default loaded trashBin
    Object.values(additionalEquipmentOnDeck).length > 1

  // only display toast if its a newly made protocol and has hardware
  useEffect(() => {
    if (hasHardware && isNewProtocol) {
      bakeToast(t('add_rest') as string, INFO_TOAST, {
        heading: t('we_added_hardware'),
        closeButton: true,
      })
      dispatch(generateNewProtocol({ isNewProtocol: false }))
    }
  }, [])

  useEffect(() => {
    if (fileMetadata?.created == null) {
      console.warn(
        'fileMetadata was refreshed while on the designer page, redirecting to landing page'
      )
      navigate('/')
    }
  }, [fileMetadata])

  const overflowWrapperRef = useOnClickOutside<HTMLDivElement>({
    onClickOutside: () => {
      if (!showDefineLiquidModal) {
        showLiquidOverflowMenu(false)
      }
    },
  })

  useEffect(() => {
    if (tab === 'startingDeck') {
      //  ensure that the starting deck page is always showing the initial deck setup
      dispatch(selectTerminalItem('__initial_setup__'))
    }
  }, [tab])

  return (
    <>
      {showDefineLiquidModal ? (
        <DefineLiquidsModal
          onClose={() => {
            setDefineLiquidModal(false)
          }}
        />
      ) : null}
      {liquidOverflowMenu ? (
        <LiquidsOverflowMenu
          overflowWrapperRef={overflowWrapperRef}
          onClose={() => {
            showLiquidOverflowMenu(false)
          }}
          showLiquidsModal={() => {
            showLiquidOverflowMenu(false)
            setDefineLiquidModal(true)
          }}
        />
      ) : null}
      <Flex flexDirection={DIRECTION_COLUMN} height="100%">
        <DesignerNavigation
          hasZoomInSlot={zoomIn.slot != null || zoomIn.cutout != null}
          hasTrashEntity={hasTrashEntity}
          showLiquidOverflowMenu={showLiquidOverflowMenu}
        />

        {tab === 'startingDeck' ? (
          <ProtocolStartingDeck zoomIn={zoomIn} />
        ) : (
          <ProtocolSteps />
        )}
      </Flex>
    </>
  )
}
