import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const matchesFilePattern = (filename: string, pattern: string): boolean => {
	if (!pattern.includes('*') && !pattern.includes('?')) {
		return filename === pattern
	}

	const regexSource = pattern
		.replace(/[.+^${}()|[\]\\]/g, '\\$&')
		.replace(/\*/g, '.*')
		.replace(/\?/g, '.')

	return new RegExp(`^${regexSource}$`).test(filename)
}

/**
 * Recursively scans a directory tree and returns absolute paths of
 * matching files.
 *
 * @param directory - Root directory to scan.
 * @param file - Exact filename (e.g. `SKILL.md`) or glob pattern
 * (e.g. `*.md`).
 */
export const scanDirectory = (
	directory: string,
	file: string,
): string[] => {
	if (!existsSync(directory)) {
		return []
	}

	const files: string[] = []

	for (const entry of readdirSync(directory)) {
		const path = join(directory, entry)
		const stats = statSync(path)

		if (stats.isDirectory()) {
			files.push(...scanDirectory(path, file))
			continue
		}

		if (matchesFilePattern(entry, file)) {
			files.push(path)
		}
	}

	return files
}
