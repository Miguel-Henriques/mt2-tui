import { randomUUID } from 'node:crypto'
import type { GameSaveStateService } from '../game-save-state/index.js'
import type {
	CreatePVMCombatSimulationInput,
	CreateSimulationInput,
	Simulation,
	SimulationStatus,
	SnapshotCharacterState,
} from './simulation-types.js'
import { PlayerCharacter } from '../../domain/player.js'
import { Monster } from '../../domain/monster.js'
import { Character } from '../../domain/index.js'

export interface SimulationService {
	listSimulations(): Simulation[]
	createSimulation(input: CreateSimulationInput): Simulation
	createPVMCombatSimulation(input: CreatePVMCombatSimulationInput): Promise<Simulation>
}

export const createSimulationService = (
	_gameSaveState: GameSaveStateService,
): SimulationService => ({
	listSimulations: () => [],
	createSimulation: (_input) => ({
		uid: '00000000-0000-0000-0000-000000000000',
		status: 'pending',
	}),


	/**
	 * 
	 * player attacks
	 * check if mob is alive -> if not, end
	 * initiate player attack cooldown
	 * 
	 * mob attacks
	 * check if player is -> if not, end
	 * initiate mob attack cooldown
	 * 
	 * mob/player cooldown ends -> repeat
	 * mob/player cooldown ends -> repeat
	 */
	createPVMCombatSimulation: async (input) => {
		const uid = randomUUID()
		let status: SimulationStatus = 'pending'

		const spawnedMobs = input.enemies.map(mobDef => new Monster(mobDef))

		//TODO: Input Player instance of PlayerCharacterInput
		if (input.player instanceof PlayerCharacter) {

			const player = input.player
			const events: SimulationEvent[] = seedPvMEvents(player, spawnedMobs)
			const abortController = new AbortController()
			let mobsAlive = [...spawnedMobs]

			emitUpdate(input, `Combat started against ${toStringCharactersList(mobsAlive)}.`, status, player, mobsAlive)

			// The combat loop is a single synchronous process to avoid race conditions
			while (events.length > 0) {
				const event = events.shift()!

				await sleep(event.at - Date.now(), abortController.signal)

				// Player attack event
				if (event.actor instanceof PlayerCharacter && event.type === 'AttackEvent') {
					const attackResults = event.actor.attack(mobsAlive)

					for (const result of attackResults) {
						emitUpdate(
							input,
							`Player dealt ${result.damage} damage to ${result.defenderName} (${result.defenderCurrentHp}/${result.defenderMaxHp}).`,
							status,
							player,
							mobsAlive,
						)
					}

					// update mobsAlive after attack cycle
					const defeatedMobs = mobsAlive.filter(mob => mob.currentHp <= 0)
					mobsAlive = mobsAlive.filter(mob => mob.currentHp > 0)

					for (const mob of defeatedMobs) {
						emitUpdate(input, `${mob.name} was defeated.`, status, player, mobsAlive)
					}

					if (mobsAlive.length === 0) {
						status = 'completed'
						emitUpdate(input, 'Player defeated all enemies.', status, player, mobsAlive)
						break
					}

					events.push({
						actor: player,
						type: 'AttackEvent',
						at: Date.now() + attackCooldownMs(player.stats.attackSpeed ?? 100),
					})
				}

				// Mob attack events
				else if (event.actor instanceof Monster && event.type === 'AttackEvent') {
					// discard scheduled attack event if mob is no longer alive
					if (!mobsAlive.some(mob => mob.id === event.actor.id)) {
						continue
					}

					const attackResults = event.actor.attack([player])

					for (const result of attackResults) {
						emitUpdate(
							input,
							`Player took ${result.damage} damage from ${result.attackerName} (${result.defenderCurrentHp}/${result.defenderMaxHp}).`,
							status,
							player,
							mobsAlive,
						)
					}

					if (player.currentHp <= 0) {
						status = 'completed'
						emitUpdate(input, 'Player has died.', status, player, mobsAlive)
						break
					}

					events.push({
						actor: event.actor,
						type: 'AttackEvent',
						at: Date.now() + attackCooldownMs(event.actor.stats.attackSpeed ?? 100),
					})
				}

				// Reorder events by execution time
				events.sort(sortEventByTimestampAsc)
			}

			return {
				uid,
				status,
			}
		}

		return {
			uid,
			status: 'failed',
		}
	}
})

/**
 * 
 * @param attackSpeed - attack speed (100 means 1 attack per second). Capped at 200 (2 attacks per second).
 * @returns attack cooldown in milliseconds.
 */
const attackCooldownMs = (attackSpeed: number) => {
	return 1000 * (100 / attackSpeed)
}

export interface SimulationEvent {
	type: 'AttackEvent'
	actor: Character
	at: number
}

const sleep = async (ms: number, signal: AbortSignal) => {
	if (signal.aborted) {
		return
	}

	await new Promise<void>((resolve) => {
		setTimeout(resolve, Math.max(0, ms))
	})
}

const sortEventByTimestampAsc = (a: SimulationEvent, b: SimulationEvent): number => {
	return a.at - b.at
}

const seedPvMEvents = (player: PlayerCharacter, mobs: Monster[]): SimulationEvent[] => {
	const seedEvents: SimulationEvent[] = []

	seedEvents.push({
		actor: player,
		type: 'AttackEvent',
		at: Date.now() + attackCooldownMs(player.stats.attackSpeed ?? 100),
	})

	for (const mob of mobs) {
		seedEvents.push({
			actor: mob,
			type: 'AttackEvent',
			at: Date.now() + attackCooldownMs(mob.stats.attackSpeed ?? 100),
		})
	}

	return seedEvents.sort(sortEventByTimestampAsc)
}

const snapshotCharacterState = (character: PlayerCharacter | Monster): SnapshotCharacterState => ({
	id: character.id,
	name: character.name,
	currentHp: character.currentHp,
	maxHp: character.stats.healthPoints ?? 0,
	attack: character.stats.physicalDamage ?? 0,
	defense: character.stats.physicalDefense ?? 0,
})

const emitUpdate = (
	input: CreatePVMCombatSimulationInput,
	message: string,
	status: SimulationStatus,
	player: PlayerCharacter,
	enemies: Monster[],
) => {
	input.onUpdate?.({
		message,
		status,
		player: snapshotCharacterState(player),
		enemies: enemies.map(snapshotCharacterState),
	})
}

const toStringCharactersList = (combatants: Monster[]): string =>
	combatants.map(combatant => combatant.name).join(', ')