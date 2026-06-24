import { Console } from 'node:console'
import { createWriteStream, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

interface Logger {
	error: (msg: string, fields?: Record<string, unknown>) => void
	info: (msg: string, fields?: Record<string, unknown>) => void
}

const DEFAULT_LOG_PATH = join('.devtools', 'tui.log')

let fileConsole: Console | null = null

export const initFileLogger = (
	logPath: string = DEFAULT_LOG_PATH,
): void => {
	mkdirSync(dirname(logPath), { recursive: true })
	const stream = createWriteStream(logPath, { flags: 'a' })
	fileConsole = new Console({ stdout: stream, stderr: stream })
}

const writeLog = (
	level: 'error' | 'info',
	msg: string,
	fields?: Record<string, unknown>,
): void => {
	const entry = JSON.stringify({
		level,
		msg,
		time: new Date().toISOString(),
		...fields,
	})

	if (fileConsole !== null) {
		if (level === 'error') {
			fileConsole.error(entry)
		} else {
			fileConsole.log(entry)
		}
		return
	}

	if (level === 'error') {
		console.error(entry)
	} else {
		console.log(entry)
	}
}

export const logger: Logger = {
	error: (msg, fields) => writeLog('error', msg, fields),
	info: (msg, fields) => writeLog('info', msg, fields),
}
