import i18n from 'i18next'
import capitalize from 'lodash/capitalize'
import startCase from 'lodash/startCase'
import { initReactI18next } from 'react-i18next'
import { resources } from './assets/localization'
import { titleCase } from '@opentrons/shared-data'

import type { InitOptions } from 'i18next'

export const US_ENGLISH = 'en-US'
export const SIMPLIFIED_CHINESE = 'zh-CN'

// these strings will not be translated so should not be localized
export const US_ENGLISH_DISPLAY_NAME = 'English (US)'
export const SIMPLIFIED_CHINESE_DISPLAY_NAME = '中文'

export type Language = typeof US_ENGLISH | typeof SIMPLIFIED_CHINESE

export const LANGUAGES: Array<{ name: string; value: Language }> = [
  { name: US_ENGLISH_DISPLAY_NAME, value: US_ENGLISH },
  { name: SIMPLIFIED_CHINESE_DISPLAY_NAME, value: SIMPLIFIED_CHINESE },
]

const i18nConfig: InitOptions = {
  resources,
  lng: 'en',
  fallbackLng: 'en',
  debug: process.env.NODE_ENV === 'development',
  defaultNS: 'shared',
  interpolation: {
    escapeValue: false, // not needed for react as it escapes by default
    format: function (value: string, format, lng) {
      if (format === 'upperCase') return value.toUpperCase()
      if (format === 'lowerCase') return value.toLowerCase()
      if (format === 'capitalize') return capitalize(value)
      if (format === 'sentenceCase') return startCase(value)
      if (format === 'titleCase') return titleCase(value)
      return value
    },
  },
  keySeparator: false, // use namespaces and context instead
  saveMissing: true,
  missingKeyHandler: (lng, ns, key) => {
    process.env.NODE_ENV === 'test'
      ? console.error(`Missing ${lng} Translation: key={${key}} ns={${ns}}`)
      : console.warn(`Missing ${lng} Translation: key={${key}} ns={${ns}}`)
  },
}

const i18nCb = (err?: Error): void => {
  if (err != null) {
    console.error(
      'Internationalization was not initialized properly. error: ',
      err
    )
  }
}

void i18n.use(initReactI18next).init(i18nConfig, i18nCb)

export { i18n, i18nCb, i18nConfig }
