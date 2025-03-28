import type * as React from 'react'
import { Provider } from 'react-redux'
import { createStore } from 'redux'

import { configReducer } from '../../redux/config/reducer'
import { EstopMissingModal } from '.'

import type { Store, StoreEnhancer } from 'redux'
import type { Story, Meta } from '@storybook/react'

export default {
  title: 'App/Organisms/EstopMissingModal',
  component: EstopMissingModal,
} as Meta

const dummyConfig = {
  config: {
    isOnDevice: false,
  },
} as any

const store: Store<any> = createStore(
  configReducer,
  dummyConfig as StoreEnhancer
)

const Template: Story<
  React.ComponentProps<typeof EstopMissingModal>
> = args => (
  <Provider store={store}>
    <EstopMissingModal {...args} />
  </Provider>
)

export const EstopMissing = Template.bind({})
EstopMissing.args = {
  robotName: 'Flexy',
  closeModal: () => {},
  isDismissedModal: false,
  setIsDismissedModal: () => {},
}
