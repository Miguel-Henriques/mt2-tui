import { join } from 'node:path'

import { instancesRoot } from '../content-paths.js'

const filenameSegment = (value: string, fallback: string): string => {
	const segment = value.split('/').pop() ?? fallback
	const plusIndex = segment.indexOf('+')

	if (plusIndex === -1) {
		return segment
	}

	return segment.slice(0, plusIndex)
}

export const playerCharacterPath = (
	name: string,
	id: string,
): string =>
	join(instancesRoot(), 'player-characters', `${filenameSegment(name, 'character')}-${id}.json`)

export const playerOwnedItemPath = (
	defId: string,
	id: string,
): string =>
	join(instancesRoot(), 'player-owned-items', `${filenameSegment(defId, 'item')}-${id}.json`)
