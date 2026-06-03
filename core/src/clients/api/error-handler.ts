import type { Context } from 'hono'

import { NotFoundError, ValidationError } from '../../shared/errors.js'

export const writeResourceError = (c: Context, err: unknown) => {
	if (err instanceof ValidationError) {
		return c.json({ error: err.message }, 400)
	}

	if (err instanceof NotFoundError) {
		return c.json({ error: err.message }, 404)
	}

	if (err instanceof Error) {
		return c.json({ error: err.message }, 500)
	}

	return c.json({ error: 'internal server error' }, 500)
}
