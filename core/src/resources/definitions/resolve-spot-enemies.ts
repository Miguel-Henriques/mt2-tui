import type {
	MobGroupDef,
	SpotDef,
} from '../../domain/definitions/character-definitions.js'

const resolveMonsterDefId = (shortPath: string): string =>
	shortPath.startsWith('characters/')
		? shortPath
		: `characters/monsters/${shortPath}`

export const resolveMobGroupEnemyDefIds = (mobGroup: MobGroupDef): string[] =>
	Object.entries(mobGroup.mobs).flatMap(([shortPath, count]) =>
		Array.from({ length: count }, () => resolveMonsterDefId(shortPath)),
	)

export const resolveSpotEnemyDefIds = (
	spot: SpotDef,
	getMobGroupDefinition: (defId: string) => MobGroupDef | undefined,
): string[] =>
	spot.mobs.flatMap((spotMob) => {
		const mobGroup = getMobGroupDefinition(spotMob.defId)

		if (mobGroup === undefined) {
			return []
		}

		const groupEnemyDefIds = resolveMobGroupEnemyDefIds(mobGroup)

		return Array.from({ length: spotMob.count }, () => groupEnemyDefIds).flat()
	})
