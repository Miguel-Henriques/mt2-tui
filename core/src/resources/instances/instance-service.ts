import { randomUUID } from 'node:crypto'

import type {
	CharacterClass,
	Monster,
} from '../../domain/definitions/character-definitions.js'
import type {
	CharacterClassInstance,
	CreateCharacterClassInput,
	CreateItemInput,
	CreateMonsterInput,
	ItemInstance,
	MonsterInstance,
	UpdateCharacterClassInput,
	UpdateItemInput,
} from './types.js'
import type { EquipmentItem } from '../../domain/definitions/item-definitions.js'
import { NotFoundError, ValidationError } from '../../shared/errors.js'
import type { DefinitionRepository } from '../../storage/definitions/definition-repository.js'
import type { InstanceRepository } from '../../storage/instances/instance-repository.js'
import {
	hydrateCharacterClass,
	hydrateItem,
	hydrateMonster,
} from './hydrate.js'

export interface InstanceService {
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

export const createInstanceService = (
	definitions: DefinitionRepository,
	instances: InstanceRepository,
): InstanceService => {
	const getItemInstance = (uid: string): ItemInstance => {
		const instance = instances.getItem(uid)

		if (instance === undefined) {
			throw new NotFoundError()
		}

		return instance
	}

	const getMonsterInstance = (uid: string): MonsterInstance => {
		const instance = instances.getMonster(uid)

		if (instance === undefined) {
			throw new NotFoundError()
		}

		return instance
	}

	const getCharacterClassInstance = (
		uid: string,
	): CharacterClassInstance => {
		const instance = instances.getCharacterClass(uid)

		if (instance === undefined) {
			throw new NotFoundError()
		}

		return instance
	}

	const requireItemDefinition = (blueprintId: string) => {
		const definition = definitions.getItemDefinition(blueprintId)

		if (definition === undefined) {
			throw new ValidationError(`unknown item blueprint: ${blueprintId}`)
		}

		return definition
	}

	const requireMonsterDefinition = (blueprintId: string) => {
		const definition = definitions.getMonsterDefinition(blueprintId)

		if (definition === undefined) {
			throw new ValidationError(
				`unknown monster blueprint: ${blueprintId}`,
			)
		}

		return definition
	}

	const requireCharacterClassDefinition = (blueprintId: string) => {
		const definition = definitions.getCharacterClassDefinition(blueprintId)

		if (definition === undefined) {
			throw new ValidationError(
				`unknown character class blueprint: ${blueprintId}`,
			)
		}

		return definition
	}

	const hydrateItemInstance = (instance: ItemInstance): EquipmentItem =>
		hydrateItem(instance, requireItemDefinition(instance.blueprintId))

	const hydrateMonsterInstance = (instance: MonsterInstance): Monster =>
		hydrateMonster(
			instance,
			requireMonsterDefinition(instance.blueprintId),
		)

	const hydrateCharacterClassInstance = (
		instance: CharacterClassInstance,
	): CharacterClass =>
		hydrateCharacterClass(
			instance,
			requireCharacterClassDefinition(instance.blueprintId),
		)

	return {
		listItems: () => instances.listItems().map(hydrateItemInstance),
		getItem: (uid) => hydrateItemInstance(getItemInstance(uid)),
		createItem: (input) => {
			requireItemDefinition(input.blueprintId)

			const instance: ItemInstance = {
				uid: randomUUID(),
				blueprintId: input.blueprintId,
				extraStats: input.extraStats,
			}

			instances.saveItem(instance)
			return hydrateItemInstance(instance)
		},
		updateItem: (uid, input) => {
			const instance = getItemInstance(uid)
			const updated: ItemInstance = {
				...instance,
				extraStats: input.extraStats ?? instance.extraStats,
			}

			instances.saveItem(updated)
			return hydrateItemInstance(updated)
		},
		deleteItem: (uid) => {
			getItemInstance(uid)
			instances.deleteItem(uid)
		},
		listMonsters: () =>
			instances.listMonsters().map(hydrateMonsterInstance),
		getMonster: (uid) => hydrateMonsterInstance(getMonsterInstance(uid)),
		createMonster: (input) => {
			requireMonsterDefinition(input.blueprintId)

			const instance: MonsterInstance = {
				uid: randomUUID(),
				blueprintId: input.blueprintId,
			}

			instances.saveMonster(instance)
			return hydrateMonsterInstance(instance)
		},
		deleteMonster: (uid) => {
			getMonsterInstance(uid)
			instances.deleteMonster(uid)
		},
		listCharacterClasses: () =>
			instances
				.listCharacterClasses()
				.map(hydrateCharacterClassInstance),
		getCharacterClass: (uid) =>
			hydrateCharacterClassInstance(getCharacterClassInstance(uid)),
		createCharacterClass: (input) => {
			const definition = requireCharacterClassDefinition(input.blueprintId)
			const level = input.level ?? 1

			if (level < 1) {
				throw new ValidationError('level must be at least 1')
			}

			const instance: CharacterClassInstance = {
				uid: randomUUID(),
				blueprintId: input.blueprintId,
				name: input.name,
				level,
				stats: input.stats ?? definition.stats,
				experience: input.experience ?? 0,
			}

			instances.saveCharacterClass(instance)
			return hydrateCharacterClassInstance(instance)
		},
		updateCharacterClass: (uid, input) => {
			const instance = getCharacterClassInstance(uid)

			if (input.level !== undefined && input.level < 1) {
				throw new ValidationError('level must be at least 1')
			}

			const updated: CharacterClassInstance = {
				...instance,
				name: input.name ?? instance.name,
				level: input.level ?? instance.level,
				stats: input.stats ?? instance.stats,
				experience: input.experience ?? instance.experience,
			}

			instances.saveCharacterClass(updated)
			return hydrateCharacterClassInstance(updated)
		},
		deleteCharacterClass: (uid) => {
			getCharacterClassInstance(uid)
			instances.deleteCharacterClass(uid)
		},
	}
}
