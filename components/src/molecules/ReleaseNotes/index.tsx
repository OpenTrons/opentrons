import Markdown from 'react-markdown'
import { LegacyStyledText } from '../../atoms'
import { COLORS } from '../../helix-design-system'
import { Box } from '../../primitives'
import { SPACING } from '../../ui-style-constants'

import styles from './styles.module.css'

export interface ReleaseNotesProps {
  isOEMMode: boolean
  source?: string | null
}

const DEFAULT_RELEASE_NOTES = 'We recommend upgrading to the latest version.'

export function ReleaseNotes(props: ReleaseNotesProps): JSX.Element {
  const { source, isOEMMode } = props

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
            hr: HorizontalRule,
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
  return <LegacyStyledText {...props} as="p" />
}

function HeaderText(props: JSX.IntrinsicAttributes): JSX.Element {
  return <LegacyStyledText {...props} as="h3" />
}

function ListItemText(props: JSX.IntrinsicAttributes): JSX.Element {
  return <LegacyStyledText {...props} as="li" />
}

function UnnumberedListText(props: JSX.IntrinsicAttributes): JSX.Element {
  return <LegacyStyledText {...props} as="ul" />
}

function HorizontalRule(): JSX.Element {
  return (
    <Box
      borderBottom={`1px solid ${COLORS.grey30}`}
      marginY={SPACING.spacing16}
      data-testid="divider"
    />
  )
}
