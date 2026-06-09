/**
 */
export interface ExtraStats {
    /**
     * Commonly abbreviated as HP, HP pool determines how much damage a player
     * can take before dying.
     */
    strongAgainst?: number
    /**
     * Defaults to 0%
     */
    criticalHitChance?: number
    /**
     * Defaults to 0%
     */
    piercingHitChance?: number

    slowingChance?: number

    stunChance?: number

    poisonChance?: number

    damageReduction?: number

    /**
     * Affects physical damage based on the percentage value (%)
     * 
     * e.g. For a weapon with an extra average damage of 10%, physical damage will be 10% higher.
     * 
     * https://pt-wiki.metin2.gameforge.com/index.php/Dano_M%C3%A9dio
     */
    averageDamage?: number
    /**
     * Affects skill damage (TODO:)
     * 
     * https://pt-wiki.metin2.gameforge.com/index.php/Dano_de_Habilidade
     */
    skillDamage?: number
}

