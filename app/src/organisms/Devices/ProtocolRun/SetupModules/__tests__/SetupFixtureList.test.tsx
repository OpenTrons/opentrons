import * as React from 'react'
import { renderWithProviders } from '@opentrons/components'
import { WASTE_CHUTE_SLOT } from '@opentrons/shared-data'
import { i18n } from '../../../../../i18n'
import { SetupFixtureList } from '../SetupFixtureList'
import { mockLoadedFixturesBySlot } from './SetupModules.test'

const render = (props: React.ComponentProps<typeof SetupFixtureList>) => {
  return renderWithProviders(<SetupFixtureList {...props} />, {
    i18nInstance: i18n,
  })
}

describe('SetupFixtureList', () => {
  let props: React.ComponentProps<typeof SetupFixtureList>
  beforeEach(() => {
    props = {
      loadedFixturesBySlot: mockLoadedFixturesBySlot,
    }
  })

  it('should render the headers and a fixture', () => {
    const { getByText, getByRole } = render(props)[0]
    getByText('Fixture')
    getByText('Location')
    getByText('Status')
    getByText('Waste Chute')
    getByRole('button', { name: 'View setup instructions' })
    getByText(WASTE_CHUTE_SLOT)
  })

  //  TODO(Jr, 10/4/23): add test coverage for buttons and status label
})
