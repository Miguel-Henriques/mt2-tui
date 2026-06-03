import { getCoreServices } from '../../index.js'
import { logger } from '../../shared/logger.js'
import { createRestAPI } from './create-server.js'

const main = async () => {
	const services = getCoreServices()

	logger.info('resources loaded', {
		definitions: services.definitions.listDefinitions().length,
		items: services.instances.listItems().length,
		monsters: services.instances.listMonsters().length,
		characters: services.instances.listCharacterClasses().length,
	})

	const rest = createRestAPI({ services })
	const controller = new AbortController()

	const handleSignal = () => {
		controller.abort()
	}

	process.on('SIGINT', handleSignal)
	process.on('SIGTERM', handleSignal)

	await new Promise<void>((resolve, reject) => {
		controller.signal.addEventListener(
			'abort',
			() => {
				void rest.stop()
					.then(resolve)
					.catch((err: unknown) => {
						logger.error('server stopped', {
							error: err instanceof Error
								? err.message
								: String(err),
						})
						reject(err)
					})
			},
			{ once: true },
		)
	})
}

main().catch((err: unknown) => {
	logger.error('server stopped', {
		error: err instanceof Error ? err.message : String(err),
	})
	process.exit(1)
})
