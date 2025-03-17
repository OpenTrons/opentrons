import ethanol80V1Uncasted from '../liquid-class/definitions/1/ethanol_80.json'
import glycerol50V1Uncasted from '../liquid-class/definitions/1/glycerol_50.json'
import waterV1Uncasted from '../liquid-class/definitions/1/water.json'
import type { LiquidClass } from '.'

const ethanol80V1 = ethanol80V1Uncasted as LiquidClass
const glycerol50V1 = glycerol50V1Uncasted as LiquidClass
const waterV1 = waterV1Uncasted as LiquidClass

const defs = { ethanol80V1, glycerol50V1, waterV1 }

export const getAllLiquidClassDefs = (): Record<string, LiquidClass> => defs
