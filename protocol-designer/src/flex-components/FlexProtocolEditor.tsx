import React, { useState } from 'react'
import {
  RoundTab,
  Flex,
  DIRECTION_COLUMN,
  Box,
  COLORS,
  BORDERS,
  SPACING,
  NewPrimaryBtn,
} from '@opentrons/components'
import { Formik } from 'formik'
import { i18n } from '../localization'
import { Modules } from './FlexModules'
import { FlexPipettes } from './FlexPipettes'
import { FlexProtocolName } from './FlexProtocolName'
import { StyledText } from './StyledText'
import styles from './FlexComponents.css'

const RoundTabs = (props: any): JSX.Element => {
  const { setCurrentTab, currentTab } = props
  const tabs = [
    {
      name: i18n.t('flex.name_and_description.name'),
      id: 1,
    },
    {
      name: i18n.t('flex.pipettes_selection.name'),
      id: 2,
    },
    {
      name: i18n.t('flex.modules_selection.name'),
      id: 3,
    },
  ]

  return (
    <>
      {tabs.map(({ name, id }, index) => {
        return (
          <RoundTab
            key={index}
            isCurrent={currentTab === id}
            onClick={() => setCurrentTab(id)}
          >
            <StyledText>{name}</StyledText>
          </RoundTab>
        )
      })}
    </>
  )
}

const selectComponent = (selectedTab: Number, props: any): any => {
  switch (selectedTab) {
    case 1:
      return <FlexProtocolName formProps={props} />
    case 2:
      return <FlexPipettes formProps={props} />
    case 3:
      return <Modules formProps={props} />
    default:
      return null
  }
}

function FlexProtocolEditorComponent(): JSX.Element {
  const [selectedTab, setTab] = useState<number>(1)

  const handleNext = (selectedTab: number): any => {
    const setTabNumber =
      selectedTab > 0 && selectedTab < 3 ? selectedTab + 1 : selectedTab
    setTab(setTabNumber)
  }
  const handlePrevious = (selectedTab: number): any => {
    const setTabNumber =
      selectedTab > 1 && selectedTab <= 3 ? selectedTab - 1 : selectedTab
    setTab(setTabNumber)
  }

  const nextButton =
    selectedTab === 3
      ? i18n.t('flex.round_tabs.go_to_liquids_page')
      : i18n.t('flex.round_tabs.next')

  const getInitialValues = {
    fields: {
      pndName: '',
      pndOrgAuthor: '',
      pndDescription: '',
    },
    pipetteSelectionData: {
      firstPipette: {},
      secondPipette: {},
    },
  }

  return (
    <Flex flexDirection={DIRECTION_COLUMN}>
      <Flex>
        <RoundTabs setCurrentTab={setTab} currentTab={selectedTab} />
      </Flex>
      <Box
        backgroundColor={COLORS.white}
        border={BORDERS.lineBorder}
        // remove left upper corner border radius when first tab is active
        borderRadius={selectedTab === 1 ? '0' : BORDERS.radiusSoftCorners}
        padding={SPACING.spacing4}
      >
        {
          <Formik
            enableReinitialize
            initialValues={getInitialValues}
            validateOnChange={false}
            onSubmit={(values, actions) => {
              console.log({ values, actions })
            }}
          >
            {(props: any) => (
              <form onSubmit={props.handleSubmit}>
                <section className={styles.editor_form}>
                  {selectComponent(selectedTab, props)}
                </section>
                <div className={styles.flex_round_tabs_button_wrapper}>
                  {selectedTab !== 1 && (
                    <NewPrimaryBtn
                      tabIndex={5}
                      onClick={() => handlePrevious(selectedTab)}
                      className={styles.flex_round_tabs_button_50p}
                    >
                      {i18n.t('flex.round_tabs.previous')}
                    </NewPrimaryBtn>
                  )}
                  <NewPrimaryBtn
                    tabIndex={4}
                    type="submit"
                    onClick={() => handleNext(selectedTab)}
                    className={
                      selectedTab !== 1
                        ? styles.flex_round_tabs_button_50p
                        : styles.flex_round_tabs_button_100p
                    }
                  >
                    {nextButton}
                  </NewPrimaryBtn>
                </div>
              </form>
            )}
          </Formik>
        }
      </Box>
    </Flex>
  )
}

export const FlexProtocolEditor = FlexProtocolEditorComponent
