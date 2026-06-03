import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export const readJsonFile = <T>(path: string): T =>
	JSON.parse(readFileSync(path, 'utf8')) as T

export const writeJsonFile = (path: string, data: unknown): void => {
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, `${JSON.stringify(data, null, '\t')}\n`, 'utf8')
}
