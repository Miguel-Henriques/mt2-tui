import type {
	CharacterClassBlueprint,
	MonsterBlueprint,
} from '../../domain/definitions/character-definitions.js'
import type { EquipmentItemBlueprint } from '../../domain/definitions/item-definitions.js'

export interface DefinitionRepository {
	listItemDefinitions(): EquipmentItemBlueprint[]
	getItemDefinition(blueprintId: string): EquipmentItemBlueprint | undefined
	listMonsterDefinitions(): MonsterBlueprint[]
	getMonsterDefinition(blueprintId: string): MonsterBlueprint | undefined
	listCharacterClassDefinitions(): CharacterClassBlueprint[]
	getCharacterClassDefinition(
		blueprintId: string,
	): CharacterClassBlueprint | undefined
}
