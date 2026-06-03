import {
	createDefinitionService,
	type DefinitionService,
} from './resources/definitions/index.js'
import {
	createInstanceService,
	type InstanceService,
} from './resources/instances/index.js'
import {
	createSimulationService,
	type SimulationService,
} from './resources/simulations/index.js'
import { FileDefinitionRepository } from './storage/definitions/file-definition-repository.js'
import { FileInstanceRepository } from './storage/instances/file-instance-repository.js'

export interface CoreServices {
	definitions: DefinitionService
	instances: InstanceService
	simulations: SimulationService
}

let coreServices: CoreServices | null = null

export const createCoreServices = (): CoreServices => {
	const definitionRepository = new FileDefinitionRepository()
	const instanceRepository = new FileInstanceRepository()
	const definitions = createDefinitionService(definitionRepository)
	const instances = createInstanceService(
		definitionRepository,
		instanceRepository,
	)
	const simulations = createSimulationService(instances)

	return {
		definitions,
		instances,
		simulations,
	}
}

export const getCoreServices = (): CoreServices => {
	coreServices ??= createCoreServices()

	return coreServices
}

export type { DefinitionService, InstanceService, SimulationService }
