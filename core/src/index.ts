import {
	createDefinitionService,
	type DefinitionService,
} from './resources/definitions/index.js'
import {
	createGameSaveStateService,
	type GameSaveStateService,
} from './resources/game-save-state/index.js'
import {
	createSimulationService,
	type SimulationService,
} from './resources/simulations/index.js'
import { FileDefinitionRepository } from './storage/definitions/file-definition-repository.js'
import { FileGameSaveStateRepository } from './storage/game-save-state/file-game-save-state-repository.js'

export interface CoreServices {
	definitions: DefinitionService
	gameSaveState: GameSaveStateService
	simulations: SimulationService
}

let coreServices: CoreServices | null = null

export const createCoreServices = (): CoreServices => {
	const definitionRepository = new FileDefinitionRepository()
	const gameSaveStateRepository = new FileGameSaveStateRepository()
	const definitions = createDefinitionService(definitionRepository)
	const gameSaveState = createGameSaveStateService(
		definitionRepository,
		gameSaveStateRepository,
	)
	const simulations = createSimulationService(gameSaveState)

	return {
		definitions,
		gameSaveState,
		simulations,
	}
}

export const getCoreServices = (): CoreServices => {
	coreServices ??= createCoreServices()

	return coreServices
}

export type { DefinitionService, GameSaveStateService, SimulationService }
