import styled from 'styled-components'
import {
  Flex,
  StyledText,
  Tag,
  DIRECTION_COLUMN,
  WRAP,
  SPACING,
  COLORS,
  BORDERS,
} from '@opentrons/components'
import React from 'react'

export interface PromptPreviewSectionProps {
  title: string
  items: string[]
  itemMaxWidth?: string
  oneItemPerRow?: boolean
}

const PromptPreviewSectionContainer = styled(Flex)`
  flex-direction: ${DIRECTION_COLUMN};
  margin-top: ${SPACING.spacing32};
`

const SectionHeading = styled(StyledText)`
  margin-bottom: ${SPACING.spacing8};
`

const TagsContainer = styled.div<{
  oneItemPerRow: boolean
}>`
  display: flex;
  grid-gap: ${SPACING.spacing4};
  flex-wrap: ${WRAP};
  justify-content: flex-start;
  width: 100%;
  flex-direction: ${props => (Boolean(props.oneItemPerRow) ? 'column' : 'row')};
`

const TagItemWrapper = styled.div<{
  itemMaxWidth: string
}>`
  display: flex;
  width: auto;
  max-width: ${props => props.itemMaxWidth};

  & > div {
    overflow: visible;
    width: 100%;
    max-width: 100%;

    > p {
      overflow: visible;
      white-space: pre-wrap !important;
      word-wrap: break-word;
      word-break: break-word;
      width: 100%;
    }
  }
`

// Special wrapper for the line break item
const LineBreakWrapper = styled.div`
  width: 100%;
  flex-basis: 100%;
  height: 0;
`

// Custom styled component that mimics a Tag but handles newlines
const StepTag = styled.div`
  background-color: ${COLORS.black90}${COLORS.opacity20HexCode};
  color: ${COLORS.black90};
  border-radius: ${BORDERS.borderRadius4};
  padding: ${SPACING.spacing2} ${SPACING.spacing8};
  width: 100%;
`

// Component to handle multiline steps
const StepTagContent = ({ text }: { text: string }) => {
  // Split by newlines and display each line properly
  return (
    <StepTag>
      {text.split('\n').map((line, i) => (
        <React.Fragment key={i}>
          {i > 0 && <br />}
          {line}
        </React.Fragment>
      ))}
    </StepTag>
  );
};

export function PromptPreviewSection({
  title,
  items,
  itemMaxWidth = '35%',
  oneItemPerRow = false,
}: PromptPreviewSectionProps): JSX.Element {
  return (
    <PromptPreviewSectionContainer>
      <SectionHeading desktopStyle="bodyLargeSemiBold">{title}</SectionHeading>
      <TagsContainer oneItemPerRow={oneItemPerRow}>
        {items.map(
          (item: string, index: number) => {
            // Handle the special line break item that separates labware from liquids
            if (item === '__LINE_BREAK__') {
              return <LineBreakWrapper key={`line-break-${index}`} />;
            }

            // Render regular items
            return item.trim() !== '' && (
              <TagItemWrapper
                data-testid={`item-tag-wrapper-${index}`}
                key={`item-tag-${index}`}
                itemMaxWidth={itemMaxWidth}
              >
                {title === 'Steps' ? (
                  <StepTagContent text={item} />
                ) : (
                  <Tag text={item} type="default" />
                )}
              </TagItemWrapper>
            )
          }
        )}
      </TagsContainer>
    </PromptPreviewSectionContainer>
  )
}
