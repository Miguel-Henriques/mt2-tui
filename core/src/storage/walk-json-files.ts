import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

export const walkJsonFiles = (directory: string): string[] => {
	if (!existsSync(directory)) {
		return []
	}

	const entries = readdirSync(directory)
	const files: string[] = []

	for (const entry of entries) {
		const path = join(directory, entry)
		const stats = statSync(path)

		if (stats.isDirectory()) {
			files.push(...walkJsonFiles(path))
			continue
		}

		if (entry.endsWith('.json')) {
			files.push(path)
		}
	}

	return files
}
