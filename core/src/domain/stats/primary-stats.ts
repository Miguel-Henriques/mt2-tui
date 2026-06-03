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

