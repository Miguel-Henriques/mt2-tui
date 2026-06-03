import { Stats } from "../../domain/stats/index.js"
import { EquipmentItemDef } from "../../domain/definitions/item-definitions.js"

/**
 * Represents an instance of an equipment item.
 * 
 * upgrade level stat modifiers only apply to base stats
 */
export interface EquipmentItem extends EquipmentItemDef {
	uid: string
	extraStats?: Stats
}

export interface ItemInstance {
	uid: string
	blueprintId: string
	extraStats?: Stats
}

export interface MonsterInstance {
	uid: string
	blueprintId: string
}

export interface CharacterClassInstance extends CharacterClass {
	uid: string
	blueprintId: string
	name: string
	level: number
	stats: Stats
	experience?: number
}

export interface CreateItemInput {
	blueprintId: string
	extraStats?: Stats
}

export interface UpdateItemInput {
	extraStats?: Stats
}

export interface CreateMonsterInput {
	blueprintId: string
}

export interface CreateCharacterClassInput {
	blueprintId: string
	name: string
	level?: number
	stats?: Stats
	experience?: number
}

export interface UpdateCharacterClassInput {
	name?: string
	level?: number
	stats?: Stats
	experience?: number
}
