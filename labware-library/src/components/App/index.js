// @flow
// main application wrapper component
import * as React from 'react'
import {hot} from 'react-hot-loader/root'

import Nav from '../Nav'
import Sidebar from '../Sidebar'
import styles from './styles.css'

export function App () {
  return (
    <React.Fragment>
      <Nav />
      <div className={styles.page}>
        <Sidebar />
        <section className={styles.content}>
          <div className={styles.content_container} />
        </section>
      </div>
    </React.Fragment>
  )
}

export default hot(App)
