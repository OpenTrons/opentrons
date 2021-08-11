import * as React from 'react'
import snakeCase from 'lodash/snakeCase'
import { Trans, useTranslation } from 'react-i18next'
import {
  Btn,
  Box,
  Link,
  Text,
  ALIGN_FLEX_END,
  SPACING_2,
  SPACING_3,
  SPACING_5,
  COLOR_WARNING_LIGHT,
  SPACING_1,
  C_DARK_GRAY,
  C_BLUE,
} from '@opentrons/components'
import { getModuleName } from './utils/getModuleName'
import { SecureLabwareModal } from './SecureLabwareModal'
import type { ModuleTypesThatRequiresExtraAttention } from './utils/getModuleTypesThatRequireExtraAttention'

interface ExtraAttentionWarningProps {
  moduleTypes: ModuleTypesThatRequiresExtraAttention[]
}

const ModuleWarning = (props: {
  moduleType: ModuleTypesThatRequiresExtraAttention
  onLinkClick: () => unknown
}): JSX.Element => {
  const { t } = useTranslation('protocol_setup')
  const moduleName = getModuleName(props.moduleType)
  return (
    <Box>
      <Text
        as="h5"
        marginTop={SPACING_2}
        marginBottom={SPACING_1}
        marginX={SPACING_2}
      >
        {getModuleName(props.moduleType)}
      </Text>
      <Trans
        t={t}
        i18nKey={`${snakeCase(moduleName)}_attention_warning`}
        components={{
          block: (
            <Text
              marginX={SPACING_2}
              marginBottom={SPACING_2}
              fontSize={'0.7rem'}
            />
          ),
          a: (
            <Btn
              as={Link}
              color={C_BLUE}
              alignSelf={ALIGN_FLEX_END}
              onClick={props.onLinkClick}
            />
          ),
        }}
      />
    </Box>
  )
}

export const ExtraAttentionWarning = (
  props: ExtraAttentionWarningProps
): JSX.Element => {
  const { moduleTypes } = props
  const [
    secureLabwareModalType,
    setSecureLabwareModalType,
  ] = React.useState<ModuleTypesThatRequiresExtraAttention | null>(null)
  return (
    <React.Fragment>
      {secureLabwareModalType != null && (
        <SecureLabwareModal
          type={secureLabwareModalType}
          onCloseClick={() => setSecureLabwareModalType(null)}
        />
      )}
      <Box
        marginX={SPACING_5}
        marginY={SPACING_3}
        backgroundColor={COLOR_WARNING_LIGHT}
        color={C_DARK_GRAY}
      >
        <Text as="h4" margin={SPACING_2}>
          Some labware and modules require extra attention
        </Text>
        {moduleTypes.map(moduleType => (
          <ModuleWarning
            key={moduleType}
            moduleType={moduleType}
            onLinkClick={() => setSecureLabwareModalType(moduleType)}
          />
        ))}
      </Box>
    </React.Fragment>
  )
}
