// @flow

import React from 'react'
import { shallow } from 'enzyme'
import { Modal, OutlineButton } from '@opentrons/components'
import * as persist from '../../../../persist'
import { AnnouncementModal, localStorageKey } from '../'
import * as announcements from '../announcements'
import type { Announcement } from '../announcements'

jest.mock('../../../../persist.js')

describe('AnnouncementModal', () => {
  const appVersion = '1.0.0'
  const getLocalStorageItemMock: JestMockFn<[string], mixed> =
    persist.getLocalStorageItem

  const announcementsMock: {
    announcements: Array<Announcement>,
  } = announcements

  beforeEach(() => {
    getLocalStorageItemMock.mockReturnValue(appVersion)
  })

  test('modal is not shown when announcement has been shown before', () => {
    announcementsMock.announcements = [
      {
        image: null,
        heading: 'a test header',
        message: 'test',
        version: appVersion,
      },
    ]

    const wrapper = shallow(<AnnouncementModal />)

    expect(wrapper.find(Modal)).toHaveLength(0)
  })

  test('announcement is shown when user has not seen it before', () => {
    announcementsMock.announcements = [
      {
        image: null,
        heading: 'a test header',
        message: 'brand new spanking feature',
        version: '1.1.0',
      },
    ]

    const wrapper = shallow(<AnnouncementModal />)
    const modal = wrapper.find(Modal)

    expect(modal).toHaveLength(1)
    expect(modal.html()).toContain('brand new spanking feature')
  })

  test('latest announcement is always shown', () => {
    announcementsMock.announcements = [
      {
        image: null,
        heading: 'a first header',
        message: 'first announcement',
        version: appVersion,
      },
      {
        image: null,
        heading: 'a second header',
        message: 'second announcement',
        version: '1.1.0',
      },
    ]

    const wrapper = shallow(<AnnouncementModal />)
    const modal = wrapper.find(Modal)

    expect(modal).toHaveLength(1)
    expect(modal.html()).toContain('second announcement')
  })

  test('optional image component is displayed when exists', () => {
    announcementsMock.announcements = [
      {
        image: <img src="test.jpg" />,
        heading: 'a test header',
        message: 'brand new spanking feature',
        version: '1.1.0',
      },
    ]

    const wrapper = shallow(<AnnouncementModal />)
    const image = wrapper.find('img')

    expect(image).toHaveLength(1)
  })

  test('button click saves announcement version to localStorage and closes modal', () => {
    announcementsMock.announcements = [
      {
        image: null,
        heading: 'a test header',
        message: 'brand new spanking feature',
        version: '1.1.0',
      },
    ]

    const wrapper = shallow(<AnnouncementModal />)
    const button = wrapper.find(OutlineButton)
    button.simulate('click')

    expect(persist.setLocalStorageItem).toHaveBeenCalledWith(
      localStorageKey,
      '1.1.0'
    )
    expect(wrapper.find(Modal)).toHaveLength(0)
  })
})
