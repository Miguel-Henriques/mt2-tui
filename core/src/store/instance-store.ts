import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'

import { loadBlueprints } from '../data/load-blueprints.js'
import { loadInstances } from '../data/load-instances.js'
import {
	characterClassInstancePath,
	itemInstancePath,
	monsterInstancePath,
} from '../data/instance-paths.js'
import {
	CharacterClass,
	Monster,
} from '../domain/definitions/character-definitions.js'
import {
	CharacterClassInstance,
	CreateCharacterClassInput,
	CreateItemInput,
	CreateMonsterInput,
	ItemInstance,
	MonsterInstance,
	UpdateCharacterClassInput,
	UpdateItemInput,
} from '../resources/instances/types.js'
import { EquipmentItem } from '../domain/definitions/item-definitions.js'
import { NotFoundError, ValidationError } from '../shared/errors.js'
import {
	hydrateCharacterClass,
	hydrateItem,
	hydrateMonster,
} from './hydrate.js'

const writeJson = (path: string, data: unknown): void => {
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, `${JSON.stringify(data, null, 4)}\n`, 'utf8')
}

export class InstanceStore {
	private readonly itemBlueprints
	private readonly monsterBlueprints
	private readonly characterClassBlueprints
	private readonly itemPaths = new Map<string, string>()
	private readonly monsterPaths = new Map<string, string>()
	private readonly characterClassPaths = new Map<string, string>()
	private readonly items = new Map<string, ItemInstance>()
	private readonly monsters = new Map<string, MonsterInstance>()
	private readonly characterClasses = new Map<string, CharacterClassInstance>()

	constructor() {
		const blueprints = loadBlueprints()
		this.itemBlueprints = blueprints.itemBlueprints
		this.monsterBlueprints = blueprints.monsterBlueprints
		this.characterClassBlueprints = blueprints.characterClassBlueprints
		this.loadInstancesFromDisk()
	}

	listItems(): EquipmentItem[] {
		return [...this.items.values()].map((instance) =>
			this.hydrateItemInstance(instance),
		)
	}

	getItem(uid: string): EquipmentItem {
		const instance = this.getItemInstance(uid)
		return this.hydrateItemInstance(instance)
	}

	createItem(input: CreateItemInput): EquipmentItem {
		this.requireItemBlueprint(input.blueprintId)

		const instance: ItemInstance = {
			uid: randomUUID(),
			blueprintId: input.blueprintId,
			extraStats: input.extraStats,
		}
		const path = itemInstancePath(instance.blueprintId, instance.uid)

		writeJson(path, instance)
		this.items.set(instance.uid, instance)
		this.itemPaths.set(instance.uid, path)

		return this.hydrateItemInstance(instance)
	}

	updateItem(uid: string, input: UpdateItemInput): EquipmentItem {
		const instance = this.getItemInstance(uid)
		const updated: ItemInstance = {
			...instance,
			extraStats: input.extraStats ?? instance.extraStats,
		}
		const path = this.itemPaths.get(uid)

		if (path === undefined) {
			throw new NotFoundError()
		}

		writeJson(path, updated)
		this.items.set(uid, updated)

		return this.hydrateItemInstance(updated)
	}

	deleteItem(uid: string): void {
		const path = this.itemPaths.get(uid)

		if (path === undefined) {
			throw new NotFoundError()
		}

		unlinkSync(path)
		this.items.delete(uid)
		this.itemPaths.delete(uid)
	}

	listMonsters(): Monster[] {
		return [...this.monsters.values()].map((instance) =>
			this.hydrateMonsterInstance(instance),
		)
	}

	getMonster(uid: string): Monster {
		const instance = this.getMonsterInstance(uid)
		return this.hydrateMonsterInstance(instance)
	}

	createMonster(input: CreateMonsterInput): Monster {
		this.requireMonsterBlueprint(input.blueprintId)

		const instance: MonsterInstance = {
			uid: randomUUID(),
			blueprintId: input.blueprintId,
		}
		const path = monsterInstancePath(instance.blueprintId, instance.uid)

		writeJson(path, instance)
		this.monsters.set(instance.uid, instance)
		this.monsterPaths.set(instance.uid, path)

		return this.hydrateMonsterInstance(instance)
	}

	deleteMonster(uid: string): void {
		const path = this.monsterPaths.get(uid)

		if (path === undefined) {
			throw new NotFoundError()
		}

		unlinkSync(path)
		this.monsters.delete(uid)
		this.monsterPaths.delete(uid)
	}

	listCharacterClasses(): CharacterClass[] {
		return [...this.characterClasses.values()].map((instance) =>
			this.hydrateCharacterClassInstance(instance),
		)
	}

	getCharacterClass(uid: string): CharacterClass {
		const instance = this.getCharacterClassInstance(uid)
		return this.hydrateCharacterClassInstance(instance)
	}

