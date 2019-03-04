// @flow

import cookie from 'cookie'
import queryString from 'query-string'
import i18n from '../localization'

export type GateStage = 'loading' |
  'promptVerifyIdentity' |
  'promptCheckEmail' |
  'failedIdentityVerification' |
  'promptOptForAnalytics' |
  'openGate'

type GateState = {gateStage: GateStage, errorMessage: ?string}

// TODO: IMMEDIATELY these constants should be switched on env vars
const OPENTRONS_API_BASE_URL = 'https://staging.web-api.opentrons.com'
const VERIFY_EMAIL_PATH = '/users/verify-email'
const CONFIRM_EMAIL_PATH = '/users/confirm-email'
const PROTOCOL_DESIGNER_URL = 'https://staging.designer.opentrons.com'

const headers = {'Accept': 'application/json', 'Content-Type': 'application/json'}

const writeIdentityCookie = (payload) => {
  global.document.cookie = cookie.serialize('name', payload.name)
  global.document.cookie = cookie.serialize('email', payload.email)
}

const getStageFromIdentityCookie = (token: ?string, hasOptedIntoAnalytics: boolean) => {
  const cookies = cookie.parse(global.document.cookie)
  const {email, name} = cookies
  const hasIdentityCookie = Boolean(email && name)

  if (hasIdentityCookie) {
    return hasOptedIntoAnalytics ? 'openGate' : 'promptOptForAnalytics'
  } else {
    return token ? 'failedIdentityVerification' : 'promptVerifyIdentity'
  }
}

export const getGateStage = (hasOptedIntoAnalytics: boolean): Promise<GateState> => {
  const parsedQueryStringParams = (queryString.parse(global.location.search))
  const {token, name, email} = parsedQueryStringParams
  console.table({token, name, email})
  let gateStage = 'loading'
  let errorMessage = null

  if (token) {
    return fetch(
      `${OPENTRONS_API_BASE_URL}${VERIFY_EMAIL_PATH}`,
      {method: 'POST', headers, body: JSON.stringify({token})},
    ).then(response => response.json().then(body => {
      if (response.ok) { // valid identity token, write new cookie
        writeIdentityCookie(body)
        gateStage = getStageFromIdentityCookie(token, hasOptedIntoAnalytics)
      } else {
        const {status, statusText} = response
        errorMessage = i18n.t('application.networking.unauthorized_verification_failure')
        if (status !== 401) {
          const specificAddendum = (body && body.message) || `${status} ${statusText}`
          errorMessage = `${errorMessage}  (Error Message: ${specificAddendum})`
        }
        gateStage = 'failedIdentityVerification'
      }
      return {gateStage, errorMessage}
    }).catch(error => {
      gateStage = getStageFromIdentityCookie(token, hasOptedIntoAnalytics)
      errorMessage = error || i18n.t('application.networking.generic_verification_failure')
      return {gateStage, errorMessage}
    }))
  } else if (email && name) { // if name and email qs present, ignore cookie and hit confirmEmail
    const confirmEmailBody = {
      name,
      email,
      verifyUrl: PROTOCOL_DESIGNER_URL,
      templateName: 'verify-email-pd',
    }
    return fetch(
      `${OPENTRONS_API_BASE_URL}${CONFIRM_EMAIL_PATH}`,
      {method: 'POST', headers, body: JSON.stringify({...confirmEmailBody})},
    ).then(response => response.json().then(body => {
      if (response.ok) { // valid identity token
        gateStage = 'promptCheckEmail'
      } else {
        errorMessage = i18n.t('application.networking.generic_verification_failure')
        gateStage = 'failedIdentityVerification'
      }
      return {gateStage, errorMessage}
    }).catch(error => {
      gateStage = 'failedIdentityVerification'
      errorMessage = error || i18n.t('application.networking.generic_verification_failure')
      return {gateStage, errorMessage}
    }))
  } else { // No identity token
    gateStage = getStageFromIdentityCookie(token, hasOptedIntoAnalytics)
    return Promise.resolve({gateStage, errorMessage})
  }
}
