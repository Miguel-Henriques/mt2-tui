import { Stats } from "./stats/index.js"

export interface AttackResult {
    attackerName: string
    defenderName: string
    damage: number
    defenderCurrentHp: number
    defenderMaxHp: number
}

export interface Character { //TODO: could be abstract
    id: string
    name: string
    currentHp: number
    stats: Stats

    attack(characters: Character[]): AttackResult[]
    takeHitDamage(damage: number): number
}