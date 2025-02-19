import { describe, it, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'

import { i18n } from '/protocol-designer/assets/localization'
import { renderWithProviders } from '/protocol-designer/__testing-utils__'
import { StepsInfo } from '../StepsInfo'

import type { ComponentProps } from 'react'
import type { InfoScreen } from '@opentrons/components'

vi.mock('@opentrons/components', async importOriginal => {
  const actual = await importOriginal<typeof InfoScreen>()
  return {
    ...actual,
    InfoScreen: () => <div>mock InfoScreen</div>,
  }
})

const mockSavedStepForms = {
  __INITIAL_DECK_SETUP_STEP__: {
    labwareLocationUpdate: {
      'd093dc35-f4b6-457e-b981-9b9828898f1c:opentrons/opentrons_flex_96_tiprack_50ul/1':
        'C2',
    },
    moduleLocationUpdate: {
      '64c722fe-515c-47dc-a56c-5250aee6bc82:heaterShakerModuleType': 'D1',
      'e99b8b82-98c6-4e44-911d-186d24ec104e:temperatureModuleType': 'C1',
    },
    pipetteLocationUpdate: {
      'ae5fdda9-4b63-4951-a325-21d92a334991': 'left',
      '25d7ff44-cd73-4843-a27c-11aae71b931f': 'right',
    },
    stepType: 'manualIntervention',
    id: '__INITIAL_DECK_SETUP_STEP__',
  },
  '4e843572-58fc-43dd-bdb0-734123c1251a': {
    labware:
      'd093dc35-f4b6-457e-b981-9b9828898f1c:opentrons/opentrons_flex_96_tiprack_50ul/1',
    newLocation: 'C4',
    useGripper: true,
    id: '4e843572-58fc-43dd-bdb0-734123c1251a',
    stepType: 'moveLabware',
    stepName: 'move labware',
    stepDetails: '',
  },
  'f1f44592-7b04-4486-af82-18c94151693f': {
    labware:
      'd093dc35-f4b6-457e-b981-9b9828898f1c:opentrons/opentrons_flex_96_tiprack_50ul/1',
    newLocation: 'B2',
    useGripper: true,
    id: 'f1f44592-7b04-4486-af82-18c94151693f',
    stepType: 'moveLabware',
    stepName: 'move labware',
    stepDetails: '',
  },
  'c4e8170c-a462-42b8-af50-62208db65d07': {
    labware:
      'd093dc35-f4b6-457e-b981-9b9828898f1c:opentrons/opentrons_flex_96_tiprack_50ul/1',
    newLocation: 'offDeck',
    useGripper: false,
    id: 'c4e8170c-a462-42b8-af50-62208db65d07',
    stepType: 'moveLabware',
    stepName: 'move labware',
    stepDetails: '',
  },
} as any

const render = (props: ComponentProps<typeof StepsInfo>) => {
  return renderWithProviders(<StepsInfo {...props} />, {
    i18nInstance: i18n,
  })
}

describe('StepsInfo', () => {
  let props: ComponentProps<typeof StepsInfo>

  beforeEach(() => {
    props = {
      savedStepForms: {},
    }
  })

  it('should render text', () => {
    render(props)
    screen.getByText('Protocol Steps')
  })

  it('should render mock infoscreen when savedStepForm is empty', () => {
    render(props)
    screen.getByText('mock InfoScreen')
  })

  it('should render number of steps', () => {
    props = {
      savedStepForms: mockSavedStepForms,
    }
    render(props)
    screen.getByText('Number of steps')
    screen.getByText('3 steps')
  })
})
