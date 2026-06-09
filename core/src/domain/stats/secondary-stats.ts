import { Stats } from "./index.js"

/**
 * Secondary stats are derived values affected by primary stats, skills, equipment, the character's class and level.
 * 
 * Secondary stats are absolute values that are not capped.
 * For items that increase physical/magic damage with absolutes, min and max should be set with the same value.
 * 
 */
export interface SecondaryStats {
    /**
     * Commonly abbreviated as HP, HP pool determines how much damage a player
     * can take before dying.
     */
    healthPoints?: number
    /**
     * Commonly abbreviated as MP, MP pool aka Mana determines a player's capacity
     * to cast skills.
     */
    manaPoints?: number
    physicalDamage?: number
    magicDamage?: number
    /**
     * Combined with the physical/magic damage to calculate random damage roll everytime
     * the character attacks.
     * 
     * e.g. if physical damage is 100 and damage spread is 40, the damage roll will be between 100 and 140.
     */
    damageSpread?: number
    physicalDefense?: number
    magicDefense?: number
}

export function calculatePhysicalDefense(level: number, stats: Stats) {
    return level + (stats.vitality ?? 0) + (stats.physicalDefense ?? 0);
}

/**
 * FIXME: german wiki mentions: MagicDefense = Level + INT + (VIT / 3) + ((Defense - VIT - Level) / 2)
 */
export function calculateMagicDefense(level: number, stats: Stats) {
    return level + (stats.intellect ?? 0) + ((stats.vitality ?? 0) * 3) + (stats.magicDefense ?? 0);
}

export function calculateHp(stats: Stats) {
    return (stats.healthPoints ?? 0) + (stats.vitality ?? 0) * 40;
}

export function calculateMp(stats: Stats) {
    return (stats.manaPoints ?? 0) + ((stats.intellect ?? 0) * 20);
}