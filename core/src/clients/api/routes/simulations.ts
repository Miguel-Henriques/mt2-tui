import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'

import type { SimulationService } from '../../../resources/simulations/index.js'
import { writeResourceError } from '../error-handler.js'

const errorSchema = z
	.object({
		error: z.string().openapi({ example: 'not found' }),
	})
	.openapi('Error')

const jsonErrorResponse = (description: string) => ({
	description,
	content: { 'application/json': { schema: errorSchema } },
})

const simulationSchema = z
	.object({
		uid: z.string().uuid(),
		status: z.enum(['pending', 'completed', 'failed']),
	})
	.openapi('Simulation')

const simulationListSchema = z
	.object({
		simulations: z.array(simulationSchema),
	})
	.openapi('SimulationList')

const createSimulationBodySchema = z
	.object({
		characterUid: z.string().uuid().optional(),
		monsterUid: z.string().uuid().optional(),
	})
	.openapi('CreateSimulationInput')

export const registerSimulationRoutes = (
	app: OpenAPIHono,
	simulations: SimulationService,
): void => {
	const listSimulationsRoute = createRoute({
		method: 'get',
		path: '/v1/simulations',
		tags: ['simulations'],
		summary: 'List simulations',
		responses: {
			200: {
				description: 'List of simulations',
				content: {
					'application/json': { schema: simulationListSchema },
				},
			},
		},
	})

	const createSimulationRoute = createRoute({
		method: 'post',
		path: '/v1/simulations',
		tags: ['simulations'],
		summary: 'Create a simulation',
		request: {
			body: {
				content: {
					'application/json': { schema: createSimulationBodySchema },
				},
			},
		},
		responses: {
			201: {
				description: 'Created simulation',
				content: {
					'application/json': { schema: simulationSchema },
				},
			},
			400: jsonErrorResponse('Validation error'),
			404: jsonErrorResponse('Resource not found'),
			500: jsonErrorResponse('Unexpected server error'),
		},
	})

	app.openapi(listSimulationsRoute, (c) => {
		return c.json({ simulations: simulations.listSimulations() }, 200)
	})

	app.openapi(createSimulationRoute, (c) => {
		try {
			const body = c.req.valid('json')
			return c.json(simulations.createSimulation(body), 201)
		} catch (err) {
			return writeResourceError(c, err)
		}
	})
}
