import {
	CharacterClassDef,
	MobGroupDef,
	MonsterDef,
	SpotDef,
} from '../../domain/definitions/character-definitions.js'
import { ItemDef } from '../../domain/definitions/item-definitions.js'
import { NotFoundError } from '../../shared/errors.js'
import type { DefinitionRepository } from '../../storage/definitions/definition-repository.js'
import {
	resolveMobGroupEnemyDefIds,
	resolveSpotEnemyDefIds,
} from './resolve-spot-enemies.js'
import type { DefinitionSummary } from './definition-types.js'

export interface DefinitionService {
	listDefinitions(): DefinitionSummary[]
	listItemDefinitions(): ItemDef[]
	getItemDefinition(defId: string): ItemDef
	listMonsterDefinitions(): MonsterDef[]
	getMonsterDefinition(defId: string): MonsterDef
	listCharacterClassDefinitions(): CharacterClassDef[]
	getCharacterClassDefinition(defId: string): CharacterClassDef
	listMobGroupDefinitions(): MobGroupDef[]
	getMobGroupDefinition(defId: string): MobGroupDef
	listSpotDefinitions(): SpotDef[]
	getSpotDefinition(defId: string): SpotDef
	resolveSpotEnemyDefIds(spotDefId: string): string[]
	resolveMobGroupEnemyDefIds(mobGroupDefId: string): string[]
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
	listCharacterClassDefinitions: () => repository.listCharacterClassDefinitions(),
	getCharacterClassDefinition: (defId) => {
		const definition = repository.getCharacterClassDefinition(defId)

		if (definition === undefined) {
			throw new NotFoundError()
		}

		return definition
	},
	listMobGroupDefinitions: () => repository.listMobGroupDefinitions(),
	getMobGroupDefinition: (defId) => {
		const definition = repository.getMobGroupDefinition(defId)

		if (definition === undefined) {
			throw new NotFoundError()
		}

		return definition
	},
	listSpotDefinitions: () => repository.listSpotDefinitions(),
	getSpotDefinition: (defId) => {
		const definition = repository.getSpotDefinition(defId)

		if (definition === undefined) {
			throw new NotFoundError()
		}

		return definition
	},
	resolveSpotEnemyDefIds: (spotDefId) => {
		const spot = repository.getSpotDefinition(spotDefId)

		if (spot === undefined) {
			throw new NotFoundError()
		}

		return resolveSpotEnemyDefIds(
			spot,
			(defId) => repository.getMobGroupDefinition(defId),
		)
	},
	resolveMobGroupEnemyDefIds: (mobGroupDefId) => {
		const mobGroup = repository.getMobGroupDefinition(mobGroupDefId)

		if (mobGroup === undefined) {
			throw new NotFoundError()
		}

		return resolveMobGroupEnemyDefIds(mobGroup)
	},
})
