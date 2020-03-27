// @flow

export type DeckCheckStep =
  | 'sessionStart'
  | 'specifyLabware'
  | 'pickUpTip'
  | 'checkPointOne'
  | 'checkPointTwo'
  | 'checkPointThree'
  | 'checkHeight'
  | 'sessionExit'
  | 'badDeckCalibration'
  | 'noPipettesAttached'

export type DeckCheckSessionData = {|
  instruments: { [string]: string },
  activeInstrument: ?string,
  currentStep: DeckCheckStep,
  nextSteps: {
    links: { [DeckCheckStep]: string },
  },
  sessionToken: string,
|}
