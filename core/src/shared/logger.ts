interface Logger {
    info: (msg: string, fields?: Record<string, unknown>) => void
    error: (msg: string, fields?: Record<string, unknown>) => void
}

export const logger: Logger = {
    info: (msg: string, fields?: Record<string, unknown>) => {
        console.log(JSON.stringify({ level: 'info', msg, ...fields }))
    },
    error: (msg: string, fields?: Record<string, unknown>) => {
        console.error(JSON.stringify({ level: 'error', msg, ...fields }))
    },
}