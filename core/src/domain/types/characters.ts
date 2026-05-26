import { ItemDrop } from "./items.js"
import { Stats } from "./stats.js"

export interface CharacterClassBlueprint {
    blueprintId: string
    stats: Stats
}

export interface CharacterClass extends CharacterClassBlueprint {
    uid: string
    name: string
    level: number
}

export interface MonsterBlueprint {
    blueprintId: string
    stats: Stats
    itemDrops: ItemDrop[]
    gold: number
    experience: number
    level: number
}

export interface Monster extends MonsterBlueprint {
    uid: string
}