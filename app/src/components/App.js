import React from 'react'
import { Switch, Route, Redirect } from 'react-router'

import NavBar from './nav-bar'

import { PageWrapper } from '../components/Page'
import SidePanel from '../pages/SidePanel'
import Robots from '../pages/Robots'
import More from '../pages/More'
import Upload from '../pages/Upload'
import Calibrate from '../pages/Calibrate'
import Run from '../pages/Run'
import { PortalRoot as ModalPortalRoot } from './portal'

import './App.global.css'
import styles from './App.css'

export default function App() {
  return (
    <div className={styles.wrapper} onDragOver={stopEvent} onDrop={stopEvent}>
      <NavBar />
      <SidePanel />
      <PageWrapper>
        <Switch>
          <Redirect from="(.*)/index.html" to="/" />
          <Redirect exact from="/" to="/robots" />
          <Route path="/robots/:name?" component={Robots} />
          <Route path="/menu" component={More} />
          <Route path="/upload" component={Upload} />
          <Route path="/calibrate" component={Calibrate} />
          <Route path="/run" component={Run} />
        </Switch>
        <ModalPortalRoot />
      </PageWrapper>
    </div>
  )
}

function stopEvent(event) {
  event.preventDefault()
}
