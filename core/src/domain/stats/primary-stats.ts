import { CharacterClassType } from "../definitions/character-definitions.js"

export interface PrimaryStats {
    /**
     * Commonly abbreviated as VIT.
     * 
     * Affects HP pool, HP regeneration, physical and magic defense.
     * 
     * +1 VIT: +40HP, +1 physical defense, +3 magic defense.
     * 
     */
    vitality?: number

    /**
     * Commonly abbreviated as INT.
     * 
     * Affects magic damage (magic damage skills/effects) and magic defense.
     * 
     * +1 INT: +2 magic damage, +1 magic defense, +20 SP, +0.5 physical damage (helps non-physical damage characters on hit-attacks)
     * 
     */
    intellect?: number

    /**
     * Commonly abbreviated as STR.
     * 
     * Affects physical damage, i.e. on-hit attacks and physical damage skills.
     * 
     * +1 STR: +1 physical damage
     * 
     */
    strength?: number

    /**
     * @experimental
     * Commonly abbreviated as DEX.
     * 
     * +1 DEX: +0.5 physical damage, +1 magic damage, +0.5 physical defense, +1.5 magic defense
     * 
     * //+3 DEX: +1% attack speed, +1% movement speed, +1% casting speed, +1% physical damage reduction, +1% magic damage reduction
     * //+3 DEX: +1 evasion, +1 impact damage, + skill damage; +2 AGI: +1 physical damage for ninjas (german wiki)
     */
    dexterity?: number
}

export function calculatePrimaryMagicDamage(level: number, stats: PrimaryStats): number {
    return level * 2 + ((stats.intellect ?? 0) * 2)
}

/**
 * This damage does not represent the final hit damage.
 * On top of this you need to combine:
 *  - attack bonuses from items and skills
 *  - weapon damage roll
 *  - target defense and resistances 
 */
export function calculatePrimaryPhysicalDamage(level: number, stats: PrimaryStats, classType: CharacterClassType | 'Monster'): number {

    const classStatAttack = (stats: PrimaryStats, classType: CharacterClassType | 'Monster') => {
        switch (classType) {
            case "Warrior":
            case "Sura":
            case "Monster":
                return 2 * (stats.strength ?? 0)
            case "Ninja":
                return (4 * (stats.strength ?? 0) + 2 * (stats.dexterity ?? 0)) / 3
            case "Shaman":
                return (4 * (stats.strength ?? 0) + 2 * (stats.intellect ?? 0)) / 3
        }
    }

    return Math.floor(level * 2 + classStatAttack(stats, classType));
}

export function calculatePrimaryPhysicalDefense(level: number, stats: PrimaryStats) {
    return level + (stats.vitality ?? 0);
}

export function calculatePrimaryMagicDefense(level: number, stats: PrimaryStats) {
    return Math.floor(level + (stats.intellect ?? 0) + ((stats.vitality ?? 0) / 3));
}