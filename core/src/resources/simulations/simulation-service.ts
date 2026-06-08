import { randomUUID } from 'node:crypto'
import type { GameSaveStateService } from '../game-save-state/index.js'
import type {
	CreatePVMCombatSimulationInput,
	CreateSimulationInput,
	Simulation,
	SimulationStatus,
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
		console.log('Spawning mobs: ', spawnedMobs.map(mob => mob.name))

		//TODO: Input Player instance of PlayerCharacterInput
		if (input.player instanceof PlayerCharacter) {

			const player = input.player
			let mobsAlive = [...spawnedMobs]
			const events: SimulationEvent[] = []
			const abortController = new AbortController()

			// The combat loop is a single synchronous process to avoid race conditions
			while (events.length > 0) {
				const event = events.shift()!

				await sleep(event.at - Date.now(), abortController.signal)

				// Player attack event
				if (event.actor instanceof PlayerCharacter && event.type === 'AttackEvent') {
					event.actor.attack(mobsAlive)

					mobsAlive = mobsAlive.filter(mob => mob.currentHp > 0) //TODO: signal mob death
					if (mobsAlive.length === 0) {
						console.log('Player killed all mobs')
						status = 'completed'
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
					event.actor.attack([player])

					if (player.currentHp <= 0) {
						console.log('Player has died')
						status = 'completed'
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
		}

		return {
			uid,
			status,
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

	return setTimeout(() => { }, ms)
}

const sortEventByTimestampAsc = (a: SimulationEvent, b: SimulationEvent): number => {
	return a.at - b.at
}