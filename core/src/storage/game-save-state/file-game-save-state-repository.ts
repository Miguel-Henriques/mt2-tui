import { unlinkSync } from 'node:fs'
import { relative } from 'node:path'

import type { CharacterClassType } from '../../domain/definitions/character-definitions.js'
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

interface LegacyCharacterSave {
	uid?: string
	id?: string
	blueprintId?: string
	classType?: CharacterClassType
	name?: string
	level?: number
	experience?: number
	progression?: PlayerCharacterSave['progression']
}

interface LegacyItemSave {
	uid?: string
	id?: string
	blueprintId?: string
	defId?: string
	owner?: string
	upgradeLevel?: number
	extraStats?: EquipmentItemSave['extraStats']
}

const classTypes: Record<string, CharacterClassType> = {
	ninja: 'Ninja',
	shaman: 'Shaman',
	sura: 'Sura',
	warrior: 'Warrior',
}

const relativePath = (path: string): string =>
	relative(instancesRoot(), path).replace(/\\/g, '/')

const upgradeLevelFromDefId = (defId: string): number => {
	const segment = defId.split('/').pop() ?? ''
	const plusIndex = segment.indexOf('+')

	if (plusIndex === -1) {
		return 0
	}

	const level = Number.parseInt(segment.slice(plusIndex + 1), 10)
	return Number.isInteger(level) ? level : 0
}

const characterClassTypeFromDefinition = (
	definitionId: string,
): CharacterClassType | undefined => {
	const segment = definitionId.split('/').pop()?.toLowerCase()

	if (segment === undefined) {
		return undefined
	}

	return classTypes[segment]
}

const toPlayerCharacterSave = (
	value: LegacyCharacterSave,
): PlayerCharacterSave | undefined => {
	const id = value.id ?? value.uid
	const classType = value.classType
		?? (value.blueprintId === undefined
			? undefined
			: characterClassTypeFromDefinition(value.blueprintId))

	if (id === undefined || classType === undefined || value.name === undefined) {
		return undefined
	}

	return {
		id,
		classType,
		name: value.name,
		level: value.level ?? 1,
		experience: value.experience ?? 0,
		progression: value.progression ?? {
			availableStatsPoints: 0,
			spentStatPoints: {},
		},
	}
}

const toEquipmentItemSave = (
	value: LegacyItemSave,
): EquipmentItemSave | undefined => {
	const id = value.id ?? value.uid
	const defId = value.defId ?? value.blueprintId

	if (id === undefined || defId === undefined || value.owner === undefined) {
		return undefined
	}

	return {
		id,
		defId,
		owner: value.owner,
		upgradeLevel: value.upgradeLevel ?? upgradeLevelFromDefId(defId),
		extraStats: value.extraStats,
	}
}

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

			if (rel.startsWith('player-characters/')
				|| rel.startsWith('characters/classes/')
			) {
				const character = toPlayerCharacterSave(
					readJsonFile<LegacyCharacterSave>(path),
				)

				if (character !== undefined) {
					this.playerCharacters.set(character.id, character)
					this.playerCharacterPaths.set(character.id, path)
				}

				continue
			}

			if (rel.startsWith('player-owned-items/')
				|| rel.startsWith('items/')
			) {
				const item = toEquipmentItemSave(readJsonFile<LegacyItemSave>(path))

				if (item !== undefined) {
					this.playerOwnedItems.set(item.id, item)
					this.playerOwnedItemPaths.set(item.id, path)
				}
			}
		}
	}
}
