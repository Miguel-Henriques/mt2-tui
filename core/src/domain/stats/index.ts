import { ExtraStats } from "./extra-stats.js";
import { PrimaryStats } from "./primary-stats.js";
import { calculatePhysicalDamage, calculatePhysicalDefense, SecondaryStats } from "./secondary-stats.js";
import { SpeedStats } from "./speed-stats.js";

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
 * 
 * Original formula: https://pt-wiki.metin2.gameforge.com/index.php/Dano
 */
export function calculateHitDamage(initiator: { level: number, stats: Stats }, enemy: { level: number, stats: Stats }): number {
    let initiatorPhysicalDamage = calculatePhysicalDamage(initiator.level, initiator.stats);
    const enemyPhysicalDefense = calculatePhysicalDefense(enemy.level, enemy.stats);

    if (initiator.stats.averageDamage) {
        initiatorPhysicalDamage *= 1 + initiator.stats.averageDamage / 100
    }

    const spread = initiator.stats.damageSpread ?? 0
    const damageRoll = Math.floor(Math.random() * (spread + 1))
        + initiatorPhysicalDamage

    //TODO: crit
    //TODO: piercing

    return damageRoll - enemyPhysicalDefense
}

//TODO: Skill damage