
/**
 * Speed stats are multipliers that despite not directly affecting combat stats,
 * have a significant impact on a character's DPS (damage per second). 
 * 
 * Base values vary per character though they can be modified/affected by equipment, skills, etc.
 * Baseline value is 100 and can be increased up to 200.
 */
export interface SpeedStats {
    /**
     * Affects attack speed.
     * 
     * Can be affected by the following equipment:
     * - bracelets
     * - weapons
     */
    attackSpeed?: number
    /**
     * Affects movement speed.
     * 
     * Can be affected by the following equipment:
     * - boots
     * - armor 
     */
    movementSpeed?: number
    castingSpeed?: number
    cooldownReduction?: number
}