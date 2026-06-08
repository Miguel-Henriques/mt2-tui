import { Stats } from "./stats/index.js"

export interface Character { //TODO: could be abstract
    name: string
    currentHp: number
    stats: Stats

    attack(characters: Character[]): void
    takeHitDamage(damage: number): void
}