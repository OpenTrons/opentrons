import robotSideAnalysis from './mockRobotSideAnalysis.json'
import doItAllAnalysis from './doItAllV10.json'
import qiaseqAnalysis from './analysis_QIAseqFX24xv4_8.json'
import type { CompletedProtocolAnalysis } from '@opentrons/shared-data'
import type { CommandTextData } from '@opentrons/components'

export const mockRobotSideAnalysis: CompletedProtocolAnalysis = robotSideAnalysis as CompletedProtocolAnalysis
export const mockDoItAllAnalysis: CompletedProtocolAnalysis = doItAllAnalysis as CompletedProtocolAnalysis
export const mockQIASeqAnalysis: CompletedProtocolAnalysis = (qiaseqAnalysis as unknown) as CompletedProtocolAnalysis
export const mockCommandTextData: CommandTextData = {
  commands: mockRobotSideAnalysis.commands,
  pipettes: mockRobotSideAnalysis.pipettes,
  labware: mockRobotSideAnalysis.labware,
  modules: mockRobotSideAnalysis.modules,
  liquids: mockRobotSideAnalysis.liquids,
}

export const mockDoItAllTextData: CommandTextData = {
  commands: mockDoItAllAnalysis.commands,
  pipettes: mockDoItAllAnalysis.pipettes,
  labware: mockDoItAllAnalysis.labware,
  modules: mockDoItAllAnalysis.modules,
  liquids: mockDoItAllAnalysis.liquids,
}

export const mockQIASeqTextData: CommandTextData = {
  commands: mockQIASeqAnalysis.commands,
  pipettes: mockQIASeqAnalysis.pipettes,
  labware: mockQIASeqAnalysis.labware,
  modules: mockQIASeqAnalysis.modules,
  liquids: mockQIASeqAnalysis.liquids,
}
