// @flow
import * as React from 'react'
import styles from './styles.css'
import MobileMenu from './MobileMenu'
import {
  navLinkProps,
  protocolLinkProps,
  supportLinkProps,
  salesLinkProps,
} from './nav-data'
import type { MenuName } from './types'

type State = {| menu: null | MenuName |}

type Props = {||}

export class MobileNav extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { menu: null }
  }

  clear = () => this.setState({ menu: null })

  toggle = (name: MenuName) =>
    this.setState({ menu: this.state.menu !== name ? name : null })

  render() {
    const { menu } = this.state
    return (
      <ul className={styles.mobile_nav}>
        {navLinkProps.map(subnav => (
          <li
            className={styles.mobile_nav_item}
            key={subnav.name}
            role="button"
          >
            <MobileMenu
              {...subnav}
              active={menu === subnav.name}
              onClick={() => this.toggle(subnav.name)}
            />
          </li>
        ))}
        <li className={styles.mobile_nav_item} role="button">
          <MobileMenu
            {...protocolLinkProps}
            name="Protocols"
            active={menu === 'Protocols'}
            onClick={() => this.toggle('Protocols')}
          />
        </li>
        <li className={styles.mobile_nav_item} role="button">
          <MobileMenu
            {...supportLinkProps}
            {...salesLinkProps}
            name="Support & Sales"
            active={menu === 'Support'}
            onClick={() => this.toggle('Support')}
          />
        </li>
      </ul>
    )
  }
}
