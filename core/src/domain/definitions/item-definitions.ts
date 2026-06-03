import { Stats } from "../stats/index.js"

// /**
//      * Item instance id.
//      * For item definitions, this is the same as the defId.
//      */
// id: string

export interface ItemDef {
    /**
     * Game object definition id
     */
    defId: string
    name: string
    description: string
}

/**
 * Represents a blueprint for an equipment item.
 */
export interface EquipmentItemDef extends ItemDef {
    type: string
    subType: string
    wearableClasses: string[]
    wearableFromLevel: number
    upgradeLevel: number
    baseStats: Stats
}

export interface ItemDropDef {
    item: ItemDef
    rate: number
}

//TODO:
export interface ItemUpgradeRequirementsDef {

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