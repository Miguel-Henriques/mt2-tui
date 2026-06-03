import { Stats } from "./stats/index.js"

export interface ItemInput {
    defId: string
    id: string
    owner: string
    extraStats?: Stats
    upgradeLevel: number
}

export class EquipmentItem {

    readonly id: string
    defId: string
    upgradeLevel: number
    owner: string
    extraStats?: Stats

    constructor(input: ItemInput) {
        this.defId = input.defId
        this.id = input.id
        this.owner = input.owner
        this.upgradeLevel = input.upgradeLevel
        this.extraStats = input.extraStats
    }
} 