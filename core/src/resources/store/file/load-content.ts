import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import {
	CharacterClassBlueprint,
	MonsterBlueprint,
} from '../../../domain/definitions/character-definitions.js'
import { EquipmentItemBlueprint } from '../../../domain/definitions/item-definitions.js'
import { CONTENT_DIRECTORY } from '../loaders/content-directory.js'
import { walkJsonFiles } from '../loaders/walk-json-files.js'

export interface ContentRegistry {
	itemContent: Map<string, EquipmentItemBlueprint>
	monsterContent: Map<string, MonsterBlueprint>
	characterClassContent: Map<string, CharacterClassBlueprint>
}

const readJson = <T>(path: string): T =>
	JSON.parse(readFileSync(path, 'utf8')) as T

const relativePath = (absolutePath: string): string =>
	relative(CONTENT_DIRECTORY, absolutePath).replace(/\\/g, '/')

export const loadContent = (): ContentRegistry => {
	const itemContent = new Map<string, EquipmentItemBlueprint>()
	const monsterContent = new Map<string, MonsterBlueprint>()
	const characterClassContent = new Map<string, CharacterClassBlueprint>()

	for (const path of walkJsonFiles(CONTENT_DIRECTORY)) {
		const rel = relativePath(path)

		if (rel.startsWith('items/')) {
			const blueprint = readJson<EquipmentItemBlueprint>(path)
			itemContent.set(blueprint.blueprintId, blueprint)
			continue
		}

		if (rel.startsWith('characters/monsters/')) {
			const blueprint = readJson<MonsterBlueprint>(path)
			monsterContent.set(blueprint.blueprintId, blueprint)
			continue
		}

		if (rel.startsWith('characters/classes/')) {
			const blueprint = readJson<CharacterClassBlueprint>(path)
			characterClassContent.set(blueprint.blueprintId, blueprint)
		}
	}

	return {
		itemContent,
		monsterContent,
		characterClassContent,
	}
}
