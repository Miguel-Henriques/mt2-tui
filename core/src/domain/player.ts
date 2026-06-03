import { createCoreServices, getCoreServices } from "../index.js"
import { Stats } from "./stats/index.js"
import { CharacterClassType } from "./definitions/character-definitions.js"

export interface PlayerAccount {
    id: string
    /**
     * A player account can hold up to 4 characters.
     */
    characterIds: string[]
    // warehouse: Inventory //TODO:
}

// export interface IPlayerCharacter { //TODO: Convert to class
//     id: string
//     accountId: string
//     /**
//      * Derive initialStats at runtime.
//      * 
//      * Pass by ref allows for ad-hoc balance changes without requiring
//      * data migrations to prevent stale data.
//      */
//     classType: CharacterClassType
//     name: string
//     level: number
//     experience: number

//     progression: CharacterProgression

//     currentHp: number
//     currentMp: number

//     //gear: EquipmentItem[]
//     //inventory //TODO:

//     get stats(): Stats
// }

export interface InstancePlayerCharacterInput {
    id: string
    accountId: string
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

export class PlayerCharacter {

    readonly id: string
    readonly accountId: string
    readonly classType: CharacterClassType

    name: string

    level: number
    experience: number
    progression: CharacterProgression

    //gear: EquipmentItem[]
    //inventory //TODO:
    stats: Stats

    constructor(input: InstancePlayerCharacterInput) {
        this.id = input.id
        this.accountId = input.accountId
        this.classType = input.classType
        this.name = input.name
        this.level = input.level
        this.experience = input.experience
        this.progression = input.progression
        this.stats = this.deriveEffectiveStats()
    }

    private deriveEffectiveStats(): Stats {



        return {
            ...
        }
    }

    private deriveStatsFromProgression(): Stats {

        const classInitialStats = getCoreServices()

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


export function extractStatsFromGear(gear: EquipmentItem[]): Stats {
    return gear
        .map(item => ({ ...item.baseStats, ...item.extraStats }))
        .reduce((acc, curr) => ({ ...acc, ...curr }), {})
}

export function calculatePrimaryStats(characterClass: CharacterClass, gearStats: Stats): PrimaryStats {
    return {
        vitality: characterClass.stats.vitality! + (gearStats.vitality ?? 0),
        intellect: characterClass.stats.intellect! + (gearStats.intellect ?? 0),
        strength: characterClass.stats.strength! + (gearStats.strength ?? 0),
        agility: characterClass.stats.agility! + (gearStats.agility ?? 0)
    }
}

export function calculateSecondaryStats(characterClass: CharacterClass, primaryStats: PrimaryStats, gearStats: Stats, level: number): SecondaryStats {
    return {
        healthPoints: calculateHp(characterClass.stats.healthPoints!, primaryStats.vitality!, gearStats.healthPoints ?? 0),
        skillPoints: calculateSp(characterClass.stats.skillPoints!, primaryStats.intellect!, gearStats.skillPoints ?? 0),
        physicalDamage: calculatePhysicalDamage(level, primaryStats.strength!, primaryStats.intellect!, gearStats.physicalDamage ?? 0),
        damageSpread: gearStats.damageSpread ?? 0,
        magicDamage: calculateMagicDamage(level, primaryStats.intellect!, gearStats.magicDamage ?? 0),
        physicalDefense: calculatePhysicalDefense(level, primaryStats.vitality!, gearStats.physicalDefense ?? 0),
        magicDefense: calculateMagicDefense(level, primaryStats.intellect!, primaryStats.vitality!, gearStats.magicDefense ?? 0)
    }
}

//TODO:
export function calculateOtherStats(): OtherStats {
    return {
        attackSpeed: 100,
        movementSpeed: 100,
        castingSpeed: 100,
        damageReduction: 100,
        cooldownReduction: 100
    }
}