import { I18nextProvider } from 'react-i18next'
import { GlobalStyle } from '../app/src/atoms/GlobalStyle'
import { i18n } from '../app/src/i18n'

global.APP_SHELL_REMOTE = {
  ipcRenderer: {
    on: (topic, cb) => {},
    invoke: (callname, args) => {},
    send: (message, payload) => {},
  },
}
global._PKG_VERSION_ = '0.0.0-storybook'

export const customViewports = {
  onDeviceDisplay: {
    name: 'Touchscreen',
    type: 'tablet',
    styles: {
      width: '1024px',
      height: '600px',
    },
  },
  desktopMinWidth: {
    // retains a 4:3 aspect ratio... minHeight is not set so the user
    // could drag the app up to a thin strip, but that's not terribly
    // useful for viewing designs
    name: 'Desktop Minimum Width',
    type: 'desktop',
    styles: {
      width: '600px',
      height: '450px',
    },
  },
  desktopSmall: {
    // A size typically used in figma app backgrounds, useful for viewing
    // larger components in context
    name: 'Desktop Typical Small',
    type: 'desktop',
    styles: {
      width: '1024px',
      height: '700px',
    },
  },
  protocolDesignerBase: {
    // The base size for Protocol Designer. This might be the base size for web
    name: 'Protocol Designer Base',
    type: 'desktop',
    styles: {
      width: '14402px',
      height: '1024px',
    },
  },
}

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  viewport: { viewports: customViewports },
  options: {
    storySort: {
      method: 'alphabetical',
      order: [
        'Design Tokens',
        'Helix',
        'Library',
        'App',
        'ODD',
        'Protocol-Designer',
        'AI',
      ],
    },
  },
}

// Global decorator to apply the styles to all stories
export const decorators = [
  Story => (
    <I18nextProvider i18n={i18n}>
      <GlobalStyle />
      <Story />
    </I18nextProvider>
  ),
]
