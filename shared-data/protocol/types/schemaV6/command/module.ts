export type ModuleCommand =
  | { commandType: 'magneticModule/engageMagnet'; params: EngageMagnetParams }
  | { commandType: 'magneticModule/disengageMagnet'; params: ModuleOnlyParams }
  | {
      commandType: 'temperatureModule/setTargetTemperature'
      params: TemperatureParams
    }
  | { commandType: 'temperatureModule/deactivate'; params: ModuleOnlyParams }
  | {
      commandType: 'temperatureModule/awaitTemperature'
      params: TemperatureParams
    }
  | {
      commandType: 'thermocycler/setTargetBlockTemperature'
      params: ThermocyclerSetTargetBlockTemperatureParams
    }
  | {
      commandType: 'thermocycler/setTargetLidTemperature'
      params: TemperatureParams
    }
  | {
      commandType: 'thermocycler/awaitBlockTemperature'
      params: TemperatureParams
    }
  | {
      commandType: 'thermocycler/awaitLidTemperature'
      params: TemperatureParams
    }
  | { commandType: 'thermocycler/openLid'; params: ModuleOnlyParams }
  | { commandType: 'thermocycler/closeLid'; params: ModuleOnlyParams }
  | { commandType: 'thermocycler/deactivateBlock'; params: ModuleOnlyParams }
  | { commandType: 'thermocycler/deactivateLid'; params: ModuleOnlyParams }
  | { commandType: 'thermocycler/runProfile'; params: TCProfileParams }
  | {
      commandType: 'thermocycler/awaitProfileComplete'
      params: ModuleOnlyParams
    }

export interface EngageMagnetParams {
  module: string
  engageHeight: number
}

export interface TemperatureParams {
  module: string
  temperature: number
}

export interface AtomicProfileStep {
  holdTime: number
  temperature: number
}

export interface TCProfileParams {
  module: string
  profile: AtomicProfileStep[]
  volume: number
}

export interface ModuleOnlyParams {
  module: string
}

export interface ThermocyclerSetTargetBlockTemperatureParams {
  module: string
  temperature: number
  volume?: number
}
