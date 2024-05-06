import * as React from 'react'
import Markdown from 'react-markdown'

import { StyledText } from '@opentrons/components'
import { useIsOEMMode } from '../../resources/robot-settings/hooks'

import styles from './styles.module.css'

export interface ReleaseNotesProps {
  source?: string | null
}

const DEFAULT_RELEASE_NOTES = 'We recommend upgrading to the latest version.'

export function ReleaseNotes(props: ReleaseNotesProps): JSX.Element {
  const { source } = props

  const isOEMMode = useIsOEMMode()

  return (
    <div className={styles.release_notes}>
      {source != null && !isOEMMode ? (
        <Markdown
          components={{
            div: undefined,
            ul: UnnumberedListText,
            h2: HeaderText,
            li: ListItemText,
            p: ParagraphText,
            a: ExternalLink,
          }}
        >
          {source}
        </Markdown>
      ) : (
        <p>{DEFAULT_RELEASE_NOTES}</p>
      )}
    </div>
  )
}

function ExternalLink(props: JSX.IntrinsicAttributes): JSX.Element {
  return <a {...props} target="_blank" rel="noopener noreferrer" />
}

function ParagraphText(props: JSX.IntrinsicAttributes): JSX.Element {
  return <StyledText {...props} as="p" />
}

function HeaderText(props: JSX.IntrinsicAttributes): JSX.Element {
  return <StyledText {...props} as="h3" />
}

function ListItemText(props: JSX.IntrinsicAttributes): JSX.Element {
  return <StyledText {...props} as="li" />
}

function UnnumberedListText(props: JSX.IntrinsicAttributes): JSX.Element {
  return <StyledText {...props} as="ul" />
}
