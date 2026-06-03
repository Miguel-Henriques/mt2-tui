import { join } from 'node:path'

import { instancesRoot } from '../content-paths.js'

const filenamePrefix = (blueprintId: string): string => {
	const segment = blueprintId.split('/').pop() ?? 'instance'
	const plusIndex = segment.indexOf('+')

	if (plusIndex === -1) {
		return segment
	}

	return segment.slice(0, plusIndex)
}

export const itemInstancePath = (
	blueprintId: string,
	uid: string,
): string => {
	const directory = join(
		instancesRoot(),
		...blueprintId.split('/').slice(0, -1),
	)

	return join(directory, `${filenamePrefix(blueprintId)}-${uid}.json`)
}

export const monsterInstancePath = (
	blueprintId: string,
	uid: string,
): string =>
	join(
		instancesRoot(),
		...blueprintId.split('/').slice(0, -1),
		`${filenamePrefix(blueprintId)}-${uid}.json`,
	)

export const characterClassInstancePath = (
	blueprintId: string,
	uid: string,
): string =>
	join(
		instancesRoot(),
		...blueprintId.split('/').slice(0, -1),
		`${filenamePrefix(blueprintId)}-${uid}.json`,
	)
