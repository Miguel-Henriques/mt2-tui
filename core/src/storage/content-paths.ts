import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const CORE_ROOT = join(
	dirname(fileURLToPath(import.meta.url)),
	'..',
	'..',
)

export const CONTENT_ROOT = join(CORE_ROOT, 'content')
export const ASSETS_ROOT = join(CONTENT_ROOT, 'assets')
export const DEFINITIONS_ROOT = join(CONTENT_ROOT, 'definitions')
export const DEFAULT_INSTANCES_ROOT = join(CONTENT_ROOT, 'instances')

export const instancesRoot = (): string =>
	process.env.STORE_INSTANCES_PATH ?? DEFAULT_INSTANCES_ROOT
