export class NotFoundError extends Error {
	constructor(message = 'not found') {
		super(message)
		this.name = 'NotFoundError'
	}
}

export class ValidationError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'ValidationError'
	}
}
