import type { InstanceService } from '../instances/index.js'
import type {
	CreateSimulationInput,
	Simulation,
} from './simulation-types.js'

export interface SimulationService {
	listSimulations(): Simulation[]
	createSimulation(input: CreateSimulationInput): Simulation
}

export const createSimulationService = (
	_instances: InstanceService,
): SimulationService => ({
	listSimulations: () => [],
	createSimulation: (_input) => ({
		uid: '00000000-0000-0000-0000-000000000000',
		status: 'pending',
	}),
})
