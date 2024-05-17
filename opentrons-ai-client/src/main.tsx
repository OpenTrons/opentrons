import React from 'react'
import ReactDOM from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { Auth0Provider } from '@auth0/auth0-react'

import { GlobalStyle } from './atoms/GlobalStyle'
import { i18n } from './i18n'
import { App } from './App'

const rootElement = document.getElementById('root')
if (rootElement != null) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <Auth0Provider
        domain="identity.auth-dev.opentrons.com"
        clientId="PcuD1wEutfijyglNeRBi41oxsKJ1HtKw"
        authorizationParams={{
          redirect_uri: window.location.origin,
        }}
      >
        <GlobalStyle />
        <I18nextProvider i18n={i18n}>
          <App />
        </I18nextProvider>
      </Auth0Provider>
    </React.StrictMode>
  )
} else {
  console.error('Root element not found')
}
