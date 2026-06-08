import { getCoreServices } from "../index.js"
import { calculateHitDamage, mergeStats, Stats } from "./stats/index.js"
import { characterClassId, CharacterClassType } from "./definitions/character-definitions.js"
import { calculateHp, calculateMagicDamage, calculateMagicDefense, calculateMp, calculatePhysicalDamage, calculatePhysicalDefense, SecondaryStats } from "./stats/secondary-stats.js"
import { Character } from "./index.js"
import { PrimaryStats } from "./stats/primary-stats.js"

export interface PlayerAccount {
    id: string
    /**
     * A player account can hold up to 4 characters.
     */
    characterIds: string[]
    // warehouse: Inventory //TODO:
}

export interface PlayerCharacterInput {
    id: string
    /**
     * Class initialStats are derived at runtime.
     *
     * Pass by ref allows ad-hoc balance changes without data migrations.
     */
    classType: CharacterClassType
    name: string
    level: number
    experience: number
    progression: CharacterProgression
}

/**
 * Persisted in game save state. Ephemeral in simulations.
 */
export class PlayerCharacter implements Character {

    readonly id: string
    //readonly accountId: string
    readonly classType: CharacterClassType

    name: string
    currentHp: number

    level: number
    experience: number
    progression: CharacterProgression

    //gear: EquipmentItem[]
    //inventory //TODO:
    stats: Stats

    constructor(input: PlayerCharacterInput) {
        this.id = input.id
        //this.accountId = input.accountId
        this.classType = input.classType
        this.name = input.name
        this.level = input.level
        this.experience = input.experience
        this.progression = input.progression
        this.stats = this.deriveEffectiveStats()
        this.currentHp = this.stats.healthPoints ?? 0
    }

    private deriveEffectiveStats(): Stats {
        const classDefId = characterClassId(this.classType)
        const classInitialStats = getCoreServices().definitions.getCharacterClassDefinition(classDefId)
        //TODO: gear stats

        // 1. Merge stats from 3 sources: class initial stats, character progression and gear
        const stats = mergeStats(classInitialStats.stats, this.progression.spentStatPoints)

        // 2. Calculate derived secondary stats (stats whose values depends on other stats) - damage, defense, hp, mp
        const secondaryStats: SecondaryStats = {
            healthPoints: calculateHp(stats),
            manaPoints: calculateMp(stats),
            physicalDamage: calculatePhysicalDamage(this.level, stats),
            damageSpread: stats.damageSpread ?? 0,
            magicDamage: calculateMagicDamage(this.level, stats),
            physicalDefense: calculatePhysicalDefense(this.level, stats),
            magicDefense: calculateMagicDefense(this.level, stats)
        }

        return {
            ...stats,
            ...secondaryStats
        }
    }

    attack(enemies: Character[]): void {
        const damage = calculateHitDamage(this)

        for (const enemy of enemies) {
            const inflictedDamage = enemy.takeHitDamage(damage)
            console.log(`Player | ${this.name} dealt ${inflictedDamage} damage to ${enemy.name} (${enemy.currentHp}/${enemy.stats.healthPoints}).`)
        }
    }

    takeHitDamage(damage: number): void {
        const physicalDefense = calculatePhysicalDefense(this.level, this.stats);
        const absorbedDamage = damage - physicalDefense
        this.currentHp -= absorbedDamage
        console.log(`Player | ${this.name} took ${absorbedDamage} damage (${this.currentHp}/${this.stats.healthPoints}).`)
    }
}

/**
 * A player can distribute per level 3 points across across primary stats.
 * 
 * Primary stats have a minimum value of 1 and a soft cap of 90 using levelling point allocation.
 * 
 * Additional permanent stat increases on level up:
 * - HP per level: random 36-44
 * - SP per level: random 18-22
 */
export interface CharacterProgression {
    availableStatsPoints: number
    spentStatPoints: Stats
}