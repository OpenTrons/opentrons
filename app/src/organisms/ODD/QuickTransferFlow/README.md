# Quick Transfer Versioning:

Quick Transfer is versioned under the `designerApplicationData` field on the resulting protocol file. Since this data is not yet read or migrated this doc details the versions, type of `quickTransferState` per version, and other changes made so that migration can occur in the future if needed.

## Version 1.0.0

```
export interface QuickTransferSummaryState {
  pipette: PipetteV2Specs
  mount: Mount
  tipRack: LabwareDefinition2
  source: LabwareDefinition2
  sourceWells: string[]
  destination: LabwareDefinition2 | 'source'
  destinationWells: string[]
  transferType: TransferType
  volume: number
  aspirateFlowRate: number
  dispenseFlowRate: number
  path: PathOption
  tipPositionAspirate: number
  preWetTip: boolean
  mixOnAspirate?: {
    mixVolume: number
    repititions: number
  }
  delayAspirate?: {
    delayDuration: number
    positionFromBottom: number
  }
  touchTipAspirate?: number
  airGapAspirate?: number
  tipPositionDispense: number
  mixOnDispense?: {
    mixVolume: number
    repititions: number
  }
  delayDispense?: {
    delayDuration: number
    positionFromBottom: number
  }
  touchTipDispense?: number
  disposalVolume?: number
  blowOut?: BlowOutLocation
  airGapDispense?: number
  changeTip: ChangeTipOptions
  dropTipLocation: CutoutConfig
}
```

## Version 1.1.0

Type is the same as in `1.0.0`, but the number represented by `touchTipAspirate` and `touchTipDispense` is now the distance from the top of the well instead of distance from the bottom of the well. This can be migrated using the well height from the definition on both source and dest labware.

```
touchTipAspirate = -(sourceWellHeight - prevTouchTipAspirate)
touchTipDispense = -(destWellHeight - prevTouchTipDispense)
```
