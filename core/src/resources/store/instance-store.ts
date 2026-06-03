import {
	CharacterClass,
	Monster,
} from '../../domain/definitions/character-definitions.js'
import {
	CreateCharacterClassInput,
	CreateItemInput,
	CreateMonsterInput,
	UpdateCharacterClassInput,
	UpdateItemInput,
} from '../instances/types.js'
import { EquipmentItem } from '../../domain/definitions/item-definitions.js'
import { FileInstanceStore } from './file/file-instance-store.js'

export interface InstanceStore {
	listItems(): EquipmentItem[]
	getItem(uid: string): EquipmentItem
	createItem(input: CreateItemInput): EquipmentItem
	updateItem(uid: string, input: UpdateItemInput): EquipmentItem
	deleteItem(uid: string): void
	listMonsters(): Monster[]
	getMonster(uid: string): Monster
	createMonster(input: CreateMonsterInput): Monster
	deleteMonster(uid: string): void
	listCharacterClasses(): CharacterClass[]
	getCharacterClass(uid: string): CharacterClass
	createCharacterClass(input: CreateCharacterClassInput): CharacterClass
	updateCharacterClass(
		uid: string,
		input: UpdateCharacterClassInput,
	): CharacterClass
	deleteCharacterClass(uid: string): void
}

export type StoreBackend = 'file'

export const createInstanceStore = (
	backend: StoreBackend = 'file',
): InstanceStore => {
	if (backend === 'file') {
		return new FileInstanceStore()
	}

	throw new Error(`unsupported store backend: ${backend}`)
}
