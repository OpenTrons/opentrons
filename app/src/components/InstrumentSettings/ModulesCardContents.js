// @flow
import * as React from 'react'
import type { Module } from '../../http-api-client'
import ModuleItem, { NoModulesMessage } from '../ModuleItem'

type Props = {
  modules: ?Array<Module>,
}

export default function ModulesCardContents(props: Props) {
  const { modules } = props
  if (!modules || !modules[0]) return <NoModulesMessage />

  return (
    <React.Fragment>
      {modules.map((mod, index) => (
        <ModuleItem module={mod} key={index} />
      ))}
    </React.Fragment>
  )
}
