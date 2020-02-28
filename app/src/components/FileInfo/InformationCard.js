// @flow
import * as React from 'react'
import { connect } from 'react-redux'
import moment from 'moment'

import {
  getProtocolName,
  getProtocolAuthor,
  getProtocolLastUpdated,
  getProtocolMethod,
  getProtocolDescription,
} from '../../protocol'

import { LabeledValue } from '@opentrons/components'
import { InfoSection } from './InfoSection'
import { SectionContentHalf, CardRow } from '../layout'

import type { State, Dispatch } from '../../types'

type OP = {||}

type SP = {|
  name: ?string,
  author: ?string,
  lastUpdated: ?number,
  method: ?string,
  description: ?string,
|}

type Props = {| ...OP, ...SP, dispatch: Dispatch |}

const INFO_TITLE = 'Information'
const DESCRIPTION_TITLE = 'Description'
const DATE_FORMAT = 'DD MMM Y, hh:mmA'

export const InformationCard = connect<Props, OP, SP, _, _, _, _>(
  mapStateToProps
)(InformationCardComponent)

function InformationCardComponent(props: Props) {
  const { name, author, method, description } = props
  const lastUpdated = props.lastUpdated
    ? moment(props.lastUpdated).format(DATE_FORMAT)
    : '-'

  return (
    <React.Fragment>
      <InfoSection title={INFO_TITLE}>
        <CardRow>
          <SectionContentHalf>
            <LabeledValue label="Protocol Name" value={name || '-'} />
          </SectionContentHalf>
          <SectionContentHalf>
            <LabeledValue label="Organization/Author" value={author || '-'} />
          </SectionContentHalf>
        </CardRow>
        <CardRow>
          <SectionContentHalf>
            <LabeledValue label="Last Updated" value={lastUpdated} />
          </SectionContentHalf>
          <SectionContentHalf>
            <LabeledValue label="Creation Method" value={method || '-'} />
          </SectionContentHalf>
        </CardRow>
      </InfoSection>
      {description && (
        <InfoSection title={DESCRIPTION_TITLE}>
          <p>{description}</p>
        </InfoSection>
      )}
    </React.Fragment>
  )
}

function mapStateToProps(state: State): SP {
  return {
    name: getProtocolName(state),
    author: getProtocolAuthor(state),
    lastUpdated: getProtocolLastUpdated(state),
    method: getProtocolMethod(state),
    description: getProtocolDescription(state),
  }
}
