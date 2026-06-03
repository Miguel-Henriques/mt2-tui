import type {
	CharacterClass,
	CharacterClassBlueprint,
	Monster,
	MonsterBlueprint,
} from '../../domain/definitions/character-definitions.js'
import type {
	CharacterClassInstance,
	ItemInstance,
	MonsterInstance,
} from './types.js'
import type {
	EquipmentItem,
	EquipmentItemBlueprint,
} from '../../domain/definitions/item-definitions.js'

const upgradeLevelFromBlueprintId = (blueprintId: string): number => {
	const segment = blueprintId.split('/').pop() ?? ''
	const plusIndex = segment.indexOf('+')

	if (plusIndex === -1) {
		return 0
	}

	const level = Number.parseInt(segment.slice(plusIndex + 1), 10)
	return Number.isInteger(level) ? level : 0
}

export const hydrateItem = (
	instance: ItemInstance,
	blueprint: EquipmentItemBlueprint,
): EquipmentItem => ({
	...blueprint,
	uid: instance.uid,
	upgradeLevel: upgradeLevelFromBlueprintId(blueprint.blueprintId),
	extraStats: instance.extraStats,
})

export const hydrateMonster = (
	instance: MonsterInstance,
	blueprint: MonsterBlueprint,
): Monster => ({
	...blueprint,
	uid: instance.uid,
})

export const hydrateCharacterClass = (
	instance: CharacterClassInstance,
	blueprint: CharacterClassBlueprint,
): CharacterClass => ({
	blueprintId: blueprint.blueprintId,
	stats: { ...blueprint.stats, ...instance.stats },
	uid: instance.uid,
	name: instance.name,
	level: instance.level,
})
