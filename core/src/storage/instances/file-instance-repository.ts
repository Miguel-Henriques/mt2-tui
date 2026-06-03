import { unlinkSync } from 'node:fs'
import { relative } from 'node:path'

import type {
	CharacterClassInstance,
	ItemInstance,
	MonsterInstance,
} from '../../resources/instances/types.js'
import { instancesRoot } from '../content-paths.js'
import { readJsonFile, writeJsonFile } from '../file-json.js'
import { walkJsonFiles } from '../walk-json-files.js'
import {
	characterClassInstancePath,
	itemInstancePath,
	monsterInstancePath,
} from './instance-paths.js'
import type { InstanceRepository } from './instance-repository.js'

const relativePath = (path: string): string =>
	relative(instancesRoot(), path).replace(/\\/g, '/')

export class FileInstanceRepository implements InstanceRepository {
	private readonly itemPaths = new Map<string, string>()
	private readonly monsterPaths = new Map<string, string>()
	private readonly characterClassPaths = new Map<string, string>()
	private readonly items = new Map<string, ItemInstance>()
	private readonly monsters = new Map<string, MonsterInstance>()
	private readonly characterClasses = new Map<string, CharacterClassInstance>()

	constructor() {
		this.loadInstances()
	}

	listItems(): ItemInstance[] {
		return [...this.items.values()]
	}

	getItem(uid: string): ItemInstance | undefined {
		return this.items.get(uid)
	}

	saveItem(instance: ItemInstance): void {
		const path = this.itemPaths.get(instance.uid)
			?? itemInstancePath(instance.blueprintId, instance.uid)

		writeJsonFile(path, instance)
		this.items.set(instance.uid, instance)
		this.itemPaths.set(instance.uid, path)
	}

	deleteItem(uid: string): void {
		this.deleteInstance(uid, this.items, this.itemPaths)
	}

	listMonsters(): MonsterInstance[] {
		return [...this.monsters.values()]
	}

	getMonster(uid: string): MonsterInstance | undefined {
		return this.monsters.get(uid)
	}

	saveMonster(instance: MonsterInstance): void {
		const path = this.monsterPaths.get(instance.uid)
			?? monsterInstancePath(instance.blueprintId, instance.uid)

		writeJsonFile(path, instance)
		this.monsters.set(instance.uid, instance)
		this.monsterPaths.set(instance.uid, path)
	}

	deleteMonster(uid: string): void {
		this.deleteInstance(uid, this.monsters, this.monsterPaths)
	}

	listCharacterClasses(): CharacterClassInstance[] {
		return [...this.characterClasses.values()]
	}

	getCharacterClass(uid: string): CharacterClassInstance | undefined {
		return this.characterClasses.get(uid)
	}

	saveCharacterClass(instance: CharacterClassInstance): void {
		const path = this.characterClassPaths.get(instance.uid)
			?? characterClassInstancePath(instance.blueprintId, instance.uid)

		writeJsonFile(path, instance)
		this.characterClasses.set(instance.uid, instance)
		this.characterClassPaths.set(instance.uid, path)
	}

	deleteCharacterClass(uid: string): void {
		this.deleteInstance(
			uid,
			this.characterClasses,
			this.characterClassPaths,
		)
	}

	private loadInstances(): void {
		for (const path of walkJsonFiles(instancesRoot())) {
			const rel = relativePath(path)

			if (rel.startsWith('items/')) {
				const instance = readJsonFile<ItemInstance>(path)
				this.items.set(instance.uid, instance)
				this.itemPaths.set(instance.uid, path)
				continue
			}

			if (rel.startsWith('characters/monsters/')) {
				const instance = readJsonFile<MonsterInstance>(path)
				this.monsters.set(instance.uid, instance)
				this.monsterPaths.set(instance.uid, path)
				continue
			}

			if (rel.startsWith('characters/classes/')) {
				const instance = readJsonFile<CharacterClassInstance>(path)
				this.characterClasses.set(instance.uid, instance)
				this.characterClassPaths.set(instance.uid, path)
			}
		}
	}

	private deleteInstance<T>(
		uid: string,
		instances: Map<string, T>,
		paths: Map<string, string>,
	): void {
		const path = paths.get(uid)

		if (path === undefined) {
			return
		}

		unlinkSync(path)
		instances.delete(uid)
		paths.delete(uid)
	}
}
