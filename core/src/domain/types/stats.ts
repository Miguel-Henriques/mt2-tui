export type Stats = PrimaryStats & SecondaryStats & OtherStats;

/**
 * A player can distribute per level 3 points across across primary stats.
 * 
 * Primary stats have a minimum value of 1 and a soft cap of 90 using levelling point allocation.
 * 
 */
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
     * Commonly abbreviated as AGI.
     * 
     * +1 AGI: +0.5 physical damage, +1 magic damage, +0.5 physical defense, +1.5 magic defense
     * 
     * //+3 AGI: +1% attack speed, +1% movement speed, +1% casting speed, +1% physical damage reduction, +1% magic damage reduction
     * //+3 AGI: +1 evasion, +1 impact damage, + skill damage; +2 AGI: +1 physical damage for ninjas (german wiki)
     */
    agility?: number
}

/**
 * Secondary stats are derived values affected by primary stats, skills, equipment, the character's class and level.
 * 
 * Secondary stats are absolute values that are not capped.
 * For items that increase physical/magic damage with absolutes, min and max should be set with the same value.
 * 
 * Permanent stat increases on level up: //TODO: Should be persisted in the database
 * - HP per level: random 36-44
 * - SP per level: random 18-22
 */
export interface SecondaryStats {
    /**
     * Commonly abbreviated as HP, HP pool determines how much damage a player
     * can take before dying.
     */
    healthPoints?: number
    /**
     * Commonly abbreviated as SP, SP pool aka Mana determines a player's capacity
     * to cast skills.
     */
    skillPoints?: number
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

/**
 * //TODO: To be added later, right now this will always be set to 1.0 for all characters.
 * 
 * These stats work as multiplers, starting with a 1.0 base value which can be modified by equipment, skills, etc.
 * Capped at 2.0 (200%).
 */
export interface OtherStats {
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
    damageReduction?: number
    cooldownReduction?: number
}

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