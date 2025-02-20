import waterV1Uncasted from '../liquid-class/definitions/1/water.json'
import ethanolV1Uncasted from '../liquid-class/definitions/1/ethanol_80.json'
import glycerolV1Uncasted from '../liquid-class/definitions/1/glycerol_50.json'
import type { LiquidClass } from '.'

const waterV1 = waterV1Uncasted as LiquidClass
const glycerolV1 = glycerolV1Uncasted as LiquidClass
const ethanolV1 = ethanolV1Uncasted as LiquidClass

const defs = { waterV1, glycerolV1, ethanolV1 }

export const getAllLiquidClassDefs = (): Record<string, LiquidClass> => defs
