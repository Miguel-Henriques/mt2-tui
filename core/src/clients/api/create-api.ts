import { OpenAPIHono } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'

import type { CoreServices } from '../../index.js'
import { registerSimulationRoutes } from './routes/simulations.js'

export interface ApiDeps {
	services: CoreServices
}

export const createApi = ({ services }: ApiDeps): OpenAPIHono => {
	const app = new OpenAPIHono({
		defaultHook: (result, c) => {
			if (!result.success) {
				return c.json({ error: 'validation error' }, 400)
			}
		},
	})

	registerSimulationRoutes(app, services.simulations)

	app.doc('/doc', {
		openapi: '3.0.0',
		info: {
			title: 'MT2 Server Core API',
			version: '1.0.0',
			description:
				'Core REST API scaffold for experimental simulations.',
		},
		servers: [
			{
				url: 'http://localhost:8080',
				description: 'Local development',
			},
		],
		tags: [
			{
				name: 'simulations',
				description: 'Experimental combat and other simulations',
			},
		],
	})

	app.get(
		'/docs',
		Scalar({
			url: '/doc',
			pageTitle: 'MT2 Server Core API',
		}),
	)

	return app
}