	createCharacterClass(
		input: CreateCharacterClassInput,
	): CharacterClass {
		const blueprint = this.requireCharacterClassBlueprint(input.blueprintId)
		const level = input.level ?? 1

		if (level < 1) {
			throw new ValidationError('level must be at least 1')
		}

		const instance: CharacterClassInstance = {
			uid: randomUUID(),
			blueprintId: input.blueprintId,
			name: input.name,
			level,
			stats: input.stats ?? blueprint.stats,
			experience: input.experience ?? 0,
		}
		const path = characterClassInstancePath(
			instance.blueprintId,
			instance.uid,
		)

		writeJson(path, instance)
		this.characterClasses.set(instance.uid, instance)
		this.characterClassPaths.set(instance.uid, path)

		return this.hydrateCharacterClassInstance(instance)
	}

	updateCharacterClass(
		uid: string,
		input: UpdateCharacterClassInput,
	): CharacterClass {
		const instance = this.getCharacterClassInstance(uid)

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
		const path = this.characterClassPaths.get(uid)

		if (path === undefined) {
			throw new NotFoundError()
		}

		writeJson(path, updated)
		this.characterClasses.set(uid, updated)

		return this.hydrateCharacterClassInstance(updated)
	}

	deleteCharacterClass(uid: string): void {
		const path = this.characterClassPaths.get(uid)

		if (path === undefined) {
			throw new NotFoundError()
		}

		unlinkSync(path)
		this.characterClasses.delete(uid)
		this.characterClassPaths.delete(uid)
	}

	private loadInstancesFromDisk(): void {
		const loaded = loadInstances()

		for (const instance of loaded.items) {
			const path = itemInstancePath(instance.blueprintId, instance.uid)
			this.items.set(instance.uid, instance)
			this.itemPaths.set(instance.uid, path)
		}

		for (const instance of loaded.monsters) {
			const path = monsterInstancePath(instance.blueprintId, instance.uid)
			this.monsters.set(instance.uid, instance)
			this.monsterPaths.set(instance.uid, path)
		}

		for (const instance of loaded.characterClasses) {
			const path = characterClassInstancePath(
				instance.blueprintId,
				instance.uid,
			)
			this.characterClasses.set(instance.uid, instance)
			this.characterClassPaths.set(instance.uid, path)
		}
	}

	private getItemInstance(uid: string): ItemInstance {
		const instance = this.items.get(uid)

		if (instance === undefined) {
			throw new NotFoundError()
		}

		return instance
	}

	private getMonsterInstance(uid: string): MonsterInstance {
		const instance = this.monsters.get(uid)

		if (instance === undefined) {
			throw new NotFoundError()
		}

		return instance
	}

	private getCharacterClassInstance(uid: string): CharacterClassInstance {
		const instance = this.characterClasses.get(uid)

		if (instance === undefined) {
			throw new NotFoundError()
		}

		return instance
	}

	private hydrateItemInstance(instance: ItemInstance): EquipmentItem {
		const blueprint = this.itemBlueprints.get(instance.blueprintId)

		if (blueprint === undefined) {
			throw new ValidationError(
				`unknown item blueprint: ${instance.blueprintId}`,
			)
		}

		return hydrateItem(instance, blueprint)
	}

	private hydrateMonsterInstance(instance: MonsterInstance): Monster {
		const blueprint = this.monsterBlueprints.get(instance.blueprintId)

		if (blueprint === undefined) {
			throw new ValidationError(
				`unknown monster blueprint: ${instance.blueprintId}`,
			)
		}

		return hydrateMonster(instance, blueprint)
	}

	private hydrateCharacterClassInstance(
		instance: CharacterClassInstance,
	): CharacterClass {
		const blueprint = this.characterClassBlueprints.get(instance.blueprintId)

		if (blueprint === undefined) {
			throw new ValidationError(
				`unknown character class blueprint: ${instance.blueprintId}`,
			)
		}

		return hydrateCharacterClass(instance, blueprint)
	}

	private requireItemBlueprint(blueprintId: string) {
		const blueprint = this.itemBlueprints.get(blueprintId)

		if (blueprint === undefined) {
			throw new ValidationError(`unknown item blueprint: ${blueprintId}`)
		}

		return blueprint
	}

	private requireMonsterBlueprint(blueprintId: string) {
		const blueprint = this.monsterBlueprints.get(blueprintId)

		if (blueprint === undefined) {
			throw new ValidationError(
				`unknown monster blueprint: ${blueprintId}`,
			)
		}

		return blueprint
	}

	private requireCharacterClassBlueprint(blueprintId: string) {
		const blueprint = this.characterClassBlueprints.get(blueprintId)

		if (blueprint === undefined) {
			throw new ValidationError(
				`unknown character class blueprint: ${blueprintId}`,
			)
		}

		return blueprint
	}
}
