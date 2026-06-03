import { unlinkSync } from 'node:fs'
import { relative } from 'node:path'

import type {
	EquipmentItemSave,
	PlayerCharacterSave,
} from '../../resources/game-save-state/types.js'
import { instancesRoot } from '../content-paths.js'
import { readJsonFile, writeJsonFile } from '../file-json.js'
import { walkJsonFiles } from '../walk-json-files.js'
import type { GameSaveStateRepository } from './game-save-state-repository.js'
import {
	playerCharacterPath,
	playerOwnedItemPath,
} from './game-save-state-paths.js'

const relativePath = (path: string): string =>
	relative(instancesRoot(), path).replace(/\\/g, '/')

export class FileGameSaveStateRepository implements GameSaveStateRepository {
	private readonly playerCharacterPaths = new Map<string, string>()
	private readonly playerOwnedItemPaths = new Map<string, string>()
	private readonly playerCharacters = new Map<string, PlayerCharacterSave>()
	private readonly playerOwnedItems = new Map<string, EquipmentItemSave>()

	constructor() {
		this.loadGameSaveState()
	}

	listPlayerCharacters(): PlayerCharacterSave[] {
		return [...this.playerCharacters.values()]
	}

	getPlayerCharacter(id: string): PlayerCharacterSave | undefined {
		return this.playerCharacters.get(id)
	}

	savePlayerCharacter(character: PlayerCharacterSave): void {
		const path = this.playerCharacterPaths.get(character.id)
			?? playerCharacterPath(character.name, character.id)

		writeJsonFile(path, character)
		this.playerCharacters.set(character.id, character)
		this.playerCharacterPaths.set(character.id, path)
	}

	listPlayerOwnedItems(): EquipmentItemSave[] {
		return [...this.playerOwnedItems.values()]
	}

	getPlayerOwnedItem(id: string): EquipmentItemSave | undefined {
		return this.playerOwnedItems.get(id)
	}

	savePlayerOwnedItem(item: EquipmentItemSave): void {
		const path = this.playerOwnedItemPaths.get(item.id)
			?? playerOwnedItemPath(item.defId, item.id)

		writeJsonFile(path, item)
		this.playerOwnedItems.set(item.id, item)
		this.playerOwnedItemPaths.set(item.id, path)
	}

	deletePlayerOwnedItem(id: string): void {
		const path = this.playerOwnedItemPaths.get(id)

		if (path === undefined) {
			return
		}

		unlinkSync(path)
		this.playerOwnedItems.delete(id)
		this.playerOwnedItemPaths.delete(id)
	}

	private loadGameSaveState(): void {
		for (const path of walkJsonFiles(instancesRoot())) {
			const rel = relativePath(path)

			if (rel.startsWith('player-characters/')) {
				const character = readJsonFile<PlayerCharacterSave>(path)
				this.playerCharacters.set(character.id, character)
				this.playerCharacterPaths.set(character.id, path)
				continue
			}

			if (rel.startsWith('player-owned-items/')) {
				const item = readJsonFile<EquipmentItemSave>(path)
				this.playerOwnedItems.set(item.id, item)
				this.playerOwnedItemPaths.set(item.id, path)
			}
		}
	}
}
