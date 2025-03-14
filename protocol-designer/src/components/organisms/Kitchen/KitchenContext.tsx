import { createContext } from 'react'

import type {
  SnackbarProps,
  ToastProps,
  ToastType,
} from '@opentrons/components'

export type BakeOptions = Omit<
  ToastProps,
  'id' | 'message' | 'type' | 'exitNow'
>

type BakeToast = (
  message: string,
  type: ToastType,
  options?: BakeOptions
) => string

type EatToast = (toastId: string) => void

export interface KitchenContextType {
  eatToast: EatToast
  bakeToast: BakeToast
  makeSnackbar: MakeSnackbar
}

export const KitchenContext = createContext<KitchenContextType>({
  eatToast: () => {},
  bakeToast: () => '',
  makeSnackbar: () => {},
})

export type MakeSnackbarOptions = Omit<SnackbarProps, 'message'>

type MakeSnackbar = (
  message: string,
  duration?: number,
  options?: MakeSnackbarOptions
) => void
