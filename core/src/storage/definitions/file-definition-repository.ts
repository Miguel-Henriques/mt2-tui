import { relative } from 'node:path'

import type {
	CharacterClassDef,
	MonsterDef,
} from '../../domain/definitions/character-definitions.js'
import type { EquipmentItemDef } from '../../domain/definitions/item-definitions.js'
import { DEFINITIONS_ROOT } from '../content-paths.js'
import { readJsonFile } from '../file-json.js'
import { walkJsonFiles } from '../walk-json-files.js'
import type { DefinitionRepository } from './definition-repository.js'

type LegacyDefinition<T> = T & {
	blueprintId?: string
}

const relativePath = (path: string): string =>
	relative(DEFINITIONS_ROOT, path).replace(/\\/g, '/')

const normalizeDefinitionId = <T extends { defId?: string }>(
	definition: LegacyDefinition<T>,
): T | undefined => {
	const defId = definition.defId ?? definition.blueprintId

	if (defId === undefined) {
		return undefined
	}

	return {
		...definition,
		defId,
	}
}

export class FileDefinitionRepository implements DefinitionRepository {
	private readonly itemDefinitions = new Map<string, EquipmentItemDef>()
	private readonly monsterDefinitions = new Map<string, MonsterDef>()
	private readonly characterClassDefinitions = new Map<
		string,
		CharacterClassDef
	>()

	constructor() {
		this.loadDefinitions()
	}

	listItemDefinitions(): EquipmentItemDef[] {
		return [...this.itemDefinitions.values()]
	}

	getItemDefinition(defId: string): EquipmentItemDef | undefined {
		return this.itemDefinitions.get(defId)
	}

	listMonsterDefinitions(): MonsterDef[] {
		return [...this.monsterDefinitions.values()]
	}

	getMonsterDefinition(defId: string): MonsterDef | undefined {
		return this.monsterDefinitions.get(defId)
	}

	listCharacterClassDefinitions(): CharacterClassDef[] {
		return [...this.characterClassDefinitions.values()]
	}

	getCharacterClassDefinition(
		defId: string,
	): CharacterClassDef | undefined {
		return this.characterClassDefinitions.get(defId)
	}

	private loadDefinitions(): void {
		for (const path of walkJsonFiles(DEFINITIONS_ROOT)) {
			const rel = relativePath(path)

			if (rel.startsWith('items/')) {
				const definition = normalizeDefinitionId(
					readJsonFile<LegacyDefinition<EquipmentItemDef>>(path),
				)

				if (definition !== undefined) {
					this.itemDefinitions.set(definition.defId, definition)
				}

				continue
			}

			if (rel.startsWith('characters/monsters/')) {
				const definition = normalizeDefinitionId(
					readJsonFile<LegacyDefinition<MonsterDef>>(path),
				)

				if (definition !== undefined) {
					this.monsterDefinitions.set(definition.defId, definition)
				}

				continue
			}

			if (rel.startsWith('characters/classes/')) {
				const definition = normalizeDefinitionId(
					readJsonFile<LegacyDefinition<CharacterClassDef>>(path),
				)

				if (definition !== undefined) {
					this.characterClassDefinitions.set(
						definition.defId,
						definition,
					)
				}
			}
		}
	}
}
