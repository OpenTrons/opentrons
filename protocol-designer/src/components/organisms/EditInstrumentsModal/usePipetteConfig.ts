import { useState } from 'react'

import type { Dispatch, SetStateAction } from 'react'
import type { PipetteMount } from '@opentrons/shared-data'
import type {
  Gen,
  PipetteType,
} from '../../../pages/CreateNewProtocolWizard/types'

export interface PipetteConfig {
  page: 'add' | 'overview'
  mount: PipetteMount
  pipetteType: PipetteType | null
  pipetteGen: Gen | 'flex'
  pipetteVolume: string | null
  selectedTips: string[]
  setPage: Dispatch<SetStateAction<'add' | 'overview'>>
  setMount: Dispatch<SetStateAction<PipetteMount>>
  setPipetteType: Dispatch<SetStateAction<PipetteType | null>>
  setPipetteGen: Dispatch<SetStateAction<Gen | 'flex'>>
  setPipetteVolume: Dispatch<SetStateAction<string | null>>
  setSelectedTips: Dispatch<SetStateAction<string[]>>
  resetFields: () => void
}

export const usePipetteConfig = (): PipetteConfig => {
  const [page, setPage] = useState<'add' | 'overview'>('overview')
  const [mount, setMount] = useState<PipetteMount>('left')
  const [pipetteType, setPipetteType] = useState<PipetteType | null>(null)
  const [pipetteGen, setPipetteGen] = useState<Gen | 'flex'>('flex')
  const [pipetteVolume, setPipetteVolume] = useState<string | null>(null)
  const [selectedTips, setSelectedTips] = useState<string[]>([])

  const resetFields = (): void => {
    setPipetteType(null)
    setPipetteGen('flex')
    setPipetteVolume(null)
    setSelectedTips([])
  }

  return {
    page,
    setPage,
    mount,
    setMount,
    pipetteType,
    setPipetteType,
    pipetteGen,
    setPipetteGen,
    pipetteVolume,
    setPipetteVolume,
    selectedTips,
    setSelectedTips,
    resetFields,
  }
}
