import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import {
	CharacterClassBlueprint,
	MonsterBlueprint,
} from '../domain/definitions/character-definitions.js'
import { EquipmentItemBlueprint } from '../domain/definitions/item-definitions.js'
import { DATA_DIRECTORY } from './data-directory.js'
import { walkJsonFiles } from './walk-json-files.js'

export interface BlueprintRegistry {
	itemBlueprints: Map<string, EquipmentItemBlueprint>
	monsterBlueprints: Map<string, MonsterBlueprint>
	characterClassBlueprints: Map<string, CharacterClassBlueprint>
}

const BLUEPRINTS_DIRECTORY = join(DATA_DIRECTORY, 'blueprints')

const readJson = <T>(path: string): T =>
	JSON.parse(readFileSync(path, 'utf8')) as T

const relativePath = (absolutePath: string): string =>
	relative(BLUEPRINTS_DIRECTORY, absolutePath).replace(/\\/g, '/')

export const loadBlueprints = (): BlueprintRegistry => {
	const itemBlueprints = new Map<string, EquipmentItemBlueprint>()
	const monsterBlueprints = new Map<string, MonsterBlueprint>()
	const characterClassBlueprints = new Map<string, CharacterClassBlueprint>()

	for (const path of walkJsonFiles(BLUEPRINTS_DIRECTORY)) {
		const rel = relativePath(path)

		if (rel.startsWith('items/')) {
			const blueprint = readJson<EquipmentItemBlueprint>(path)
			itemBlueprints.set(blueprint.blueprintId, blueprint)
			continue
		}

		if (rel.startsWith('characters/monsters/')) {
			const blueprint = readJson<MonsterBlueprint>(path)
			monsterBlueprints.set(blueprint.blueprintId, blueprint)
			continue
		}

		if (rel.startsWith('characters/classes/')) {
			const blueprint = readJson<CharacterClassBlueprint>(path)
			characterClassBlueprints.set(blueprint.blueprintId, blueprint)
		}
	}

	return {
		itemBlueprints,
		monsterBlueprints,
		characterClassBlueprints,
	}
}
