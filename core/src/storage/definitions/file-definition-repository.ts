import { relative } from 'node:path'

import type {
	CharacterClassDef,
	MobGroupDef,
	MonsterDef,
	SpotDef,
} from '../../domain/definitions/character-definitions.js'
import type { EquipmentItemDef } from '../../domain/definitions/item-definitions.js'
import { DEFINITIONS_ROOT } from '../content-paths.js'
import { readJsonFile } from '../file-json.js'
import { walkJsonFiles } from '../walk-json-files.js'
import type { DefinitionRepository } from './definition-repository.js'

const relativePath = (path: string): string =>
	relative(DEFINITIONS_ROOT, path).replace(/\\/g, '/')

export class FileDefinitionRepository implements DefinitionRepository {
	private readonly itemDefinitions = new Map<string, EquipmentItemDef>()
	private readonly monsterDefinitions = new Map<string, MonsterDef>()
	private readonly characterClassDefinitions = new Map<
		string,
		CharacterClassDef
	>()
	private readonly mobGroupDefinitions = new Map<string, MobGroupDef>()
	private readonly spotDefinitions = new Map<string, SpotDef>()

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

	listMobGroupDefinitions(): MobGroupDef[] {
		return [...this.mobGroupDefinitions.values()]
	}

	getMobGroupDefinition(defId: string): MobGroupDef | undefined {
		return this.mobGroupDefinitions.get(defId)
	}

	listSpotDefinitions(): SpotDef[] {
		return [...this.spotDefinitions.values()]
	}

	getSpotDefinition(defId: string): SpotDef | undefined {
		return this.spotDefinitions.get(defId)
	}

	private loadDefinitions(): void {
		for (const path of walkJsonFiles(DEFINITIONS_ROOT)) {
			const rel = relativePath(path)

			if (rel.startsWith('items/')) {
				const definition = readJsonFile<EquipmentItemDef>(path)
				this.itemDefinitions.set(definition.defId, definition)
				continue
			}

			if (rel.startsWith('characters/monsters/')) {
				const definition = readJsonFile<MonsterDef>(path)
				this.monsterDefinitions.set(definition.defId, definition)
				continue
			}

			if (rel.startsWith('characters/classes/')) {
				const definition = readJsonFile<CharacterClassDef>(path)
				this.characterClassDefinitions.set(
					definition.defId,
					definition,
				)
				continue
			}

			if (rel.startsWith('characters/mob-groups/')) {
				const definition = readJsonFile<MobGroupDef>(path)
				this.mobGroupDefinitions.set(definition.defId, definition)
				continue
			}

			if (rel.startsWith('spots/')) {
				const definition = readJsonFile<SpotDef>(path)
				this.spotDefinitions.set(definition.defId, definition)
			}
		}
	}
}
