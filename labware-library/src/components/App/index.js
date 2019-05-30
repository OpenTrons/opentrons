// @flow
// main application wrapper component
import * as React from 'react'
import { hot } from 'react-hot-loader/root'
import cx from 'classnames'

import { DefinitionRoute } from '../../definitions'
import { getFilters } from '../../filters'
import Nav, { Breadcrumbs } from '../Nav'
import Sidebar from '../Sidebar'
import Page from './Page'
import LabwareList from '../LabwareList'
import LabwareDetails from '../LabwareDetails'
import styles from './styles.css'

import type { DefinitionRouteRenderProps } from '../../definitions'

export function App(props: DefinitionRouteRenderProps) {
  const { definition, location } = props
  const scrollRef = React.useRef<HTMLDivElement | null>(null)
  const filters = getFilters(location)
  const detailPage = Boolean(definition)

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    window.scrollTo(0, 0)
  }, [location.pathname, location.search])

  return (
    <div
      className={cx(styles.app, {
        [styles.is_detail_page]: detailPage,
      })}
    >
      <Nav />
      {detailPage && <Breadcrumbs definition={definition} />}
      <Page
        scrollRef={scrollRef}
        detailPage={detailPage}
        sidebar={<Sidebar filters={filters} />}
        content={
          definition ? (
            <LabwareDetails definition={definition} />
          ) : (
            <LabwareList filters={filters} />
          )
        }
      />
    </div>
  )
}

export function AppWithRoute() {
  return <DefinitionRoute render={props => <App {...props} />} />
}

export default hot(AppWithRoute)
