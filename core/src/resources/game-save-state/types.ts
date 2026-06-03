import type { CharacterClassType } from '../../domain/definitions/character-definitions.js'
import type { CharacterProgression } from '../../domain/player.js'
import type { Stats } from '../../domain/stats/index.js'

export interface PlayerCharacterSave {
	id: string
	classType: CharacterClassType
	name: string
	level: number
	experience: number
	progression: CharacterProgression
}

export interface EquipmentItemSave {
	id: string
	defId: string
	owner: string
	upgradeLevel: number
	extraStats?: Stats
}

export interface CreatePlayerCharacterInput {
	name: string
	classType: CharacterClassType
}

export interface PatchPlayerCharacterInput {
	name?: string
	level?: number
	experience?: number
	progression?: CharacterProgression
}

export interface CreateEquipmentItemInput {
	itemDefinitionId: string
	owner: string
}

export interface PatchEquipmentItemInput {
	itemDefinitionId?: string
	owner?: string
	extraStats?: Stats
}
