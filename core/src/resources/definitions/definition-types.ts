import type {
	CharacterClassBlueprint,
	MonsterBlueprint,
} from '../../domain/definitions/character-definitions.js'
import type { EquipmentItemBlueprint } from '../../domain/definitions/item-definitions.js'

export type DefinitionKind = 'item' | 'monster' | 'character-class'

export interface DefinitionSummary {
	kind: DefinitionKind
	blueprintId: string
	name: string
}

export type Definition =
	| EquipmentItemBlueprint
	| MonsterBlueprint
	| CharacterClassBlueprint
