import { CharacterClass } from "./types/characters.js";
import { EquipmentItem } from "./types/items.js";
import { OtherStats, PrimaryStats, SecondaryStats, Stats } from "./types/stats.js";

export function calculateHp(baseHealthPoints: number, vitality: number, ...additionalHpSources: number[]) {
    return baseHealthPoints + (vitality * 40) + additionalHpSources.reduce((a, b) => a + b, 0);
}

export function calculateSp(baseSkillPoints: number, intellect: number, ...additionalSpSources: number[]) {
    return baseSkillPoints + (intellect * 20) + additionalSpSources.reduce((a, b) => a + b, 0);
}

export function calculateMagicDamage(level: number, intellect: number, ...additionalMagicDamageSources: number[]) {
    return level + (intellect * 2) + additionalMagicDamageSources.reduce((a, b) => a + b, 0);
}

export function calculatePhysicalDamage(level: number, strength: number, intellect: number, agility: number, ...additionalPhysicalDamageSources: number[]) {
    return level + strength + (intellect * 0.5) + (agility * 0.5) + additionalPhysicalDamageSources.reduce((a, b) => a + b, 0);
}

/**
 * FIXME: german wiki mentions: MagicDefense = Level + INT + (VIT / 3) + ((Defense - VIT - Level) / 2)
 */
export function calculateMagicDefense(level: number, intellect: number, vitality: number, ...additionalMagicDefenseSources: number[]) {
    return level + intellect + (vitality * 3) + additionalMagicDefenseSources.reduce((a, b) => a + b, 0);
}

export function calculatePhysicalDefense(level: number, vitality: number, ...additionalPhysicalDefenseSources: number[]) {
    return level + vitality + additionalPhysicalDefenseSources.reduce((a, b) => a + b, 0);
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