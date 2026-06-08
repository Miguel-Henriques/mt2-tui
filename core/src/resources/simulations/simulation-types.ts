import { Monster } from "../../domain/monster.js"
import { PlayerCharacter, PlayerCharacterInput } from "../../domain/player.js"
import { PrimaryStats } from "../../domain/stats/primary-stats.js"

export interface Simulation {
	uid: string
	status: SimulationStatus
}

export type SimulationStatus = 'pending' | 'completed' | 'failed'

export interface CreateSimulationInput {
	characterUid?: string
	monsterUid?: string
}

export interface CreatePVMCombatSimulationInput {
	/**
	 * Information required to instantiate a player character.
	 * 
	 * Either a PlayerCharacterInput (stateless simulation) or a PlayerCharacter instance (from game object)
	 */
	player: (Omit<PlayerCharacterInput, 'progression'> & { progressionStatsPoints: PrimaryStats }) | PlayerCharacter
	/**
	 * List of monster definition IDs
	 */
	enemies: string[]
}