export interface Simulation {
	uid: string
	status: 'pending' | 'completed' | 'failed'
}

export interface CreateSimulationInput {
	characterUid?: string
	monsterUid?: string
}
