import { relative } from 'node:path'

import type {
	CharacterClassBlueprint,
	MonsterBlueprint,
} from '../../domain/definitions/character-definitions.js'
import type { EquipmentItemBlueprint } from '../../domain/definitions/item-definitions.js'
import { DEFINITIONS_ROOT } from '../content-paths.js'
import { readJsonFile } from '../file-json.js'
import { walkJsonFiles } from '../walk-json-files.js'
import type { DefinitionRepository } from './definition-repository.js'

const relativePath = (path: string): string =>
	relative(DEFINITIONS_ROOT, path).replace(/\\/g, '/')

export class FileDefinitionRepository implements DefinitionRepository {
	private readonly itemDefinitions = new Map<string, EquipmentItemBlueprint>()
	private readonly monsterDefinitions = new Map<string, MonsterBlueprint>()
	private readonly characterClassDefinitions = new Map<
		string,
		CharacterClassBlueprint
	>()

	constructor() {
		this.loadDefinitions()
	}

	listItemDefinitions(): EquipmentItemBlueprint[] {
		return [...this.itemDefinitions.values()]
	}

	getItemDefinition(blueprintId: string): EquipmentItemBlueprint | undefined {
		return this.itemDefinitions.get(blueprintId)
	}

	listMonsterDefinitions(): MonsterBlueprint[] {
		return [...this.monsterDefinitions.values()]
	}

	getMonsterDefinition(blueprintId: string): MonsterBlueprint | undefined {
		return this.monsterDefinitions.get(blueprintId)
	}

	listCharacterClassDefinitions(): CharacterClassBlueprint[] {
		return [...this.characterClassDefinitions.values()]
	}

	getCharacterClassDefinition(
		blueprintId: string,
	): CharacterClassBlueprint | undefined {
		return this.characterClassDefinitions.get(blueprintId)
	}

	private loadDefinitions(): void {
		for (const path of walkJsonFiles(DEFINITIONS_ROOT)) {
			const rel = relativePath(path)

			if (rel.startsWith('items/')) {
				const definition = readJsonFile<EquipmentItemBlueprint>(path)
				this.itemDefinitions.set(definition.blueprintId, definition)
				continue
			}

			if (rel.startsWith('characters/monsters/')) {
				const definition = readJsonFile<MonsterBlueprint>(path)
				this.monsterDefinitions.set(definition.blueprintId, definition)
				continue
			}

			if (rel.startsWith('characters/classes/')) {
				const definition = readJsonFile<CharacterClassBlueprint>(path)
				this.characterClassDefinitions.set(
					definition.blueprintId,
					definition,
				)
			}
		}
	}
}
