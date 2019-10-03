// @flow
import { getAnalyticsCookies } from './utils'
import { trackWithMixpanel } from './mixpanel'
import type { AnalyticsEvent } from './types'

// NOTE: right now we report with only mixpanel, this fn is meant
// to be a general interface to any analytics event reporting
export const reportEvent = (event: AnalyticsEvent) => {
  // NOTE: this cookie parsing is not very performant, but this implementation
  // uses cookies as the source of truth (not `analyticsState` of the hook)
  const { optedIn } = getAnalyticsCookies()

  console.debug('Trackable event', { event, optedIn })
  if (optedIn) {
    trackWithMixpanel(event.name, event.properties)
  }
}
