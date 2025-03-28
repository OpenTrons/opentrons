import { useState } from 'react'

interface BannerProps {
  showBanner: boolean
  toggleBanner: () => void
}

export interface UseInfoBannersResult {
  defaultOffsetInfoBanner: BannerProps
}

// TODO(jh, 03-28-25): This could live in redux.

// Holds state & functionality for managing banners that require persistent state for this LPC session only.
export function useInfoBanners(): UseInfoBannersResult {
  const [
    showDefaultOffsetInfoBanner,
    setShowDefaultOffsetInfoBanner,
  ] = useState(true)

  const toggleDefaultOffsetInfoBanner = (): void => {
    setShowDefaultOffsetInfoBanner(!showDefaultOffsetInfoBanner)
  }

  return {
    defaultOffsetInfoBanner: {
      toggleBanner: toggleDefaultOffsetInfoBanner,
      showBanner: showDefaultOffsetInfoBanner,
    },
  }
}
