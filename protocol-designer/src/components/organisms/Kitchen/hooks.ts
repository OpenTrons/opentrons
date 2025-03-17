import { useContext } from 'react'
import { KitchenContext } from './KitchenContext'
import type { KitchenContextType } from './KitchenContext'

export function useKitchen(): KitchenContextType {
  const { eatToast, bakeToast, makeSnackbar } = useContext(KitchenContext)

  return { eatToast, bakeToast, makeSnackbar }
}
