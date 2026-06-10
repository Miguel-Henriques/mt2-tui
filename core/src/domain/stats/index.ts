import { ExtraStats } from "./extra-stats.js";
import { PrimaryStats } from "./primary-stats.js";
import { SecondaryStats } from "./secondary-stats.js";
import { SpeedStats } from "./speed-stats.js";

/**
 * TODO: Resistances (Element System) - https://fr-wiki.metin2.gameforge.com/index.php/Syst%C3%A8me_d%27%C3%A9l%C3%A9ments
 * TODO: HP/MP Regeneration 
 */
export type Stats = PrimaryStats & SecondaryStats & ExtraStats & SpeedStats;

/**
 * The original model allows players to increase primary, secondary and other stats through gear base and extra stats, though for now
 * we will simplify it and only allow additional stats to increase secondary and other stats.
 * 
 * Additional stats obtained from gear can exceed the soft cap.
 * 
 * The following equipment types can include base/extra primary stats:
 * - earrings
 * - necklaces
 * - weapons (extra)
 * - shields (extra)
 * 
 * Equipment bonus cap: +24 total (+12 per piece max per stat)
 */

/**
 * Takes the total character's physical damage and applies variance from extra stats.
 * 
 * Original formula: https://pt-wiki.metin2.gameforge.com/index.php/Dano
 */
export function calculateHitDamage(initiator: { level: number, stats: Stats }): number {
    let initiatorPhysicalDamage = initiator.stats.physicalDamage ?? 0

    // 1. Average damage multiplier
    if (initiator.stats.averageDamage) {
        initiatorPhysicalDamage *= 1 + initiator.stats.averageDamage / 100
    }

    // 2. Damage roll
    const spread = initiator.stats.damageSpread ?? 0
    // Some leaks suggest: damage roll * 2 + physical damage
    const damageRoll = Math.floor(Math.random() * (spread + 1))
        + initiatorPhysicalDamage

    //TODO: crit
    //TODO: piercing
    //TODO: poison
    //TODO: stun

    // 3. Attack accuracy factor //TODO:
    //const accuracyMultiplier = calculateAccuracyAttackFactor(initiator.level, initiator.stats)

    return damageRoll
}

//TODO: Skill damage

export function mergeStats(...sources: Stats[]): Stats {
    const result: Stats = {}
    for (const source of sources) {
        for (const [key, value] of Object.entries(source)) {
            if (value === undefined) continue
            const statKey = key as keyof Stats
            result[statKey] = (result[statKey] ?? 0) + value
        }
    }
    return result
}

/**
 * @experimental
 */
export function calculateAccuracyAttackFactor(level: number, stats: Stats): number {
    const src = Math.min(90, (stats.dexterity ?? 0 * 4 + level * 2) / 6)
    return Math.floor((src + 210) / 300)
}

/**
 * @experimental
 */
export function calculateAccuracyEvasionFactor(level: number, stats: Stats): number {
    const src = Math.min(90, (stats.dexterity ?? 0 * 4 + level * 2) / 6)
    return Math.floor(((src * 2 + 5) / (src + 95)) * 0.3)
}