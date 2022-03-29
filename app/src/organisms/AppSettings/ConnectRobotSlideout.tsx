import * as React from 'react'
import { useSelector, connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  Flex,
  ALIGN_FLEX_END,
  DIRECTION_COLUMN,
  SPACING,
  Text,
  TYPOGRAPHY,
  COLORS,
  Icon,
  SIZE_2,
  Link,
} from '@opentrons/components'
import { ManualIpHostnameForm } from './ManualIpHostname'
import { IpHostnameList } from './IpHostnameList'
import { Slideout } from '../../atoms/Slideout'
import { PrimaryButton } from '../../atoms/Buttons'
import { ExternalLink } from '../../atoms/Link/ExternalLink'
import { Divider } from '../../atoms/structure'
import { StyledText } from '../../atoms/text'
import { getScanning, startDiscovery } from '../../redux/discovery'
import { getConfig } from '../../redux/config'

import type { State } from '../../redux/types'
import type { MapDispatchToProps } from 'react-redux'
import type { DiscoveryCandidates } from '../../redux/config/types'

const SUPPORT_PAGE_LINK =
  'https://support.opentrons.com/en/articles/2934336-manually-adding-a-robot-s-ip-address'

interface SP {
  candidates: DiscoveryCandidates
}

interface DP {
  checkIpAndHostname: () => unknown
}
type ConnectRobotSlideoutProps = SP &
  DP & {
    isExpanded: boolean
    onCloseClick: () => unknown
  }

export function ConnectRobotSlideoutComponent(
  props: ConnectRobotSlideoutProps
): JSX.Element | null {
  const [mostRecentAddition, setMostRecentAddition] = React.useState<
    string | null
  >(null)
  const { onCloseClick, isExpanded } = props
  const { t } = useTranslation('app_settings')
  const isScanning = useSelector<State>(getScanning)

  const displayLinkButton = (buttonLabel: string): JSX.Element => {
    return (
      <Link
        role="button"
        css={TYPOGRAPHY.pSemiBold}
        color={COLORS.blue}
        onClick={props.checkIpAndHostname}
        id="AppSettings_Connection_Button"
      >
        {buttonLabel}
      </Link>
    )
  }

  React.useEffect(() => {
    if (!isScanning) {
      setMostRecentAddition(null)
    }
  }, [isScanning])

  return (
    <Slideout
      title={t('connect_ip')}
      onCloseClick={onCloseClick}
      isExpanded={isExpanded}
      height={`calc(100vh - ${SPACING.spacing4})`}
      footer={
        <PrimaryButton onClick={onCloseClick} width="100%">
          {t('connect_ip_button')}
        </PrimaryButton>
      }
    >
      <Flex flexDirection={DIRECTION_COLUMN}>
        <Text fontSize={TYPOGRAPHY.fontSizeP} marginBottom={SPACING.spacing3}>
          {t('ip_description_first')}
        </Text>
        <Text fontSize={TYPOGRAPHY.fontSizeP}>
          {t('ip_description_second')}
        </Text>
        <ExternalLink
          href={SUPPORT_PAGE_LINK}
          css={TYPOGRAPHY.pSemiBold}
          id="ConnectIPAddressSupportPage"
          marginTop={SPACING.spacing4}
        >
          {t('connect_ip_link')}
        </ExternalLink>
        <Divider marginY={SPACING.spacing5} />
        <Text css={TYPOGRAPHY.pSemiBold}>{t('add_ip_hostname')}</Text>
        <ManualIpHostnameForm setMostRecentAddition={setMostRecentAddition} />

        <Flex
          marginTop={SPACING.spacing5}
          marginBottom={SPACING.spacing4}
          justifyContent={ALIGN_FLEX_END}
        >
          {isScanning ? (
            <Icon name="ot-spinner" size={SIZE_2} spin />
          ) : (
            [
              mostRecentAddition !== null ? (
                displayLinkButton(t('ip_refresh_button'))
              ) : (
                <>
                  <StyledText
                    as="p"
                    color={COLORS.darkGreyEnabled}
                    margin={`0 ${SPACING.spacing2}`}
                  >
                    {t('ip_connect_timeout')}
                  </StyledText>
                  {displayLinkButton(t('ip_reconnect_button'))}
                </>
              ),
            ]
          )}
        </Flex>
        <IpHostnameList mostRecentAddition={mostRecentAddition} />
      </Flex>
    </Slideout>
  )
}

const mapStateToProps = (state: State): SP => {
  return {
    candidates: getConfig(state)?.discovery.candidates ?? [],
  }
}

const mapDispatchToProps: MapDispatchToProps<DP, {}> = dispatch => {
  return {
    checkIpAndHostname: () => {
      dispatch(startDiscovery())
    },
  }
}

export const ConnectRobotSlideout = connect(
  mapStateToProps,
  mapDispatchToProps
)(ConnectRobotSlideoutComponent)
