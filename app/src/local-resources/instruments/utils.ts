export interface IsPartialTipConfigParams {
  channel: 1 | 8 | 96
  activeNozzleCount: number
}

export function isPartialTipConfig({
  channel,
  activeNozzleCount,
}: IsPartialTipConfigParams): boolean {
  switch (channel) {
    case 1:
      return false
    case 8:
      return activeNozzleCount !== 8
    case 96:
      return activeNozzleCount !== 96
  }
}
