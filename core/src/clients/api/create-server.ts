import { serve, type ServerType } from '@hono/node-server'

import { logger } from '../../shared/logger.js'
import { createApi, type ApiDeps } from './create-api.js'

export interface RestAPI {
	stop(): Promise<void>
}

export const createRestAPI = (deps: ApiDeps): RestAPI => {
	const app = createApi(deps)
	const hostname = '0.0.0.0'
	const port = 8080
	let httpServer: ServerType | null = null

	httpServer = serve(
		{
			fetch: app.fetch,
			hostname,
			port,
		},
		(info) => {
			logger.info('rest listening', {
				addr: `${info.address}:${info.port}`,
			})
		},
	)

	return {
		stop() {
			if (httpServer === null) {
				return Promise.resolve()
			}

			const server = httpServer
			httpServer = null

			return new Promise((resolve, reject) => {
				server.close((err) => {
					if (err !== undefined) {
						reject(err)
						return
					}

					resolve()
				})
			})
		},
	}
}
