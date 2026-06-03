import type {
	EquipmentItemSave,
	PlayerCharacterSave,
} from '../../resources/game-save-state/types.js'

export interface GameSaveStateRepository {
	listPlayerCharacters(): PlayerCharacterSave[]
	getPlayerCharacter(id: string): PlayerCharacterSave | undefined
	savePlayerCharacter(character: PlayerCharacterSave): void
	listPlayerOwnedItems(): EquipmentItemSave[]
	getPlayerOwnedItem(id: string): EquipmentItemSave | undefined
	savePlayerOwnedItem(item: EquipmentItemSave): void
	deletePlayerOwnedItem(id: string): void
}
