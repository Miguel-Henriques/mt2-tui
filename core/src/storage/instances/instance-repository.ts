import type {
	CharacterClassInstance,
	ItemInstance,
	MonsterInstance,
} from '../../resources/instances/types.js'

export interface InstanceRepository {
	listItems(): ItemInstance[]
	getItem(uid: string): ItemInstance | undefined
	saveItem(instance: ItemInstance): void
	deleteItem(uid: string): void
	listMonsters(): MonsterInstance[]
	getMonster(uid: string): MonsterInstance | undefined
	saveMonster(instance: MonsterInstance): void
	deleteMonster(uid: string): void
	listCharacterClasses(): CharacterClassInstance[]
	getCharacterClass(uid: string): CharacterClassInstance | undefined
	saveCharacterClass(instance: CharacterClassInstance): void
	deleteCharacterClass(uid: string): void
}
