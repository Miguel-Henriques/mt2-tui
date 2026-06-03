import { MonsterDef } from "../../domain/definitions/character-definitions.js"
import { CharacterClassDef } from "../../domain/definitions/character-definitions.js"
import { ItemDef } from "../../domain/definitions/item-definitions.js"

export interface DefinitionRepository {
	listItemDefinitions(): ItemDef[]
	getItemDefinition(defId: string): ItemDef | undefined
	listMonsterDefinitions(): MonsterDef[]
	getMonsterDefinition(defId: string): MonsterDef | undefined
	listCharacterClassDefinitions(): CharacterClassDef[]
	getCharacterClassDefinition(
		defId: string,
	): CharacterClassDef | undefined
}
