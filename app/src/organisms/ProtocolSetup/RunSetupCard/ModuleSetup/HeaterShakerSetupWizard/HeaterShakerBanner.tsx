import { COLORS } from '@opentrons/components'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Divider } from '../../../../../atoms/structure/Divider'
import { HeaterShakerWizard } from '../../../../Devices/HeaterShakerWizard'
import { ModuleRenderInfoForProtocol } from '../../../../Devices/hooks'
import { Banner, BannerItem } from '../Banner/Banner'

interface HeaterShakerBannerProps {
  displayName: string
  modules: ModuleRenderInfoForProtocol[]
}

export function HeaterShakerBanner(
  props: HeaterShakerBannerProps
): JSX.Element | null {
  const [showWizard, setShowWizard] = React.useState(false)
  const { displayName, modules } = props
  const { t } = useTranslation('heater_shaker')
  return (
    <Banner title={t('attach_heater_shaker_to_deck', { name: displayName })}>
      {modules.map((module, index) => (
        <React.Fragment key={index}>
          {showWizard && (
            <HeaterShakerWizard
              onCloseClick={() => setShowWizard(false)}
              moduleFromProtocol={module}
            />
          )}
          {index > 0 && <Divider color={COLORS.medGrey} />}
          <BannerItem
            title={t('module_in_slot', {
              moduleName: module.moduleDef.displayName,
              slotName: module.slotName,
            })}
            body={t('improperly_fastened_description')}
            btnText={t('view_instructions')}
            onClick={() => setShowWizard(true)}
          />
        </React.Fragment>
      ))}
    </Banner>
  )
}
