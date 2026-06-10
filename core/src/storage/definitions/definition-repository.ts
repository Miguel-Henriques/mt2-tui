import {
	CharacterClassDef,
	MobGroupDef,
	MonsterDef,
	SpotDef,
} from '../../domain/definitions/character-definitions.js'
import { ItemDef } from '../../domain/definitions/item-definitions.js'

export interface DefinitionRepository {
	listItemDefinitions(): ItemDef[]
	getItemDefinition(defId: string): ItemDef | undefined
	listMonsterDefinitions(): MonsterDef[]
	getMonsterDefinition(defId: string): MonsterDef | undefined
	listCharacterClassDefinitions(): CharacterClassDef[]
	getCharacterClassDefinition(
		defId: string,
	): CharacterClassDef | undefined
	listMobGroupDefinitions(): MobGroupDef[]
	getMobGroupDefinition(defId: string): MobGroupDef | undefined
	listSpotDefinitions(): SpotDef[]
	getSpotDefinition(defId: string): SpotDef | undefined
}
