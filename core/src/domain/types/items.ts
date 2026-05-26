import { CharacterClass } from "./characters.js"
import { OtherStats, PrimaryStats, SecondaryStats, Stats } from "./stats.js"

export interface Item {
    blueprintId: string
    name: string
    description: string
}

/**
 * @experimental //TODO:
 * 
 * FLAT_ADDITIVE - Upgrade level * Step Size
 * 
 * Higher-tier/epic weapons often use handcrafted accelerating tables, especially at +8/+9 upgrades.
 * Lower tier weapons often use linear tables with different step sizes.
 * 
 * It could be the case we model this differently, e.g. using an upgrade table or separate
 * blueprint instances for each upgrade level. 
 * 
 */
export type ItemUpgradeLevelMultiplier = 'FLAT_ADDITIVE'

/**
 * Represents a blueprint for an equipment item.
 */
export interface EquipmentItemBlueprint extends Item {
    type: string
    subType: string
    wearableClasses: CharacterClass[]
    wearableFromLevel: number
    upgradeLevel: number
    baseStats: Stats
}

/**
 * Represents an instance of an equipment item.
 * 
 * upgrade level stat modifiers only apply to base stats
 */
export interface EquipmentItem extends EquipmentItemBlueprint {
    uid: string
    extraStats?: Stats
}

export interface ItemDrop {
    item: Item
    rate: number
}

//TODO:
export interface ItemUpgradeRequirements {

}
