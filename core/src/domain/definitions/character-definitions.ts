import { Stats } from "../stats/index.js"
import { ItemDropDef } from "./item-definitions.js"

/**
 * Character definition interface.
 */
export interface CharacterDef {
    /**
     * Game object definition id.
     */
    defId: string
    stats: Stats
    name: string
}

export type CharacterClassType = 'Sura' | 'Shaman' | 'Warrior' | 'Ninja'
export const characterClassId = (type: CharacterClassType) => `characters/classes/${type.toLowerCase()}`

export interface CharacterClassDef extends CharacterDef { }

/**
 * Monster definition interface.
 */
export interface MonsterDef extends CharacterDef {
    level: number
    itemDrops: ItemDropDef[]
    gold: number
    goldSpread: number
    experience: number
}