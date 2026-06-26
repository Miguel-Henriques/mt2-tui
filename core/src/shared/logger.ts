import { Console } from 'node:console'
import { createWriteStream, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

type LogLevel = 'debug' | 'error' | 'info' | 'warn'

interface Logger {
	debug: (msg: string, fields?: Record<string, unknown>) => void
	error: (msg: string, fields?: Record<string, unknown>) => void
	info: (msg: string, fields?: Record<string, unknown>) => void
	warn: (msg: string, fields?: Record<string, unknown>) => void
}

const DEFAULT_LOG_LEVEL: LogLevel = 'info'
const DEFAULT_LOG_PATH = join('.devtools', 'tui.log')

const LOG_LEVELS: Record<LogLevel, number> = {
	debug: 0,
	error: 3,
	info: 1,
	warn: 2,
}

let fileConsole: Console | null = null

const resolveLogLevel = (value: string | undefined): LogLevel => {
	if (value === undefined) {
		return DEFAULT_LOG_LEVEL
	}

	const normalized = value.toLowerCase()
	if (
		normalized === 'debug'
		|| normalized === 'error'
		|| normalized === 'info'
		|| normalized === 'warn'
	) {
		return normalized
	}

	return DEFAULT_LOG_LEVEL
}

let minLogLevel = resolveLogLevel(process.env.LOG_LEVEL)

const shouldLog = (level: LogLevel): boolean =>
	LOG_LEVELS[level] >= LOG_LEVELS[minLogLevel]

export const initFileLogger = (
	logPath: string = DEFAULT_LOG_PATH,
): void => {
	mkdirSync(dirname(logPath), { recursive: true })
	const stream = createWriteStream(logPath, { flags: 'a' })
	fileConsole = new Console({ stdout: stream, stderr: stream })
	minLogLevel = resolveLogLevel(process.env.LOG_LEVEL)
}

export const serializeError = (error: unknown): Record<string, unknown> => { //FIXME: Error serialization should be internally handled by the logger (callers don't need to invoke it)
	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
			stack: error.stack,
		}
	}

	return { message: String(error) }
}

let processErrorHandlersRegistered = false

export const initProcessErrorHandlers = (): void => {
	if (processErrorHandlersRegistered) {
		return
	}

	processErrorHandlersRegistered = true

	process.on('uncaughtException', (error) => {
		logger.error('Uncaught exception', serializeError(error))
		process.exit(1)
	})

	process.on('unhandledRejection', (reason) => {
		logger.error('Unhandled promise rejection', serializeError(reason))
	})
}

const consoleMethods: Record<
	LogLevel,
	'debug' | 'error' | 'log' | 'warn'
> = {
	debug: 'debug',
	error: 'error',
	info: 'log',
	warn: 'warn',
}

const writeLog = (
	level: LogLevel,
	msg: string,
	fields?: Record<string, unknown>, //FIXME: Logger should accept multiple data types and serialize them accordingly instead of requiring callers to use a map
): void => {
	if (!shouldLog(level)) {
		return
	}

	const entry = JSON.stringify({
		level,
		msg,
		time: new Date().toISOString(),
		...fields,
	})

	const method = consoleMethods[level]

	if (fileConsole !== null) {
		fileConsole[method](entry)
		return
	}

	console[method](entry)
}

export const logger: Logger = {
	debug: (msg, fields) => writeLog('debug', msg, fields),
	error: (msg, fields) => writeLog('error', msg, fields),
	info: (msg, fields) => writeLog('info', msg, fields),
	warn: (msg, fields) => writeLog('warn', msg, fields),
}
