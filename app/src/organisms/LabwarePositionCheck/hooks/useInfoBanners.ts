import { useState } from 'react'

interface BannerProps {
  showBanner: boolean
  toggleBanner: () => void
}

export interface UseInfoBannersResult {
  defaultOffsetInfoBanner: BannerProps
}

// Holds state & functionality for managing banners that require app-wide persistent state.
// If state should persist between LPC wizard sessions, use Redux instead!
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
