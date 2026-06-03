import type {
	CharacterClassBlueprint,
	MonsterBlueprint,
} from '../../domain/definitions/character-definitions.js'
import type { EquipmentItemBlueprint } from '../../domain/definitions/item-definitions.js'
import { NotFoundError } from '../../shared/errors.js'
import type { DefinitionRepository } from '../../storage/definitions/definition-repository.js'
import type { DefinitionSummary } from './definition-types.js'

export interface DefinitionService {
	listDefinitions(): DefinitionSummary[]
	listItemDefinitions(): EquipmentItemBlueprint[]
	getItemDefinition(blueprintId: string): EquipmentItemBlueprint
	listMonsterDefinitions(): MonsterBlueprint[]
	getMonsterDefinition(blueprintId: string): MonsterBlueprint
	listCharacterClassDefinitions(): CharacterClassBlueprint[]
	getCharacterClassDefinition(blueprintId: string): CharacterClassBlueprint
}

const definitionName = (blueprintId: string): string =>
	blueprintId.split('/').pop() ?? blueprintId

export const createDefinitionService = (
	repository: DefinitionRepository,
): DefinitionService => ({
	listDefinitions: () => [
		...repository.listItemDefinitions().map((definition) => ({
			kind: 'item' as const,
			blueprintId: definition.blueprintId,
			name: definition.name,
		})),
		...repository.listMonsterDefinitions().map((definition) => ({
			kind: 'monster' as const,
			blueprintId: definition.blueprintId,
			name: definitionName(definition.blueprintId),
		})),
		...repository.listCharacterClassDefinitions().map((definition) => ({
			kind: 'character-class' as const,
			blueprintId: definition.blueprintId,
			name: definitionName(definition.blueprintId),
		})),
	],
	listItemDefinitions: () => repository.listItemDefinitions(),
	getItemDefinition: (blueprintId) => {
		const definition = repository.getItemDefinition(blueprintId)

		if (definition === undefined) {
			throw new NotFoundError()
		}

		return definition
	},
	listMonsterDefinitions: () => repository.listMonsterDefinitions(),
	getMonsterDefinition: (blueprintId) => {
		const definition = repository.getMonsterDefinition(blueprintId)

		if (definition === undefined) {
			throw new NotFoundError()
		}

		return definition
	},
	listCharacterClassDefinitions: () =>
		repository.listCharacterClassDefinitions(),
	getCharacterClassDefinition: (blueprintId) => {
		const definition = repository.getCharacterClassDefinition(blueprintId)

		if (definition === undefined) {
			throw new NotFoundError()
		}

		return definition
	},
})
