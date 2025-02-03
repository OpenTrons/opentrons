import type { FC } from 'react'

/** assistant: ChatGPT API, user: user */
type Role = 'assistant' | 'user'

export interface ChatData {
  /** assistant: ChatGPT API, user: user */
  role: Role
  /** content ChatGPT API return or user prompt */
  reply: string
  /** for testing purpose will be removed and this is not used in the app */
  fake?: boolean
  /** uuid to map the chat prompt request to the response from the LLM */
  requestId: string
}

export interface CreatePrompt {
  /** the prompt that is generated by the create protocol page */
  prompt: string
  regenerate: boolean
  scientific_application_type: string
  description: string
  robots: 'opentrons_flex' | 'opentrons_ot2' | string
  mounts: string[]
  flexGripper: boolean
  modules: string[]
  labware: string[]
  liquids: string[]
  steps: string[]
  fake?: boolean
  fake_id?: number
}

export type UpdateOptions =
  | 'adapt_python_protocol'
  | 'change_labware'
  | 'change_pipettes'
  | 'other'

export interface UpdatePrompt {
  /** the prompt that is generated by the update protocol page */
  prompt: string
  protocol_text: string
  regenerate: boolean
  update_type: UpdateOptions
  update_details: string
  fake: boolean
  fake_id: number
}

export interface Chat {
  /** assistant: ChatGPT API, user: user */
  role: Role
  /** content ChatGPT API return or user prompt */
  content: string
}

export interface RouteProps {
  /** the component rendered by a route match
   * drop developed components into slots held by placeholder div components
   * */
  Component: FC
  /** a route/page name to render in the nav bar
   */
  name: string
  /** the path for navigation linking, for example to push to a default tab
   */
  path: string
  navLinkTo: string
}

export interface Mixpanel {
  analytics: {
    hasOptedIn: boolean
  }
  isInitialized: boolean
}

export interface AnalyticsEvent {
  name: string
  properties: Record<string, unknown>
  superProperties?: Record<string, unknown>
}

export interface HeaderWithMeterAtomProps {
  displayHeaderWithMeter: boolean
  progress: number
}

export interface CreateProtocolAtomProps {
  currentSection: number
  focusSection: number
}

export interface PromptData {
  /** assistant: ChatGPT API, user: user */
  role: Role
  /** content gathered from the user selection */
  data: {
    applicationSection: {
      application: string
      description: string
    }
    instrumentsSection: {
      robot: string
      instruments: string[]
    }
  }
}
