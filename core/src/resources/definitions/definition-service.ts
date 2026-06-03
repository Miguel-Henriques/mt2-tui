import { CharacterClassDef, MonsterDef } from '../../domain/definitions/character-definitions.js'
import { ItemDef } from '../../domain/definitions/item-definitions.js'
import { NotFoundError } from '../../shared/errors.js'
import type { DefinitionRepository } from '../../storage/definitions/definition-repository.js'
import type { DefinitionSummary } from './definition-types.js'

export interface DefinitionService {
	listDefinitions(): DefinitionSummary[]
	listItemDefinitions(): ItemDef[]
	getItemDefinition(defId: string): ItemDef
	listMonsterDefinitions(): MonsterDef[]
	getMonsterDefinition(defId: string): MonsterDef
	listCharacterClassDefinitions(): CharacterClassDef[]
	getCharacterClassDefinition(defId: string): CharacterClassDef
}

const definitionName = (defId: string): string =>
	defId.split('/').pop() ?? defId

export const createDefinitionService = (
	repository: DefinitionRepository,
): DefinitionService => ({
	listDefinitions: () => [
		...repository.listItemDefinitions().map((definition) => ({
			defId: definition.defId,
			kind: 'item' as const,
			name: definition.name,
		})),
		...repository.listMonsterDefinitions().map((definition) => ({
			defId: definition.defId,
			kind: 'monster' as const,
			name: definition.name ?? definitionName(definition.defId),
		})),
		...repository.listCharacterClassDefinitions().map((definition) => ({
			defId: definition.defId,
			kind: 'character-class' as const,
			name: definition.name ?? definitionName(definition.defId),
		})),
	],
	listItemDefinitions: () => repository.listItemDefinitions(),
	getItemDefinition: (defId) => {
		const definition = repository.getItemDefinition(defId)

		if (definition === undefined) {
			throw new NotFoundError()
		}

		return definition
	},
	listMonsterDefinitions: () => repository.listMonsterDefinitions(),
	getMonsterDefinition: (defId) => {
		const definition = repository.getMonsterDefinition(defId)

		if (definition === undefined) {
			throw new NotFoundError()
		}

		return definition
	},
	listCharacterClassDefinitions: () =>
		repository.listCharacterClassDefinitions(),
	getCharacterClassDefinition: (defId) => {
		const definition = repository.getCharacterClassDefinition(defId)

		if (definition === undefined) {
			throw new NotFoundError()
		}

		return definition
	},
})
