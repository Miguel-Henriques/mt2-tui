import { randomUUID } from 'node:crypto'

import { characterClassId } from '../../domain/definitions/character-definitions.js'
import { EquipmentItem } from '../../domain/equipment-item.js'
import { PlayerCharacter } from '../../domain/player.js'
import { NotFoundError, ValidationError } from '../../shared/errors.js'
import type { DefinitionRepository } from '../../storage/definitions/definition-repository.js'
import type { GameSaveStateRepository } from '../../storage/game-save-state/game-save-state-repository.js'
import type {
	CreateEquipmentItemInput,
	CreatePlayerCharacterInput,
	EquipmentItemSave,
	PatchEquipmentItemInput,
	PatchPlayerCharacterInput,
	PlayerCharacterSave,
} from './types.js'

export interface GameSaveStateService {
	listPlayerCharacters(): PlayerCharacter[]
	getPlayerCharacter(id: string): PlayerCharacter
	createPlayerCharacter(input: CreatePlayerCharacterInput): PlayerCharacter
	patchPlayerCharacter(
		id: string,
		input: PatchPlayerCharacterInput,
	): PlayerCharacter
	listPlayerOwnedItems(): EquipmentItem[]
	getPlayerOwnedItem(id: string): EquipmentItem
	createEquipmentItem(input: CreateEquipmentItemInput): EquipmentItem
	patchEquipmentItem(
		id: string,
		input: PatchEquipmentItemInput,
	): EquipmentItem
	deleteEquipmentItem(id: string): void
}

const upgradeLevelFromDefId = (defId: string): number => {
	const segment = defId.split('/').pop() ?? ''
	const plusIndex = segment.indexOf('+')

	if (plusIndex === -1) {
		return 0
	}

	const level = Number.parseInt(segment.slice(plusIndex + 1), 10)
	return Number.isInteger(level) ? level : 0
}

export const createGameSaveStateService = (
	definitions: DefinitionRepository,
	gameSaveState: GameSaveStateRepository,
): GameSaveStateService => {
	const requirePlayerCharacterSave = (id: string): PlayerCharacterSave => {
		const character = gameSaveState.getPlayerCharacter(id)

		if (character === undefined) {
			throw new NotFoundError()
		}

		return character
	}

	const requirePlayerOwnedItemSave = (id: string): EquipmentItemSave => {
		const item = gameSaveState.getPlayerOwnedItem(id)

		if (item === undefined) {
			throw new NotFoundError()
		}

		return item
	}

	const requireItemDefinition = (defId: string): void => {
		if (definitions.getItemDefinition(defId) === undefined) {
			throw new ValidationError(`unknown item definition: ${defId}`)
		}
	}

	const requireCharacterClassDefinition = (
		characterClass: CreatePlayerCharacterInput['classType'],
	): void => {
		const defId = characterClassId(characterClass)

		if (definitions.getCharacterClassDefinition(defId) === undefined) {
			throw new ValidationError(`unknown character class: ${characterClass}`)
		}
	}

	const requireOwner = (owner: string): void => {
		requirePlayerCharacterSave(owner)
	}

	const validateLevel = (level: number): void => {
		if (level < 1) {
			throw new ValidationError('level must be at least 1')
		}
	}

	const hydratePlayerCharacter = (
		save: PlayerCharacterSave,
	): PlayerCharacter => new PlayerCharacter(save)

	const hydrateEquipmentItem = (save: EquipmentItemSave): EquipmentItem =>
		new EquipmentItem(save)

	return {
		listPlayerCharacters: () =>
			gameSaveState.listPlayerCharacters().map(hydratePlayerCharacter),
		getPlayerCharacter: (id) =>
			hydratePlayerCharacter(requirePlayerCharacterSave(id)),
		createPlayerCharacter: (input) => {
			requireCharacterClassDefinition(input.classType)

			const character: PlayerCharacterSave = {
				id: randomUUID(),
				classType: input.classType,
				name: input.name,
				level: 1,
				experience: 0,
				progression: {
					availableStatsPoints: 0,
					spentStatPoints: {},
				},
			}

			gameSaveState.savePlayerCharacter(character)
			return hydratePlayerCharacter(character)
		},
		patchPlayerCharacter: (id, input) => {
			const character = requirePlayerCharacterSave(id)
			const level = input.level ?? character.level

			validateLevel(level)

			const updated: PlayerCharacterSave = {
				...character,
				name: input.name ?? character.name,
				level,
				experience: input.experience ?? character.experience,
				progression: input.progression ?? character.progression,
			}

			gameSaveState.savePlayerCharacter(updated)
			return hydratePlayerCharacter(updated)
		},
		listPlayerOwnedItems: () =>
			gameSaveState.listPlayerOwnedItems().map(hydrateEquipmentItem),
		getPlayerOwnedItem: (id) =>
			hydrateEquipmentItem(requirePlayerOwnedItemSave(id)),
		createEquipmentItem: (input) => {
			requireItemDefinition(input.itemDefinitionId)
			requireOwner(input.owner)

			const item: EquipmentItemSave = {
				id: randomUUID(),
				defId: input.itemDefinitionId,
				owner: input.owner,
				upgradeLevel: upgradeLevelFromDefId(input.itemDefinitionId),
			}

			gameSaveState.savePlayerOwnedItem(item)
			return hydrateEquipmentItem(item)
		},
		patchEquipmentItem: (id, input) => {
			const item = requirePlayerOwnedItemSave(id)
			const defId = input.itemDefinitionId ?? item.defId
			const owner = input.owner ?? item.owner

			requireItemDefinition(defId)
			requireOwner(owner)

			const updated: EquipmentItemSave = {
				...item,
				defId,
				owner,
				upgradeLevel: upgradeLevelFromDefId(defId),
				extraStats: input.extraStats ?? item.extraStats,
			}

			gameSaveState.savePlayerOwnedItem(updated)
			return hydrateEquipmentItem(updated)
		},
		deleteEquipmentItem: (id) => {
			requirePlayerOwnedItemSave(id)
			gameSaveState.deletePlayerOwnedItem(id)
		},
	}
}
